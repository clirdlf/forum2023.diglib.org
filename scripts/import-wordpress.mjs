/** One-time import. Intentionally not part of the build: src is the editable source. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { load } from 'cheerio';
import { XMLParser } from 'fast-xml-parser';
if (!process.argv.includes('--force')) {
  try { await fs.access('src/pages/index.html'); console.error('Imported content already exists. Re-importing overwrites edits; pass --force only when intended.'); process.exit(1); } catch {}
}
const origin = 'https://forum2023.diglib.org';
const uploadPrefix = '/wp-content/uploads/sites/45/';
const cache = '.cache/import';
await fs.mkdir(cache, { recursive: true });
const xml = new XMLParser({ ignoreAttributes: false, parseTagValue: false }).parse(await fs.readFile('data/dlfforum2023.WordPress.2026-09-27.xml', 'utf8'));
const all = xml.rss.channel.item;
const items = all.filter(i => ['page','post'].includes(i['wp:post_type']) && i['wp:status'] === 'publish' && !/^(DEMO |OLD-Sponsorship)/i.test(i.title));
const excluded = all.filter(i => ['page','post'].includes(i['wp:post_type']) && !items.includes(i)).map(i => ({title:i.title, url:i.link, status:i['wp:status']}));
const assets = new Map();
const failures = [];
const warnings = [];
async function fetchCached(url) {
  const file = path.join(cache, crypto.createHash('sha256').update(url).digest('hex'));
  try { return await fs.readFile(file); } catch {}
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(file, bytes);
  return bytes;
}
function internal(value) {
  const local = value.replaceAll(origin, '').replaceAll('http://forum2023.diglib.org', '');
  return ({'/affiliated-events/learnatdlf':'/affiliated-events/learndlf/','/resources/hotel-accommodations/':'/conference-venue-and-hotel/'})[local] || local || '/';
}
async function asset(value, base = origin) {
  if (!value || /^(data:|#|mailto:|tel:|javascript:)/i.test(value)) return value;
  const url = new URL(value, base);
  const key = url.origin + url.pathname;
  if (assets.has(key)) return assets.get(key);
  const local = url.hostname === 'forum2023.diglib.org' && url.pathname.startsWith(uploadPrefix)
    ? url.pathname : `/assets/vendor/${url.hostname}${url.pathname}`;
  const dest = local.startsWith(uploadPrefix) ? 'data/uploads/45/' + decodeURIComponent(local.slice(uploadPrefix.length)) : 'src' + decodeURIComponent(local);
  assets.set(key, local);
  try {
    let bytes;
    // Capture current generated styles; media comes from the supplied upload archive.
    if (!url.pathname.endsWith('.css')) { try { bytes = await fs.readFile(dest); } catch {} }
    bytes ??= await fetchCached(url.href);
    if (url.pathname.endsWith('.css')) {
      let css = bytes.toString();
      const matches = [...css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)];
      for (const m of matches) {
        const rewritten = await asset(m[2], url.href);
        css = css.replace(m[0], `url("${rewritten}")`);
      }
      bytes = Buffer.from(css);
    }
    await fs.mkdir(path.dirname(dest), {recursive:true});
    await fs.writeFile(dest, bytes);
  } catch (error) {
    if (/post-(326|1459|1381)\.css$/.test(url.pathname)) { warnings.push({url:url.href,reason:'Empty page stylesheet is also missing on the live site; omitted.'}); assets.set(key, null); return null; }
    failures.push({url:url.href, error:String(error)});
  }
  return local + url.hash;
}
async function localize($, base) {
  for (const el of $('link[rel="stylesheet"], link[rel*="icon"], img, source, video, audio, a[href], iframe, script[src]').toArray()) {
    const e = $(el), tag = el.tagName;
    if (tag === 'a') {
      let href = e.attr('href');
      if (/\.(pdf|png|jpe?g|gif|webp|svg|docx?|pptx?|xlsx?|zip)(?:[?#]|$)/i.test(href || '') && /(?:diglib\.org|clir\.org|wp-content)/.test(href)) e.attr('href', await asset(href, base));
      else if (href) e.attr('href',internal(href));
    } else if (tag !== 'iframe' && tag !== 'script') {
      const attr = tag === 'link' ? 'href' : 'src';
      if (e.attr(attr)) { const local = await asset(e.attr(attr),base); if(local)e.attr(attr,local);else e.remove(); }
      if (e.attr('poster')) e.attr('poster', await asset(e.attr('poster'),base));
      if (e.attr('srcset')) {
        const parts=[];
        for (const candidate of e.attr('srcset').split(',')) {
          const match = candidate.trim().match(/^(.*?)[ \t]+(\d+(?:\.\d+)?[wx])$/);
          const [,url,size] = match || [null,candidate.trim(),null];
          parts.push([await asset(url,base),size].filter(Boolean).join(' '));
        }
        e.attr('srcset',parts.join(', '));
      }
    }
  }
  for(const el of $('[data-thumbnail]').toArray()) { const e=$(el); e.attr('data-thumbnail',await asset(e.attr('data-thumbnail'),base)); }
  $('[data-e-action-hash]').removeAttr('data-e-action-hash');
  for (const el of $('[style],style').toArray()) {
    const e=$(el); let css=el.tagName==='style'?e.html():e.attr('style');
    for(const m of [...css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)]) css=css.replace(m[0],`url("${await asset(m[2],base)}")`);
    if(el.tagName==='style')e.html(css);else e.attr('style',css);
  }
  for(const el of $('[data-settings]').toArray()) {
    const e=$(el); let value=e.attr('data-settings');
    for(const m of [...value.matchAll(/https?:[^"\s]+/g)]) {
      if(/\.(png|jpe?g|svg|webp|gif)(?:\?|$)/i.test(m[0])) value=value.replaceAll(m[0],await asset(m[0],base));
    }
    e.attr('data-settings',value);
  }
}
const report=[];
const queue=items.map(i=>({item:i,url:i.link}));
const seen=new Set();
let shared=false;
await fs.mkdir('src/_includes/heads',{recursive:true});
for(let index=0;index<queue.length;index++) {
  const {item,url}=queue[index];
  const route=new URL(url).pathname;
  if(seen.has(route))continue;seen.add(route);
  console.log(`Import ${index+1}/${queue.length}: ${route}`);
  const $=load((await fetchCached(url)).toString());
  // Discover archive pagination, which is generated by WordPress and absent from WXR.
  $('a[href]').each((_,el)=>{const href=$(el).attr('href');if(/^https:\/\/forum2023\.diglib\.org\/news\/page\/\d+\//.test(href))queue.push({item,url:href});});
  $('link[rel="alternate"],link[rel="https://api.w.org/"],link[rel="EditURI"],link[rel="shortlink"],link[rel="profile"],meta[name="generator"]').remove();
  $('script').each((_,el)=>{
    const e=$(el),src=e.attr('src')||'',text=e.html()||'';
    if(e.attr('type')==='application/ld+json')return;
    // Retain only active third-party content embeds; never analytics or WP runtimes.
    if(/(?:sched\.com|hsforms\.net|hsforms\.com|vimeo\.com|youtube\.com)/.test(src) || /hbspt\.forms\.create/.test(text))return;
    e.remove();
  });
  // Cloudflare email obfuscation would otherwise require its server script.
  $('[data-cfemail]').each((_,el)=>{
    const e=$(el),hex=e.attr('data-cfemail'),key=parseInt(hex.slice(0,2),16);
    const email=hex.slice(2).match(/../g).map(c=>String.fromCharCode(parseInt(c,16)^key)).join('');
    if(el.tagName==='a')e.attr('href','mailto:'+email);
    e.text(email).removeAttr('data-cfemail').removeClass('__cf_email__');
  });
  $('a[href*="/cdn-cgi/l/email-protection"]').each((_,el)=>{$(el).attr('href','mailto:'+$(el).text().trim());});
  // Exclude the accessibility toolbar from the static site.
  $('#pojo-a11y-toolbar').remove();
  await localize($,url);
  $('.elementor-widget-video').each((_,el)=>{
    const e=$(el),settings=JSON.parse(e.attr('data-settings')||'{}');
    const video=settings.youtube_url||settings.vimeo_url;
    if(!video)return;
    const parsed=new URL(video);let embed=video;
    if(settings.video_type==='youtube') {
      const id=parsed.searchParams.get('v')||parsed.pathname.split('/').filter(Boolean).pop();
      embed='https://www.youtube.com/embed/'+id;
    }
    const frame=$('<iframe>').attr({src:embed,title:'Video: '+item.title,loading:'lazy',allow:'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',allowfullscreen:''});
    e.find('.elementor-video').replaceWith(frame);
  });
  $('iframe:not([title]),iframe[title=""]').attr('title','Embedded content: '+item.title);
  $('.elementor-widget-table-of-contents').each((_,el)=>{
    const list=$('<ul class="elementor-toc__list-wrapper">');
    $('h2').not('.elementor-toc__header-title').each((i,h)=>{
      if($(h).closest('.elementor-location-header,.elementor-location-footer').length)return;
      const id=$(h).attr('id')||'section-'+i;$(h).attr('id',id);
      list.append($('<li class="elementor-toc__list-item">').append($('<a class="elementor-toc__list-item-text">').attr('href','#'+id).text($(h).text())));
    });
    $(el).find('.elementor-toc__body').empty().append(list);
  });
  $('link[rel="canonical"]').attr('href',origin+route);
  $('head').append('<link rel="stylesheet" href="/assets/site.css">');
  $('body').append('<script src="/assets/site.js" defer></script>');
  const header=$('.elementor-location-header').first();
  const footer=$('.elementor-location-footer').first();
  if(!shared && route==='/') {
    header.find('.current-menu-item,.current_page_item').removeClass('current-menu-item current_page_item');
    await fs.writeFile('src/_includes/header.html',header.toString());
    await fs.writeFile('src/_includes/footer.html',footer.toString());
    shared=true;
  }
  header.remove(); footer.remove();
  const slug=route==='/'?'index':route.replace(/^\/|\/$/g,'').replaceAll('/','--');
  const meta={layout:'base.njk',title:item.title,permalink:route,wpId:item['wp:post_id'],date:item['wp:post_date'].replace(' ','T'),kind:item['wp:post_type'],headFile:`heads/${slug}.html`,bodyClass:$('body').attr('class')||''};
  await fs.writeFile(`src/pages/${slug}.json`,JSON.stringify(meta,null,2)+'\n');
  await fs.writeFile(`src/pages/${slug}.html`,$('body').html().trim()+'\n');
  await fs.writeFile(`src/_includes/heads/${slug}.html`,$('head').html());
  report.push({title:item.title,route,source:`src/pages/${slug}.html`,wpId:item['wp:post_id']});
}
await fs.writeFile('src/_includes/base.njk','<!doctype html>\n<html lang="en-US">\n<head>{% include headFile %}</head>\n<body class="{{ bodyClass }}">\n{% include "header.html" %}\n{{ content | safe }}\n{% include "footer.html" %}\n</body>\n</html>\n');
await fs.writeFile('data/migration-report.json',JSON.stringify({pages:report,excluded,warnings,assets:[...assets].filter(([,local])=>local).map(([source,local])=>({source,local})),failures},null,2)+'\n');
console.log(`Imported ${report.length} pages, localized ${assets.size} assets, ${failures.length} asset failures.`);
if(failures.length) { console.error(failures); process.exitCode=1; }
