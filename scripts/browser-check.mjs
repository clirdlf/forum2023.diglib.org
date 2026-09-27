import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
await fs.mkdir('.cache/screenshots',{recursive:true});
const failures=[];
for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1});
 const page=await context.newPage();
 page.on('pageerror',e=>{failures.push(String(e));console.log('PAGE ERROR',String(e));});
 page.on('response',r=>{if(r.url().startsWith('http://localhost:8080')&&r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});
 // External embeds remain active in production; block their network calls for deterministic layout verification.
 await context.route('**/*',route=>{
  const url=route.request().url();
  if(url.startsWith('http://localhost:8080')||url.startsWith('data:'))route.continue();else route.abort();
 });
 for(const route of ['/','/local-guide/','/conference-venue-and-hotel/','/sponsorship/','/news/']){
  await page.goto('http://localhost:8080'+route,{waitUntil:'networkidle'});
  await page.locator('img').evaluateAll(images=>images.forEach(i=>i.loading='eager'));
  await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
  await page.screenshot({path:`.cache/screenshots/local-${width}-${route.replaceAll('/','_')}.png`,fullPage:true});
  console.log(width,route,await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,images:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src)})));
  if(route==='/'&&width===390){await page.locator('.elementor-menu-toggle').click();await page.locator('.elementor-nav-menu__container[aria-hidden="false"] .menu-item-has-children > a').first().click();if(!await page.locator('.elementor-nav-menu__container[aria-hidden="false"] a[href="/about/"]').isVisible())failures.push('Mobile submenu not visible');await page.screenshot({path:'.cache/screenshots/mobile-menu.png'});}
  if(route==='/local-guide/'){
   const title=page.locator(width===390?'.elementor-tab-mobile-title':'.elementor-tab-desktop-title').filter({hasText:'Farther Afield'}).first();await title.click();if(!await page.locator('#'+await title.getAttribute('aria-controls')).isVisible())failures.push('Tab panel not visible');
  }
  if(route==='/sponsorship/') { const title=page.locator('.elementor-accordion .elementor-tab-title').first();await title.click();await title.click();if(!await page.locator('#'+await title.getAttribute('aria-controls')).isVisible())failures.push('Accordion not visible'); }
  if(route==='/conference-venue-and-hotel/') {await page.locator('a[data-elementor-open-lightbox="yes"]').first().click();if(!await page.locator('dialog').isVisible())failures.push('Lightbox not visible');await page.keyboard.press('Escape');}
 }
 await context.close();
}
const live=await browser.newPage({viewport:{width:1440,height:1000}});
await live.goto('https://forum2023.diglib.org/',{waitUntil:'domcontentloaded'});
await live.waitForTimeout(2500);
await live.screenshot({path:'.cache/screenshots/live-desktop.png',fullPage:true});
await live.close();const mobile=await browser.newPage({viewport:{width:390,height:1000}});await mobile.goto('https://forum2023.diglib.org/',{waitUntil:'domcontentloaded'});await mobile.waitForTimeout(1500);await mobile.screenshot({path:'.cache/screenshots/live-mobile.png',fullPage:true});
await browser.close();
console.log('Browser failures:',failures);if(failures.length)process.exitCode=1;
