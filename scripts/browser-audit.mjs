import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const report=JSON.parse(await fs.readFile('data/migration-report.json','utf8'));
const browser=await chromium.launch({channel:'chrome'}),failures=[];
for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:1000}});
 await context.route('**/*',route=>route.request().url().startsWith('http://localhost:8080')?route.continue():route.abort());
 const page=await context.newPage();
 page.on('pageerror',e=>failures.push(`${page.url()}: ${e}`));
 page.on('response',r=>{if(r.url().startsWith('http://localhost:8080')&&r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});
 for(const {route}of report.pages){
  await page.goto('http://localhost:8080'+route,{waitUntil:'load'});
  await page.locator('img').evaluateAll(images=>images.forEach(i=>i.loading='eager'));
  await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
  const result=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,broken:[...document.images].filter(i=>!i.naturalWidth).map(i=>i.src)}));
  if(result.overflow||result.broken.length)failures.push({width,route,...result});
 }
 console.log(`Checked ${report.pages.length} routes at ${width}px.`);await context.close();
}
await browser.close();console.log(JSON.stringify(failures,null,2));if(failures.length)process.exitCode=1;
