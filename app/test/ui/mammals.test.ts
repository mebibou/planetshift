import { describe, expect, it } from 'vitest';
import { mammalStat } from '../../src/app/summary';
import { translator } from '../../src/i18n/i18n';

const ratio = { farmedBefore: 642e6, farmedAfter: 342e6, wild: 61e6, before: 10.52, after: 5.61 };
const plain = (s: string | undefined) => s?.replace(/\u00a0/g, ' ');

describe('the farmed mammals figure', () => {
  it('gives farmed mammals for each wild one, today and with the levers, and the tonnes', () => {
    const s = mammalStat(translator('en'), 'en-GB', ratio);
    expect(s.label).toBe('Farmed mammals to wild ones, by weight');
    expect(s.value).toBe('10.5 to 1 → 5.6 to 1');
    expect(plain(s.detail)).toBe(
      'farmed 642 Mt → 342 Mt of live weight once the levers are in full; wild, on land and at sea, 61 Mt (Greenspoon et al. 2023)',
    );
  });

  it('reads in French', () => {
    expect(mammalStat(translator('fr'), 'fr-FR', ratio).value).toBe('10,5 pour 1 → 5,6 pour 1');
  });
});
