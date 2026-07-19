import axios from 'axios';
import type {
  Material,
  RugCatalog,
  Customer,
  Quote,
  Order,
  InventoryTransaction,
  QuoteCalculateRequest,
  QuoteCalculateResponse,
  ChatMessage,
  DashboardStats,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach stored token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('loomcraftrugs_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('loomcraftrugs_token');
      localStorage.removeItem('loomcraftrugs_user');
      window.location.href = '/admin/login';
    }
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const { data } = await api.get<DashboardStats>('/dashboard/stats');
  return data;
};

// ── Catalog ───────────────────────────────────────────────────────────────────

export const getCatalog = async (): Promise<RugCatalog[]> => {
  const { data } = await api.get<RugCatalog[]>('/catalog');
  return data;
};

export const getRug = async (id: number): Promise<RugCatalog> => {
  const { data } = await api.get<RugCatalog>(`/catalog/${id}`);
  return data;
};

export const createRug = async (rug: Partial<RugCatalog>): Promise<RugCatalog> => {
  const { data } = await api.post<RugCatalog>('/catalog', rug);
  return data;
};

export const updateRug = async (id: number, rug: Partial<RugCatalog>): Promise<RugCatalog> => {
  const { data } = await api.put<RugCatalog>(`/catalog/${id}`, rug);
  return data;
};

export const deleteRug = async (id: number): Promise<void> => {
  await api.delete(`/catalog/${id}`);
};

// ── Quotes ────────────────────────────────────────────────────────────────────

export interface QuoteFilters {
  status?: string;
  rush_order?: boolean;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export const getQuotes = async (filters?: QuoteFilters): Promise<Quote[]> => {
  const params: Record<string, string | boolean> = {};
  if (filters?.status)                     params.status      = filters.status;
  if (filters?.rush_order !== undefined)   params.rush_order  = filters.rush_order;
  if (filters?.search)                     params.search      = filters.search;
  if (filters?.date_from)                  params.date_from   = filters.date_from;
  if (filters?.date_to)                    params.date_to     = filters.date_to;
  const { data } = await api.get<Quote[]>('/quotes', { params });
  return data;
};

export const getQuote = async (id: number): Promise<Quote> => {
  const { data } = await api.get<Quote>(`/quotes/${id}`);
  return data;
};

export const createQuote = async (quote: Partial<Quote>): Promise<Quote> => {
  const { data } = await api.post<Quote>('/quotes', quote);
  return data;
};

export const updateQuote = async (id: number, quote: Partial<Quote>): Promise<Quote> => {
  const { data } = await api.put<Quote>(`/quotes/${id}`, quote);
  return data;
};

export const deleteQuote = async (id: number): Promise<void> => {
  await api.delete(`/quotes/${id}`);
};

export const calculateQuote = async (request: QuoteCalculateRequest): Promise<QuoteCalculateResponse> => {
  const { data } = await api.post<QuoteCalculateResponse>('/quotes/calculate', request);
  return data;
};

// ── Orders ────────────────────────────────────────────────────────────────────

export const getOrders = async (status?: string, search?: string): Promise<Order[]> => {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  if (search) params.search = search;
  const { data } = await api.get<Order[]>('/orders', { params });
  return data;
};

export const sendQuoteToCustomer = async (quoteId: number, vendorNotes?: string): Promise<Quote> => {
  const { data } = await api.patch<Quote>(`/quotes/${quoteId}/send-to-customer`, { vendor_notes: vendorNotes ?? null });
  return data;
};

export const adjustQuotePrice = async (
  quoteId: number,
  finalPrice: number,
  vendorNotes?: string,
  manualDiscountPct?: number,
): Promise<Quote> => {
  const { data } = await api.patch<Quote>(`/quotes/${quoteId}/adjust`, {
    final_price: finalPrice,
    vendor_notes: vendorNotes ?? null,
    manual_discount_pct: manualDiscountPct ?? null,
  });
  return data;
};

export const getOrder = async (id: number): Promise<Order> => {
  const { data } = await api.get<Order>(`/orders/${id}`);
  return data;
};

export const createOrder = async (order: Partial<Order>): Promise<Order> => {
  const { data } = await api.post<Order>('/orders', order);
  return data;
};

export const updateOrder = async (id: number, order: Partial<Order>): Promise<Order> => {
  const { data } = await api.put<Order>(`/orders/${id}`, order);
  return data;
};

export const getOrderBreakdown = async (id: number): Promise<import('../types').QuoteCalculateResponse & { stored_final_price: number | null; price_currency: string; shipping_address: string | null; margin_locked: boolean; gst_locked: boolean }> => {
  const { data } = await api.get(`/orders/${id}/breakdown`);
  return data;
};

export const updateOrderStatus = async (id: number, status: string): Promise<Order> => {
  const { data } = await api.patch<Order>(`/orders/${id}/status`, null, { params: { status } });
  return data;
};

// ── Inventory ─────────────────────────────────────────────────────────────────

export const getInventory = async (): Promise<Material[]> => {
  const { data } = await api.get<Material[]>('/inventory');
  return data;
};

export const getLowStock = async (): Promise<Material[]> => {
  const { data } = await api.get<Material[]>('/inventory/low-stock');
  return data;
};

export const getMaterial = async (id: number): Promise<Material> => {
  const { data } = await api.get<Material>(`/inventory/${id}`);
  return data;
};

export const restockMaterial = async (id: number, qty: number, notes?: string): Promise<Material> => {
  const params: Record<string, string | number> = { qty_meters: qty };
  if (notes) params.notes = notes;
  const { data } = await api.post<Material>(`/inventory/${id}/restock`, null, { params });
  return data;
};

export const getMaterialTransactions = async (id: number): Promise<InventoryTransaction[]> => {
  const { data } = await api.get<InventoryTransaction[]>(`/inventory/${id}/transactions`);
  return data;
};

export const createMaterial = async (payload: {
  name: string; type: string; color: string;
  stock_meters: number; cost_per_sqm: number; cost_currency?: string; is_available: boolean;
}): Promise<Material> => {
  const { data } = await api.post<Material>('/inventory', payload);
  return data;
};

export const deleteMaterial = async (id: number): Promise<void> => {
  await api.delete(`/inventory/${id}`);
};

// ── Customers ─────────────────────────────────────────────────────────────────

export const getCustomers = async (): Promise<Customer[]> => {
  const { data } = await api.get<Customer[]>('/customers');
  return data;
};

export const getCustomer = async (id: number): Promise<Customer> => {
  const { data } = await api.get<Customer>(`/customers/${id}`);
  return data;
};

export const getCustomerQuotes = async (id: number): Promise<Quote[]> => {
  const { data } = await api.get<Quote[]>(`/customers/${id}/quotes`);
  return data;
};

export const createCustomer = async (customer: Partial<Customer>): Promise<Customer> => {
  const { data } = await api.post<Customer>('/customers', customer);
  return data;
};

export const updateCustomer = async (id: number, customer: Partial<Customer>): Promise<Customer> => {
  const { data } = await api.put<Customer>(`/customers/${id}`, customer);
  return data;
};

// ── Chat ──────────────────────────────────────────────────────────────────────

export const sendChat = async (
  messages: ChatMessage[],
  sessionId?: string
): Promise<{ response: string; session_id: string }> => {
  const { data } = await api.post('/chat', {
    messages,
    session_id: sessionId,
  });
  return data;
};

// ── Customer Portal ───────────────────────────────────────────────────────────

export interface InspirationMatch {
  rug_id: number;
  match_score: number;
  match_reason: string;
  color_adaptation: string;
  budget_note?: string;
  rug: {
    id: number;
    name: string;
    description: string;
    weave_type: string;
    pile_height: string;
    material: string;
    sizes: string[];
    lead_time_days: number;
    image_url: string | null;
  };
  quote: {
    rug_id: number;
    size_sqm: number;
    base_price_per_sqm: number;
    material_cost_per_sqm: number;
    subtotal: number;
    bulk_discount: number;
    rush_fee: number;
    size_surcharge: number;
    final_price: number;
    moq_met: boolean;
    stock_available: boolean;
    lead_time_days: number;
    warnings: string[];
  };
}

export interface InspirationResult {
  analysis: {
    dominant_colors: string[];
    color_palette_mood: string;
    pattern_style: string;
    texture_feel: string;
    overall_aesthetic: string;
  };
  floor_region: { x: number; y: number; width: number; height: number };
  matches: InspirationMatch[];
  requested_size: { width: number; height: number; sqm: number };
  qty: number;
}

export const inspireMatch = async (
  image: File,
  sizeW: number,
  sizeH: number,
  qty: number,
  budgetMax?: number,
  rushOrder?: boolean,
): Promise<InspirationResult> => {
  const form = new FormData();
  form.append('image', image);
  form.append('size_w', String(sizeW));
  form.append('size_h', String(sizeH));
  form.append('qty', String(qty));
  if (budgetMax) form.append('budget_max', String(budgetMax));
  form.append('rush_order', String(rushOrder ?? false));

  const { data } = await axios.post<InspirationResult>('/api/customer/inspire', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const getPublicCatalog = async () => {
  const { data } = await axios.get('/api/customer/catalog');
  return data;
};

export interface RoomPreset {
  id: string;
  name: string;
  style: string;
  thumbnail_url: string;
}

export const getRooms = async (): Promise<RoomPreset[]> => {
  const { data } = await axios.get<RoomPreset[]>('/api/customer/rooms');
  return data;
};

export interface RoomInspireRequest {
  room_id: string;
  size_w: number;
  size_h: number;
  qty: number;
  budget_max?: number;
  rush_order?: boolean;
}

export const inspireFromRoom = async (req: RoomInspireRequest): Promise<InspirationResult & { room_id: string; room_name: string; room_image_url: string }> => {
  const { data } = await axios.post('/api/customer/inspire-room', req);
  return data;
};

export interface QuoteRequestPayload {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  rug_id: number;
  size_w: number;
  size_h: number;
  qty: number;
  rush_order: boolean;
  notes?: string;
}

export interface QuoteRequestResponse {
  quote_id: number;
  customer_name: string;
  rug_name: string;
  final_price: number;
  size: string;
  lead_time_days: number;
  message: string;
}

export const requestQuote = async (payload: QuoteRequestPayload, customerToken?: string | null): Promise<QuoteRequestResponse> => {
  const headers = customerToken ? { Authorization: `Bearer ${customerToken}` } : {};
  const { data } = await axios.post<QuoteRequestResponse>('/api/customer/request-quote', payload, { headers });
  return data;
};

export interface CheckoutPayload {
  rug_id: number;
  size_w: number;
  size_h: number;
  qty: number;
  rush_order: boolean;
  notes?: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  shipping_address: string;
}

export interface CheckoutResponse {
  order_id: number;
  quote_id: number;
  rug_name: string;
  size: string;
  qty: number;
  pre_gst_price: number | null;
  gst_pct: number;
  gst_amount: number | null;
  final_price: number;
  price_currency: string;
  status: string;
  estimated_delivery: string;
  lead_time_days: number;
  customer_name: string;
  shipping_address: string;
}

export const customerCheckout = async (payload: CheckoutPayload, customerToken?: string | null): Promise<CheckoutResponse> => {
  const headers = customerToken ? { Authorization: `Bearer ${customerToken}` } : {};
  const { data } = await axios.post<CheckoutResponse>('/api/customer/checkout', payload, { headers });
  return data;
};

export interface PaymentOrderResponse {
  razorpay_order_id: string;
  amount_paise: number;
  currency: string;
  key_id: string;
  final_price: number;
  pre_gst_price: number | null;
  gst_pct: number | null;
  gst_amount: number | null;
  price_currency: string;
  rug_name: string;
  estimated_days: number;
}

export const createPaymentOrder = async (
  payload: CheckoutPayload,
  customerToken?: string | null,
): Promise<PaymentOrderResponse> => {
  const headers = customerToken ? { Authorization: `Bearer ${customerToken}` } : {};
  const { data } = await axios.post<PaymentOrderResponse>(
    '/api/customer/checkout/create-payment-order', payload, { headers },
  );
  return data;
};

export const verifyPayment = async (
  payload: CheckoutPayload & { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string },
  customerToken?: string | null,
): Promise<CheckoutResponse> => {
  const headers = customerToken ? { Authorization: `Bearer ${customerToken}` } : {};
  const { data } = await axios.post<CheckoutResponse>(
    '/api/customer/checkout/verify-payment', payload, { headers },
  );
  return data;
};

export interface CustomerOrder {
  order_id: number;
  quote_id: number | null;
  status: string;
  rug_name: string;
  size: string;
  size_w: number | null;
  size_h: number | null;
  qty: number;
  base_price: number | null;
  final_price: number | null;
  pre_gst_price: number | null;
  gst_pct: number | null;
  gst_amount: number | null;
  price_currency: string;
  rush_order: boolean;
  manual_discount_pct: number | null;
  shipping_address: string | null;
  estimated_delivery: string | null;
  created_at: string | null;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  page_size: number;
  pages: number;
  items: T[];
  action_needed?: number;
}

export interface OrdersFilter {
  status?: string;
  sort_by?: string;
  size_min?: number;
  size_max?: number;
  date_from?: string;
  date_to?: string;
}

export const getMyOrders = async (
  email: string,
  page = 1,
  page_size = 10,
  filters: OrdersFilter = {},
): Promise<PaginatedResponse<CustomerOrder>> => {
  const params: Record<string, string | number> = { email, page, page_size };
  if (filters.status && filters.status !== 'all') params.status = filters.status;
  if (filters.sort_by) params.sort_by = filters.sort_by;
  if (filters.size_min != null) params.size_min = filters.size_min;
  if (filters.size_max != null) params.size_max = filters.size_max;
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  const { data } = await axios.get<PaginatedResponse<CustomerOrder>>(
    '/api/customer/orders',
    { params },
  );
  return data;
};

export const downloadInvoice = (quoteId: number, type: 'tax' | 'export' | 'proforma' = 'tax'): void => {
  const token = localStorage.getItem('loomcraftrugs_token');
  const url = `/api/quotes/${quoteId}/invoice?invoice_type=${type}`;
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => r.blob())
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `invoice-Q${String(quoteId).padStart(4, '0')}-${type}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    });
};

export const sendQuoteEmail = async (
  quoteId: number,
  invoiceType: 'tax' | 'export' | 'proforma',
  recipientEmail?: string
): Promise<{ message: string; recipient: string }> => {
  const params: Record<string, string> = { invoice_type: invoiceType };
  if (recipientEmail) params.recipient_email = recipientEmail;
  const { data } = await api.post(`/quotes/${quoteId}/send-email`, null, { params });
  return data;
};

export default api;
