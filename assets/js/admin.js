async function openAdmin(){
  if (!state.session) { toast('Please sign in first', 'err'); openAuth('login', openAdmin); return; }
  if (!state.isAdmin) { toast('Admin access only', 'err'); return; }
  $('#page-admin').classList.add('active');
  PAGES.forEach(p => $('#page-'+p)?.classList.remove('active'));
  document.body.classList.add('admin-mode');
  switchAdmin('dashboard');
}
function closeAdmin(){
  document.body.classList.remove('admin-mode');
  $('#page-admin').classList.remove('active');
  showPage('home');
}
function switchAdmin(tab){
  $$('.admin-side a').forEach(a=>a.classList.toggle('active', a.dataset.tab===tab));
  $$('.admin-pane').forEach(p=>p.classList.toggle('hide', p.dataset.pane!==tab));
  const loaders = {
    dashboard: loadAdminDashboard, products: loadAdminProducts, categories: loadAdminCats,
    orders: loadAdminOrders, coupons: loadAdminCoupons, custom: loadAdminCustom,
    reviews: loadAdminReviews, customers: loadAdminCustomers, settings: loadAdminSettings
  };
  loaders[tab]?.();
}

async function loadAdminDashboard(){
  const s = await api.adminStats();
  $('#adminStats').innerHTML = `
    <div class="stat"><div class="num">${money(s.revenue)}</div><div class="lbl">Revenue (paid)</div></div>
    <div class="stat"><div class="num">${s.orderCount}</div><div class="lbl">Orders</div></div>
    <div class="stat"><div class="num">${s.productCount}</div><div class="lbl">Products</div></div>
    <div class="stat"><div class="num">${s.userCount}</div><div class="lbl">Customers</div></div>`;
  const orders = await api.adminAllOrders();
  $('#adminRecentOrders').innerHTML = orders.slice(0,6).map(o=>`
    <tr><td>${esc(o.order_number)}</td><td>${esc(o.profiles?.full_name||'—')}</td><td>${money(o.total_amount)}</td><td><span class="status-badge status-${o.status}">${o.status}</span></td></tr>`).join('') ||
    `<tr><td colspan="4">No orders yet</td></tr>`;
}

async function loadAdminProducts(){
  const [products, cats] = await Promise.all([api.adminAllProducts(), api.adminAllCategories()]);
  state.categories = cats.length ? cats : state.categories;
  window.__adminCats = cats;
  $('#adminProductsTbl').innerHTML = products.map(p=>`
    <tr>
      <td><img src="${esc((p.images||[])[0]||placeholderImg())}" style="width:42px;height:42px;object-fit:cover"></td>
      <td>${esc(p.name)}</td>
      <td>${esc(p.categories?.name||'—')}</td>
      <td>${money(p.price)}</td>
      <td>${p.stock_quantity}</td>
      <td>${p.is_active ? '<span class="status-badge status-delivered">Active</span>' : '<span class="status-badge status-cancelled">Hidden</span>'}</td>
      <td><button class="action-btn" onclick="editProduct('${p.id}')">Edit</button> <button class="action-btn" onclick="deleteProduct('${p.id}','${esc(p.name)}')">Delete</button></td>
    </tr>`).join('') || `<tr><td colspan="7">No products yet. Add your first piece →</td></tr>`;
  window.__adminProducts = products;
}
function showAddProduct(){
  $('#productForm').reset(); $('#productFormId').value = '';
  $('#productFormTitle').textContent = 'Add Product';
  $('#productCat').innerHTML = (window.__adminCats||[]).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
  $('#productModal').classList.add('open'); $('#overlay').classList.add('open');
}
function hideAddProduct(){ $('#productModal').classList.remove('open'); }
function editProduct(id){
  const p = (window.__adminProducts||[]).find(x=>x.id===id);
  if (!p) return;
  showAddProduct();
  $('#productFormTitle').textContent = 'Edit Product';
  $('#productFormId').value = p.id;
  $('#productName').value = p.name || '';
  $('#productCat').value = p.category_id || '';
  $('#productPrice').value = p.price || '';
  $('#productMrp').value = p.mrp || '';
  $('#productStock').value = p.stock_quantity || 0;
  $('#productMaterial').value = p.material || '';
  $('#productPurity').value = p.purity || '';
  $('#productWeight').value = p.weight_grams || '';
  $('#productImages').value = (p.images||[]).join(', ');
  $('#productDesc').value = p.description || '';
  $('#productFeatured').checked = !!p.is_featured;
  $('#productBestseller').checked = !!p.is_bestseller;
  $('#productActive').checked = p.is_active !== false;
}
async function saveProduct(e){
  e.preventDefault();
  const name = $('#productName').value.trim();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') + '-' + Math.random().toString(36).slice(2,6);
  const payload = {
    id: $('#productFormId').value || undefined,
    name,
    category_id: $('#productCat').value || null,
    price: Number($('#productPrice').value),
    mrp: $('#productMrp').value ? Number($('#productMrp').value) : null,
    stock_quantity: Number($('#productStock').value || 0),
    material: $('#productMaterial').value,
    purity: $('#productPurity').value,
    weight_grams: $('#productWeight').value ? Number($('#productWeight').value) : null,
    images: $('#productImages').value.split(',').map(s=>s.trim()).filter(Boolean),
    description: $('#productDesc').value,
    is_featured: $('#productFeatured').checked,
    is_bestseller: $('#productBestseller').checked,
    is_active: $('#productActive').checked
  };
  if (!payload.id) payload.slug = slug;
  try {
    await api.adminSaveProduct(payload);
    toast('Product saved');
    hideAddProduct();
    loadAdminProducts();
  } catch (err) { toast(err.message||'Could not save product', 'err'); }
}
async function deleteProduct(id, name){
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try { await api.adminDeleteProduct(id); toast('Product deleted'); loadAdminProducts(); }
  catch (err) { toast(err.message||'Could not delete', 'err'); }
}

async function loadAdminCats(){
  const cats = await api.adminAllCategories();
  window.__adminCats = cats;
  $('#adminCatsTbl').innerHTML = cats.map(c=>`
    <tr><td>${c.icon||''}</td><td>${esc(c.name)}</td><td>${esc(c.slug)}</td><td>${c.sort_order}</td>
    <td>${c.is_active?'<span class="status-badge status-delivered">Active</span>':'<span class="status-badge status-cancelled">Hidden</span>'}</td>
    <td><button class="action-btn" onclick="editCategory('${c.id}')">Edit</button></td></tr>`).join('');
}
function showAddCat(){
  $('#categoryForm').reset(); $('#categoryFormId').value = '';
  $('#categoryModal').classList.add('open'); $('#overlay').classList.add('open');
}
function editCategory(id){
  const c = (window.__adminCats||[]).find(x=>x.id===id); if (!c) return;
  showAddCat();
  $('#categoryFormId').value = c.id;
  $('#catName').value = c.name; $('#catIcon').value = c.icon||''; $('#catOrder').value = c.sort_order||0;
  $('#catActive').checked = c.is_active !== false;
}
async function saveCategory(e){
  e.preventDefault();
  const name = $('#catName').value.trim();
  const payload = { id: $('#categoryFormId').value || undefined, name, icon: $('#catIcon').value, sort_order: Number($('#catOrder').value||0), is_active: $('#catActive').checked };
  if (!payload.id) payload.slug = name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
  try { await api.adminSaveCategory(payload); toast('Category saved'); $('#categoryModal').classList.remove('open'); loadAdminCats(); }
  catch (err) { toast(err.message||'Could not save category','err'); }
}

async function loadAdminOrders(){
  const orders = await api.adminAllOrders();
  window.__adminOrders = orders;
  $('#adminOrdersTbl').innerHTML = orders.map(o=>`
    <tr>
      <td>${esc(o.order_number)}</td>
      <td>${esc(o.profiles?.full_name||'—')}<br><span style="font-size:11px;color:rgba(34,31,28,.5)">${esc(o.profiles?.phone||'')}</span></td>
      <td>${new Date(o.created_at).toLocaleDateString('en-IN')}</td>
      <td>${money(o.total_amount)}</td>
      <td>${esc(o.payment_method||'—')} / ${esc(o.payment_status)}</td>
      <td>
        <select onchange="adminUpdateOrderStatus('${o.id}', this.value)">
          ${['pending','confirmed','processing','packed','shipped','out_for_delivery','delivered','cancelled','returned','refunded'].map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </td>
    </tr>`).join('') || `<tr><td colspan="6">No orders yet</td></tr>`;
}
async function adminUpdateOrderStatus(id, status){
  try { await api.adminUpdateOrderStatus(id, status); toast('Order status updated'); }
  catch (err) { toast(err.message||'Could not update order','err'); }
}

async function loadAdminCoupons(){
  const coupons = await api.adminAllCoupons();
  window.__adminCoupons = coupons;
  $('#adminCouponsTbl').innerHTML = coupons.map(c=>`
    <tr><td><b>${esc(c.code)}</b></td><td>${esc(c.description||'')}</td>
    <td>${c.discount_type==='percent'?c.discount_value+'%':money(c.discount_value)}</td>
    <td>${c.used_count}${c.usage_limit?'/'+c.usage_limit:''}</td>
    <td>${c.is_active?'<span class="status-badge status-delivered">Active</span>':'<span class="status-badge status-cancelled">Off</span>'}</td>
    <td><button class="action-btn" onclick="editCoupon('${c.id}')">Edit</button></td></tr>`).join('') || `<tr><td colspan="6">No coupons yet</td></tr>`;
}
function showAddCoupon(){ $('#couponForm').reset(); $('#couponFormId').value=''; $('#couponModal').classList.add('open'); $('#overlay').classList.add('open'); }
function editCoupon(id){
  const c = (window.__adminCoupons||[]).find(x=>x.id===id); if (!c) return;
  showAddCoupon();
  $('#couponFormId').value = c.id; $('#couponCode').value = c.code; $('#couponDesc').value = c.description||'';
  $('#couponType').value = c.discount_type; $('#couponValue').value = c.discount_value; $('#couponMin').value = c.min_order_amount||0;
  $('#couponActive').checked = c.is_active !== false;
}
async function saveCoupon(e){
  e.preventDefault();
  const payload = {
    id: $('#couponFormId').value || undefined,
    code: $('#couponCode').value.trim().toUpperCase(),
    description: $('#couponDesc').value,
    discount_type: $('#couponType').value,
    discount_value: Number($('#couponValue').value),
    min_order_amount: Number($('#couponMin').value||0),
    is_active: $('#couponActive').checked
  };
  try { await api.adminSaveCoupon(payload); toast('Coupon saved'); $('#couponModal').classList.remove('open'); loadAdminCoupons(); }
  catch (err) { toast(err.message||'Could not save coupon','err'); }
}

async function loadAdminCustom(){
  const rows = await api.adminAllCustomOrders();
  $('#adminCustomTbl').innerHTML = rows.map(r=>`
    <tr><td>${esc(r.full_name)}<br><span style="font-size:11px;color:rgba(34,31,28,.5)">${esc(r.phone)}</span></td>
    <td>${esc(r.jewellery_type||'—')}</td><td>${esc(r.budget_range||'—')}</td>
    <td>
      <select onchange="adminUpdateCustom('${r.id}', this.value)">
        ${['new','reviewing','quoted','accepted','in_production','completed','cancelled'].map(s=>`<option value="${s}" ${r.status===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </td>
    <td>${new Date(r.created_at).toLocaleDateString('en-IN')}</td></tr>`).join('') || `<tr><td colspan="5">No custom requests yet</td></tr>`;
}
async function adminUpdateCustom(id, status){
  try { await api.adminUpdateCustomOrder(id, { status }); toast('Request updated'); }
  catch (err) { toast(err.message||'Could not update','err'); }
}

async function loadAdminReviews(){
  const rows = await api.adminAllReviews();
  $('#adminReviewsTbl').innerHTML = rows.map(r=>`
    <tr><td>${esc(r.products?.name||'—')}</td><td>${esc(r.profiles?.full_name||'—')}</td>
    <td style="color:var(--gold)">${stars(r.rating)}</td><td style="max-width:260px">${esc(r.body||'')}</td>
    <td>${r.is_approved?'<span class="status-badge status-delivered">Approved</span>':'<span class="status-badge status-pending">Pending</span>'}</td>
    <td>${!r.is_approved ? `<button class="action-btn" onclick="approveReview('${r.id}')">Approve</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="6">No reviews yet</td></tr>`;
}
async function approveReview(id){
  try { await api.adminApproveReview(id, true); toast('Review approved'); loadAdminReviews(); }
  catch (err) { toast(err.message||'Could not approve','err'); }
}

async function loadAdminCustomers(){
  const rows = await api.adminAllCustomers();
  $('#adminCustomersTbl').innerHTML = rows.map(c=>`
    <tr><td>${esc(c.full_name||'—')}</td><td>${esc(c.phone||'—')}</td><td>${c.total_orders||0}</td>
    <td>${money(c.total_spent||0)}</td><td>${c.loyalty_points||0} pts</td>
    <td><span class="status-badge ${c.role==='customer'?'status-pending':'status-delivered'}">${c.role}</span></td></tr>`).join('');
}

async function loadAdminSettings(){
  const settings = await api.getSettings();
  const fields = ['gold_rate_22k','gold_rate_24k','silver_rate','free_shipping_threshold','announcement_text','whatsapp_number','store_phone','store_email','store_address'];
  $('#adminSettingsForm').innerHTML = fields.map(k=>`
    <div class="field"><label>${k.replace(/_/g,' ')}</label><input id="set_${k}" value="${esc(settings[k]||'')}"></div>`).join('');
}
async function saveAllSettings(){
  const fields = ['gold_rate_22k','gold_rate_24k','silver_rate','free_shipping_threshold','announcement_text','whatsapp_number','store_phone','store_email','store_address'];
  try {
    await Promise.all(fields.map(k => api.updateSetting(k, $('#set_'+k).value)));
    toast('Settings saved');
    state.settings = await api.getSettings();
  } catch (err) { toast(err.message||'Could not save settings','err'); }
}

