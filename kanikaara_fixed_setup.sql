-- ============================================================
-- KANIKAARA JEWELLERY - FIXED SUPABASE SETUP
-- Step 1: Run PART 1 first, then PART 2, then PART 3
-- Supabase → SQL Editor → New Query → Paste → Run
-- ============================================================

-- ============================================================
-- PART 1: EXTENSIONS & CORE TABLES
-- ============================================================

-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'superadmin')),
  avatar_url TEXT,
  date_of_birth DATE,
  anniversary_date DATE,
  total_orders INT DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  loyalty_points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'customer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TABLE: addresses
-- ============================================================
CREATE TABLE IF NOT EXISTS addresses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Home',
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (name, slug, icon, sort_order) VALUES
  ('Gold Jewellery', 'gold-jewellery', '💍', 1),
  ('Diamond Jewellery', 'diamond-jewellery', '💎', 2),
  ('Artificial / Imitation', 'artificial-jewellery', '✨', 3),
  ('Precious Stones', 'precious-stones', '💠', 4),
  ('Bridal Collection', 'bridal', '👰', 5),
  ('Daily Wear', 'daily-wear', '🌸', 6),
  ('Festive Collection', 'festive', '🪔', 7),
  ('Gifting Special', 'gifting', '🎁', 8),
  ('Kids Jewellery', 'kids', '👶', 9),
  ('Custom Orders', 'custom', '⚙️', 10),
  ('Mens Jewellery', 'mens', '⌚', 11)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- TABLE: products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  price DECIMAL(12,2) NOT NULL,
  mrp DECIMAL(12,2),
  cost_price DECIMAL(12,2),
  sku TEXT UNIQUE,
  weight_grams DECIMAL(8,3),
  material TEXT,
  purity TEXT,
  hallmark TEXT,
  stone_details TEXT,
  certification TEXT,
  is_customizable BOOLEAN DEFAULT FALSE,
  engraving_available BOOLEAN DEFAULT FALSE,
  gift_packaging BOOLEAN DEFAULT TRUE,
  stock_quantity INT DEFAULT 0,
  low_stock_threshold INT DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_bestseller BOOLEAN DEFAULT FALSE,
  is_new_arrival BOOLEAN DEFAULT FALSE,
  badge TEXT,
  tags TEXT[],
  images TEXT[],
  care_instructions TEXT,
  return_policy TEXT DEFAULT '15 days easy return',
  delivery_days INT DEFAULT 5,
  making_charges DECIMAL(8,2),
  making_charges_type TEXT DEFAULT 'fixed' CHECK (making_charges_type IN ('fixed', 'percent')),
  views_count INT DEFAULT 0,
  sold_count INT DEFAULT 0,
  rating_avg DECIMAL(3,2) DEFAULT 0,
  rating_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: product_variants
-- ============================================================
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  variant_value TEXT NOT NULL,
  price_modifier DECIMAL(10,2) DEFAULT 0,
  stock_quantity INT DEFAULT 0,
  sku_suffix TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: wishlists
-- ============================================================
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- ============================================================
-- TABLE: cart_items
-- ============================================================
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id),
  quantity INT DEFAULT 1,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: coupons
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2),
  usage_limit INT,
  used_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount) VALUES
  ('WELCOME10', '10% off on first order', 'percent', 10, 0),
  ('BRIDAL15', '15% off on bridal collection', 'percent', 15, 5000),
  ('FLAT500', 'Flat Rs.500 off on orders above Rs.2999', 'fixed', 500, 2999)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- TABLE: orders
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','processing','packed','shipped','out_for_delivery','delivered','cancelled','returned','refunded')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded','cod_pending')),
  payment_method TEXT,
  payment_id TEXT,
  subtotal DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  coupon_code TEXT,
  shipping_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  shipping_address JSONB NOT NULL,
  tracking_number TEXT,
  tracking_url TEXT,
  carrier TEXT,
  notes TEXT,
  admin_notes TEXT,
  estimated_delivery DATE,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  gift_message TEXT,
  gift_packaging BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to generate order numbers (fixes the DEFAULT expression error)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'KNK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_order_number ON orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
  EXECUTE FUNCTION generate_order_number();

-- ============================================================
-- TABLE: order_items
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  product_name TEXT NOT NULL,
  product_image TEXT,
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  is_customized BOOLEAN DEFAULT FALSE,
  customization_notes TEXT,
  engraving_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: order_status_history
-- ============================================================
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id),
  rating INT CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  title TEXT,
  body TEXT,
  images TEXT[],
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  helpful_count INT DEFAULT 0,
  admin_reply TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: custom_order_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS custom_order_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  jewellery_type TEXT,
  occasion TEXT,
  budget_range TEXT,
  description TEXT,
  reference_images TEXT[],
  status TEXT DEFAULT 'new' CHECK (status IN ('new','reviewing','quoted','accepted','in_production','completed','cancelled')),
  quote_amount DECIMAL(12,2),
  admin_notes TEXT,
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: email_subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS email_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  user_id UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  source TEXT DEFAULT 'popup',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: consultations
-- ============================================================
CREATE TABLE IF NOT EXISTS consultations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  consultation_type TEXT CHECK (consultation_type IN ('video_call','store_visit','whatsapp','phone')),
  preferred_date DATE,
  preferred_time TEXT,
  purpose TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: product_enquiries
-- ============================================================
CREATE TABLE IF NOT EXISTS product_enquiries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  message TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: site_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  label TEXT,
  type TEXT DEFAULT 'text',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO site_settings (key, value, label) VALUES
  ('gold_rate_22k', '67450', '22K Gold Rate per 10g'),
  ('gold_rate_24k', '73200', '24K Gold Rate per 10g'),
  ('silver_rate', '86500', 'Silver Rate per kg'),
  ('free_shipping_threshold', '2999', 'Free Shipping Above (Rs.)'),
  ('announcement_text', 'FREE SHIPPING ON ORDERS ABOVE Rs.2999 | BIS HALLMARKED | 15-DAY RETURNS | PAN INDIA DELIVERY', 'Announcement Bar Text'),
  ('whatsapp_number', '917400000053', 'WhatsApp Number'),
  ('store_phone', '+91 74XX XXXX 53', 'Store Phone'),
  ('store_email', 'hello@kanikaara.com', 'Store Email'),
  ('store_address', 'Rajasthan, India', 'Store Address')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- TABLE: banners
-- ============================================================
CREATE TABLE IF NOT EXISTS banners (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT,
  subtitle TEXT,
  cta_text TEXT,
  cta_link TEXT,
  image_url TEXT,
  position TEXT DEFAULT 'hero',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PART 2: ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin'))
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
DROP POLICY IF EXISTS "Admins manage products" ON products;
CREATE POLICY "Anyone can view active products" ON products FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins manage products" ON products FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin'))
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
DROP POLICY IF EXISTS "Admins manage categories" ON categories;
CREATE POLICY "Anyone can view categories" ON categories FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins manage categories" ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin'))
);

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own wishlist" ON wishlists;
CREATE POLICY "Users manage own wishlist" ON wishlists FOR ALL USING (auth.uid() = user_id);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own cart" ON cart_items;
CREATE POLICY "Users manage own cart" ON cart_items FOR ALL USING (auth.uid() = user_id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own orders" ON orders;
DROP POLICY IF EXISTS "Users create orders" ON orders;
DROP POLICY IF EXISTS "Admins manage orders" ON orders;
CREATE POLICY "Users view own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage orders" ON orders FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin'))
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own order items" ON order_items;
DROP POLICY IF EXISTS "Admins manage order items" ON order_items;
CREATE POLICY "Users view own order items" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid())
);
CREATE POLICY "Admins manage order items" ON order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin'))
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone views approved reviews" ON reviews;
DROP POLICY IF EXISTS "Users manage own reviews" ON reviews;
DROP POLICY IF EXISTS "Admins manage reviews" ON reviews;
CREATE POLICY "Anyone views approved reviews" ON reviews FOR SELECT USING (is_approved = TRUE);
CREATE POLICY "Users manage own reviews" ON reviews FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins manage reviews" ON reviews FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin'))
);

ALTER TABLE custom_order_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own requests" ON custom_order_requests;
DROP POLICY IF EXISTS "Anyone can submit" ON custom_order_requests;
DROP POLICY IF EXISTS "Admins manage custom orders" ON custom_order_requests;
CREATE POLICY "Users view own requests" ON custom_order_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can submit" ON custom_order_requests FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Admins manage custom orders" ON custom_order_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin'))
);

ALTER TABLE email_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can subscribe" ON email_subscriptions;
DROP POLICY IF EXISTS "Admins view subscriptions" ON email_subscriptions;
CREATE POLICY "Anyone can subscribe" ON email_subscriptions FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Admins view subscriptions" ON email_subscriptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin'))
);

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can book" ON consultations;
DROP POLICY IF EXISTS "Users view own consultations" ON consultations;
DROP POLICY IF EXISTS "Admins manage consultations" ON consultations;
CREATE POLICY "Anyone can book" ON consultations FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Users view own consultations" ON consultations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage consultations" ON consultations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin'))
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads settings" ON site_settings;
DROP POLICY IF EXISTS "Admins update settings" ON site_settings;
CREATE POLICY "Anyone reads settings" ON site_settings FOR SELECT USING (TRUE);
CREATE POLICY "Admins update settings" ON site_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin'))
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can check coupons" ON coupons;
DROP POLICY IF EXISTS "Admins manage coupons" ON coupons;
CREATE POLICY "Anyone can check coupons" ON coupons FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins manage coupons" ON coupons FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin'))
);

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own addresses" ON addresses;
CREATE POLICY "Users manage own addresses" ON addresses FOR ALL USING (auth.uid() = user_id);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone views active banners" ON banners;
DROP POLICY IF EXISTS "Admins manage banners" ON banners;
CREATE POLICY "Anyone views active banners" ON banners FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins manage banners" ON banners FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin'))
);

-- ============================================================
-- PART 3: MAKE ADMIN
-- Run this AFTER you sign up on the website with:
-- Email: avinashnaruka89@gmail.com
-- ============================================================

-- STEP 1: First sign up on the website using the above email
-- STEP 2: Then run this query:

UPDATE profiles 
SET role = 'superadmin'
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'avinashnaruka89@gmail.com'
);

-- Verify it worked (should show role = superadmin):
SELECT p.id, p.full_name, p.role, u.email
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'avinashnaruka89@gmail.com';

-- Done! All tables created successfully.
-- KANIKAARA database setup complete.
