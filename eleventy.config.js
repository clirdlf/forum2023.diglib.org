import fs from 'node:fs';
import { buildStyles, stylesheets } from './scripts/lib/styles.mjs';

const isoDate = (value) => new Date(value).toISOString();
export default function (eleventyConfig) {
  buildStyles();
  eleventyConfig.on('eleventy.before', buildStyles);
  eleventyConfig.addWatchTarget('src/styles/');
  eleventyConfig.ignores.add('src/styles/**');
  eleventyConfig.addPassthroughCopy({ '.cache/styles': 'assets/styles' });
  eleventyConfig.addPassthroughCopy({
    'src/assets/site.css': 'assets/site.css',
    'src/assets/site.js': 'assets/site.js',
  });
  // Preserve every public media URL; obsolete plugin styles are replaced by the bundles.
  for (const [source, target] of [
    ['data/uploads/45', 'wp-content/uploads/sites/45'],
    ['src/assets/vendor', 'assets/vendor'],
  ]) {
    for (const file of fs.readdirSync(source, { recursive: true })) {
      if (fs.statSync(`${source}/${file}`).isFile() && !/\.(css|html)$/i.test(file))
        eleventyConfig.addPassthroughCopy({ [`${source}/${file}`]: `${target}/${file}` });
    }
  }
  eleventyConfig.addPassthroughCopy({ 'src/CNAME': 'CNAME', 'src/robots.txt': 'robots.txt' });
  eleventyConfig.addCollection('posts', (collection) =>
    collection
      .getAll()
      .filter((item) => item.data.kind === 'post')
      .sort(
        (a, b) =>
          b.date - a.date ||
          Number(b.data.wpId || 0) - Number(a.data.wpId || 0) ||
          a.url.localeCompare(b.url),
      ),
  );
  eleventyConfig.addFilter('stylesheets', stylesheets);
  eleventyConfig.addFilter('absoluteUrl', (value, origin) => new URL(value, origin).href);
  eleventyConfig.addFilter('isoDate', isoDate);
  eleventyConfig.addFilter('readableDate', (value) =>
    new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(
      new Date(value),
    ),
  );
  eleventyConfig.addFilter('adjacentPosts', (posts, url) => {
    const index = posts.findIndex((post) => post.url === url);
    return { previous: posts[index + 1], next: posts[index - 1] };
  });
  eleventyConfig.addFilter('structuredData', (data, site) =>
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': data.kind === 'post' ? 'BlogPosting' : 'WebPage',
      name: data.title,
      description: data.description || site.description,
      url: new URL(data.url, site.url).href,
      ...(data.kind === 'post'
        ? {
            headline: data.title,
            datePublished: isoDate(data.date),
            dateModified: isoDate(data.updated || data.date),
          }
        : {}),
      ...(data.image ? { image: new URL(data.image, site.url).href } : {}),
      isPartOf: { '@type': 'WebSite', name: site.name, url: site.url },
    }).replaceAll('<', '\\u003c'),
  );
  return {
    dir: { input: 'src', output: '_site' },
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
  };
}
