(() => {
  function init(root = document) {
    root.querySelectorAll('[data-product-section]').forEach(section => {
      if (section.dataset.bound) return;
      section.dataset.bound = 'true';
      const form = section.querySelector('[data-product-form]');
      const data = section.querySelector('[data-product-variants]');
      let variants = [];
      try { variants = JSON.parse(data?.textContent || '[]'); } catch { return; }
      const showMedia = id => {
        if (!id || !section.querySelector(`[data-media-id="${id}"]`)) return;
        section.querySelectorAll('[data-media-id]').forEach(el => {
          el.hidden = el.dataset.mediaId !== String(id);
          if (el.hidden) el.querySelectorAll('video').forEach(video => video.pause());
        });
        section.querySelectorAll('[data-media-target]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.mediaTarget === String(id))));
      };
      section.querySelectorAll('[data-media-target]').forEach(button => button.addEventListener('click', () => showMedia(button.dataset.mediaTarget)));
      if (!form) return;
      const selector = form.querySelector('[data-variant-select]');
      const plan = form.querySelector('[data-selling-plan]');
      const button = form.querySelector('[data-add-to-cart]');
      const label = form.querySelector('[data-add-label]');
      const error = form.querySelector('[data-form-error]');
      const status = form.querySelector('[data-form-status]');
      let busy = false;
      const update = (changeUrl = false) => {
        const variant = variants.find(v => String(v.id) === selector.value);
        const allocation = plan?.value ? variant?.plans.find(p => String(p.id) === plan.value) : null;
        const available = Boolean(variant?.available && (!plan?.value || allocation));
        button.disabled = busy || !available;
        label.textContent = busy ? 'Adding…' : available ? 'Add to bag' : 'Unavailable';
        const availability = form.querySelector('[data-availability]');
        if (availability) availability.textContent = available ? 'Available' : 'Unavailable';
        const price = section.querySelector('[data-current-price]');
        if (price && variant) price.innerHTML = allocation?.price || variant.price;
        const compare = section.querySelector('[data-compare-price]');
        if (compare) { compare.hidden = !variant?.compare || Boolean(allocation); compare.innerHTML = variant?.compare || ''; }
        const unit = section.querySelector('[data-unit-price]');
        if (unit) unit.innerHTML = allocation ? '' : variant?.unit || '';
        const payment = form.querySelector('.product-payment');
        if (payment) payment.hidden = !available;
        if (changeUrl && variant) { const url = new URL(location.href); url.searchParams.set('variant', variant.id); history.replaceState({}, '', url); showMedia(variant.media); }
        return available;
      };
      selector.addEventListener('change', () => update(true));
      plan?.addEventListener('change', () => update());
      form.addEventListener('submit', async event => {
        event.preventDefault();
        if (busy || !update()) return;
        error.hidden = true; status.textContent = ''; busy = true; update();
        try {
          const response = await fetch((window.Shopify?.routes?.root || '/') + 'cart/add.js', {method:'POST', headers:{Accept:'application/json'}, body:new FormData(form)});
          const result = await response.json();
          if (!response.ok) throw new Error(result.description || 'We could not add this item. Please try again.');
          status.textContent = 'Added to your bag.';
          document.dispatchEvent(new CustomEvent('origin:cart-changed', {detail:{open:true}}));
        } catch (e) { error.textContent = e.message; error.hidden = false; }
        finally { busy = false; update(); }
      });
      update();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init()); else init();
  document.addEventListener('shopify:section:load', e => init(e.target));
})();
