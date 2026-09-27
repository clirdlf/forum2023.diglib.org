export default class {
  data() { return { permalink: '/sitemap.xml', eleventyExcludeFromCollections: true }; }
  render({ collections }) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + collections.all.filter(p => p.data.wpId).map(p => `<url><loc>https://forum2023.diglib.org${p.url}</loc></url>`).join('') + '</urlset>';
  }
}
