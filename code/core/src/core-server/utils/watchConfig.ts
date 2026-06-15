import { basename } from 'node:path';

import type { Path } from 'storybook/internal/types';

import Watchpack from 'watchpack';

// See also the sibling ignore list in './watch-story-specifiers.ts'.
// Keep the two in sync so that tsconfig.json / tooling cache changes are
// filtered out by both watchers.
const COMMON_IGNORED = [
  '**/.git',
  '**/node_modules',
  '**/.nx/cache/**',
  '**/.nx',
  '**/.turbo/**',
  '**/.cache/**',
  '**/tsconfig.json',
  '**/tsconfig.*.json',
  '**/tsconfig-*.json',
];

/** Watch the `.storybook` dir for changes */
export function watchConfig(
  configDir: Path,
  onInvalidate: (path: Path, removed: boolean) => Promise<void>
) {
  const wp = new Watchpack({
    followSymlinks: false,
    ignored: COMMON_IGNORED,
  });

  wp.watch({
    directories: [configDir],
  });

  // Additional "belt and suspenders" filter in case a glob pattern above
  // does not match on certain platforms (watchpack forwards chokidar paths
  // verbatim, so we also reject by basename here).
  const isIgnoredBasename = (p: Path) => {
    const name = basename(p).toLowerCase();
    return (
      name.startsWith('tsconfig') ||
      name.endsWith('.tsbuildinfo') ||
      name === 'nx.json' ||
      name === '.gitignore'
    );
  };

  wp.on('change', async (filePath: Path, mtime: Date, explanation: string) => {
    if (isIgnoredBasename(filePath)) {
      return;
    }
    const removed = !mtime;
    await onInvalidate(filePath, removed);
  });
  wp.on('remove', async (filePath: Path, explanation: string) => {
    if (isIgnoredBasename(filePath)) {
      return;
    }
    await onInvalidate(filePath, true);
  });

  return () => wp.close();
}
