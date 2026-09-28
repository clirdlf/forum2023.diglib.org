// Backward-compatible entry point; comparisons use saved local baselines, never WordPress.
import { spawnSync } from 'node:child_process';
const result = spawnSync('pnpm', ['test:visual', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});
process.exitCode = result.status ?? 1;
