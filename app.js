const ADMIN_WHATSAPP = '254115496673';

// The admin manually adds approved products here after reviewing seller messages.
// Example:
// { name: 'Product name', category: 'Fashion', price: 'Ksh 2,500', description: 'Short details', image: 'images/product.jpg', sellerPhone: '0712345678' }
const PRODUCTS = [];

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

const renderProducts = (query = '') => {
  const grid = document.getElementById('listingGrid');
  if (!grid) return;

  const search = query.trim().toLowerCase();
  const products = PRODUCTS.filter((product) =>
    `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(search)
  );

  if (!products.length) {
    grid.innerHTML = `
      <div class="empty-products">
        <span aria-hidden="true">✦</span>
        <h3>New products coming soon</h3>
        <p>Products appear here after the admin reviews and publishes them.</p>
        <a href="#advertise">Promote your product</a>
      </div>`;
    return;
  }

  grid.innerHTML = products.map((product) => {
    const image = safeImageUrl(product.image);
    const imageStyle = image ? ` style="background-image:url('${escapeHtml(image)}')"` : '';
    const phone = String(product.sellerPhone || '').replace(/[^\d+]/g, '');
    const contactLink = phone
      ? `<a href="tel:${escapeHtml(phone)}">Contact seller</a>`
      : '';

    return `
      <article class="product-card">
        <div class="product-image"${imageStyle} role="img" aria-label="${escapeHtml(product.name)}"></div>
        <div class="product-body">
          <span class="product-category">${escapeHtml(product.category || 'Product')}</span>
          <h3>${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(product.description || '')}</p>
          <div class="product-footer"><strong>${escapeHtml(product.price || '')}</strong>${contactLink}</div>
        </div>
      </article>`;
  }).join('');
};

const sendProductToWhatsApp = (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const message = [
    'Hello Moi Market admin, I would like to advertise a product.',
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
  renderProducts();

  const form = document.getElementById('whatsappForm');
  if (form) form.addEventListener('submit', sendProductToWhatsApp);

  const search = document.getElementById('searchInput');
  if (search) search.addEventListener('input', (event) => renderProducts(event.target.value));
});
