# DLF Forum 2023 — Eleventy

A static migration of https://forum2023.diglib.org for GitHub Pages. Builds use checked-in content and assets, without contacting WordPress. Third-party schedules, videos, maps, and newsletter forms remain active, with visible fallback links.

## Development

Use Node.js 22 (see `.node-version`) and pnpm 12.6.0 (pinned in `package.json`). pnpm is the only package manager; commit `pnpm-lock.yaml` when dependencies change.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The development site runs at http://localhost:8080. For deployment output and checks:

```sh
pnpm build
pnpm check
pnpm lint
pnpm format:check
```

`pnpm build` clears generated output before building `_site/`. `pnpm format` formats maintained code and metadata; captured layout HTML and vendor CSS are deliberately excluded to keep migration diffs readable.

## Content and templates

- `src/pages/*.html`: editable page/post bodies. Elementor layout wrappers remain to preserve the design. These files use Nunjucks, so shared components can be included directly.
- `src/pages/*.json`: title, description, permalink, image, dates, and optional post excerpt/thumbnail. `heading` is an optional, intentionally different display heading (trusted HTML); otherwise the H1 uses `title`. Posts use `title` for their headings and listings.
- `src/pages/pages.11tydata.json`: defaults for both existing and new HTML/Markdown pages: layout, styling, body classes, and sitemap inclusion.
- `src/_data/site.json`: site name, production origin, default description, and icon.
- `src/_data/navigation.json`: single navigation source for desktop and mobile.
- `src/_includes/base.njk` and `head.njk`: shared document, landmark, skip link, metadata, and structured data. Titles, canonical/social URLs, and schema follow page data automatically. No WordPress search schema is emitted.
- `src/_includes/header.njk`, `navigation.njk`, and `footer.html`: shared site chrome.
- `src/_includes/post-list.njk` and `post-navigation.njk`: home/news listings and adjacent-post links, generated from the `posts` collection (`kind: post`, newest first). Post data supplies `excerpt`, optional `homeExcerpt`, `thumbnail`, and `thumbnailAlt`.
- `src/assets/site.css` and `site.js`: maintained styles and progressive enhancements. Native buttons control navigation; tabs have keyboard focus management. Navigation, content panels, skip links, and gallery images remain available without JavaScript.

### Add a page or post

Create `src/pages/example.md` with front matter, or an HTML file plus same-name JSON metadata:

```md
---
title: Example page
description: A concise description of this page.
permalink: /example/
---

<h1>{{ title }}</h1>

Page content goes here.
```

Pages inherit the layout and `sitemap: true`; no WordPress ID is needed. Set `sitemap: false` to exclude a page. Keep existing permalinks stable.

For a post, add `kind: post`, an ISO `date` (with timezone), and `excerpt`. It automatically appears in the news listing, homepage latest-three cards, adjacent-post navigation, and sitemap. An optional `updated` date controls the structured-data modification date. `wpId` is retained only for historical provenance and ordering simultaneous legacy posts; new posts do not need it.

For a different layout appearance, use an existing `styleKey` from `src/_data/legacyStyles.json` or add authored styles to `site.css`. The default `about` key supplies the preserved base design. The current imported pages have explicit style keys and body classes.

## Assets and performance

The stylesheet manifest and `src/styles/imported/` preserve the original CSS order. The build emits a shared bundle and a page bundle, followed by `site.css`: three stylesheet requests instead of roughly thirty. Obsolete accessibility-widget, search-plugin, emoji, and block-global styles were removed. See `src/styles/README.md` for the CSS maintenance boundary.

`data/uploads/45/` retains all supplied media, including historical variants, at `/wp-content/uploads/sites/45/`. Fonts and externally sourced images are local as well. The old path is a static URL, not a WordPress service. All original media is intentionally retained to avoid breaking historical direct links; the roughly 190 MB deployment is not the amount downloaded for a page. Unused generated CSS and upload-directory HTML are not published. The XML export is never published.

## Validation

`pnpm check` validates generated HTML, local links and fragment targets, responsive images, inline/external CSS asset references, approved external embed hosts, main landmarks, canonical URLs, JSON-LD, and sitemap destinations. It rejects external rendering assets and WordPress API/search endpoints. It does not test external sites' uptime or promise full WCAG conformance.

Install the test browser once, then run the suite:

```sh
pnpm exec playwright install chromium
pnpm test
```

The suite starts its own preview server on port 8081, checks all imported routes at desktop/mobile sizes, and exercises keyboard menus, tabs, accordions, galleries, and no-JavaScript content. Targeted axe checks cover core accessibility semantics on representative pages. External network requests are blocked in tests. CI runs these checks on pull requests before deployment.

To use an existing Chrome installation locally, prefix test commands with `PLAYWRIGHT_CHANNEL=chrome`.

Optional screenshot comparisons use committed local reference images, never the WordPress site:

```sh
pnpm test:visual
# After reviewing an intentional visual change:
pnpm test:visual --update-snapshots
```

Snapshots are platform-specific; the initial references were captured on macOS with Chrome. Use the same platform/browser for comparisons, or generate and review an additional platform's baseline. Visual tests are opt-in; CI runs functional/accessibility checks and saves failure screenshots and traces. Reference updates must be visually reviewed rather than accepted automatically.

## GitHub Pages

`.github/workflows/pages.yml` uses pnpm's frozen lockfile, runs lint/format/build/link/browser checks on pull requests and `main`, and deploys only successful `main` builds. Actions are pinned to commit SHAs. Only the deployment job receives Pages/OIDC write permissions. Dependabot proposes monthly package and Action updates.

1. Push this repository to GitHub.
2. Choose **GitHub Actions** under **Settings → Pages → Build and deployment**.
3. Set **forum2023.diglib.org** as the custom domain. `src/CNAME` is included in output.
4. At cutover, point the subdomain's DNS CNAME to your account/organization's `<owner>.github.io` host, and enable HTTPS when available.

Repository settings and DNS have not been changed by this project. Configure branch protection to require the build job before merging.

## Migration provenance and recovery

The WXR export supplied published IDs, dates, and URLs. The initial importer captured rendered Elementor HTML and styles to preserve appearance: 30 published pages and 13 posts, excluding DEMO pages, OLD-Sponsorship, drafts, and private content. `data/migration-report.json` records that original capture and its exclusions; it is historical provenance, not the current asset manifest.

The importer is retained only as a recovery tool:

```sh
pnpm import:wordpress
```

It requires the original XML, uploads, and live WordPress site. All output now goes to `.cache/wordpress-import/`, including a staged copy of media. It never overwrites `src/` or the supplied uploads. Its legacy HTML must be reviewed and adapted before copying anything into the modernized content structure. Normal development, builds, and tests do not need this tool or the original server.

Vendor styles, fonts, and media retain their original licensing terms. Keep the archive's content and media URLs stable when making future changes.
