/** Applies the tenant's business name/logo to the browser tab (title + favicon).
 *  Pass setTitle=false on storefront pages: each page sets its own SEO <title> via
 *  react-helmet-async, and overwriting document.title here would clobber it. */
export function applyBranding(name: string | null | undefined, logoUrl: string | null | undefined, setTitle = true) {
  if (name && setTitle) {
    document.title = name;
  }

  if (logoUrl) {
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = logoUrl;
  }
}
