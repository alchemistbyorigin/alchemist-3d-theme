document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('[data-product-section]');
  if (!sections.length) return;

  sections.forEach((section) => {
    const form = section.querySelector('[data-product-form]');
    const variantData = section.querySelector('[data-product-variants]');
    if (!form || !variantData) return;

    let variants;
    try {
      variants = JSON.parse(variantData.textContent);
    } catch (error) {
      console.error('Unable to read product variants.', error);
      return;
    }
    if (!Array.isArray(variants) || !variants.length) return;

    const variantId = form.querySelector('[data-variant-id]');
    const price = section.querySelector('[data-current-price]');
    const comparePrice = section.querySelector('[data-compare-price]');
    const addButton = form.querySelector('[data-add-to-cart]');
    const addLabel = form.querySelector('[data-add-label]');
    const error = form.querySelector('[data-form-error]');
    const inventoryStatus = section.querySelector('[data-inventory-status]');
    const inventoryLabel = section.querySelector('[data-inventory-label]');
    const skuWrap = section.querySelector('[data-sku-wrap]');
    const sku = section.querySelector('[data-sku]');
    const sticky = section.querySelector('[data-sticky-atc]');
    const stickyAdd = section.querySelector('[data-sticky-add]');
    const stickyAddLabel = section.querySelector('[data-sticky-add-label]');
    const stickyPrice = section.querySelector('[data-sticky-price]');
    const mediaItems = [...section.querySelectorAll('[data-media-id]')];
    const mediaButtons = [...section.querySelectorAll('[data-media-target]')];
    const optionInputs = [...form.querySelectorAll('[data-option-index]')];

    if (!variantId || !addButton || !addLabel) return;

    const text = {
      add: section.dataset.addToCartText || 'Add to cart',
      soldOut: section.dataset.soldOutText || 'Sold out',
      unavailable: section.dataset.unavailableText || 'Unavailable',
      inStock: section.dataset.inStockText || 'In stock',
      outOfStock: section.dataset.outOfStockText || 'Out of stock',
      lowStock: section.dataset.lowStockTemplate || 'Low stock — __COUNT__ left',
    };
    const lowStockThreshold = Number(section.dataset.lowStockThreshold || 5);

    const money = (cents) => new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: document.documentElement.dataset.currency || 'USD'
    }).format(Number(cents || 0) / 100);

    const selectedValues = () => {
      const indices = [...new Set(optionInputs.map((input) => Number(input.dataset.optionIndex)))].sort((a, b) => a - b);
      return indices.map((index) => form.querySelector(`[data-option-index="${index}"]:checked`)?.value || '');
    };

    const findVariant = () => {
      if (!optionInputs.length) return variants.find((variant) => String(variant.id) === String(variantId.value)) || variants[0];
      const values = selectedValues();
      return variants.find((candidate) => candidate.options.every((option, index) => option === values[index]));
    };

    const setActiveMedia = (mediaId, { focusThumbnail = false } = {}) => {
      if (!mediaId || !mediaItems.length) return;
      const id = String(mediaId);
      const target = mediaItems.find((item) => String(item.dataset.mediaId) === id);
      if (!target) return;

      mediaItems.forEach((item) => {
        const active = item === target;
        item.hidden = !active;
        item.classList.toggle('is-active', active);
        if (!active) {
          item.querySelectorAll('video').forEach((video) => video.pause?.());
        }
      });

      mediaButtons.forEach((button) => {
        const active = String(button.dataset.mediaTarget) === id;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
        if (active && focusThumbnail) button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      });
    };

    const updateOptionLabels = () => {
      section.querySelectorAll('[data-option-group]').forEach((group) => {
        const checked = group.querySelector('[data-option-index]:checked');
        const label = group.querySelector('[data-selected-option-value]');
        if (checked && label) label.textContent = checked.value;
      });
    };

    const updateInventory = (variant) => {
      if (!inventoryStatus || !inventoryLabel) return;

      inventoryStatus.classList.toggle('is-unavailable', !variant?.available);
      if (!variant || !variant.available) {
        inventoryLabel.textContent = text.outOfStock;
        return;
      }

      const quantity = Number(variant.inventory_quantity);
      if (variant.inventory_management && Number.isFinite(quantity) && quantity > 0 && quantity <= lowStockThreshold) {
        inventoryLabel.textContent = text.lowStock.replace('__COUNT__', String(quantity));
      } else {
        inventoryLabel.textContent = text.inStock;
      }
    };

    const updateSku = (variant) => {
      if (!skuWrap || !sku) return;
      const value = variant?.sku || '';
      sku.textContent = value;
      skuWrap.hidden = !value;
    };

    const updateUrl = (variant) => {
      if (!variant?.id || !window.history?.replaceState) return;
      const url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url.toString());
    };

    const update = ({ changeMedia = true, changeUrl = true } = {}) => {
      updateOptionLabels();
      const variant = findVariant();

      if (!variant) {
        addButton.disabled = true;
        addLabel.textContent = text.unavailable;
        if (stickyAdd) stickyAdd.disabled = true;
        if (stickyAddLabel) stickyAddLabel.textContent = text.unavailable;
        if (inventoryStatus) inventoryStatus.classList.add('is-unavailable');
        if (inventoryLabel) inventoryLabel.textContent = text.outOfStock;
        return null;
      }

      variantId.value = variant.id;
      addButton.disabled = !variant.available;
      addLabel.textContent = variant.available ? text.add : text.soldOut;

      if (price) price.textContent = money(variant.price);
      if (comparePrice) {
        const onSale = Number(variant.compare_at_price) > Number(variant.price);
        comparePrice.hidden = !onSale;
        comparePrice.textContent = onSale ? money(variant.compare_at_price) : '';
      }

      if (stickyAdd) stickyAdd.disabled = !variant.available;
      if (stickyAddLabel) stickyAddLabel.textContent = variant.available ? text.add : text.soldOut;
      if (stickyPrice) stickyPrice.textContent = money(variant.price);

      updateInventory(variant);
      updateSku(variant);
      if (changeMedia && variant.featured_media_id) setActiveMedia(variant.featured_media_id, { focusThumbnail: true });
      if (changeUrl) updateUrl(variant);
      return variant;
    };

    optionInputs.forEach((input) => input.addEventListener('change', () => update()));

    mediaButtons.forEach((button) => {
      button.addEventListener('click', () => setActiveMedia(button.dataset.mediaTarget));
    });

    if (stickyAdd) {
      stickyAdd.addEventListener('click', () => {
        if (!stickyAdd.disabled) form.requestSubmit();
      });
    }

    if (sticky) sticky.hidden = false;

    form.addEventListener('submit', async (event) => {
      if (!window.fetch || !variantId.value) return;
      event.preventDefault();
      if (error) error.hidden = true;
      addButton.disabled = true;
      if (stickyAdd) stickyAdd.disabled = true;

      try {
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            items: [{
              id: Number(variantId.value),
              quantity: Math.max(1, Number(form.querySelector('[name="quantity"]')?.value || 1))
            }]
          })
        });

        if (!response.ok) {
          let message = text.unavailable;
          try {
            const payload = await response.json();
            message = payload.description || payload.message || message;
          } catch (_) {
            // Keep localized fallback message.
          }
          throw new Error(message);
        }

        document.querySelector('[data-cart-toggle]')?.click();
      } catch (requestError) {
        if (error) {
          error.textContent = requestError.message;
          error.hidden = false;
        } else {
          console.error(requestError);
        }
      } finally {
        update({ changeMedia: false, changeUrl: false });
      }
    });

    update({ changeMedia: false, changeUrl: false });
  });
});
