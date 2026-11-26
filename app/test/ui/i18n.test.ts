import { describe, expect, it } from 'vitest';
import { flatten, interpolate, lookup, placeholders } from '../../src/i18n/dict';
import { DICTIONARIES } from '../../src/i18n/i18n';
import { ANIMAL_GROUPS, PLANT_GROUPS } from '../../src/data/types';
import { SECTIONS, sectionTitleKey } from '../../src/methodology/sections';
import { LAYERS, GAS_CHOICES, WASTE_OF } from '../../src/map/layers';
import { CHARTS } from '../../src/app/url';
import { TIERS } from '../../src/map/sources';
import { FAMILIES, familyLabel, LEVERS, PANEL_MODULES } from '../../src/levers/registry';
import { OPTIONS } from '../../src/model/options';

const EN = DICTIONARIES.en;
const FR = DICTIONARIES.fr;

describe('dictionaries', () => {
  it('have the same keys in English and French', () => {
    expect(Object.keys(FR).sort()).toEqual(Object.keys(EN).sort());
  });

  it('have the same placeholders for each key', () => {
    Object.keys(EN).forEach((key) =>
      expect([key, placeholders(FR[key] ?? '')]).toEqual([key, placeholders(EN[key] ?? '')]),
    );
  });

  it('have no empty text', () => {
    [...Object.values(EN), ...Object.values(FR)].forEach((v) => expect(v.trim()).not.toBe(''));
  });

  it('name every group, gas, tier, chart tab and its download, layer, option, section, lever and family', () => {
    const keys = [
      ...['all', ...ANIMAL_GROUPS, ...PLANT_GROUPS].map((g) => `groups.${g}`),
      ...GAS_CHOICES.map((g) => `gases.${g}`),
      ...TIERS.map((t) => `tiers.${t}`),
      ...CHARTS.flatMap((c) => [`charts.tabs.${c}`, `download.chartText.${c}`]),
      ...LAYERS.flatMap((l) => [
        `map.layers.${l}`,
        ...(l === 'waste' ? WASTE_OF.map((w) => `map.notes.waste.${w}`) : [`map.notes.${l}`]),
      ]),
      ...OPTIONS.flatMap(({ texts, values }) => [
        `${texts}.label`,
        `${texts}.hint`,
        ...values.map((v) => `${texts}.${v}`),
      ]),
      ...SECTIONS.map(sectionTitleKey),
      ...LEVERS.flatMap((l) => [l.ui.label, l.ui.hint]),
      ...PANEL_MODULES.flatMap((m) => [`levers.${m.id}.title`, `levers.${m.id}.description`]),
      ...FAMILIES.map(familyLabel),
    ];
    expect(keys.filter((k) => !(k in EN))).toEqual([]);
  });
});

describe('dict helpers', () => {
  it('flattens nested keys', () => {
    expect(flatten({ a: { b: 'x', c: { d: 'y' } }, e: 'z' })).toEqual({
      'a.b': 'x',
      'a.c.d': 'y',
      e: 'z',
    });
  });

  it('interpolates known placeholders and leaves others', () => {
    expect(interpolate('{a} and {b}', { a: 1 })).toBe('1 and {b}');
  });

  it('falls back to the next dictionary, then the key', () => {
    expect(lookup([{}, { k: 'en' }], 'k')).toBe('en');
    expect(lookup([{}, {}], 'missing')).toBe('missing');
  });
});
