(() => {
  if (window.OriginCartBound) return;
  window.OriginCartBound = true;
  const root = () => window.Shopify?.routes?.root || '/';
  const drawer = () => document.querySelector('[data-cart-drawer]');
  let previousFocus;
  let updating = Promise.resolve();
  const showError = message => { const el = drawer()?.querySelector('[data-cart-error]'); if(el) {el.textContent=message;el.hidden=false;} };
  const setOpen = open => {
    const el = drawer(); if (!el) return;
    el.hidden = !open;
    document.body.classList.toggle('drawer-open',open);
    document.querySelectorAll('[data-cart-toggle]').forEach(button => button.setAttribute('aria-expanded',String(open)));
    if(open) el.querySelector('.cart-drawer__panel')?.focus(); else previousFocus?.focus?.();
  };
  const refresh = async open => {
    const current = drawer(); if(!current) return;
    const id = current.dataset.sectionId;
    const url = new URL(location.href); url.searchParams.set('sections',id);
    const response = await fetch(url, {headers:{Accept:'application/json'}});
    if(!response.ok) throw new Error('Your bag could not be refreshed. Please open the cart page.');
    const sections = await response.json();
    const html = sections[id]; if(!html) throw new Error('Your bag could not be refreshed. Please open the cart page.');
    const template = document.createElement('template'); template.innerHTML = html;
    const next = template.content.querySelector('[data-cart-drawer]'); if(!next) throw new Error('Your bag is temporarily unavailable.');
    const wasOpen = !current.hidden;
    const count = next.querySelector('[data-cart-count]')?.textContent?.trim() || '0';
    current.replaceWith(next);
    document.querySelectorAll('[data-cart-count]').forEach(el=>{el.textContent=count;el.hidden=count==='0';});
    if(open || wasOpen) setOpen(true);
  };
  const queueRefresh = open => { updating = updating.then(() => refresh(open)).catch(e => showError(e.message)); return updating; };
  document.addEventListener('origin:cart-changed', event => { previousFocus=document.activeElement; queueRefresh(event.detail?.open); });
  document.addEventListener('click', event => {
    const target=event.target;
    if(target.closest('[data-cart-toggle]')) { event.preventDefault(); previousFocus=document.activeElement;setOpen(true);return; }
    if(target.closest('[data-cart-close]')) {setOpen(false);return;}
    const item=target.closest('[data-cart-item]'); if(!item) return;
    const input=item.querySelector('[data-cart-quantity]'); if(!input) return;
    let quantity=Number(input.value);
    if(target.closest('[data-quantity-increase]')) quantity++;
    else if(target.closest('[data-quantity-decrease]')) quantity=Math.max(0,quantity-1);
    else if(target.closest('[data-cart-remove]')) quantity=0;
    else return;
    change(item,quantity);
  });
  const change=(item,quantity)=>{
    const key=item.dataset.key;if(!key || !Number.isInteger(quantity) || quantity<0) return;
    item.setAttribute('aria-busy','true');
    item.querySelectorAll('button,input').forEach(el=>el.disabled=true);
    updating=updating.then(async()=>{
      const response=await fetch(root()+'cart/change.js',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({id:key,quantity})});
      const data=await response.json();if(!response.ok) throw new Error(data.description || 'This quantity is unavailable.');
      await refresh(false);
    }).catch(e=>showError(e.message)).finally(()=>{item.removeAttribute('aria-busy');item.querySelectorAll('button,input').forEach(el=>el.disabled=false);});
  };
  document.addEventListener('change',event=>{const input=event.target.closest('[data-cart-quantity]');if(input)change(input.closest('[data-cart-item]'),Number(input.value));});
  document.addEventListener('keydown',event=>{
    const el=drawer();if(!el || el.hidden)return;
    if(event.key==='Escape'){setOpen(false);return;}
    if(event.key!=='Tab')return;
    const items=[...el.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),textarea,summary,select')].filter(node=>node.getClientRects().length);
    const first=items[0],last=items.at(-1);
    if(event.shiftKey && (document.activeElement===first || document.activeElement===el.querySelector('.cart-drawer__panel'))){event.preventDefault();last?.focus();}
    else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
  });
})();
