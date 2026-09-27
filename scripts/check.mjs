import fs from 'node:fs/promises';
import path from 'node:path';
import {load} from 'cheerio';
const root='_site',errors=[],external=new Set();
async function exists(url,from){
  if(!url||/^(mailto:|tel:|data:|javascript:|#)/.test(url))return;
  let parsed;try{parsed=new URL(url,'https://forum2023.diglib.org'+from);}catch{return;}
  if(parsed.hostname!=='forum2023.diglib.org')return;
  if(/\/wp-(json|admin)\/|xmlrpc\.php/.test(parsed.pathname)){errors.push(`${from}: WordPress endpoint ${url}`);return;}
  let target=path.join(root,decodeURIComponent(parsed.pathname));
  try{if((await fs.stat(target)).isDirectory())target=path.join(target,'index.html');await fs.access(target);}catch{errors.push(`${from}: missing ${url}`);}
}
const files=await fs.readdir(root,{recursive:true});
for(const file of files.filter(f=>f.endsWith('.html'))){
 const html=await fs.readFile(path.join(root,file),'utf8'),$=load(html),route='/'+file.replace(/index\.html$/,'');
 for(const el of $('a[href],link[href],img[src],script[src],iframe[src],source[src],video[src],[data-thumbnail]').toArray()){
  const e=$(el),url=e.attr('href')||e.attr('src')||e.attr('data-thumbnail');
  if(el.tagName==='link'&&!/stylesheet|icon/.test(e.attr('rel')||''))continue;
  await exists(url,route);
  if(['script','iframe'].includes(el.tagName)&&/^(https?:)?\/\//.test(url)){
   if(!/(sched\.com|hsforms\.net|hsforms\.com|youtube\.com|vimeo\.com|google\.com)/.test(new URL(url,'https://forum2023.diglib.org').hostname))errors.push(`${route}: unexpected remote runtime ${url}`);
   external.add(url);
  }
  if(['img','source'].includes(el.tagName)&&/^(https?:)?\/\//.test(url))errors.push(`${route}: remote media ${url}`);
 }
 for(const el of $('[srcset]').toArray())for(const part of $(el).attr('srcset').split(','))await exists(part.trim().split(/[ \t]+/)[0],route);
 if(/admin-ajax\.php|wp-json\//.test(html))errors.push(`${route}: WordPress API reference`);
}
for(const file of files.filter(f=>f.endsWith('.css'))){
 const css=await fs.readFile(path.join(root,file),'utf8');
 // Only verify CSS actually used by imported pages/vendor styles; uploads also contain unused historical styles.
 if(file.startsWith('wp-content/')&&!JSON.stringify(await fs.readFile('data/migration-report.json','utf8')).includes(file))continue;
 for(const match of css.matchAll(/url\(\s*['"]?([^'"\)]+)['"]?\s*\)/g))await exists(match[1],'/'+file);
}
console.log(`Checked ${files.filter(f=>f.endsWith('.html')).length} HTML pages. Active external embeds: ${external.size}.`);
if(errors.length){console.error([...new Set(errors)].join('\n'));process.exitCode=1;}else console.log('All local links and assets resolve; no WordPress API dependencies.');
