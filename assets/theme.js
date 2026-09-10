(() => {
  function init(root = document) {
    root.querySelectorAll('[data-header]').forEach(header => {
      if (header.dataset.bound) return;
      header.dataset.bound = 'true';
      const drawer = header.querySelector('[data-mobile-drawer]');
      const toggle = header.querySelector('[data-mobile-toggle]');
      const close = () => { if (!drawer) return; drawer.hidden = true; toggle?.setAttribute('aria-expanded','false'); document.body.classList.remove('menu-open'); toggle?.focus(); };
      toggle?.addEventListener('click', () => { drawer.hidden = false; toggle.setAttribute('aria-expanded','true'); document.body.classList.add('menu-open'); drawer.querySelector('button')?.focus(); });
      header.querySelector('[data-mobile-close]')?.addEventListener('click', close);
      header.addEventListener('keydown', event => {
        if (event.key === 'Escape') { if (!drawer?.hidden) close(); header.querySelectorAll('[data-menu-toggle]').forEach(button => { document.getElementById(button.getAttribute('aria-controls')).hidden = true; button.setAttribute('aria-expanded','false'); }); }
        if (event.key !== 'Tab' || drawer?.hidden) return;
        const items = [...drawer.querySelectorAll('a[href],button,select,summary')].filter(el => el.getClientRects().length);
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === drawer)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      });
      header.querySelectorAll('[data-menu-toggle]').forEach(button => button.addEventListener('click', () => {
        const menu = document.getElementById(button.getAttribute('aria-controls'));
        if (!menu) return;
        menu.hidden = !menu.hidden; button.setAttribute('aria-expanded',String(!menu.hidden));
      }));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init()); else init();
  document.addEventListener('shopify:section:load', e => init(e.target));
  document.addEventListener('shopify:section:unload', () => document.body.classList.remove('menu-open'));
  document.addEventListener('click', e => {
    document.querySelectorAll('[data-menu-toggle][aria-expanded="true"]').forEach(button => {
      if (!button.parentElement.contains(e.target)) { document.getElementById(button.getAttribute('aria-controls')).hidden = true; button.setAttribute('aria-expanded','false'); }
    });
  });
})();
