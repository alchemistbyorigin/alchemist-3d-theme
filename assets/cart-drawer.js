class CartDrawer {
  constructor(drawer) {
    this.drawer = drawer;
    this.panel = drawer.querySelector('.cart-drawer__panel');
    this.sectionId = drawer.dataset.sectionId;
    this.previousFocus = null;
    this.nativeFetch = window.fetch.bind(window);
    this.refreshing = false;
    this.bindEvents();
    this.interceptCartRequests();
  }

  get activeDrawer() {
    return document.querySelector('[data-cart-drawer]');
  }

  bindEvents() {
    document.addEventListener('click', (event) => {
      const target = event.target;
      const toggle = target.closest('[data-cart-toggle]');
      if (toggle) {
        event.preventDefault();
        this.open();
        return;
      }

      if (target.closest('[data-cart-close]')) {
        this.close();
        return;
      }

      const item = target.closest('[data-cart-item]');
      if (!item) return;
      const input = item.querySelector('[data-cart-quantity]');
      if (!input) return;
      if (target.closest('[data-quantity-increase]')) input.value = Number(input.value) + 1;
      if (target.closest('[data-quantity-decrease]')) input.value = Math.max(Number(input.value) - 1, 0);
      if (target.closest('[data-quantity-increase], [data-quantity-decrease], [data-cart-remove]')) {
        this.changeLine(item, target.closest('[data-cart-remove]') ? 0 : Number(input.value));
      }
    });

    document.addEventListener('change', (event) => {
      const input = event.target.closest('[data-cart-quantity]');
      const item = input?.closest('[data-cart-item]');
      if (input && item) this.changeLine(item, Math.max(Number(input.value) || 0, 0));
    });

    document.addEventListener('keydown', (event) => {
      const drawer = this.activeDrawer;
      if (!drawer || drawer.hidden) return;
      if (event.key === 'Escape') {
        this.close();
        return;
      }
      if (event.key === 'Tab') this.trapFocus(event, drawer);
    });
  }

  interceptCartRequests() {
    window.fetch = async (...args) => {
      const response = await this.nativeFetch(...args);
      const requestUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      const isCartMutation = /\/cart\/(add|change|update)(\.js)?(?:\?|$)/.test(requestUrl);
      if (response.ok && isCartMutation) {
        this.refresh();
      }
      return response;
    };
  }

  async changeLine(item, quantity) {
    const line = Number(item.dataset.line);
    if (!line) return;
    item.setAttribute('aria-busy', 'true');
    try {
      const response = await this.nativeFetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ line, quantity })
      });
      if (!response.ok) throw new Error('Cart line update failed');
      await this.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      item.removeAttribute('aria-busy');
    }
  }

  async refresh() {
    if (this.refreshing || !this.sectionId) return;
    this.refreshing = true;
    try {
      const url = `${window.location.pathname}?sections=${encodeURIComponent(this.sectionId)}`;
      const response = await this.nativeFetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Cart drawer section request failed');
      const sections = await response.json();
      const html = sections[this.sectionId];
      if (!html) throw new Error('Cart drawer section was not returned');
      const template = document.createElement('template');
      template.innerHTML = html.trim();
      const nextDrawer = template.content.querySelector('[data-cart-drawer]');
      const currentDrawer = this.activeDrawer;
      if (!nextDrawer || !currentDrawer) return;
      currentDrawer.replaceWith(nextDrawer);
      this.drawer = nextDrawer;
      this.panel = nextDrawer.querySelector('.cart-drawer__panel');
      await this.updateCount();
      if (document.body.classList.contains('drawer-open')) this.setOpenState(true);
    } catch (error) {
      console.error(error);
    } finally {
      this.refreshing = false;
    }
  }

  async updateCount() {
    const response = await this.nativeFetch('/cart.js', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Cart count request failed');
    const cart = await response.json();
    document.querySelectorAll('[data-cart-count]').forEach((element) => {
      element.textContent = cart.item_count;
      element.hidden = cart.item_count === 0;
    });
  }

  setOpenState(open) {
    const drawer = this.activeDrawer;
    if (!drawer) return;
    drawer.hidden = false;
    drawer.toggleAttribute('data-open', open);
    document.body.classList.toggle('drawer-open', open);
    if (!open) {
      window.setTimeout(() => {
        if (!drawer.hasAttribute('data-open')) drawer.hidden = true;
      }, 300);
    }
  }

  open() {
    const drawer = this.activeDrawer;
    if (!drawer) return;
    this.previousFocus = document.activeElement;
    this.setOpenState(true);
    drawer.querySelector('.cart-drawer__panel')?.focus();
  }

  close() {
    this.setOpenState(false);
    this.previousFocus?.focus?.();
  }

  trapFocus(event, drawer) {
    const focusable = [...drawer.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const drawer = document.querySelector('[data-cart-drawer]');
  if (!drawer) return;
  new CartDrawer(drawer);
});
