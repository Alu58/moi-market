const STORAGE_KEY = 'moi-market-products';
const DEFAULT_PRODUCTS = [
  {
    id: 1,
    productName: 'Luxury Blender Pro',
    businessName: 'Pure Kitchen Co.',
    category: 'Home & Living',
    plan: 'Featured',
    status: 'Approved',
    description: 'Powerful kitchen appliance for smoothies, soups, and daily meal prep.',
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80',
    phone: '0712345678'
  },
  {
    id: 2,
    productName: 'Classic Leather Bag',
    businessName: 'Milea Fashion',
    category: 'Fashion',
    plan: 'Basic',
    status: 'Approved',
    description: 'Elegant daily carry bag made from premium material.',
    imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80',
    phone: '0723456789'
  },
  {
    id: 3,
    productName: 'Smart Fitness Watch',
    businessName: 'Nova Health',
    category: 'Health',
    plan: 'Premium',
    status: 'Approved',
    description: 'Track heart rate, workouts, and sleep with a sleek premium design.',
    imageUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=80',
    phone: '0734567890'
  }
];

const PLANS = {
  Basic: 2500,
  Featured: 5500,
  Premium: 9500
};

const getStoredProducts = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PRODUCTS));
    return DEFAULT_PRODUCTS;
  }

  try {
    const parsed = JSON.parse(saved);
    return parsed.length ? parsed : DEFAULT_PRODUCTS;
  } catch (error) {
    return DEFAULT_PRODUCTS;
  }
};

const updateSummary = () => {
  const form = document.getElementById('sellerForm');
  const plan = form?.elements?.plan?.value || 'Basic';
  const price = PLANS[plan] || 2500;

  const summaryPlan = document.getElementById('summaryPlan');
  const summaryPrice = document.getElementById('summaryPrice');

  if (summaryPlan && summaryPrice) {
    summaryPlan.textContent = plan;
    summaryPrice.textContent = `Ksh ${price.toLocaleString()}`;
  }
};

const renderProducts = (query = '') => {
  const grid = document.getElementById('listingGrid');
  if (!grid) return;

  const products = getStoredProducts().filter((product) => {
    const haystack = `${product.productName} ${product.businessName} ${product.category}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  if (!products.length) {
    grid.innerHTML = '<div class="panel"><p>No products match your search yet.</p></div>';
    return;
  }

  grid.innerHTML = products
    .filter((product) => product.status === 'Approved')
    .map(
      (product) => `
        <article class="product-card">
          <div class="product-image" style="background-image: url('${product.imageUrl || 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80'}')"></div>
          <div class="product-body">
            <span class="product-tag">${product.category}</span>
            <span class="product-status">${product.status}</span>
            <h3>${product.productName}</h3>
            <p>${product.description}</p>
            <div class="product-meta">
              <span class="product-price">Ksh ${Number(PLANS[product.plan] || 2500).toLocaleString()}</span>
              <span class="product-contact">${product.phone}</span>
            </div>
          </div>
        </article>
      `
    )
    .join('');
};

const saveProduct = (product) => {
  const allProducts = getStoredProducts();
  allProducts.push(product);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allProducts));
  renderProducts();
  renderAdminTable();
};

const handleSellerSubmit = (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);
  const product = {
    id: Date.now(),
    productName: formData.get('productName'),
    businessName: formData.get('businessName'),
    category: formData.get('category'),
    plan: formData.get('plan'),
    status: 'Pending',
    description: formData.get('description'),
    imageUrl: formData.get('imageUrl') || 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80',
    phone: formData.get('phone'),
    paymentMethod: formData.get('paymentMethod'),
    paymentDetails: formData.get('paymentDetails')
  };

  saveProduct(product);
  form.reset();
  updateSummary();
  alert('Your ad has been submitted and is awaiting admin review.');
};

const renderAdminTable = () => {
  const tbody = document.getElementById('adminTableBody');
  const adminTableWrap = document.getElementById('adminTableWrap');
  const message = document.getElementById('adminMessage');

  if (!tbody || !adminTableWrap || !message) return;

  const isLoggedIn = sessionStorage.getItem('moi-market-admin') === 'logged-in';
  if (!isLoggedIn) {
    adminTableWrap.classList.add('hidden');
    message.textContent = 'Log in to review submissions.';
    return;
  }

  const products = getStoredProducts();
  const pendingProducts = products.filter((product) => product.status === 'Pending');

  if (!pendingProducts.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">No pending submissions. All current listings are active.</td>
      </tr>
    `;
  } else {
    tbody.innerHTML = pendingProducts
      .map(
        (product) => `
          <tr>
            <td>${product.businessName}</td>
            <td>${product.productName}</td>
            <td>${product.plan}</td>
            <td><span class="status-pill status-pending">Pending</span></td>
            <td>
              <div class="action-buttons">
                <button class="action-button approve" data-id="${product.id}" data-action="approve">Approve</button>
                <button class="action-button reject" data-id="${product.id}" data-action="reject">Reject</button>
              </div>
            </td>
          </tr>
        `
      )
      .join('');
  }

  adminTableWrap.classList.remove('hidden');
  message.textContent = 'Review list is ready.';
};

const handleAdminLogin = (event) => {
  event.preventDefault();

  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value.trim();

  if (username === 'admin' && password === 'moi123') {
    sessionStorage.setItem('moi-market-admin', 'logged-in');
    renderAdminTable();
    alert('Admin login successful.');
  } else {
    alert('Invalid admin credentials. Use admin / moi123');
  }
};

const handleAdminAction = (event) => {
  const target = event.target;
  if (!target.classList.contains('action-button')) return;

  const { id, action } = target.dataset;
  const products = getStoredProducts();
  const updatedProducts = products.map((product) => {
    if (String(product.id) === String(id)) {
      return {
        ...product,
        status: action === 'approve' ? 'Approved' : 'Rejected'
      };
    }
    return product;
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProducts));
  renderProducts();
  renderAdminTable();
};

const bindEvents = () => {
  const sellerForm = document.getElementById('sellerForm');
  if (sellerForm) {
    sellerForm.addEventListener('submit', handleSellerSubmit);
    sellerForm.elements.plan.addEventListener('change', updateSummary);
  }

  const adminForm = document.getElementById('adminLoginForm');
  if (adminForm) {
    adminForm.addEventListener('submit', handleAdminLogin);
  }

  document.addEventListener('click', handleAdminAction);

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => renderProducts(event.target.value));
  }
};

const init = () => {
  renderProducts();
  updateSummary();
  renderAdminTable();
  bindEvents();
};

window.addEventListener('DOMContentLoaded', init);
