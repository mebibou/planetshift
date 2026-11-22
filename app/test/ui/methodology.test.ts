import { describe, expect, it } from 'vitest';
import { indexFiles, parsePath, pickSections, titleOf } from '../../src/methodology/select';
import { SECTIONS } from '../../src/methodology/sections';

const files = indexFiles({
  '../../../docs/methodology/en/overview.md': '# Overview\n\nText',
  '../../../docs/methodology/en/data.md': 'No heading',
  '../../../docs/methodology/fr/overview.md': '# Vue d’ensemble\n\nTexte',
  '../../../docs/methodology/en/unknown.md': '# Not a section',
  'elsewhere.txt': 'ignored',
});

describe('methodology', () => {
  it('parses a file path into language and section', () => {
    expect(parsePath('../../../docs/methodology/fr/climate.md')).toEqual({
      lang: 'fr',
      id: 'climate',
    });
    expect(parsePath('readme.txt')).toBeNull();
  });

  it('reads the first level-one heading', () => {
    expect(titleOf('intro\n# Title here\n## Sub')).toBe('Title here');
    expect(titleOf('## Only sub')).toBeNull();
  });

  it('keeps the fixed order, skips missing sections and unknown files', () => {
    const s = pickSections(SECTIONS, files, 'en', (id) => `[${id}]`);
    expect(s.map((x) => x.id)).toEqual(['overview', 'data']);
    expect(s[1]?.title).toBe('[data]');
  });

  it('uses French where written and English otherwise', () => {
    const s = pickSections(SECTIONS, files, 'fr', (id) => id);
    expect(s.map((x) => [x.id, x.lang])).toEqual([
      ['overview', 'fr'],
      ['data', 'en'],
    ]);
  });
});
