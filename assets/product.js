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

    const selectors = [...form.querySelectorAll('[data-option-index]')];
    const variantId = form.querySelector('[data-variant-id]');
    const price = section.querySelector('[data-current-price]');
    const comparePrice = section.querySelector('[data-compare-price]');
    const addButton = form.querySelector('[data-add-to-cart]');
    const addLabel = form.querySelector('[data-add-label]');
    const error = form.querySelector('[data-form-error]');
    if (!variantId || !addButton || !addLabel) return;

    const money = (cents) => new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: document.documentElement.dataset.currency || 'USD'
    }).format(cents / 100);

    const update = () => {
      const values = selectors.map((selector) => selector.value);
      const variant = variants.find((candidate) => candidate.options.every((option, index) => option === values[index]));
      if (!variant) {
        addButton.disabled = true;
        addLabel.textContent = 'Unavailable';
        return;
      }
      variantId.value = variant.id;
      addButton.disabled = !variant.available;
      addLabel.textContent = variant.available ? 'Add to cart' : 'Sold out';
      if (price) price.textContent = money(variant.price);
      if (comparePrice) {
        comparePrice.hidden = !(variant.compare_at_price > variant.price);
        comparePrice.textContent = variant.compare_at_price ? money(variant.compare_at_price) : '';
      }
    };

    selectors.forEach((selector) => selector.addEventListener('change', update));
    form.addEventListener('submit', async (event) => {
      if (!window.fetch || !variantId.value) return;
      event.preventDefault();
      if (error) error.hidden = true;
      addButton.disabled = true;
      try {
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items: [{ id: Number(variantId.value), quantity: Number(form.querySelector('[name="quantity"]')?.value || 1) }] })
        });
        if (!response.ok) throw new Error('Unable to add product to cart');
        document.querySelector('[data-cart-toggle]')?.click();
      } catch (requestError) {
        if (error) {
          error.textContent = requestError.message;
          error.hidden = false;
        } else {
          console.error(requestError);
        }
      } finally {
        update();
      }
    });
    update();
  });
});
