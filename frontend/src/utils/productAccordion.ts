import type { ProductAccordionSection } from '../types';

/** Accept both current settings and responses from backends predating dynamic sections. */
export function productAccordionSections(settings: Record<string, unknown>): ProductAccordionSection[] {
  const sections = settings.product_accordion_sections;
  if (Array.isArray(sections)) {
    // An explicitly empty list means the administrator removed all sections.
    return sections.filter((section): section is ProductAccordionSection =>
      section != null && typeof section === 'object' &&
      typeof section.id === 'string' && typeof section.title === 'string' && typeof section.html === 'string'
    );
  }
  return [
    { id: 'sample', title: 'Rug Sample Information', field: 'rug_sample_information_html' },
    { id: 'care', title: 'Care Advice', field: 'rug_care_advice_html' },
    { id: 'shipping', title: 'Shipping & Returns', field: 'rug_shipping_returns_html' },
  ].flatMap(({ id, title, field }) => {
    const html = settings[field];
    return typeof html === 'string' && html.trim() ? [{ id, title, html }] : [];
  });
}
