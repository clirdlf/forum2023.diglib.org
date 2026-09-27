/* Small, dependency-free replacements for WordPress/Elementor frontend behavior. */
const all = (selector, root = document) => [...root.querySelectorAll(selector)];
function activate(element, callback) {
  element.addEventListener('click', callback);
  if (!['BUTTON','A'].includes(element.tagName) || !element.hasAttribute('href')) {
    element.tabIndex = 0;
    element.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); callback(event); }
    });
  }
}
all('.elementor-menu-toggle').forEach((toggle,index) => {
  const menu = toggle.nextElementSibling;
  menu.id ||= `mobile-navigation-${index}`;
  toggle.setAttribute('aria-controls', menu.id);
  const setOpen = open => {
    toggle.classList.toggle('elementor-active',open);
    toggle.setAttribute('aria-expanded',String(open));
    menu.setAttribute('aria-hidden',String(!open));
    all('a',menu).forEach(a => a.tabIndex = open ? 0 : -1);
  };
  activate(toggle, () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('keydown',event=>{if(event.key==='Escape'){setOpen(false);toggle.focus();}});
});
all('.menu-item-has-children > a').forEach(link => {
  link.setAttribute('role','button'); link.setAttribute('aria-expanded','false');
  activate(link,event=>{
    event.preventDefault();
    const open=link.parentElement.classList.toggle('is-open');
    link.setAttribute('aria-expanded',String(open));
  });
  link.parentElement.addEventListener('keydown',event=>{
    if(event.key==='Escape'){link.parentElement.classList.remove('is-open');link.setAttribute('aria-expanded','false');link.focus();}
  });
});
all('.elementor-nav-menu a[href]').forEach(a=>{
  if(new URL(a.href).pathname===location.pathname){a.classList.add('elementor-item-active');a.setAttribute('aria-current','page');}
});
all('.elementor-widget-tabs,.elementor-widget-accordion,.elementor-widget-toggle').forEach(widget=>{
  const tabs=widget.classList.contains('elementor-widget-tabs');
  const accordion=widget.classList.contains('elementor-widget-accordion');
  const titles=all('.elementor-tab-title',widget),panels=all('.elementor-tab-content',widget);
  function setTab(number,open=true) {
    panels.forEach(p=>{if(tabs||accordion||p.dataset.tab===number){const active=p.dataset.tab===number&&open;p.hidden=!active;p.classList.toggle('elementor-active',active);}});
    titles.forEach(t=>{if(tabs||accordion||t.dataset.tab===number){const active=t.dataset.tab===number&&open;t.classList.toggle('elementor-active',active);t.setAttribute('aria-expanded',String(active));if(tabs)t.setAttribute('aria-selected',String(active));}});
  }
  panels.forEach(p=>p.hidden=true);
  if(tabs||accordion)setTab(titles[0]?.dataset.tab);
  titles.forEach(t=>{
    activate(t,()=>setTab(t.dataset.tab,tabs||t.getAttribute('aria-expanded')!=='true'));
    if(tabs)t.addEventListener('keydown',event=>{
      if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
      event.preventDefault();
      const peers=titles.filter(p=>p.classList.contains('elementor-tab-desktop-title')===t.classList.contains('elementor-tab-desktop-title'));
      const next=event.key==='Home'?0:event.key==='End'?peers.length-1:(peers.indexOf(t)+(event.key==='ArrowRight'?1:-1)+peers.length)%peers.length;
      peers[next].focus();setTab(peers[next].dataset.tab);
    });
  });
});
all('.elementor-toc__toggle-button').forEach(button=>activate(button,()=>{
  const panel=document.getElementById(button.getAttribute('aria-controls'));
  panel.hidden=!panel.hidden;
  all('.elementor-toc__toggle-button',button.parentElement).forEach(b=>b.setAttribute('aria-expanded',String(!panel.hidden)));
}));
all('[data-thumbnail]').forEach(image=>image.style.backgroundImage=`url("${image.dataset.thumbnail}")`);
all('.elementor-main-swiper').forEach(carousel=>{
  const track=carousel.querySelector('.swiper-wrapper');
  if(track.children.length<2)return;
  const controls=document.createElement('div');controls.className='static-carousel-controls';
  for(const [label,direction] of [['Previous testimonial',-1],['Next testimonial',1]]){
    const button=document.createElement('button');button.type='button';button.textContent=direction===1?'→':'←';button.setAttribute('aria-label',label);
    button.addEventListener('click',()=>{const count=track.children.length;const index=(Math.round(track.scrollLeft/track.clientWidth)+direction+count)%count;track.scrollTo({left:index*track.clientWidth,behavior:'smooth'});});controls.append(button);
  }
  carousel.append(controls);
});
all('a[data-elementor-open-lightbox="yes"]').forEach(link=>link.addEventListener('click',event=>{
  event.preventDefault();const dialog=document.createElement('dialog');dialog.className='static-lightbox';
  const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','Close image');
  const image=document.createElement('img');image.src=link.href;image.alt=link.dataset.elementorLightboxTitle||link.querySelector('[aria-label]')?.getAttribute('aria-label')||'';
  dialog.setAttribute('aria-label',image.alt||'Image viewer');dialog.append(close,image);document.body.append(dialog);
  close.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});dialog.addEventListener('close',()=>{dialog.remove();link.focus();});dialog.showModal();
}));
all('.elementor-share-btn').forEach(button=>{
  const network=[...button.classList].find(c=>c.startsWith('elementor-share-btn_'))?.split('_').pop();
  const url=encodeURIComponent(location.href),title=encodeURIComponent(document.title);
  const targets={facebook:`https://www.facebook.com/sharer/sharer.php?u=${url}`,twitter:`https://twitter.com/intent/tweet?url=${url}&text=${title}`,linkedin:`https://www.linkedin.com/sharing/share-offsite/?url=${url}`,email:`mailto:?subject=${title}&body=${url}`};
  button.setAttribute('role','button');button.setAttribute('aria-label',`Share via ${network}`);
  activate(button,()=>{if(targets[network])window.open(targets[network],'_blank','noopener,noreferrer');});
});
// The retained HubSpot embed queues initialization callbacks.
if(window.hbspt) (window.hsFormsOnReady||[]).splice(0).forEach(callback=>callback());
const main=document.querySelector('main,[data-elementor-type="wp-page"],[data-elementor-type="single-post"],[data-elementor-type="archive"]');
if(main){main.id||='main-content';const skip=document.createElement('a');skip.href='#'+main.id;skip.textContent='Skip to content';skip.className='skip-link';document.body.prepend(skip);}
// Preserve the original sticky navigation and back-to-top control.
const stickyNavigation=all('.elementor-location-header [data-settings]').find(e=>JSON.parse(e.dataset.settings).sticky==='top');
if(stickyNavigation){
  const placeholder=document.createElement('div');stickyNavigation.before(placeholder);
  const update=()=>{
    const stick=placeholder.getBoundingClientRect().top<0;
    placeholder.style.height=stick?stickyNavigation.getBoundingClientRect().height+'px':'0';
    stickyNavigation.classList.toggle('static-sticky-nav',stick);
  };
  addEventListener('scroll',update,{passive:true});addEventListener('resize',update);update();
}
all('.elementor-location-footer [data-settings]').forEach(e=>{if(JSON.parse(e.dataset.settings).sticky==='bottom')e.classList.add('static-back-to-top');});
