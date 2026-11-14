const STORAGE_KEY = 'moi-market-products';
const PLAN_PRICE = { Basic: 2500, Featured: 5500, Premium: 9500 };

const getProducts = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const defaults = [
      { id: 1, productName: 'Luxury Blender Pro', businessName: 'Pure Kitchen Co.', category: 'Home & Living', plan: 'Featured', status: 'Approved', description: 'A high-powered blender for smoothies, soups, and daily meal prep.', imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80', phone: '0712345678' },
      { id: 2, productName: 'Classic Leather Bag', businessName: 'Milea Fashion', category: 'Fashion', plan: 'Basic', status: 'Approved', description: 'Elegant leather carry bag designed for daily use.', imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80', phone: '0723456789' },
      { id: 3, productName: 'Smart Fitness Watch', businessName: 'Nova Health', category: 'Health', plan: 'Premium', status: 'Approved', description: 'Track heart rate, workouts, and sleep with a premium design.', imageUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=900&q=80', phone: '0734567890' }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

const renderListings = (query = '') => {
  const grid = document.getElementById('listingGrid');
  if (!grid) return;

  const items = getProducts().filter((item) => item.status === 'Approved' && `${item.productName} ${item.businessName} ${item.category}`.toLowerCase().includes(query.toLowerCase()));

  grid.innerHTML = items.length
    ? items.map((item) => `
      <article class="product-card">
        <div class="product-image" style="background-image:url('${item.imageUrl || 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80'}')"></div>
        <div class="product-body">
          <span class="product-tag">${item.category}</span>
          <span class="product-status">${item.status}</span>
          <h3>${item.productName}</h3>
          <p>${item.description}</p>
          <div class="product-meta">
            <span class="product-price">Ksh ${PLAN_PRICE[item.plan] || 2500}</span>
            <span class="product-phone">${item.phone}</span>
          </div>
        </div>
      </article>
    `).join('')
    : '<div class="card"><p>No approved products found.</p></div>';
};

const updateSummary = () => {
  const plan = document.querySelector('#sellerForm select[name="plan"]')?.value || 'Basic';
  const amount = PLAN_PRICE[plan] || 2500;
  const planEl = document.getElementById('summaryPlan');
  const priceEl = document.getElementById('summaryPrice');
  if (planEl) planEl.textContent = plan;
  if (priceEl) priceEl.textContent = `Ksh ${amount.toLocaleString()}`;
};

const renderAdminTable = () => {
  const tableWrap = document.getElementById('adminTableWrap');
  const adminMessage = document.getElementById('adminMessage');
  const tbody = document.getElementById('adminTableBody');
  if (!tableWrap || !adminMessage || !tbody) return;

  const loggedIn = sessionStorage.getItem('moi-market-admin') === 'logged-in';
  if (!loggedIn) {
    adminMessage.textContent = 'Log in to review submissions.';
    tableWrap.classList.add('hidden');
    return;
  }

  const products = getProducts().filter((item) => item.status === 'Pending');
  if (!products.length) {
    tbody.innerHTML = '<tr><td colspan="5">No pending submissions.</td></tr>';
  } else {
    tbody.innerHTML = products.map((item) => `
      <tr>
        <td>${item.businessName}</td>
        <td>${item.productName}</td>
        <td>${item.plan}</td>
        <td><span class="status-pill status-pending">Pending</span></td>
        <td>
          <div class="action-buttons">
            <button class="action-button approve" data-id="${item.id}" data-action="approve">Approve</button>
            <button class="action-button reject" data-id="${item.id}" data-action="reject">Reject</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  tableWrap.classList.remove('hidden');
  adminMessage.textContent = 'Review list is ready.';
};

const handleSellerSubmit = (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const product = {
    id: Date.now(),
    productName: data.get('productName'),
    businessName: data.get('businessName'),
    category: data.get('category'),
    plan: data.get('plan'),
    status: 'Pending',
    description: data.get('description'),
    imageUrl: data.get('imageUrl') || 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80',
    phone: data.get('phone'),
    paymentMethod: data.get('paymentMethod'),
    paymentDetails: data.get('paymentDetails')
  };

  const products = getProducts();
  products.push(product);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  form.reset();
  updateSummary();
  renderListings();
  renderAdminTable();
  alert('Your product ad has been submitted and is pending admin review.');
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
    alert('Invalid credentials. Use admin / moi123');
  }
};

const handleAdminAction = (event) => {
  const button = event.target.closest('.action-button');
  if (!button) return;
  const { id, action } = button.dataset;
  const products = getProducts().map((item) => {
    if (String(item.id) === String(id)) {
      return { ...item, status: action === 'approve' ? 'Approved' : 'Rejected' };
    }
    return item;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  renderListings();
  renderAdminTable();
};

const bindEvents = () => {
  const sellerForm = document.getElementById('sellerForm');
  if (sellerForm) {
    sellerForm.addEventListener('submit', handleSellerSubmit);
    sellerForm.querySelector('select[name="plan"]').addEventListener('change', updateSummary);
  }

  const adminForm = document.getElementById('adminLoginForm');
  if (adminForm) adminForm.addEventListener('submit', handleAdminLogin);

  document.addEventListener('click', handleAdminAction);

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => renderListings(event.target.value));
  }
};

window.addEventListener('DOMContentLoaded', () => {
  renderListings();
  updateSummary();
  renderAdminTable();
  bindEvents();
});
