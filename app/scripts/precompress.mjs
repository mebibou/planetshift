// Writes `<file>.gz` and `<file>.br` beside every text asset of a built site, which GitLab Pages
// serves to browsers that accept them. `node scripts/precompress.mjs [folder]`, `dist` by default.
// A compressed copy no smaller than its original is not written.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const EXTENSIONS = new Set(['.json', '.js', '.css', '.html', '.svg']);

const filesIn = (folder) =>
  readdirSync(folder, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && EXTENSIONS.has(extname(e.name)))
    .map((e) => join(e.parentPath, e.name));

const brotli = (bytes) =>
  brotliCompressSync(bytes, {
    params: {
      [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
      [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
      [constants.BROTLI_PARAM_SIZE_HINT]: bytes.length,
    },
  });

const ENCODINGS = [
  ['.gz', (bytes) => gzipSync(bytes, { level: 9 })],
  ['.br', brotli],
];

const compress = (file) => {
  const bytes = readFileSync(file);
  return ENCODINGS.flatMap(([suffix, encode]) => {
    const encoded = encode(bytes);
    if (encoded.length >= bytes.length) return [];
    writeFileSync(file + suffix, encoded);
    return [{ file: file + suffix, bytes: encoded.length }];
  });
};

const folder = process.argv[2] ?? 'dist';
const written = filesIn(folder).flatMap(compress);
console.log(`precompress: ${written.length} files written in ${folder}`);
