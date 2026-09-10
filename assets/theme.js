document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('[data-header]');

  if (header) {
    const mobileDrawer = header.querySelector('[data-mobile-drawer]');
    const mobileToggle = header.querySelector('[data-mobile-toggle]');
    const mobileClose = header.querySelector('[data-mobile-close]');
    const searchPanel = header.querySelector('[data-search-panel]');
    const searchToggle = header.querySelector('[data-search-toggle]');
    const searchInput = header.querySelector('[data-search-input]');
    const searchResults = header.querySelector('[data-search-results]');
    const menuToggles = header.querySelectorAll('[data-menu-toggle]');

    const setDrawer = (drawer, toggle, open) => {
      if (!drawer || !toggle) return;
      drawer.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('drawer-open', open);
    };

    mobileToggle?.addEventListener('click', () => setDrawer(mobileDrawer, mobileToggle, true));
    mobileClose?.addEventListener('click', () => setDrawer(mobileDrawer, mobileToggle, false));
    searchToggle?.addEventListener('click', () => {
      if (!searchPanel || !searchToggle) return;
      const open = searchPanel.hidden;
      searchPanel.hidden = !open;
      searchToggle.setAttribute('aria-expanded', String(open));
      if (open) searchInput?.focus();
    });

    let searchRequest;
    searchInput?.addEventListener('input', async () => {
      if (!searchResults) return;
      const query = searchInput.value.trim();
      searchResults.replaceChildren();
      if (query.length < 2) return;
      searchRequest?.abort();
      searchRequest = new AbortController();
      try {
        const response = await fetch(`/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=5`, { signal: searchRequest.signal });
        if (!response.ok) throw new Error('Predictive search request failed');
        const data = await response.json();
        const products = data.resources?.results?.products || [];
        products.forEach((product) => {
          const link = document.createElement('a');
          link.href = product.url;
          link.textContent = product.title;
          searchResults.append(link);
        });
      } catch (error) {
        if (error.name !== 'AbortError') console.error(error);
      }
    });

    const closeMenus = () => {
      menuToggles.forEach((toggle) => {
        const menu = document.getElementById(toggle.getAttribute('aria-controls'));
        toggle.setAttribute('aria-expanded', 'false');
        if (menu) menu.hidden = true;
      });
    };

    menuToggles.forEach((toggle) => {
      toggle.addEventListener('click', () => {
        const menu = document.getElementById(toggle.getAttribute('aria-controls'));
        if (!menu) return;
        const open = toggle.getAttribute('aria-expanded') === 'true';
        closeMenus();
        toggle.setAttribute('aria-expanded', String(!open));
        menu.hidden = open;
      });
    });

    header.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenus();
    });
    document.addEventListener('click', (event) => {
      if (!header.contains(event.target)) closeMenus();
    });
  }

  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('.product-card__form');
    if (!form || !window.fetch) return;

    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    if (button?.disabled) return;
    button?.setAttribute('aria-busy', 'true');
    if (button) button.disabled = true;

    try {
      const formData = new FormData(form);
      const id = Number(formData.get('id'));
      const quantity = Math.max(1, Number(formData.get('quantity') || 1));
      if (!id) throw new Error('Product variant is unavailable');

      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: [{ id, quantity }] })
      });
      if (!response.ok) throw new Error('Unable to add product to cart');

      document.dispatchEvent(new CustomEvent('alchemist:cart:changed', { detail: { open: true, source: 'product-card' } }));
    } catch (error) {
      console.error(error);
      form.submit();
    } finally {
      button?.removeAttribute('aria-busy');
      if (button) button.disabled = false;
    }
  });
});
