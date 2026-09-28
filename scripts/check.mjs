import fs from 'node:fs/promises';
import path from 'node:path';
import { load } from 'cheerio';
const root = path.resolve('_site');
const site = JSON.parse(await fs.readFile('src/_data/site.json', 'utf8'));
const origin = new URL(site.url);
const errors = new Set(),
  external = new Set(),
  documents = new Map();
const providers = [
  'sched.com',
  'hsforms.net',
  'hsforms.com',
  'youtube.com',
  'vimeo.com',
  'google.com',
];
const allowedProvider = (host) =>
  providers.some((domain) => host === domain || host.endsWith('.' + domain));
const files = await fs.readdir(root, { recursive: true });
for (const file of files.filter((file) => file.endsWith('.html')))
  documents.set(path.join(root, file), load(await fs.readFile(path.join(root, file), 'utf8')));
async function reference(value, from, { asset = false, embed = false, fragment = false } = {}) {
  if (!value || /^(mailto:|tel:|data:)/.test(value)) return;
  if (/^javascript:/i.test(value)) {
    errors.add(`${from}: javascript URL`);
    return;
  }
  let url;
  try {
    url = new URL(value, new URL(from, origin));
  } catch {
    errors.add(`${from}: invalid URL ${value}`);
    return;
  }
  if (!['https:', 'http:'].includes(url.protocol)) {
    errors.add(`${from}: unsupported protocol ${value}`);
    return;
  }
  if (url.origin !== origin.origin) {
    if (embed && allowedProvider(url.hostname)) {
      external.add(url.origin);
      return;
    }
    if (asset || embed) errors.add(`${from}: unexpected remote asset ${value}`);
    return;
  }
  if (
    /\/wp-(json|admin)(\/|$)|xmlrpc\.php|admin-ajax\.php/.test(url.pathname) ||
    url.searchParams.has('s')
  ) {
    errors.add(`${from}: WordPress endpoint ${value}`);
    return;
  }
  let target;
  try {
    target = path.join(root, decodeURIComponent(url.pathname));
  } catch {
    errors.add(`${from}: invalid encoding ${value}`);
    return;
  }
  if (!target.startsWith(root + path.sep) && target !== root) {
    errors.add(`${from}: invalid path ${value}`);
    return;
  }
  try {
    if ((await fs.stat(target)).isDirectory()) target = path.join(target, 'index.html');
    await fs.access(target);
  } catch {
    errors.add(`${from}: missing ${value}`);
    return;
  }
  if (fragment && url.hash && url.hash !== '#') {
    let id;
    try {
      id = decodeURIComponent(url.hash.slice(1));
    } catch {
      errors.add(`${from}: invalid fragment ${value}`);
      return;
    }
    const doc = documents.get(target);
    if (
      doc &&
      !doc('[id],[name]')
        .toArray()
        .some((el) => doc(el).attr('id') === id || doc(el).attr('name') === id)
    )
      errors.add(`${from}: missing fragment ${value}`);
  }
}
async function cssReferences(css, from) {
  for (const m of css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g))
    if (!m[2].startsWith('#')) await reference(m[2], from, { asset: true });
  for (const m of css.matchAll(/@import\s+['"]([^'"]+)['"]/g))
    await reference(m[1], from, { asset: true });
}
for (const [file, $] of documents) {
  const route = '/' + path.relative(root, file).replace(/index\.html$/, '');
  for (const el of $(
    'a[href],link[href],img[src],script[src],iframe[src],source[src],video[src],audio[src],[data-thumbnail],[poster]',
  ).toArray()) {
    const e = $(el),
      tag = el.tagName,
      rel = e.attr('rel') || '';
    if (tag === 'link' && !/stylesheet|icon|canonical/.test(rel)) continue;
    const value = e.attr('href') || e.attr('src') || e.attr('data-thumbnail');
    await reference(value, route, {
      asset: tag !== 'a' && rel !== 'canonical',
      embed: ['script', 'iframe'].includes(tag),
      fragment: tag === 'a',
    });
    if (e.attr('poster')) await reference(e.attr('poster'), route, { asset: true });
  }
  for (const el of $('[srcset]').toArray())
    for (const entry of $(el).attr('srcset').split(','))
      await reference(entry.trim().replace(/[ \t]+[\d.]+[wx]$/, ''), route, { asset: true });
  for (const el of $('style,[style]').toArray())
    await cssReferences(el.tagName === 'style' ? $(el).text() : $(el).attr('style'), route);
  if ($('body').attr('id') === 'top') {
    if ($('main').length !== 1) errors.add(`${route}: expected one main landmark`);
    if ($('link[rel="canonical"]').attr('href') !== new URL(route, origin).href)
      errors.add(`${route}: incorrect canonical`);
    if (!$('meta[name="description"]').attr('content')) errors.add(`${route}: missing description`);
  }
  for (const el of $('script[type="application/ld+json"]').toArray()) {
    try {
      const data = JSON.parse($(el).text());
      if (JSON.stringify(data).includes('SearchAction'))
        errors.add(`${route}: unsupported search schema`);
    } catch {
      errors.add(`${route}: invalid structured data`);
    }
  }
}
for (const file of files.filter((file) => file.endsWith('.css')))
  await cssReferences(await fs.readFile(path.join(root, file), 'utf8'), '/' + file);
const sitemap = load(await fs.readFile(path.join(root, 'sitemap.xml'), 'utf8'), { xml: true });
for (const el of sitemap('loc').toArray()) await reference(sitemap(el).text(), '/sitemap.xml');
console.log(
  `Checked ${documents.size} HTML pages, CSS assets, local fragments, metadata, and sitemap; ${external.size} approved embed origins.`,
);
if (errors.size) {
  console.error([...errors].join('\n'));
  process.exitCode = 1;
} else console.log('All checks passed.');
