import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** The JSON files of a folder of public/ and their sizes, for the download list. */
const filesIn = (folder: string) => {
  const dir = fileURLToPath(new URL(`./public/${folder}/`, import.meta.url));
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((name) => ({ name, bytes: statSync(dir + name).size }));
};

export default defineConfig({
  base: './',
  define: {
    __DATA_FILES__: JSON.stringify({ 'data/': filesIn('data'), 'fixtures/': filesIn('fixtures') }),
  },
  test: {
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
  },
});
