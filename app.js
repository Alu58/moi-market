const ADMIN_WHATSAPP = '254115496673';

// The admin manually adds approved products here after reviewing seller messages.
// Example: { name: 'Product name', category: 'Fashion', price: 'Ksh 2,500', description: 'Short details', image: 'images/product.jpg', sellerPhone: '0712345678' }
const PRODUCTS = [];

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

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

  grid.innerHTML = products.map((product) => `
    <article class="product-card">
      <div class="product-image" style="background-image:url('${escapeHtml(product.image || '')}')