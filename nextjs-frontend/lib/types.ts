export interface CatalogSize {
  width_ft?: number; height_ft?: number; width?: number; height?: number;
  label?: string; total_cost?: number; price?: number; is_default?: boolean;
  lead_time_days?: number;
}

export interface RugImage { id: number; image_url: string; sort_order: number }

export interface CatalogRug {
  id: number; slug: string; name: string; description: string | null;
  about_content_html?: string | null; material: string; material_type?: string;
  material_color?: string; weave_type: string | null; pile_height: string | null;
  image_url: string | null; images: RugImage[]; display_price: number | null;
  base_price_currency?: string | null; default_size: CatalogSize | null;
  lead_time_days: number; sizes: CatalogSize[]; available: boolean;
  inventory_quantity?: number | null; room_types?: string[]; mood_tags?: string[];
}

export interface CatalogResponse { items: CatalogRug[]; total: number; has_more: boolean }
export interface PublicSettings {
  business_name?: string; hero_image_url?: string | null; hero_eyebrow?: string | null;
  hero_heading?: string | null; hero_cta_label?: string | null;
  contact_phones?: string[]; contact_emails?: string[]; contact_address?: string | null;
}
