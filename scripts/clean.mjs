import { rm } from 'node:fs/promises';
// Only generated output is removed; authored content and media are never touched.
await rm('_site', { recursive: true, force: true });
await rm('.cache/styles', { recursive: true, force: true });
