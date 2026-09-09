# Alchemist 3D

Alchemist 3D is a premium Shopify Online Store 2.0 theme focused on immersive storytelling, strong conversion UX, mobile performance, accessibility, and maintainable theme architecture.

## Status

The theme is under active development. Commercial release should only happen after Shopify Theme Check, development-store testing, Lighthouse mobile testing, Theme Editor lifecycle testing, and accessibility smoke tests pass.

## Core principles

- Preserve working commerce behavior before adding visual complexity.
- Prefer Shopify-native Liquid, sections, blocks, forms, routes, and APIs.
- Load nonessential JavaScript and CSS only when needed.
- Keep 3D/WebGL as progressive enhancement with a static fallback.
- Build mobile-first and maintain keyboard/reduced-motion support.
- Reuse shared components instead of duplicating product or grid logic.
- Never rename published setting IDs without a migration plan.

## Requirements

- Shopify development store
- Shopify CLI
- Node.js version supported by the current Shopify CLI
- Shopify Liquid extension for VS Code recommended

## Local development

```bash
git clone https://github.com/alchemistbyorigin/alchemist-3d-theme.git
cd alchemist-3d-theme
shopify theme dev
```

For the current upgrade work, use the feature branch:

```bash
git checkout alchemist-v1-core-upgrade
```

## Theme architecture

```text
assets/      CSS, JavaScript, SVG and theme assets
blocks/      Reusable theme blocks
config/      Theme settings and saved configuration
layout/      Global page layouts
locales/     Translation and schema translation files
sections/    Merchant-editable page sections
snippets/    Shared Liquid components
Templates/   Shopify JSON/Liquid templates
```

## Current premium direction

The current build includes an immersive 3D hero with static fallback, premium homepage composition, product cards, product page foundation, header/navigation, cart drawer, global design settings, motion controls, and accessibility safeguards. Remaining work is tracked through the active pull request and release checklist.

## Quality gates before release

1. `shopify theme check` passes with zero release-blocking errors.
2. Homepage, product, collection, cart, search, blog, article, 404, password and standard page templates render correctly.
3. Mobile Lighthouse targets are validated on home, product and collection pages.
4. Theme Editor add/remove/reorder behavior is tested for dynamic sections, especially the 3D hero.
5. Keyboard navigation, focus states and reduced-motion behavior are smoke-tested.
6. Customer-facing strings are translatable.
7. No temporary or staging directories remain in the release branch.
8. Documentation and changelog match the shipped version.

## Performance conventions

- Use Shopify `image_url` + `image_tag` with responsive widths and sizes.
- Eager-load only likely LCP imagery; lazy-load below-the-fold media.
- Avoid global third-party dependencies for page-specific features.
- Pause or dispose animation/render loops when hidden or removed.
- Keep product/cart/search interactions isolated; do not monkey-patch browser globals.

## Accessibility conventions

- Use semantic HTML first.
- Provide visible `:focus-visible` states.
- Maintain ARIA state for drawers, menus and dialogs.
- Respect `prefers-reduced-motion` and the global theme motion setting.
- Keep interactive touch targets large enough for mobile use.

## Contribution workflow

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

See [LICENSE.md](./LICENSE.md).
