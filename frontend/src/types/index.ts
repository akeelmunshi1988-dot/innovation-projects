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

export interface RugCatalog {
  id: number;
  name: string;
  description: string | null;
  sizes: string[];
  base_price: number;
  base_price_currency: string | null;
  material_id: number;
  pile_height: string | null;
  weave_type: string | null;
  lead_time_days: number;
  image_url: string | null;
  profit_margin_pct: number | null;
  hsn_code: string | null;
  material?: Material;
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
  is_export_buyer: boolean;
  created_at: string;
}

export interface Quote {
  id: number;
  customer_id: number | null;
  rug_catalog_id: number | null;
  custom_size_w: number | null;
  custom_size_h: number | null;
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
}

export interface Order {
  id: number;
  quote_id: number;
  status: 'pending' | 'in_production' | 'quality_check' | 'shipped' | 'delivered';
  estimated_delivery: string | null;
  actual_delivery: string | null;
  created_at: string;
  quote?: Quote;
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
  base_price_per_sqm: number;
  material_cost_per_sqm: number;
  profit_margin_pct: number;
  subtotal: number;
  bulk_discount: number;
  manual_discount: number;
  rush_surcharge: number;
  size_surcharge: number;
  pre_gst_price: number;
  gst_pct: number;
  gst_amount: number;
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
