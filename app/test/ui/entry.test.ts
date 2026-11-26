import { describe, expect, it } from 'vitest';
import { parseEntry, siteRoot, withEntryView } from '../../src/app/entry';

describe('a pre-rendered entry page', () => {
  it('reads its view, language and root, and nothing else', () => {
    expect(parseEntry('{"view":"methodology","lang":"fr","root":"../../"}')).toEqual({
      view: 'methodology',
      lang: 'fr',
      root: '../../',
    });
    expect(parseEntry('{"view":"nope","lang":"fr","root":"../"}')).toBeNull();
    expect(parseEntry('{"view":"explore","lang":"de","root":"../"}')).toBeNull();
    expect(parseEntry('{"view":"explore","root":""}')).toEqual({ view: 'explore', root: '' });
    expect(parseEntry('not json')).toBeNull();
    expect(parseEntry(null)).toBeNull();
  });

  it('adds its view to the query unless the query names one', () => {
    const entry = { view: 'methodology' as const, lang: 'en' as const, root: '../' };
    expect(withEntryView('', entry)).toBe('?view=methodology');
    expect(withEntryView('?shift=50', entry)).toBe('?shift=50&view=methodology');
    expect(withEntryView('?view=explore', entry)).toBe('?view=explore');
    expect(withEntryView('?shift=50', null)).toBe('?shift=50');
  });

  it('finds the site root from an entry page, so data is never fetched under /fr/', () => {
    const fr = '{"view":"explore","lang":"fr","root":"../"}';
    expect(siteRoot(fr, 'https://planetshift.org/fr/')).toBe('https://planetshift.org/');
    expect(
      siteRoot(
        '{"view":"methodology","lang":"fr","root":"../../"}',
        'https://planetshift.org/fr/methodology/?a=1',
      ),
    ).toBe('https://planetshift.org/');
    expect(siteRoot(null, 'https://planetshift.org/?shift=50')).toBe('https://planetshift.org/');
  });
});
