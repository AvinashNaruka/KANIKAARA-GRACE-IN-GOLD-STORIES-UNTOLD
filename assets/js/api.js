const api = {

  async signUp(email, password, fullName, phone){
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, phone } }
    });
    if (error) throw error;
    return data;
  },
  async signIn(email, password){
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async signOut(){ await sb.auth.signOut(); },
  async resetPassword(email){
    const { error } = await sb.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },
  async getSession(){
    const { data } = await sb.auth.getSession();
    return data.session;
  },
  onAuthChange(cb){ sb.auth.onAuthStateChange((_evt, session) => cb(session)); },

  async getProfile(userId){
    const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    return data;
  },
  async updateProfile(userId, patch){
    const { error } = await sb.from('profiles').update(patch).eq('id', userId);
    if (error) throw error;
  },


  async getCategories(){
    const { data, error } = await sb.from('categories').select('*').eq('is_active', true).order('sort_order');
    if (error) throw error;
    return data || [];
  },

  async getProducts({ categorySlug, featured, bestseller, newArrival, search, minPrice, maxPrice, sort, limit } = {}){
    let q = sb.from('products').select('*, categories(name, slug)').eq('is_active', true);
    if (featured) q = q.eq('is_featured', true);
    if (bestseller) q = q.eq('is_bestseller', true);
    if (newArrival) q = q.eq('is_new_arrival', true);
    if (search) q = q.ilike('name', `%${search}%`);
    if (minPrice != null) q = q.gte('price', minPrice);
    if (maxPrice != null) q = q.lte('price', maxPrice);
    if (categorySlug) {
      const { data: cat } = await sb.from('categories').select('id').eq('slug', categorySlug).maybeSingle();
      if (cat) q = q.eq('category_id', cat.id);
    }
    switch (sort) {
      case 'price_asc': q = q.order('price', { ascending: true }); break;
      case 'price_desc': q = q.order('price', { ascending: false }); break;
      case 'newest': q = q.order('created_at', { ascending: false }); break;
      case 'popular': q = q.order('sold_count', { ascending: false }); break;
      default: q = q.order('created_at', { ascending: false });
    }
    if (limit) q = q.limit(limit);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },
  async getProductBySlug(slug){
    const { data, error } = await sb.from('products').select('*, categories(name, slug)').eq('slug', slug).maybeSingle();
    if (error) throw error;
    if (data) sb.from('products').update({ views_count: (data.views_count || 0) + 1 }).eq('id', data.id).then(()=>{});
    return data;
  },
  async getRelatedProducts(categoryId, excludeId){
    const { data, error } = await sb.from('products').select('*').eq('category_id', categoryId).eq('is_active', true).neq('id', excludeId).limit(4);
    if (error) throw error;
    return data || [];
  },

  async getApprovedReviews(limit = 6){
    const { data, error } = await sb.from('reviews').select('*, profiles(full_name)').eq('is_approved', true).order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  },
  async getProductReviews(productId){
    const { data, error } = await sb.from('reviews').select('*, profiles(full_name)').eq('product_id', productId).eq('is_approved', true).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async submitReview(payload){
    const { error } = await sb.from('reviews').insert(payload);
    if (error) throw error;
  },

  async getWishlist(userId){
    const { data, error } = await sb.from('wishlists').select('*, products(*)').eq('user_id', userId);
    if (error) throw error;
    return data || [];
  },
  async toggleWishlist(userId, productId){
    const { data } = await sb.from('wishlists').select('id').eq('user_id', userId).eq('product_id', productId).maybeSingle();
    if (data) {
      await sb.from('wishlists').delete().eq('id', data.id);
      return false;
    } else {
      await sb.from('wishlists').insert({ user_id: userId, product_id: productId });
      return true;
    }
  },

  async getCart(userId){
    const { data, error } = await sb.from('cart_items').select('*, products(*)').eq('user_id', userId);
    if (error) throw error;
    return data || [];
  },
  async addToCart(userId, productId, quantity = 1){
    const { data: existing } = await sb.from('cart_items').select('*').eq('user_id', userId).eq('product_id', productId).maybeSingle();
    if (existing) {
      await sb.from('cart_items').update({ quantity: existing.quantity + quantity, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await sb.from('cart_items').insert({ user_id: userId, product_id: productId, quantity });
    }
  },
  async updateCartQty(cartItemId, quantity){
    if (quantity < 1) return api.removeCartItem(cartItemId);
    const { error } = await sb.from('cart_items').update({ quantity, updated_at: new Date().toISOString() }).eq('id', cartItemId);
    if (error) throw error;
  },
  async removeCartItem(cartItemId){
    const { error } = await sb.from('cart_items').delete().eq('id', cartItemId);
    if (error) throw error;
  },
  async clearCart(userId){
    await sb.from('cart_items').delete().eq('user_id', userId);
  },

  async getAddresses(userId){
    const { data, error } = await sb.from('addresses').select('*').eq('user_id', userId).order('is_default', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async saveAddress(payload){
    if (payload.id) {
      const { error } = await sb.from('addresses').update(payload).eq('id', payload.id);
      if (error) throw error;
    } else {
      const { error } = await sb.from('addresses').insert(payload);
      if (error) throw error;
    }
  },
  async deleteAddress(id){ await sb.from('addresses').delete().eq('id', id); },

  async validateCoupon(code, subtotal){
    const { data, error } = await sb.from('coupons').select('*').eq('code', code.toUpperCase()).eq('is_active', true).maybeSingle();
    if (error || !data) return { valid: false, message: 'Invalid or expired coupon code' };
    if (data.valid_until && new Date(data.valid_until) < new Date()) return { valid: false, message: 'This coupon has expired' };
    if (data.usage_limit && data.used_count >= data.usage_limit) return { valid: false, message: 'This coupon has reached its usage limit' };
    if (subtotal < data.min_order_amount) return { valid: false, message: `Add items worth ₹${data.min_order_amount} more to use this coupon` };
    let discount = data.discount_type === 'percent' ? (subtotal * data.discount_value / 100) : data.discount_value;
    if (data.max_discount) discount = Math.min(discount, data.max_discount);
    return { valid: true, coupon: data, discount: Math.round(discount) };
  },

  async createOrder(order, items){
    const { data: created, error } = await sb.from('orders').insert(order).select().single();
    if (error) throw error;
    const orderItems = items.map(it => ({
      order_id: created.id,
      product_id: it.product_id,
      product_name: it.products?.name || it.name,
      product_image: (it.products?.images || it.images || [])[0] || null,
      quantity: it.quantity,
      unit_price: it.products?.price ?? it.price,
      total_price: (it.products?.price ?? it.price) * it.quantity
    }));
    const { error: itemErr } = await sb.from('order_items').insert(orderItems);
    if (itemErr) throw itemErr;
    if (order.coupon_code) {

      try {
        const { data: c } = await sb.from('coupons').select('id, used_count').eq('code', order.coupon_code).maybeSingle();
        if (c) await sb.from('coupons').update({ used_count: (c.used_count || 0) + 1 }).eq('id', c.id);
      } catch (_) { /* ignore */ }
    }
    return created;
  },
  async getUserOrders(userId){
    const { data, error } = await sb.from('orders').select('*, order_items(*)').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async getOrderByNumber(orderNumber){
    const { data, error } = await sb.from('orders').select('*, order_items(*)').eq('order_number', orderNumber).maybeSingle();
    if (error) throw error;
    return data;
  },

  async submitCustomOrder(payload){
    const { error } = await sb.from('custom_order_requests').insert(payload);
    if (error) throw error;
  },
  async getUserCustomOrders(userId){
    const { data, error } = await sb.from('custom_order_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async bookConsultation(payload){ const { error } = await sb.from('consultations').insert(payload); if (error) throw error; },
  async submitEnquiry(payload){ const { error } = await sb.from('product_enquiries').insert(payload); if (error) throw error; },
  async subscribeEmail(email, source = 'footer'){
    const { error } = await sb.from('email_subscriptions').insert({ email, source });
    if (error && error.code !== '23505') throw error; // ignore duplicate
  },

  async getSettings(){
    const { data, error } = await sb.from('site_settings').select('*');
    if (error) throw error;
    const map = {};
    (data || []).forEach(s => map[s.key] = s.value);
    return map;
  },
  async updateSetting(key, value){
    const { error } = await sb.from('site_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key);
    if (error) throw error;
  },

  async getBanners(position){
    let q = sb.from('banners').select('*').eq('is_active', true).order('sort_order');
    if (position) q = q.eq('position', position);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async isAdmin(userId){
    const p = await api.getProfile(userId);
    return p && (p.role === 'admin' || p.role === 'superadmin');
  },
  async adminStats(){
    const [{ count: orderCount }, { count: productCount }, { count: userCount }, { data: revenueRows }] = await Promise.all([
      sb.from('orders').select('*', { count: 'exact', head: true }),
      sb.from('products').select('*', { count: 'exact', head: true }),
      sb.from('profiles').select('*', { count: 'exact', head: true }),
      sb.from('orders').select('total_amount').eq('payment_status', 'paid')
    ]);
    const revenue = (revenueRows || []).reduce((s, r) => s + Number(r.total_amount || 0), 0);
    return { orderCount: orderCount || 0, productCount: productCount || 0, userCount: userCount || 0, revenue };
  },
  async adminAllProducts(){
    const { data, error } = await sb.from('products').select('*, categories(name)').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async adminSaveProduct(payload){
    if (payload.id) {
      const { error } = await sb.from('products').update(payload).eq('id', payload.id);
      if (error) throw error;
    } else {
      const { error } = await sb.from('products').insert(payload);
      if (error) throw error;
    }
  },
  async adminDeleteProduct(id){ await sb.from('products').delete().eq('id', id); },

  async adminAllCategories(){
    const { data, error } = await sb.from('categories').select('*').order('sort_order');
    if (error) throw error;
    return data || [];
  },
  async adminSaveCategory(payload){
    if (payload.id) { const { error } = await sb.from('categories').update(payload).eq('id', payload.id); if (error) throw error; }
    else { const { error } = await sb.from('categories').insert(payload); if (error) throw error; }
  },

  async adminAllOrders(){
    const { data, error } = await sb.from('orders').select('*, order_items(*), profiles(full_name, phone)').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async adminUpdateOrderStatus(id, status, extra = {}){
    const { error } = await sb.from('orders').update({ status, updated_at: new Date().toISOString(), ...extra }).eq('id', id);
    if (error) throw error;
    await sb.from('order_status_history').insert({ order_id: id, status });
  },

  async adminAllCoupons(){
    const { data, error } = await sb.from('coupons').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async adminSaveCoupon(payload){
    if (payload.id) { const { error } = await sb.from('coupons').update(payload).eq('id', payload.id); if (error) throw error; }
    else { const { error } = await sb.from('coupons').insert(payload); if (error) throw error; }
  },

  async adminAllCustomOrders(){
    const { data, error } = await sb.from('custom_order_requests').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async adminUpdateCustomOrder(id, patch){
    const { error } = await sb.from('custom_order_requests').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },

  async adminAllReviews(){
    const { data, error } = await sb.from('reviews').select('*, products(name), profiles(full_name)').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async adminApproveReview(id, approve){
    const { error } = await sb.from('reviews').update({ is_approved: approve }).eq('id', id);
    if (error) throw error;
  },

  async adminAllCustomers(){
    const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
};
