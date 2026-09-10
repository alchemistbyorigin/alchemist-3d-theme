# Contributing to Alchemist 3D

Alchemist 3D is a commercial-quality Shopify theme. Contributions should improve reliability, performance, accessibility, merchant flexibility, or conversion UX without introducing unnecessary complexity.

## Before changing code

- Read the current implementation before replacing or duplicating it.
- Preserve working Shopify-native behavior whenever possible.
- Prefer small, reviewable patches over broad rewrites.
- Do not commit temporary generated files or staging directories.
- Keep published setting IDs stable.

## Development workflow

1. Create a focused feature branch from the current development base.
2. Make one logical change at a time.
3. Run Shopify Theme Check.
4. Preview the change in a Shopify development store.
5. Test desktop and mobile behavior.
6. Test keyboard navigation and reduced-motion behavior where relevant.
7. Open a pull request describing the user impact, files changed, risks, and validation performed.

## Theme standards

### Liquid and Shopify architecture

- Use Shopify Online Store 2.0 JSON templates.
- Prefer sections, blocks, snippets, forms, routes, and native Shopify APIs.
- Keep reusable product/grid markup in shared snippets or blocks.
- Escape merchant/customer text unless intentionally rendering trusted rich text.

### Performance

- Avoid unnecessary global JavaScript.
- Load page/section-specific assets conditionally.
- Use responsive Shopify image helpers with explicit widths and sizes.
- Lazy-load below-the-fold imagery.
- Keep the 3D experience progressive: static HTML and fallback media must work without WebGL.
- Dispose WebGL resources and cancel animation loops when sections unload.

### Accessibility

- Preserve semantic headings and landmarks.
- Keep visible focus styles.
- Maintain `aria-expanded`, `aria-controls`, labels, and keyboard behavior for custom UI.
- Respect `prefers-reduced-motion`.
- Keep mobile interaction targets comfortably tappable.

### JavaScript

- Do not override browser globals such as `window.fetch`.
- Use direct Shopify AJAX Cart/Search APIs where needed.
- Prefer CustomEvents for communication between independent components.
- Clean up listeners, observers, timers, and animation frames when components are destroyed.

### Localization

- Customer-facing UI strings should be translation-backed before commercial release.
- Schema text should follow the project's translation-key convention.

## Pull request checklist

- [ ] Theme Check passes
- [ ] Development-store preview tested
- [ ] Mobile layout tested
- [ ] Keyboard interaction tested where applicable
- [ ] No temporary files/directories added
- [ ] No working commerce flow regressed
- [ ] Changelog updated for release-impacting changes

## Repository

https://github.com/alchemistbyorigin/alchemist-3d-theme
