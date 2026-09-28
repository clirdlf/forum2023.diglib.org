import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

let output = new Map();
export function buildStyles() {
  const manifest = JSON.parse(fs.readFileSync('src/_data/legacyStyles.json', 'utf8'));
  const lists = Object.values(manifest);
  let prefixLength = 0;
  while (
    lists[0][prefixLength] &&
    lists.every((list) => list[prefixLength] === lists[0][prefixLength])
  )
    prefixLength++;
  const directory = '.cache/styles';
  fs.mkdirSync(directory, { recursive: true });
  function bundle(files) {
    if (!files.length) return null;
    const css = files
      .map((file) => fs.readFileSync(path.join('src/styles/imported', file), 'utf8'))
      .join('\n')
      .replace(/@charset[^;]+;/g, '');
    const hash = crypto.createHash('sha256').update(css).digest('hex').slice(0, 16);
    const name = `legacy-${hash}.css`;
    fs.writeFileSync(path.join(directory, name), css);
    return `/assets/styles/${name}`;
  }
  const common = bundle(lists[0].slice(0, prefixLength));
  output = new Map(
    Object.entries(manifest).map(([key, files]) => [
      key,
      [common, bundle(files.slice(prefixLength))].filter(Boolean),
    ]),
  );
}
export function stylesheets(key = 'about') {
  if (!output.has(key)) throw new Error(`Unknown styleKey: ${key}`);
  return output.get(key);
}
