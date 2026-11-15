const ADMIN_WHATSAPP = '254115496673';
const PRODUCT_IMAGE_BUCKET = 'product-images';
const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;
const PRODUCT_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

// These are public client settings. Never put a Supabase service-role key here.
const SUPABASE_CONFIG = {
  url: 'https://kbenhfbajfyweqkndywd.supabase.co',
  anonKey: 'sb_publishable_K0vlQYfUBQXshiIxsqrplQ_bpbg_dut'
};

const isSupabaseConfigured = () =>
  SUPABASE_CONFIG.url.startsWith('https://') &&
  !SUPABASE_CONFIG.url.includes('YOUR_PROJECT_ID') &&
  Boolean(SUPABASE_CONFIG.anonKey) &&
  !SUPABASE_CONFIG.anonKey.includes('YOUR_SUPABASE_ANON_KEY');

const supabaseClient = isSupabaseConfigured() && window.supabase
  ? window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
  : null;

let products = [];
let currentAdmin = null;
let productSearchQuery = '';
let productLoadRequestId = 0;

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const safeImageUrl = (value) => {
  if (!value) return '';
  try {
    const url = new URL(value, window.location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
};

const parseProductPrice = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  const normalized = String(value ?? '')
    .trim()
    .replace(/^(?:KES|KSH)\s*/i, '')
    .replace(/,/g, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
};

const formatProductPrice = (value) => {
  const amount = parseProductPrice(value);
  return amount === null
    ? String(value ?? '')
    : `KES ${amount.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
};

const setCatalogueMessage = (message, isError = false) => {
  const status = document.getElementById('catalogueMessage');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('is-error', isError);
};

const renderProducts = (query = productSearchQuery) => {
  const grid = document.getElementById('listingGrid');
  if (!grid) return;

  productSearchQuery = query;
  const search = productSearchQuery.trim().toLowerCase();
  const visibleProducts = products.filter((product) =>
    product.quantity > 0 &&
    `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(search)
  );

  if (!visibleProducts.length) {
    grid.innerHTML = `
      <div class="empty-products">
        <span aria-hidden="true">✦</span>
        <h3>${search ? 'No matching products' : 'New products coming soon'}</h3>
        <p>Products appear here after the admin reviews and publishes them.</p>
        <a href="#advertise">Promote your product</a>
      </div>`;
    return;
  }

  grid.innerHTML = visibleProducts.map((product) => {
    const image = safeImageUrl(product.image_url);
    const imageStyle = image ? ` style="background-image:url('${escapeHtml(image)}')"` : '';
    const phone = String(product.seller_phone || '').replace(/[^\d+]/g, '');
    const contactLink = phone ? `<a href="tel:${escapeHtml(phone)}">Contact seller</a>` : '';

    return `
      <article class="product-card">
        <div class="product-image"${imageStyle} role="img" aria-label="${escapeHtml(product.name)}"></div>
        <div class="product-body">
          <span class="product-category">${escapeHtml(product.category || 'Product')}</span>
          <h3>${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(product.description || '')}</p>
          <div class="product-footer"><strong>${escapeHtml(formatProductPrice(product.price))}</strong><span>Available: ${escapeHtml(product.quantity)}</span>${contactLink}</div>
        </div>
      </article>`;
  }).join('');
};

const loadProducts = async (includeOutOfStock = false) => {
  if (!supabaseClient) {
    renderProducts();
    setCatalogueMessage('Product listings are not connected yet. The site owner must configure Supabase.');
    return;
  }
  const requestId = ++productLoadRequestId;
  setCatalogueMessage('Loading products...');
  let productQuery = supabaseClient
    .from('products')
    .select('id, name, category, price, quantity, description, image_url, seller_phone')
    .order('created_at', { ascending: false });
  if (!includeOutOfStock) productQuery = productQuery.gt('quantity', 0);
  const { data, error } = await productQuery;
  if (requestId !== productLoadRequestId) return;
  if (error) {
    setCatalogueMessage(`Could not load products: ${error.message}`, true);
    return;
  }
  products = data;
  renderProducts();
  setCatalogueMessage('');
};

const showAdminMessage = (message, isError = false) => {
  const status = document.getElementById('adminMessage');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('is-error', isError);
};

const resetProductEditor = () => {
  const form = document.getElementById('productAdminForm');
  if (!form) return;
  form.reset();
  form.elements.productId.value = '';
  document.getElementById('productEditorTitle').textContent = 'Add product';
  document.getElementById('saveProductButton').textContent = 'Add product';
  document.getElementById('cancelProductEdit').hidden = true;
  document.getElementById('removeImageOption').hidden = true;
  previewProductImage(null);
};

const getProductImagePath = (imageUrl) => {
  if (!imageUrl) return null;
  try {
    const url = new URL(imageUrl);
    const prefix = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;
    if (url.origin !== SUPABASE_CONFIG.url || !url.pathname.startsWith(prefix)) return null;
    return url.pathname.slice(prefix.length);
  } catch {
    return null;
  }
};

const removeProductImage = async (imageUrl) => {
  const path = getProductImagePath(imageUrl);
  if (!path) return null;
  const { error } = await supabaseClient.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
  return error;
};

const previewProductImage = (imageUrl) => {
  const preview = document.getElementById('productImagePreview');
  if (preview.dataset.objectUrl) URL.revokeObjectURL(preview.dataset.objectUrl);
  delete preview.dataset.objectUrl;
  preview.replaceChildren();
  if (!imageUrl) {
    preview.hidden = true;
    return;
  }
  const image = document.createElement('img');
  image.src = imageUrl;
  image.alt = 'Product image preview';
  if (imageUrl.startsWith('blob:')) preview.dataset.objectUrl = imageUrl;
  preview.append(image);
  preview.hidden = false;
};

const uploadProductImage = async (file) => {
  const extension = PRODUCT_IMAGE_TYPES[file.type];
  if (!extension) {
    return { error: { message: 'Choose a JPG, PNG, WebP, or GIF image.' } };
  }
  if (file.size > MAX_PRODUCT_IMAGE_SIZE) {
    return { error: { message: 'The image must be 5 MB or smaller.' } };
  }
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await supabaseClient.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error };
  const { data } = supabaseClient.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
};

const renderAdminProducts = () => {
  const list = document.getElementById('adminProductList');
  if (!list) return;
  if (!products.length) {
    list.innerHTML = '<p class="fine-print">No products have been published yet.</p>';
    return;
  }
  list.innerHTML = products.map((product) => `
    <article class="admin-product-row">
      <div>
        <strong>${escapeHtml(product.name)}</strong>
        <span>${escapeHtml(product.category)} · ${escapeHtml(formatProductPrice(product.price))}</span>
        <span>${product.quantity === null ? 'Quantity not set' : product.quantity === 0 ? 'Out of stock' : `${escapeHtml(product.quantity)} available`}</span>
      </div>
      <div class="admin-row-actions">
        <button type="button" class="text-button" data-action="edit" data-id="${escapeHtml(product.id)}">Edit</button>
        <button type="button" class="text-button danger-button" data-action="delete" data-id="${escapeHtml(product.id)}">Delete</button>
      </div>
    </article>`).join('');
};

const updateAdminSession = async (session) => {
  const loginForm = document.getElementById('adminLoginForm');
  const workspace = document.getElementById('adminWorkspace');
  if (!session || !supabaseClient) {
    currentAdmin = null;
    loginForm.hidden = false;
    workspace.hidden = true;
    resetProductEditor();
    document.getElementById('adminProductList').replaceChildren();
    await loadProducts();
    return;
  }

  const { data, error } = await supabaseClient
    .from('admin_users')
    .select('id')
    .eq('id', session.user.id)
    .maybeSingle();
  if (error) {
    const { error: signOutError } = await supabaseClient.auth.signOut();
    showAdminMessage(
      signOutError
        ? `Could not verify admin access: ${error.message}. Sign-out also failed: ${signOutError.message}`
        : `Could not verify admin access: ${error.message}`,
      true
    );
    return;
  }
  if (!data) {
    const { error: signOutError } = await supabaseClient.auth.signOut();
    showAdminMessage(
      signOutError
        ? `This account is not authorized to manage products. Sign-out failed: ${signOutError.message}`
        : 'This account is not authorized to manage products.',
      true
    );
    return;
  }

  currentAdmin = session.user;
  loginForm.hidden = true;
  workspace.hidden = false;
  document.getElementById('adminIdentity').textContent = `Signed in as ${session.user.email}`;
  showAdminMessage('');
  await loadProducts(true);
  renderAdminProducts();
};

const signInAdmin = async (event) => {
  event.preventDefault();
  if (!supabaseClient) {
    showAdminMessage('Admin sign-in is unavailable until Supabase is configured.', true);
    return;
  }
  const form = event.currentTarget;
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: form.elements.email.value,
    password: form.elements.password.value
  });
  if (error) {
    showAdminMessage(`Sign-in failed: ${error.message}`, true);
    return;
  }
  form.reset();
  showAdminMessage('Verifying admin access...');
};

const saveAdminProduct = async (event) => {
  event.preventDefault();
  if (!supabaseClient || !currentAdmin) {
    showAdminMessage('Sign in with an authorized admin account first.', true);
    return;
  }
  const form = event.currentTarget;
  const productId = form.elements.productId.value;
  const previousProduct = products.find((item) => item.id === productId);
  const price = parseProductPrice(form.elements.price.value);
  if (price === null) {
    showAdminMessage('Enter a valid price of 0 or more, with up to 2 decimal places.', true);
    return;
  }
  const quantity = Number(form.elements.quantity.value);
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    showAdminMessage('Enter a whole-number quantity of 0 or more.', true);
    return;
  }
  const imageFile = form.elements.image_file.files[0];
  const removeImage = form.elements.remove_image.checked;
  const saveButton = document.getElementById('saveProductButton');
  if (imageFile && (!PRODUCT_IMAGE_TYPES[imageFile.type] || imageFile.size > MAX_PRODUCT_IMAGE_SIZE)) {
    showAdminMessage(
      !PRODUCT_IMAGE_TYPES[imageFile.type]
        ? 'Choose a JPG, PNG, WebP, or GIF image.'
        : 'The image must be 5 MB or smaller.',
      true
    );
    return;
  }

  saveButton.disabled = true;
  showAdminMessage(imageFile ? 'Uploading image...' : 'Saving product...');
  let uploadedImageUrl = null;
  if (imageFile) {
    const uploadResult = await uploadProductImage(imageFile);
    if (uploadResult.error) {
      saveButton.disabled = false;
      showAdminMessage(`Could not upload image: ${uploadResult.error.message}`, true);
      return;
    }
    uploadedImageUrl = uploadResult.url;
  }

  const product = {
    name: form.elements.name.value.trim(),
    category: form.elements.category.value.trim(),
    price,
    quantity,
    seller_phone: form.elements.seller_phone.value.trim() || null,
    image_url: uploadedImageUrl || (removeImage ? null : previousProduct?.image_url || null),
    description: form.elements.description.value.trim()
  };
  const result = productId
    ? await supabaseClient.from('products').update(product).eq('id', productId).select('id').maybeSingle()
    : await supabaseClient.from('products').insert(product).select('id').single();
  if (result.error) {
    if (uploadedImageUrl) {
      const cleanupError = await removeProductImage(uploadedImageUrl);
      showAdminMessage(
        cleanupError
          ? `Could not save product: ${result.error.message}. Uploaded image cleanup failed: ${cleanupError.message}`
          : `Could not save product: ${result.error.message}`,
        true
      );
    } else {
      showAdminMessage(`Could not save product: ${result.error.message}`, true);
    }
    saveButton.disabled = false;
    return;
  }
  if (!result.data) {
    const cleanupError = uploadedImageUrl ? await removeProductImage(uploadedImageUrl) : null;
    showAdminMessage(
      cleanupError
        ? `Product was not saved. Uploaded image cleanup failed: ${cleanupError.message}`
        : 'Product was not saved. It may have been removed or you may no longer have permission.',
      true
    );
    saveButton.disabled = false;
    return;
  }

  resetProductEditor();
  saveButton.disabled = false;
  await loadProducts(true);
  renderAdminProducts();
  const replacedImage = previousProduct?.image_url && (uploadedImageUrl || removeImage)
    ? previousProduct.image_url
    : null;
  const cleanupError = replacedImage ? await removeProductImage(replacedImage) : null;
  showAdminMessage(
    cleanupError
      ? `Product saved, but old image cleanup failed: ${cleanupError.message}`
      : 'Product saved.',
    Boolean(cleanupError)
  );
};

const handleAdminProductAction = async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button || !supabaseClient || !currentAdmin) return;
  const product = products.find((item) => item.id === button.dataset.id);
  if (!product) return;

  if (button.dataset.action === 'edit') {
    editAdminProduct(product);
    return;
  }

  if (button.dataset.action === 'delete' && window.confirm(`Delete "${product.name}"?`)) {
    const { error } = await supabaseClient.from('products').delete().eq('id', product.id);
    if (error) {
      showAdminMessage(`Could not delete product: ${error.message}`, true);
      return;
    }
    await loadProducts(true);
    renderAdminProducts();
    const cleanupError = await removeProductImage(product.image_url);
    showAdminMessage(
      cleanupError
        ? `Product deleted, but image cleanup failed: ${cleanupError.message}`
        : 'Product deleted.',
      Boolean(cleanupError)
    );
  }
};

const editAdminProduct = (product) => {
  const form = document.getElementById('productAdminForm');
  form.elements.productId.value = product.id;
  form.elements.name.value = product.name;
  form.elements.category.value = product.category;
  const price = parseProductPrice(product.price);
  form.elements.price.value = price === null ? '' : String(price);
  form.elements.quantity.value = product.quantity === null ? '' : String(product.quantity);
  form.elements.seller_phone.value = product.seller_phone || '';
  form.elements.description.value = product.description;
  form.elements.image_file.value = '';
  form.elements.remove_image.checked = false;
  document.getElementById('productEditorTitle').textContent = 'Edit product';
  document.getElementById('saveProductButton').textContent = 'Save changes';
  document.getElementById('cancelProductEdit').hidden = false;
  document.getElementById('removeImageOption').hidden = !product.image_url;
  previewProductImage(product.image_url);
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const sendProductToWhatsApp = (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const message = [
    'Hello Moi Market.com admin, I would like to advertise a product.',
    '',
    `Owner/business: ${data.get('businessName')}`,
    `Product: ${data.get('productName')}`,
    `Category: ${data.get('category')}`,
    `Selling price: ${data.get('price')}`,
    `Seller phone: ${data.get('sellerPhone')}`,
    `Preferred advertising plan: ${data.get('plan')}`,
    `Description: ${data.get('description')}`,
    '',
    'I will attach product photos in this WhatsApp chat. Please confirm the advertising fee and payment instructions.'
  ].join('\n');

  const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`;
  const status = document.getElementById('formMessage');
  if (status) {
    status.textContent = 'Opening WhatsApp with your product details. Attach product photos and press Send in WhatsApp.';
  }
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
};

window.addEventListener('DOMContentLoaded', () => {
  void loadProducts();

  const form = document.getElementById('whatsappForm');
  if (form) form.addEventListener('submit', sendProductToWhatsApp);
  document.getElementById('adminLoginForm').addEventListener('submit', signInAdmin);

  if (!supabaseClient) {
    showAdminMessage('Admin sign-in is not configured yet. Ask the site owner to connect Supabase.');
  } else {
    document.getElementById('productAdminForm').addEventListener('submit', saveAdminProduct);
    document.getElementById('adminProductList').addEventListener('click', handleAdminProductAction);
    document.getElementById('cancelProductEdit').addEventListener('click', resetProductEditor);
    document.getElementById('productAdminForm').elements.image_file.addEventListener('change', (event) => {
      const file = event.currentTarget.files[0];
      const form = document.getElementById('productAdminForm');
      form.elements.remove_image.checked = false;
      if (file) {
        previewProductImage(URL.createObjectURL(file));
      } else {
        const product = products.find((item) => item.id === form.elements.productId.value);
        previewProductImage(product?.image_url);
      }
    });
    document.getElementById('adminSignOut').addEventListener('click', async () => {
      const { error } = await supabaseClient.auth.signOut();
      if (error) showAdminMessage(`Could not sign out: ${error.message}`, true);
    });
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => { void updateAdminSession(session); }, 0);
    });
    void supabaseClient.auth.getSession().then(({ data, error }) => {
      if (error) {
        showAdminMessage(`Could not restore sign-in: ${error.message}`, true);
        return;
      }
      return updateAdminSession(data.session);
    });
  }

  const search = document.getElementById('searchInput');
  if (search) search.addEventListener('input', (event) => renderProducts(event.target.value));
});
