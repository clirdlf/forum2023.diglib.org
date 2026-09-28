const escapeXml = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
export default class {
  data() {
    return { permalink: '/sitemap.xml', eleventyExcludeFromCollections: true };
  }
  render({ collections, site }) {
    return (
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      collections.all
        .filter((page) => page.data.sitemap === true)
        .map((page) => `<url><loc>${escapeXml(new URL(page.url, site.url).href)}</loc></url>`)
        .join('') +
      '</urlset>'
    );
  }
}
