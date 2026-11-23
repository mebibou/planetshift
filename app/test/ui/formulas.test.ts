import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../../src/methodology/markdown';

const DOCS = join(__dirname, '../../../docs/methodology');
const pages = readdirSync(DOCS).flatMap((lang) =>
  readdirSync(join(DOCS, lang))
    .filter((f) => f.endsWith('.md'))
    .map((f) => [`${lang}/${f}`, readFileSync(join(DOCS, lang, f), 'utf8')] as const),
);

describe('formulas in the Methodology', () => {
  it('typesets inline and display formulas, and leaves a currency sign alone', () => {
    const html = renderMarkdown(
      'With ($r_W = 0.5$), up to \\$100 a tonne:\n\n$$\nw = \\frac{a}{b}\n$$\n',
    );
    expect(html).toContain('class="katex"');
    expect(html).toContain('katex-display');
    expect(html).toContain('<math');
    expect(html).toContain('up to $100 a tonne');
  });

  it.each(pages)('%s has no formula KaTeX cannot read and no stray dollar', (_, text) => {
    const html = renderMarkdown(text);
    expect(html).not.toContain('katex-error');
    expect(html.replace(/<span class="katex[\s\S]*?<\/annotation>/g, '')).not.toMatch(/\$\$/);
  });
});
