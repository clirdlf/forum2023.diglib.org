# DLF Forum 2023 — Eleventy

A static migration of https://forum2023.diglib.org for GitHub Pages. The normal build uses only checked-in HTML, templates, styles, fonts, and media. It does not read the WordPress export or contact WordPress.

## Run locally

Use Node.js 22 or later:

```sh
npm ci
npm start
```

Eleventy serves the site at http://localhost:8080. To produce and verify the deployable site:

```sh
npm run build
npm run check
```

Output is `_site/`. Do not edit it directly.

## Edit content

- `src/pages/*.html`: editable page/post body HTML. Elementor's rendered classes and layout wrappers are retained for visual fidelity. Edit text, links, and images inside those wrappers.
- `src/pages/*.json`: each page's original URL (`permalink`), title, date, WordPress ID (provenance only), body classes, and head include. Nested URLs use `--` in the source filename; the `permalink` controls the public URL.
- `src/_includes/header.html` and `footer.html`: shared navigation, announcement, footer, and newsletter form.
- `src/_includes/heads/*.html`: per-page document titles, SEO metadata, and stylesheet references. Update these when changing a page title or description.
- `src/_includes/base.njk`: shared document structure.
- `src/assets/site.css` and `site.js`: local styles and interaction replacements.
- `data/uploads/45/`: local media and captured Elementor styles/fonts, served at `/wp-content/uploads/sites/45/` to preserve existing image and document URLs. This URL is a static directory, not WordPress.
- `src/assets/vendor/`: other captured styles, fonts, and images, organized by their source host and path.

For a new page, copy an existing page's HTML and JSON, give it a unique permalink, and copy/update its head include. Eleventy also accepts `.md` pages with front matter; specify `layout: base.njk`, `headFile`, and suitable `bodyClass` values. Imported HTML preserves the original visual design more closely than converting Elementor layouts into Markdown.

Navigation and news-card excerpts are editable HTML snapshots. If adding posts, update the news and home-page listings too. The sitemap is generated automatically from pages with a `wpId` field.

## GitHub Pages

`.github/workflows/pages.yml` installs locked dependencies, builds, runs the local link/asset checks, uploads `_site`, and deploys on pushes to `main` or manual dispatch. No WordPress connection or import step is used in CI.

1. Push this repository to GitHub.
2. In **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
3. In Pages settings, set the custom domain to **forum2023.diglib.org**. `src/CNAME` is included in the output.
4. At cutover, point that subdomain's DNS CNAME at your account or organization's `<owner>.github.io` Pages host, then enable HTTPS in Pages settings when available.

The repository owner's Pages hostname cannot be inferred from this project. DNS and repository settings have not been changed by this migration. The workflow assumes the default branch is `main`.

## Migration scope

The WordPress export supplies the published page/post inventory, IDs, dates, and URLs. The one-time importer captures the corresponding public rendered HTML because Elementor markup, generated styles, shared templates, and embeds cannot be faithfully reconstructed from WXR content alone.

- 30 published pages and 13 posts imported, retaining their URLs.
- Five DEMO pages, OLD-Sponsorship, drafts, and private content excluded.
- Shared header/footer extracted; theme, widget, and font styles copied locally.
- Responsive image sources, gallery thumbnails, CSS image/font URLs, and linked local documents resolve locally, including images originally served from other CLIR/DLF sites.
- WordPress REST/oEmbed metadata, AJAX runtimes, analytics, and Cloudflare email-obfuscation scripts removed. Email links are ordinary `mailto:` links.
- Local JavaScript handles navigation, tabs, accordions, table-of-contents controls, image lightboxes, share buttons, and sticky navigation. Decorative WordPress motion effects are not required for rendering.
- Sched schedules, YouTube videos, Google Maps, and HubSpot newsletter forms remain live third-party embeds. Their provider-controlled resources still load from those providers, as expected for active embeds.
- Two obsolete content links repaired; static redirects preserve `/affiliated-events/learnatdlf/` and `/resources/hotel-accommodations/`.
- Three empty-page stylesheets also missing on the original server were omitted. Details, asset provenance, and exclusions are recorded in `data/migration-report.json`.

Original upload filenames and generated styles are retained; vendor assets remain subject to their original licenses. The export is migration input only and is not published in `_site`.

## Verification and one-time import

`npm run check` checks all generated HTML pages, local links, responsive images, referenced styles/fonts, and WordPress API dependencies. The CI workflow runs this check before deployment.

For optional browser verification, install Google Chrome, run the local server, then run:

```sh
node scripts/browser-check.mjs
```

This checks representative desktop/mobile pages and interactions with external services blocked, and captures local/original screenshots in ignored `.cache/screenshots/`. `node scripts/browser-audit.mjs` checks every imported page at desktop and mobile sizes, also with external services blocked. External provider uptime is separate from these checks.

The import script is retained for provenance/recovery. **Do not re-import after editing content unless you intend to replace those edits.** It requires the XML export, supplied uploads, and access to the original live site:

```sh
npm run import:wordpress -- --force
```

Downloads are cached in `.cache/import/`; normal builds never use that cache. Re-importing overwrites imported page bodies, metadata, shared templates, and captured assets.
