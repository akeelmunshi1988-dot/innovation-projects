/** Applies the tenant's business name/logo to the browser tab (title + favicon). */
export function applyBranding(name: string | null | undefined, logoUrl: string | null | undefined) {
  if (name) {
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
