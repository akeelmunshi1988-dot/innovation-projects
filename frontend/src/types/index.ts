export interface Material {
  id: number;
  name: string;
  type: 'wool' | 'silk' | 'cotton' | 'synthetic';
  color: string;
  stock_meters: number;
  cost_per_sqm: number;
  cost_currency: string | null;
  is_available: boolean;
}

export interface ShowcaseVideo {
  id: number;
  title: string;
  description: string | null;
  video_url: string;
  poster_url: string | null;
  sort_order: number;
  is_active: boolean;
  is_intro: boolean;
}

export interface WorkshopPhoto {
  id: number;
  caption: string;
  description: string | null;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

export interface AnnouncementMessage {
  id: number;
  text: string;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Testimonial {
  id: number;
  author_name: string;
  author_title: string | null;
  country: string | null;
  quote: string;
  photo_url: string | null;
  rating: number | null;
  sort_order: number;
  is_active: boolean;
}

export interface ProjectGalleryImage {
  id: number;
  image_url: string;
  sort_order: number;
}

export interface ProjectGalleryItem {
  id: number;
  image_url: string;
  caption: string | null;
  link_url: string | null;
  description: string | null;
  owner_name: string | null;
  owner_message: string | null;
  rating: number | null;
  sort_order: number;
  is_active: boolean;
  images: ProjectGalleryImage[];
}

export interface PromoCode {
  id: number;
  code: string;
  discount_type: 'percentage' | 'flat' | 'free_shipping';
  discount_value: number | null;
  min_order_value: number | null;
  max_uses: number | null;
  one_per_customer: boolean;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  used_count: number;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: number;
  email: string;
  source: string | null;
  subscribed_at: string | null;
}

export interface RugImage {
  id: number;
  image_url: string;
  sort_order: number;
}

/** A vendor-entered catalog "standard size" — see frontend/src/utils/size.ts for
 * the display/parsing helpers built around this shape. `cm` is optional and never
 * auto-computed from `ft`: it's exactly what the vendor typed on the catalog form,
 * or absent. */
export interface CatalogSize {
  master_size_id?: number | null;
  ft: string;
  cm?: string | null;
  is_default?: boolean;
  price: number;
  lead_time_days?: number | null;
}

export interface CatalogSizeMaster {
  id: number;
  ft: string;
  cm?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface RugColorOption {
  name: string;
  hex: string;
  image_url?: string | null;
}

export interface RugCatalog {
  id: number;
  slug: string | null;
  name: string;
  description: string | null;
  about_content_html: string | null;
  additional_information_html: string | null;
  sizes: CatalogSize[];
  base_price: number;
  base_price_currency: string | null;
  material_id: number;
  pile_height: string | null;
  weave_type: string | null;
  lead_time_days: number;
  image_url: string | null;
  profit_margin_pct: number | null;
  hsn_code: string | null;
  room_types: string[] | null;
  mood_tags: string[] | null;
  color_options: RugColorOption[] | null;
  is_available: boolean;
  inventory_quantity: number | null;
  material?: Material;
  images: RugImage[];
}

export interface PricingRule {
  id: number;
  name: string;
  rule_type: 'size_multiplier' | 'rush_fee' | 'bulk_discount' | 'custom_work';
  min_qty: number | null;
  max_qty: number | null;
  multiplier: number | null;
  flat_fee: number | null;
  description: string | null;
}

export interface MOQRule {
  id: number;
  rug_type: string;
  minimum_sqm: number | null;
  minimum_pieces: number | null;
  notes: string | null;
}

export interface ProductionTimeline {
  id: number;
  order_type: string;
  base_days: number;
  complexity_multiplier_per_sqm: number;
  notes: string | null;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  gstin: string | null;
  state_code: string | null;
  address: string | null;
  country: string | null;
  is_export_buyer: boolean;
  created_at: string;
}

export interface Quote {
  id: number;
  customer_id: number | null;
  rug_catalog_id: number | null;
  custom_size_w: number | null;
  custom_size_h: number | null;
  rug_shape: string | null;
  material_id: number | null;
  qty: number;
  base_price: number | null;
  final_price: number | null;
  price_currency: string | null;
  rush_order: boolean;
  margin_pct: number | null;
  gst_pct: number | null;
  expected_delivery_days: number | null;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  notes: string | null;
  vendor_notes: string | null;
  customer_response_notes: string | null;
  created_at: string;
  customer?: Customer;
  rug_catalog?: RugCatalog;
  material?: Material;
  is_custom_request: boolean;
  room_type: string | null;
  material_preference: string | null;
  budget_range: string | null;
  expected_delivery: string | null;
  reference_image_urls: string[] | null;
  vendor_sample_image_urls: string[] | null;
  revised_from_quote_id: number | null;
  request_group_id: string | null;
}

export interface OrderItem {
  id: number;
  quote?: Quote;
}

export interface Order {
  id: number;
  quote_id: number;
  status: 'pending' | 'in_production' | 'quality_check' | 'shipped' | 'delivered' | 'cancelled';
  estimated_delivery: string | null;
  actual_delivery: string | null;
  created_at: string;
  promo_code?: string | null;
  discount_amount?: number | null;
  shipping_cost?: number | null;
  razorpay_payment_id?: string | null;
  refund_id?: string | null;
  refund_status?: string | null;
  refund_amount?: number | null;
  refunded_at?: string | null;
  quote?: Quote;
  items?: OrderItem[];
}

export interface InventoryTransaction {
  id: number;
  material_id: number;
  qty_change: number;
  transaction_type: 'restock' | 'used';
  notes: string | null;
  created_at: string;
}

export interface QuoteCalculateRequest {
  rug_id: number;
  size_w: number;
  size_h: number;
  material_id: number;
  qty: number;
  rush_order: boolean;
  manual_discount_pct?: number;
  shipping_cost?: number;
}

export interface QuoteBreakdownItem {
  label?: string;
  rule?: string;
  type?: string;
  amount: number;
  description?: string;
}

export interface QuoteCalculateResponse {
  size_sqm: number;
  total_sqm: number;
  catalog_price_per_piece: number;
  base_price_per_sqm: number;
  material_cost_per_sqm: number;
  profit_margin_pct: number;
  subtotal: number;
  bulk_discount: number;
  manual_discount: number;
  rush_surcharge: number;
  size_surcharge: number;
  shipping_cost: number;
  pre_gst_price: number;
  gst_pct: number;
  gst_amount: number;
  gst_inclusive: boolean;
  final_price: number;
  price_per_piece: number;
  price_currency: string | null;
  moq_met: boolean;
  moq_message: string;
  material_available: boolean;
  material_message: string;
  estimated_days: number;
  breakdown: QuoteBreakdownItem[];
}

export interface EmailTemplate {
  id: number;
  key: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  is_active: boolean;
  updated_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatMessage {
  id: number;
  session_id: string | null;
  role: 'user' | 'assistant';
  content: string;
  created_at: string | null;
}

export interface AiChatSession {
  session_id: string;
  started_at: string;
  last_message_at: string;
  message_count: number;
  preview: string;
}

export interface ApiClient {
  id: number;
  name: string;
  key_prefix: string;
  is_active: boolean;
  created_at: string | null;
  last_used_at: string | null;
}

export interface ApiClientCreated extends ApiClient {
  api_key: string;
}

export interface PendingAiAction {
  id: number;
  action_type: 'create' | 'update' | 'delete';
  entity_type: 'rug_catalog' | 'material' | 'promo_code';
  entity_id: number | null;
  payload: Record<string, unknown>;
  summary: string;
  status: 'pending' | 'confirmed' | 'rejected';
  created_at: string | null;
}

export interface DashboardStats {
  total_orders: number;
  total_revenue: number;
  active_quotes: number;
  low_stock_materials: number;
  orders_in_production: number;
  orders_pending: number;
  recent_orders: RecentOrder[];
  recent_quotes: RecentQuote[];
  monthly_revenue: MonthlyRevenue[];
}

export interface RecentOrder {
  id: number;
  status: string;
  created_at: string | null;
  estimated_delivery: string | null;
  customer_name: string | null;
  rug_name: string | null;
  final_price: number | null;
  price_currency: string | null;
}

export interface RecentQuote {
  id: number;
  status: string;
  created_at: string | null;
  customer_name: string | null;
  rug_name: string | null;
  final_price: number | null;
  price_currency: string | null;
  qty: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  orders: number;
}
