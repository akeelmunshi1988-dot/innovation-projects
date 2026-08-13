// Shared DOMPurify allowlist for admin-authored rich text (e.g. RugCatalog.about_content_html).
// Kept in one place so the admin editor's "Paste HTML" sanitization and the customer-facing
// render-time sanitization can never drift apart — the backend stores this field as trusted,
// authenticated-staff-only content with no server-side sanitization of its own, so the
// render-time pass here is the actual XSS boundary and should be exactly as tight as what
// the editor lets an admin produce in the first place, not DOMPurify's broader default profile.
export const PROSE_ALLOWED_TAGS = ['p', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'blockquote', 'a', 'br'];
export const PROSE_ALLOWED_ATTR = ['href', 'target', 'rel'];
