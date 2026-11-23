import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { resolveDepartures, type ConfigSchema } from './src/configSchema';

/** The JSON files of a folder of public/ and their sizes, for the download list. */
const filesIn = (folder: string) => {
  const dir = fileURLToPath(new URL(`./public/${folder}/`, import.meta.url));
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((name) => ({ name, bytes: statSync(dir + name).size }));
};

/** A JSON file at the repository's root. */
const root = (name: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../${name}`, import.meta.url)), 'utf8'));

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // React and D3 change far less often than the app, so a deploy leaves them cached.
        manualChunks: (id) =>
          /node_modules\/(react|react-dom|scheduler)\//.test(id)
            ? 'react'
            : /node_modules\/d3-(?!geo)/.test(id)
              ? 'd3'
              : undefined,
      },
    },
  },
  define: {
    __DATA_FILES__: JSON.stringify({ 'data/': filesIn('data'), 'fixtures/': filesIn('fixtures') }),
    __PLANETSHIFT_DEPARTURES__: JSON.stringify(
      resolveDepartures(
        root('planetshift.config.schema.json') as ConfigSchema,
        root('planetshift.config.json'),
      ),
    ),
  },
  test: {
    include: ['test/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
