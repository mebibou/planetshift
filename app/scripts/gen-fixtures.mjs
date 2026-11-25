// Writes small but plausible fixtures for Planetshift. Usage: node gen-fixtures.mjs <out dir>
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2];
mkdirSync(out, { recursive: true });
const write = (name, value) =>
  writeFileSync(join(out, name), `${JSON.stringify(value, null, 2)}\n`);
const r = (x, d = 0) => Math.round(x * 10 ** d) / 10 ** d;
const BASE = 2022;
const years = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

write('meta.json', {
  baseYear: BASE,
  builtAt: '2026-11-21',
  sources: [
    {
      id: 'fixture',
      name: 'Planetshift test fixture (synthetic, plausible magnitudes)',
      version: '1',
      url: 'https://www.fao.org/faostat/en/#data/FBS',
      licence: 'CC BY 4.0',
    },
  ],
});

const countryDefs = [
  ['FRA', 68, 'France', 'France', 'Europe', true, 66.3e6, 0.002],
  [
    'USA',
    231,
    'United States of America',
    "États-Unis d'Amérique",
    'Americas',
    true,
    338.3e6,
    0.005,
  ],
  ['IND', 100, 'India', 'Inde', 'Asia', false, 1417.2e6, 0.007],
  ['BRA', 21, 'Brazil', 'Brésil', 'Americas', false, 215.3e6, 0.004],
  ['NGA', 159, 'Nigeria', 'Nigéria', 'Africa', false, 218.5e6, 0.022],
];
write(
  'countries.json',
  countryDefs.map(([iso3, fao, en, fr, region, highIncome, pop, growth]) => ({
    iso3,
    fao,
    name: { en, fr },
    region,
    highIncome,
    population: Object.fromEntries(
      years(BASE, 2100).map((y) => [
        String(y),
        r(pop * (1 + growth * (1 - (y - BASE) / 80)) ** (y - BASE)),
      ]),
    ),
  })),
);

// code, en, fr, group, animal, kcal/t, protein t/t
const itemDefs = [
  [2511, 'Wheat and products', 'Blé et produits', 'cereals', false, 3.34e6, 0.105],
  [2514, 'Maize and products', 'Maïs et produits', 'cereals', false, 3.6e6, 0.09],
  [2516, 'Oats', 'Avoine', 'cereals', false, 3.0e6, 0.1],
  [2807, 'Rice and products', 'Riz et produits', 'rice', false, 3.6e6, 0.07],
  [2546, 'Beans', 'Haricots', 'pulses', false, 3.4e6, 0.21],
  [2555, 'Soyabeans', 'Soja', 'oilCrops', false, 3.9e6, 0.35],
  [2571, 'Soyabean Oil', 'Huile de soja', 'oilCrops', false, 8.84e6, 0],
  [
    2531,
    'Potatoes and products',
    'Pommes de terre et produits',
    'rootsTubers',
    false,
    0.67e6,
    0.016,
  ],
  [2601, 'Tomatoes and products', 'Tomates et produits', 'vegetables', false, 0.17e6, 0.009],
  [2615, 'Bananas', 'Bananes', 'fruit', false, 0.6e6, 0.008],
  [2536, 'Sugar cane', 'Canne à sucre', 'sugarCrops', false, 0.3e6, 0],
  [2731, 'Bovine Meat', 'Viande de bovins', 'ruminantMeat', true, 2.0e6, 0.15],
  [2732, 'Mutton & Goat Meat', "Viande d'ovins et de caprins", 'ruminantMeat', true, 2.2e6, 0.14],
  [2733, 'Pigmeat', 'Viande de porc', 'pigMeat', true, 3.0e6, 0.13],
  [2734, 'Poultry Meat', 'Viande de volaille', 'poultryMeat', true, 1.6e6, 0.17],
  [2848, 'Milk - Excluding Butter', 'Lait - Excl. beurre', 'dairy', true, 0.6e6, 0.032],
  [2744, 'Eggs', 'Œufs', 'eggs', true, 1.3e6, 0.11],
  [2761, 'Freshwater Fish', 'Poissons eau douce', 'seafood', true, 0.76e6, 0.108],
  [2763, 'Pelagic Fish', 'Poissons pélagiques', 'seafood', true, 1.0e6, 0.12],
];
write(
  'items.json',
  itemDefs.map(([code, en, fr, group, animal, kcal, protein]) => ({
    code,
    name: { en, fr },
    group,
    animal,
    kcalPerTonne: kcal,
    proteinPerTonne: protein,
  })),
);

// per capita kg/yr: [food, feed, processing, other, self-sufficiency]
const percap = {
  FRA: {
    2571: [1.5, 0, 0, 1, 0.3],
    2511: [110, 90, 5, 5, 2.0],
    2514: [10, 150, 10, 5, 1.5],
    2516: [3, 5, 0, 0, 1.0],
    2807: [7, 0, 0, 0, 0.1],
    2546: [2, 0, 0, 0, 0.5],
    2555: [1, 50, 5, 0, 0.3],
    2531: [55, 3, 5, 0, 1.5],
    2601: [15, 0, 0, 0, 0.7],
    2615: [12, 0, 0, 0, 0.1],
    2731: [23, 0, 0, 0, 1.0],
    2732: [2.5, 0, 0, 0, 0.5],
    2733: [33, 0, 0, 0, 1.0],
    2734: [28, 0, 0, 0, 0.9],
    2848: [260, 5, 0, 0, 1.2],
    2744: [13, 0, 0, 0, 1.0],
    2761: [4, 0, 0, 0, 0.4],
    2763: [10, 2, 0, 0, 0.6],
  },
  USA: {
    2571: [11, 0, 0, 3, 1.1],
    2511: [80, 20, 5, 5, 1.7],
    2514: [15, 400, 20, 400, 1.2],
    2516: [2, 5, 0, 0, 0.3],
    2807: [10, 1, 0, 0, 1.5],
    2546: [4, 0, 0, 0, 1.2],
    2555: [2, 60, 20, 5, 2.0],
    2531: [50, 2, 5, 0, 1.0],
    2601: [20, 0, 0, 0, 0.8],
    2615: [12, 0, 0, 0, 0.01],
    2536: [0.5, 0, 90, 0, 1.0],
    2731: [37, 0, 0, 0, 0.95],
    2732: [0.5, 0, 0, 0, 0.4],
    2733: [30, 0, 0, 0, 1.2],
    2734: [57, 0, 0, 0, 1.15],
    2848: [250, 3, 0, 0, 1.05],
    2744: [16, 0, 0, 0, 1.0],
    2761: [5, 0, 0, 0, 0.5],
    2763: [8, 3, 0, 0, 1.0],
  },
  IND: {
    2571: [3.5, 0, 0, 0, 0.3],
    2511: [60, 5, 2, 0, 1.05],
    2514: [6, 10, 2, 1, 1.1],
    2807: [70, 2, 0, 1, 1.25],
    2546: [4, 0, 0, 0, 0.9],
    2555: [1, 5, 2, 0, 1.0],
    2531: [25, 0, 1, 0, 1.0],
    2601: [15, 0, 0, 0, 1.0],
    2615: [22, 0, 0, 0, 1.0],
    2536: [5, 0, 250, 5, 1.0],
    2731: [1.5, 0, 0, 0, 2.5],
    2732: [0.6, 0, 0, 0, 1.0],
    2733: [0.2, 0, 0, 0, 1.0],
    2734: [3, 0, 0, 0, 1.0],
    2848: [120, 2, 0, 0, 1.0],
    2744: [3.5, 0, 0, 0, 1.0],
    2761: [6, 0, 0, 0, 1.0],
    2763: [2, 0.5, 0, 0, 1.2],
  },
  BRA: {
    2571: [17, 0, 0, 4, 1.4],
    2511: [50, 2, 2, 0, 0.5],
    2514: [20, 250, 10, 30, 1.6],
    2516: [0.5, 1, 0, 0, 0.9],
    2807: [33, 0, 0, 0, 1.0],
    2546: [14, 0, 0, 0, 1.0],
    2555: [2, 80, 30, 10, 2.5],
    2531: [17, 0, 1, 0, 1.0],
    2601: [18, 0, 0, 0, 1.0],
    2615: [28, 0, 0, 0, 1.0],
    2536: [2, 0, 3000, 0, 1.0],
    2731: [35, 0, 0, 0, 1.35],
    2732: [0.5, 0, 0, 0, 1.0],
    2733: [15, 0, 0, 0, 1.2],
    2734: [48, 0, 0, 0, 1.45],
    2848: [160, 2, 0, 0, 0.97],
    2744: [12, 0, 0, 0, 1.0],
    2761: [3, 0, 0, 0, 0.9],
    2763: [2, 1, 0, 0, 0.8],
  },
  NGA: {
    2571: [1, 0, 0, 0, 0.5],
    2511: [20, 0, 0, 0, 0.01],
    2514: [25, 30, 2, 0, 0.95],
    2807: [30, 0, 0, 0, 0.6],
    2546: [15, 0, 0, 0, 1.0],
    2555: [2, 5, 1, 0, 1.0],
    2531: [5, 0, 0, 0, 1.0],
    2601: [15, 0, 0, 0, 1.0],
    2615: [10, 0, 0, 0, 1.0],
    2536: [2, 0, 5, 0, 1.0],
    2731: [2, 0, 0, 0, 0.95],
    2732: [1.5, 0, 0, 0, 1.0],
    2733: [1, 0, 0, 0, 1.0],
    2734: [1.3, 0, 0, 0, 0.98],
    2848: [6, 0, 0, 0, 0.4],
    2744: [3, 0, 0, 0, 1.0],
    2761: [6, 0, 0, 0, 0.7],
    2763: [4, 0, 0, 0, 0.4],
  },
};
const itemGroup = Object.fromEntries(itemDefs.map((d) => [d[0], d[3]]));
const lossRate = (g) =>
  ({ vegetables: 0.1, fruit: 0.1, rootsTubers: 0.1, dairy: 0.01 })[g] ??
  (['ruminantMeat', 'pigMeat', 'poultryMeat', 'eggs'].includes(g) ? 0.02 : 0.05);
const seedRate = (code, g) =>
  g === 'cereals' || g === 'rice'
    ? 0.03
    : code === 2531
      ? 0.08
      : g === 'pulses'
        ? 0.03
        : code === 2555
          ? 0.02
          : 0;
const popOf = Object.fromEntries(countryDefs.map((c) => [c[0], c[6]]));

const row = (iso3, code, [food, feed, processing, other, ss]) => {
  const pop = popOf[iso3];
  const t = (kg) => (kg * pop) / 1000;
  const g = itemGroup[code];
  const end = t(food) + t(feed) + t(processing) + t(other);
  const supply = end / (1 - lossRate(g) - seedRate(code, g));
  const production = supply * ss;
  return {
    production: r(production),
    imports: r(Math.max(0, supply - production)),
    exports: r(Math.max(0, production - supply)),
    food: r(t(food)),
    feed: r(t(feed)),
    losses: r(supply * lossRate(g)),
    processing: r(t(processing)),
    seed: r(supply * seedRate(code, g)),
    other: r(t(other)),
  };
};
write('supply.json', {
  baseYear: BASE,
  byCountry: Object.fromEntries(
    Object.entries(percap).map(([iso3, items]) => [
      iso3,
      Object.fromEntries(
        Object.entries(items).map(([code, v]) => [code, row(iso3, Number(code), v)]),
      ),
    ]),
  ),
});

// farm-gate kg per tonne: [co2, ch4, n2o]; country multipliers on ruminants and milk
const farmGate = {
  2511: [100, 0.3, 0.9],
  2514: [90, 0.3, 0.8],
  2516: [80, 0.3, 0.8],
  2807: [100, 40, 0.4],
  2546: [50, 0.2, 0.5],
  2555: [60, 0.2, 0.4],
  2571: [400, 0.5, 2.0],
  2531: [30, 0.1, 0.15],
  2601: [40, 0.1, 0.2],
  2615: [30, 0.1, 0.2],
  2536: [5, 0.5, 0.06],
  2731: [1500, 800, 15],
  2732: [1200, 900, 14],
  2733: [300, 60, 2],
  2734: [300, 5, 1.5],
  2848: [60, 25, 0.6],
  2744: [300, 3, 1.2],
  2761: [0, 0, 2.1],
  2763: [0, 0, 0],
};
// fish: fuel and the farm's energy only with inputs (seafood.md)
const seafoodCradle = { 2761: [420, 0, 2.1], 2763: [800, 0, 0] };
const ruminantFactor = { FRA: 1, USA: 0.8, IND: 1.8, BRA: 2.0, NGA: 2.5 };
const milkFactor = { FRA: 1, USA: 0.8, IND: 1.8, BRA: 1.8, NGA: 4.8 };
const tierOf = { FRA: 1, USA: 2, IND: 3, BRA: 4, NGA: 5 };
const intensitySources = [
  'https://hestia.earth/',
  'https://www.fao.org/faostat/en/#data/GLE',
  'https://doi.org/10.1126/science.aaq0216',
  'https://www.fao.org/faostat/en/#data/GCE',
];
const sourceOf = (tier) => (tier <= 2 ? 0 : Math.min(tier, 5) - 2);
const groupFactor = { ruminantMeat: ruminantFactor, dairy: milkFactor };
// Bananas (2615) come one tier below the country's other items.
const tierAt = (iso3, code) => Math.min(6, tierOf[iso3] + (code === 2615 ? 1 : 0));
const intensity = (iso3, code) => {
  const [co2, ch4, n2o] = farmGate[code];
  const f = groupFactor[itemGroup[code]]?.[iso3] ?? 1;
  const tier = tierAt(iso3, code);
  const mk = (kg) => ({
    kgPerTonne: { co2: r(kg[0], 2), ch4: r(kg[1], 3), n2o: r(kg[2], 3) },
    tier,
    source: sourceOf(tier),
  });
  const farm = mk([co2 * f, ch4 * f, n2o * f]);
  const cradle = mk(
    seafoodCradle[code] ?? [co2 * f * 3 + 150, ch4 * f * 1.05 + 0.5, n2o * f * 1.1],
  );
  return iso3 === 'NGA' && code === 2615
    ? { farmGate: farm }
    : { farmGate: farm, cradleToFarmGate: cradle };
};
write('intensities.json', {
  sources: intensitySources,
  byCountry: Object.fromEntries(
    Object.entries(percap).map(([iso3, items]) => [
      iso3,
      Object.fromEntries(Object.keys(items).map((code) => [code, intensity(iso3, Number(code))])),
    ]),
  ),
});

// aquaculture takes 4% of every feed crop, the other groups keeping their proportions
const share = (ruminantMeat, pigMeat, poultryMeat, dairy, eggs) => ({
  ruminantMeat: r(ruminantMeat * 0.96, 4),
  pigMeat: r(pigMeat * 0.96, 4),
  poultryMeat: r(poultryMeat * 0.96, 4),
  dairy: r(dairy * 0.96, 4),
  eggs: r(eggs * 0.96, 4),
  seafood: 0.04,
});
const fishmeal = { pigMeat: 0.23, poultryMeat: 0.07, seafood: 0.7 };
write('feed.json', {
  shares: {
    species: {
      World: {
        2511: share(0.05, 0.35, 0.4, 0.1, 0.1),
        2514: share(0.1, 0.3, 0.45, 0.1, 0.05),
        2516: share(0.3, 0.1, 0.1, 0.4, 0.1),
        2807: share(0, 0.4, 0.5, 0, 0.1),
        2555: share(0.06, 0.25, 0.45, 0.12, 0.12),
        2531: share(0.2, 0.6, 0, 0.2, 0),
        2848: share(0.5, 0.2, 0, 0.3, 0),
        2763: fishmeal,
      },
      Europe: { 2514: share(0.1, 0.3, 0.25, 0.3, 0.05), 2511: share(0.05, 0.4, 0.3, 0.15, 0.1) },
    },
    gleam: {
      World: {
        2511: share(0.08, 0.32, 0.35, 0.15, 0.1),
        2514: share(0.15, 0.28, 0.35, 0.15, 0.07),
        2516: share(0.35, 0.1, 0.05, 0.45, 0.05),
        2807: share(0, 0.45, 0.45, 0, 0.1),
        2555: share(0.08, 0.3, 0.38, 0.14, 0.1),
        2531: share(0.25, 0.55, 0, 0.2, 0),
        2848: share(0.55, 0.15, 0, 0.3, 0),
        2763: fishmeal,
      },
      Europe: { 2514: share(0.12, 0.28, 0.22, 0.33, 0.05), 2555: share(0.05, 0.3, 0.3, 0.25, 0.1) },
      Asia: { 2514: share(0.05, 0.35, 0.4, 0.1, 0.1), 2807: share(0, 0.5, 0.4, 0, 0.1) },
    },
  },
});

// land: hectares harvested per tonne (1 / yield), soybean oil with a third of the soybean area
// of the 5.5 t of beans it is pressed from; pastures in ha with the share grazed by each
// ruminant group; natural regrowth in t CO₂/ha/yr.
const yields = {
  2511: { FRA: 7.0, USA: 3.1, IND: 3.5, BRA: 2.7, NGA: 1.5 },
  2514: { FRA: 9.0, USA: 11.0, IND: 3.2, BRA: 5.5, NGA: 2.0 },
  2516: { FRA: 4.5, USA: 3.3, BRA: 2.4 },
  2807: { FRA: 5.5, USA: 8.5, IND: 4.1, BRA: 6.5, NGA: 2.0 },
  2546: { FRA: 2.2, USA: 2.1, IND: 0.6, BRA: 1.1, NGA: 0.9 },
  2555: { FRA: 2.8, USA: 3.4, IND: 1.0, BRA: 3.3, NGA: 1.0 },
  2531: { FRA: 43, USA: 50, IND: 24, BRA: 33, NGA: 6 },
  2601: { FRA: 140, USA: 95, IND: 26, BRA: 70, NGA: 7 },
  2615: { FRA: 20, USA: 20, IND: 37, BRA: 15, NGA: 6 },
  2536: { USA: 80, IND: 80, BRA: 75, NGA: 20 },
};
const haPerTonne = (iso3) => {
  const crops = Object.fromEntries(
    Object.entries(yields)
      .filter(([code, byCountry]) => byCountry[iso3] && percap[iso3][code])
      .map(([code, byCountry]) => [code, r(1 / byCountry[iso3], 4)]),
  );
  return crops['2555'] ? { ...crops, 2571: r((crops['2555'] * 5.5) / 3, 4) } : crops;
};
const pastures = {
  FRA: [9.5e6, 0.55, 0.45],
  USA: [245e6, 0.85, 0.15],
  IND: [10.3e6, 0.3, 0.7],
  BRA: [173e6, 0.88, 0.12],
  NGA: [30.5e6, 0.9, 0.1],
};
const regrowth = {
  FRA: [3.5, 1.5, 6.0],
  USA: [3.0, 1.2, 5.5],
  IND: [4.5, 2.0, 8.0],
  BRA: [6.0, 3.0, 11.0],
  NGA: [4.0, 1.5, 7.5],
};
write('land.json', {
  cropHaPerTonne: Object.fromEntries(Object.keys(percap).map((iso3) => [iso3, haPerTonne(iso3)])),
  pasture: Object.fromEntries(
    Object.entries(pastures).map(([iso3, [ha, ruminantMeat, dairy]]) => [
      iso3,
      { ha, shares: { ruminantMeat, dairy } },
    ]),
  ),
  regrowth: Object.fromEntries(
    Object.entries(regrowth).map(([iso3, [median, low, high]]) => [iso3, { median, low, high }]),
  ),
  regrowthYears: 30,
  // albedo forcing of a hectare of farmland, W/m² of global mean: more in the north
  albedoPerHa: { FRA: -6e-11, USA: -6e-11, IND: -2e-11, BRA: -2e-11, NGA: -2e-11 },
  // FAOSTAT land area, ha
  landArea: { FRA: 5.47e7, USA: 9.15e8, IND: 2.97e8, BRA: 8.36e8, NGA: 9.1e7 },
});

// climate
const H = 100;
const hs = years(0, H);
const agtpCo2 = hs.map((h) => 5.0e-16 * (1 - 0.3 * Math.exp(-h / 5)));
const agtpCh4 = hs.map(
  (h) =>
    2e-13 * (Math.exp(-h / 12) - Math.exp(-h / 1.5)) +
    3e-15 * (1 - Math.exp(-h / 5)) * Math.exp(-h / 400),
);
const agtpN2o = hs.map((h) => 1.6e-13 * (1 - Math.exp(-h / 4)) * Math.exp(-h / 150) + 1e-15);
// HFC-134a: FaIR's 1.4e-12 at 20 years and 1.6e-13 at 100.
const agtpHfc = hs.map(
  (h) => 4e-12 * (Math.exp(-h / 14) - Math.exp(-h / 3)) + 1.6e-13 * (1 - Math.exp(-h / 10)),
);
const band = (m) => ({
  median: m.map((v) => Number(v.toPrecision(4))),
  p05: m.map((v) => Number((v * 0.7).toPrecision(4))),
  p95: m.map((v) => Number((v * 1.4).toPrecision(4))),
});
const medianOnly = (m) => ({
  median: m.map((v) => Number((v * 0.95).toPrecision(4))),
  p05: [],
  p95: [],
});

const hist = (y) => 1.25 * Math.max(0, (y - 1850) / 174) ** 2.6 + 0.08 * Math.sin(y / 3.7);
const observed = (a, b, bias) => ({
  years: years(a, b),
  values: years(a, b).map((y) => r(hist(y) + bias, 3)),
});
const sspEnd = { ssp126: [1.75, 1.6], ssp245: [2.0, 2.7], ssp370: [2.15, 3.6] };
const projected = (ssp, y) => {
  const t2024 = hist(2024);
  const [t2050, t2100] = sspEnd[ssp];
  return y <= 2024
    ? hist(y)
    : y <= 2050
      ? t2024 + ((t2050 - t2024) * (y - 2024)) / 26
      : t2050 + ((t2100 - t2050) * (y - 2050)) / 50;
};
const bandSeries = (f, a, b, spread) => {
  const ys = years(a, b);
  return {
    years: ys,
    median: ys.map((y) => r(f(y), 4)),
    p05: ys.map((y) => r(f(y) - spread(y), 4)),
    p95: ys.map((y) => r(f(y) + spread(y), 4)),
  };
};
const spreadT = (y) => 0.05 + 0.4 * Math.max(0, (y - 2000) / 100);
const ssps = ['ssp126', 'ssp245', 'ssp370'];
const futureFactor = {
  ssp126: { co2: 0.7, ch4: 0.75, n2o: 0.85 },
  ssp245: { co2: 1.05, ch4: 1.1, n2o: 1.1 },
  ssp370: { co2: 1.2, ch4: 1.3, n2o: 1.25 },
};
const ag2022 = { co2: 2.0e11, ch4: 1.45e11, n2o: 7.5e9 };
const agEmission = (ssp, gas, y) => {
  const h = ag2022[gas] * (0.2 + 0.8 * Math.max(0, (y - 1850) / 172) ** 1.6);
  return y <= BASE
    ? h
    : ag2022[gas] * (1 + ((futureFactor[ssp][gas] - 1) * (y - BASE)) / (2050 - BASE));
};
const agWarming = { ssp126: 0.36, ssp245: 0.42, ssp370: 0.47 };
const causeShare = {
  fossilIndustry: 0.75,
  agriculture: 0.25,
  landUse: 0.12,
  airPollution: -0.45,
  other: 0.33,
};
// Each greenhouse gas's warming by the causes that emit it, a share of the projected warming.
const gasShare = {
  co2: { fossilIndustry: 0.66, agriculture: 0.01, landUse: 0.12, other: 0.02 },
  ch4: { fossilIndustry: 0.08, agriculture: 0.17, other: 0.07 },
  n2o: { fossilIndustry: 0.01, agriculture: 0.06, other: 0.01 },
  hfc: { other: 0.012 },
};
// Natural forcing alone: a flat line near zero, with a dip after each large eruption.
const natural = (y) =>
  0.02 * Math.sin((2 * Math.PI * (y - 1850)) / 11) -
  [1883, 1902, 1963, 1982, 1991].reduce(
    (s, e) => s + (y >= e ? 0.25 * Math.exp(-(y - e) / 1.5) : 0),
    0,
  );
write('climate.json', {
  observed: { hadcrut5: observed(1850, 2024, 0), berkeley: observed(1850, 2025, 0.03) },
  agtp: {
    fair: { co2: band(agtpCo2), ch4: band(agtpCh4), n2o: band(agtpN2o), hfc: band(agtpHfc) },
    ar6: {
      co2: medianOnly(agtpCo2),
      ch4: medianOnly(agtpCh4),
      n2o: medianOnly(agtpN2o),
      hfc: medianOnly(agtpHfc),
    },
  },
  scenarioTemperature: Object.fromEntries(
    ssps.map((s) => [s, bandSeries((y) => projected(s, y), 1850, 2100, spreadT)]),
  ),
  agricultureEmissions: Object.fromEntries(
    ssps.map((s) => [
      s,
      Object.fromEntries(
        ['co2', 'ch4', 'n2o'].map((g) => [
          g,
          {
            years: years(1850, 2100),
            values: years(1850, 2100).map((y) => Number(agEmission(s, g, y).toPrecision(5))),
          },
        ]),
      ),
    ]),
  ),
  attribution: Object.fromEntries(
    ssps.map((s) => [
      s,
      Object.fromEntries([
        ...Object.entries(causeShare).map(([cause, k]) => [
          cause,
          cause === 'agriculture'
            ? bandSeries(
                (y) =>
                  y <= 2024
                    ? 0.3 * Math.max(0, (y - 1850) / 174) ** 1.8
                    : 0.3 + ((agWarming[s] - 0.3) * (y - 2024)) / 26,
                1850,
                2100,
                (y) => 0.02 + 0.1 * Math.max(0, (y - 1950) / 100),
              )
            : bandSeries(
                (y) => k * projected(s, y),
                1850,
                2100,
                (y) => Math.abs(k) * spreadT(y),
              ),
        ]),
        ['natural', bandSeries(natural, 1850, 2100, () => 0.04)],
      ]),
    ]),
  ),
  attributionByGas: Object.fromEntries(
    ssps.map((s) => [
      s,
      Object.fromEntries(
        Object.entries(gasShare).map(([gas, shares]) => [
          gas,
          Object.fromEntries(
            Object.entries(shares).map(([cause, k]) => [
              cause,
              bandSeries(
                (y) => k * projected(s, y),
                1850,
                2100,
                (y) => k * spreadT(y),
              ),
            ]),
          ),
        ]),
      ),
    ]),
  ),
  naturalOnly: bandSeries(natural, 1850, 2100, () => 0.04),
  permafrost: {
    kgCPerDegree: { median: 20.8e12, low: 3.8e12, high: 48.3e12 },
    ch4Share: 0.1346,
    releaseYears: 20,
    source: 'IPCC AR6 WG1 Chapter 5, Table 5.7 and Box 5.1 (doi:10.1017/9781009157896.007)',
  },
  shippingSulphur2020: {
    years: [2020, 2050, 2100],
    erf: Object.fromEntries(
      ['ssp126', 'ssp245', 'ssp370'].map((ssp, i) => [
        ssp,
        {
          median: [0.12, 0.12 - 0.02 * (1 - i), 0.12 - 0.04 * (1 - i)],
          low: [0.08, 0.08, 0.08],
          high: [0.14, 0.14, 0.14],
        },
      ]),
    ),
    source: 'Planetshift test fixture: 0.12 W/m² (0.08–0.14) from 2020',
  },
});

// El Niño and La Niña: an annual index swinging every few years, classified at ±0.5 °C.
const ensoYears = years(1951, 2025);
const oni = ensoYears.map((y) => r(1.1 * Math.sin((2 * Math.PI * (y - 1951)) / 4.3), 2));
write('enso.json', {
  years: ensoYears,
  oni,
  phase: oni.map((v) => (v >= 0.5 ? 'elNino' : v <= -0.5 ? 'laNina' : 'neutral')),
  threshold: 0.5,
  source: 'Synthetic fixture',
});

// Impacts at warming levels: the real file's groups and levels, with round synthetic values.
const impactRow = (id, unit, values) => ({ id, unit, ref: 'Synthetic fixture', ...values });
write('impacts.json', {
  groups: [
    {
      id: 'wgi',
      url: 'https://example.org/wgi',
      jointly: false,
      levels: [1, 1.5, 2, 3, 4],
      rows: [
        impactRow('hot10', 'times', {
          mid: [3, 4, 6, 8, 10],
          low: [2, 3, 4, 6, 8],
          high: [4, 5, 7, 9, 11],
        }),
        impactRow('hot50', 'times', {
          mid: [5, 9, 14, 27, 39],
          low: [2, 4, 7, 15, 27],
          high: [6, 11, 17, 31, 41],
        }),
        impactRow('rain10', 'times', {
          mid: [1.3, 1.5, 1.7, 2.2, 2.7],
          low: [1.2, 1.4, 1.6, 1.9, 2.3],
          high: [1.4, 1.7, 2, 2.7, 3.6],
        }),
        impactRow('drought10', 'times', {
          mid: [1.7, 2, 2.4, 3.2, 4.1],
          low: [0.7, 1, 1.3, 1.4, 1.7],
          high: [4, 5, 6, 8, 7],
        }),
      ],
    },
    {
      id: 'wgii',
      url: 'https://example.org/wgii',
      jointly: false,
      levels: [1.5, 2, 3, 4, 5],
      rows: [
        impactRow('extinction', 'percent', { low: [3, 3, 3, 3, 3], high: [14, 18, 29, 39, 48] }),
      ],
    },
    {
      id: 'sr15',
      url: 'https://example.org/sr15',
      jointly: true,
      levels: [1.5, 2],
      rows: [
        impactRow('coral', 'percent', { low: [70, 99], high: [90, 100] }),
        impactRow('arctic', 'perCentury', { mid: [1, 10] }),
        impactRow('rangeInsects', 'percent', { mid: [6, 18] }),
        impactRow('rangePlants', 'percent', { mid: [8, 16] }),
        impactRow('rangeVertebrates', 'percent', { mid: [4, 8] }),
        impactRow('fishery', 'megatonnes', { mid: [1.5, 3] }),
      ],
    },
    {
      id: 'heatwave',
      url: 'https://example.org/heatwave',
      jointly: true,
      levels: [1.5, 2],
      rows: [impactRow('heatwave', 'percent', { mid: [14, 37], low: [9, 32], high: [18, 45] })],
    },
  ],
});

// TopoJSON: one rough rectangle per country, absolute coordinates (no transform), clockwise rings for d3-geo.
const rects = {
  FRA: [-5, 42, 8, 51],
  USA: [-125, 25, -67, 49],
  IND: [68, 8, 97, 35],
  BRA: [-74, -33, -35, 5],
  NGA: [3, 4, 14, 14],
};
const isos = Object.keys(rects);
write('world.topo.json', {
  type: 'Topology',
  bbox: [-125, -33, 97, 51],
  objects: {
    countries: {
      type: 'GeometryCollection',
      geometries: isos.map((iso3, i) => ({
        type: 'Polygon',
        arcs: [[i]],
        id: iso3,
        properties: { iso3, name: countryDefs.find((c) => c[0] === iso3)[2] },
      })),
    },
  },
  arcs: isos.map((iso3) => {
    const [x0, y0, x1, y1] = rects[iso3];
    return [
      [x0, y0],
      [x0, y1],
      [x1, y1],
      [x1, y0],
      [x0, y0],
    ];
  }),
});

// breakdown: the share of each gas of an item's intensity by source, by kind of item; France's
// beef has its own split, every other country and item the world's.
const split = (kind, scope) => {
  const co2 =
    scope === 'farmGate'
      ? { syntheticFertiliser: 0.6, other: 0.4 }
      : { fuel: 0.2, electricity: 0.1, inputsManufacture: 0.5, other: 0.2 };
  return {
    ruminant: {
      co2,
      ch4: { enteric: 0.85, manure: 0.15 },
      n2o: { manure: 0.5, organicFertiliser: 0.2, syntheticFertiliser: 0.2, residues: 0.1 },
    },
    monogastric: {
      co2,
      ch4: { manure: 0.8, enteric: 0.2 },
      n2o: { manure: 0.6, syntheticFertiliser: 0.3, other: 0.1 },
    },
    rice: {
      co2,
      ch4: { rice: 0.95, residues: 0.05 },
      n2o: { syntheticFertiliser: 0.6, organicFertiliser: 0.1, residues: 0.3 },
    },
    seafood: { co2: { fuel: 0.8, electricity: 0.2 }, n2o: { other: 1 } },
    crop: {
      co2,
      ch4: { residues: 0.6, other: 0.4 },
      n2o: { syntheticFertiliser: 0.65, organicFertiliser: 0.1, residues: 0.25 },
    },
  }[kind];
};
const kindOf = (group) =>
  group === 'ruminantMeat' || group === 'dairy'
    ? 'ruminant'
    : ['pigMeat', 'poultryMeat', 'eggs'].includes(group)
      ? 'monogastric'
      : group === 'rice'
        ? 'rice'
        : group === 'seafood'
          ? 'seafood'
          : 'crop';
const scopes = (kind) => ({
  farmGate: split(kind, 'farmGate'),
  cradleToFarmGate: split(kind, 'cradle'),
});
write('breakdown.json', {
  world: Object.fromEntries(itemDefs.map(([code, , , group]) => [code, scopes(kindOf(group))])),
  byCountry: {
    FRA: {
      2731: {
        farmGate: { ...split('ruminant', 'farmGate'), ch4: { enteric: 0.8, manure: 0.2 } },
      },
    },
  },
});

// practices: published reductions, rounded; the share of the targeted emissions that could
// adopt each, higher where farms are housed and fed.
const practice = (sources, gases, reduction, applicable, groups) => ({
  sources,
  gases,
  ...(groups ? { groups } : {}),
  reduction: { median: reduction[0], low: reduction[1], high: reduction[2] },
  applicable,
  source: 'https://doi.org/10.1126/science.aaq0216',
});
write('practices.json', {
  feedAdditives: practice(
    ['enteric'],
    ['ch4'],
    [0.3, 0.2, 0.4],
    { World: 0.3, FRA: 0.6, USA: 0.6 },
    ['ruminantMeat', 'dairy'],
  ),
  breedingAndFeed: practice(['enteric'], ['ch4'], [0.1, 0.05, 0.15], { World: 0.8 }),
  manureManagement: practice(['manure'], ['ch4', 'n2o'], [0.3, 0.15, 0.5], { World: 0.5 }),
  riceWater: practice(['rice'], ['ch4'], [0.35, 0.2, 0.5], { World: 0.6 }),
  nitrogenEfficiency: practice(
    ['syntheticFertiliser', 'organicFertiliser'],
    ['n2o'],
    [0.2, 0.1, 0.3],
    { World: 0.7 },
  ),
  farmEnergy: {
    ...practice(['fuel'], ['co2'], [0.5, 0.3, 0.7], { World: 0.8 }),
    electrified: {
      efficiency: 0.3,
      kwhPerFuelCo2: { World: 1.5 },
      gridRatio: { World: 1, FRA: 0.1, IND: 1.5 },
      kgCo2PerKwh: 0.5,
    },
  },
});

// waste after shops, edible part, kg per person a year
const wasteKg = {
  FRA: [12, 25, 50],
  USA: [15, 40, 60],
  IND: [7, 12, 30],
  BRA: [3, 25, 35],
  NGA: [5, 10, 40],
};
write('waste.json', {
  byCountry: Object.fromEntries(
    Object.entries(wasteKg).map(([iso3, [retail, foodService, household]]) => [
      iso3,
      { retail, foodService, household },
    ]),
  ),
  source: 'https://wedocs.unep.org/20.500.11822/45230',
});

// deforestation CO₂ attributed to commodities, tonnes a year, and the forest area cleared, ha a year
write('deforestation.json', {
  byCountry: {
    BRA: { 2731: 3.0e8, 2555: 1.2e8, 2514: 2.0e7 },
    NGA: { 2514: 2.0e7, 2615: 5.0e6 },
    IND: { 2555: 1.0e7 },
  },
  areaByCountry: {
    BRA: { 2731: 6.0e5, 2555: 2.5e5, 2514: 4.0e4 },
    NGA: { 2514: 6.0e4, 2615: 1.5e4 },
    IND: { 2555: 2.0e4 },
  },
  // CO₂ from drained organic soils, tonnes a year, by the item it is shared to
  drainedByCountry: {
    FRA: { 2731: 2.0e6, 2511: 1.0e6 },
    BRA: { 2731: 1.0e7 },
  },
  years: [2018, 2022],
  source: 'https://doi.org/10.5281/zenodo.10633818',
});

// net CO₂ from all land-use change, tonnes a year; a sink is negative, USA left without data
write('landuse.json', {
  byCountry: { BRA: 1.4e9, NGA: 6.0e7, IND: -5.0e7, FRA: -2.0e6 },
  world: 5.0e9,
  years: [2015, 2024],
  source: 'Synthetic fixture',
});

// farmed mammals' live weight, tonnes by the food group each herd follows; NGA left without data
write('mammals.json', {
  year: 2024,
  byCountry: {
    FRA: { dairy: 1.82e6, ruminantMeat: 6.02e6, pigMeat: 7.6e5, other: 1.2e5 },
    USA: { dairy: 4.8e6, ruminantMeat: 3.14e7, pigMeat: 4.6e6, other: 2.4e6 },
    IND: { dairy: 4.75e7, ruminantMeat: 1.36e7, pigMeat: 2.3e5, other: 1.41e7 },
    BRA: { dairy: 5.2e6, ruminantMeat: 6.99e7, pigMeat: 1.2e6, other: 2.3e6 },
  },
  wild: { land: 2.2e7, marine: 3.9e7 },
  source: 'Synthetic fixture',
});

// species committed to extinction per ha of cropland and pasture, [average, marginal]; NGA left
// without factors
write('species.json', {
  byCountry: {
    FRA: { cropland: [9.7e-6, 1.8e-5], pasture: [3.9e-5, 4.8e-5] },
    USA: { cropland: [5.5e-6, 1.1e-5], pasture: [1.1e-5, 2.0e-5] },
    IND: { cropland: [3.1e-6, 7.2e-6], pasture: [8.0e-6, 1.5e-5] },
    BRA: { cropland: [2.6e-5, 4.9e-5], pasture: [3.1e-5, 6.1e-5] },
  },
  described: 421093,
  fish: { unfished: 3.3e9, fished: 1.1e9 },
  source: 'Synthetic fixture',
});

// food's emissions after the farm: each food's Poore & Nemecek weight at the shared stages, and
// kg of each gas per weighted tonne by country and stage; IND left to the world's
write('chain.json', {
  year: 2024,
  weights: {
    2511: { processing: 0.2, transport: 0.1, packaging: 0.1, retail: 0.05 },
    2731: { processing: 1.8, transport: 0.5, packaging: 0.35, retail: 0.23 },
    2848: { processing: 0.15, transport: 0.1, packaging: 0.1, retail: 0.27 },
  },
  byCountry: {
    FRA: {
      processing: { co2: 350 },
      retail: { co2: 90, hfc: 0.8 },
      transport: { co2: 420 },
      household: { co2: 30 },
      waste: { ch4: 3.8 },
    },
    USA: {
      processing: { co2: 300 },
      transport: { co2: 500 },
      household: { co2: 120 },
      waste: { ch4: 6 },
    },
    BRA: {
      processing: { co2: 200 },
      transport: { co2: 300 },
      household: { co2: 40 },
      waste: { ch4: 5 },
    },
  },
  world: {
    processing: { co2: 350 },
    transport: { co2: 260 },
    household: { co2: 160 },
    waste: { ch4: 6.2 },
  },
});

// where each country's imports come from: France's poultry from Brazil and the United States
write('origins.json', {
  years: [2022, 2024],
  byCountry: {
    FRA: {
      2734: [
        ['BRA', 0.6],
        ['USA', 0.3],
      ],
    },
  },
});

// carbon stored in farmland, t CO₂ per ha a year
const removal = (rate, appliesTo, maxShare, years) => ({
  rate: Object.fromEntries(
    Object.entries(rate).map(([k, [median, low, high]]) => [k, { median, low, high }]),
  ),
  appliesTo,
  maxShare,
  years,
  source: 'https://doi.org/10.1038/s41893-020-00661-7',
});
write('removals.json', {
  coverCrops: removal({ World: [1.1, 0.4, 1.8] }, 'cropland', 0.5, 30),
  agroforestry: removal({ World: [3.0, 1.0, 6.0], BRA: [5.0, 2.0, 9.0] }, 'farmland', 0.1, 30),
  biochar: removal({ World: [1.5, 0.5, 3.0] }, 'cropland', 0.3, 20),
  enhancedWeathering: removal({ World: [1.0, 0.3, 2.0] }, 'cropland', 0.3, 30),
});

// CO₂ uncaught large pelagic fish would sink to the deep ocean, kg per tonne less of the item
write('deadfall.json', {
  kgCo2PerTonne: { FRA: { 2763: 80 }, IND: { 2763: 20 }, USA: { 2763: 20 } },
  deepWaterShare: 0.44,
  buildUpYears: 10,
  source: 'https://doi.org/10.1126/sciadv.abb4848',
});

// fossil CO₂ of the sectors the energy levers act on, kg a year, straight lines between the
// values of sectors.md (2023, 2050, 2100); the grid's intensity in kg CO₂ per kWh
const SECTOR_START = 2023;
const sectorYears = years(SECTOR_START, 2100);
const lerp = ([y0, v0], [y1, v1], y) => v0 + ((v1 - v0) * (y - y0)) / (y1 - y0);
const through = (points) => (y) => {
  const i = points.findIndex(([py]) => py >= y);
  return i <= 0 ? points[Math.max(0, i)][1] : lerp(points[i - 1], points[i], y);
};
const sectorGt = {
  ssp126: {
    roadPassenger: [3.66, 2.81, 0.09],
    roadFreight: [2.44, 1.87, 0.06],
    aviation: [0.95, 0.91, 0.56],
    shipping: [0.85, 0.62, 0.35],
    electricity: [14.15, 4.53, 0],
    dataCentres: [0, 0.08, 0],
  },
  ssp245: {
    roadPassenger: [3.66, 5.01, 2.35],
    roadFreight: [2.44, 3.34, 1.57],
    aviation: [0.95, 1.47, 1.8],
    shipping: [0.85, 0.8, 0.89],
    electricity: [14.15, 13.07, 0],
    dataCentres: [0, 0.21, 0],
  },
  ssp370: {
    roadPassenger: [3.66, 4.31, 3.33],
    roadFreight: [2.44, 2.88, 2.22],
    aviation: [0.95, 1.81, 3.0],
    shipping: [0.85, 0.84, 0.62],
    electricity: [14.15, 23.71, 40.55],
    dataCentres: [0, 0.4, 0.43],
  },
};
const grid = {
  ssp126: [0.48, 0.39, 0.23, 0.1, 0, 0],
  ssp245: [0.48, 0.42, 0.32, 0.27, 0.16, 0],
  ssp370: [0.48, 0.49, 0.5, 0.51, 0.53, 0.55],
};
const gridYears = [2023, 2030, 2040, 2050, 2070, 2100];
const responseOf = (h) =>
  h === 0 ? 0.068 : 0.107 * Math.exp(-(h - 1) / 3.5) + 0.002 * Math.exp(-h / 300);
const response = years(0, 200).map(responseOf);
write('sectors.json', {
  co2: Object.fromEntries(
    Object.entries(sectorGt).map(([ssp, bySector]) => [
      ssp,
      Object.fromEntries(
        Object.entries(bySector).map(([sector, [a, b, c]]) => {
          const f = through([
            [2023, a],
            [2050, b],
            [2100, c],
          ]);
          return [
            sector,
            {
              years: sectorYears,
              values: sectorYears.map((y) => Number((f(y) * 1e12).toPrecision(4))),
            },
          ];
        }),
      ),
    ]),
  ),
  gridIntensity: Object.fromEntries(
    Object.entries(grid).map(([ssp, values]) => {
      const f = through(gridYears.map((y, i) => [y, values[i]]));
      return [ssp, { years: sectorYears, values: sectorYears.map((y) => r(f(y), 4)) }];
    }),
  ),
  evKwhPerKgCo2: {
    passenger: { median: 1.11, low: 0.72, high: 1.73 },
    freight: { median: 1.47, low: 1.04, high: 1.99 },
  },
  dataCentresTwh: {
    years: [2024, 2030, 2035],
    median: [0, 530, 785],
    low: [0, 155, 285],
    high: [0, 701, 1285],
  },
  aviationNonCo2: { median: 6.44e-14, low: 2.03e-14, high: 10.7e-14 },
  forcingResponse: {
    median: response.map((v) => Number(v.toPrecision(4))),
    p05: response.map((v) => Number((v * 0.55).toPrecision(4))),
    p95: response.map((v) => Number((v * 1.35).toPrecision(4))),
  },
  source: 'Planetshift test fixture: sectors.md values, straight lines between them',
});

// what each sector's fossil CO₂ comes with, g per kg in 2023 (sectors.md), air pollution falling
// by a third by 2100; the forcing per kg of each pollutant and the methane a kg less NOx leaves
const coYears = [2023, 2050, 2100];
const coGrams = {
  roadPassenger: {
    co2: 150,
    ch4: 5.0,
    n2o: 0.045,
    so2: 0.74,
    bc: 0.185,
    oc: 0.071,
    nh3: 0.071,
    nox: 4.79,
    co: 13.6,
    voc: 4.0,
  },
  roadFreight: {
    co2: 150,
    ch4: 5.0,
    n2o: 0.045,
    so2: 0.74,
    bc: 0.185,
    oc: 0.071,
    nh3: 0.071,
    nox: 4.79,
    co: 13.6,
    voc: 4.0,
  },
  aviation: {
    co2: 153,
    ch4: 4.78,
    n2o: 0.001,
    so2: 0.4,
    bc: 0.023,
    oc: 0.005,
    nh3: 0.002,
    nox: 0.032,
    co: 0.41,
    voc: 1.7,
  },
  shipping: {
    co2: 153,
    ch4: 4.8,
    n2o: 0.059,
    so2: 4.47,
    bc: 0.12,
    oc: 0.076,
    nh3: 0.022,
    nox: 22.87,
    co: 1.36,
    voc: 2.8,
  },
  electricity: {
    co2: 76,
    ch4: 4.1,
    n2o: 0.027,
    so2: 2.31,
    bc: 0.005,
    oc: 0.006,
    nh3: 0.071,
    nox: 1.49,
    co: 3.0,
    voc: 1.08,
  },
  buildings: {
    co2: 62,
    ch4: 5.63,
    n2o: 0.011,
    so2: 1.14,
    bc: 0.1,
    oc: 0.12,
    nh3: 0.057,
    nox: 1.02,
    co: 8.6,
    voc: 0.99,
  },
  industry: {
    co2: 36,
    ch4: 2.07,
    n2o: 0.006,
    so2: 1.36,
    bc: 0.035,
    oc: 0.039,
    nh3: 0.035,
    nox: 1.42,
    co: 13.4,
    voc: 0.93,
  },
  aviationOwn: {
    co2: 0,
    ch4: 0,
    n2o: 0.032,
    so2: 0.37,
    bc: 0.01,
    oc: 0.004,
    nh3: 0.053,
    nox: 4.4,
    co: 0.88,
    voc: 0.12,
  },
};
const coRange = (median, low, high) => ({
  median: coYears.map(() => median),
  low: coYears.map(() => low),
  high: coYears.map(() => high),
});
const coErf = {
  so2: coRange(-6e-12, -11e-12, -1.9e-12),
  bc: coRange(26e-12, -10e-12, 65e-12),
  oc: coRange(-7e-12, -20e-12, -1.9e-12),
  nox: coRange(1.16e-12, -0.07e-12, 2.27e-12),
  nh3: coRange(-0.62e-12, -0.69e-12, -0.56e-12),
  co: coRange(0.026e-12, -0.1e-12, 0.15e-12),
  voc: coRange(0.25e-12, -0.1e-12, 0.63e-12),
};
write('coemissions.json', {
  years: coYears,
  perKgCo2: Object.fromEntries(
    Object.keys(sectorGt).map((ssp) => [
      ssp,
      Object.fromEntries(
        Object.entries(coGrams).map(([sector, grams]) => [
          sector,
          Object.fromEntries(
            Object.entries(grams).map(([species, g]) => [
              species,
              (species === 'co2' ? [1, 1, 1] : [1, 0.85, species === 'ch4' ? 0.8 : 0.67]).map((k) =>
                Number((g * k * 1e-3).toPrecision(4)),
              ),
            ]),
          ),
        ]),
      ),
    ]),
  ),
  erfPerKg: Object.fromEntries(Object.keys(sectorGt).map((ssp) => [ssp, coErf])),
  noxCh4PerKgCo2: {
    hoor: Object.fromEntries(
      Object.keys(sectorGt).map((ssp) => [
        ssp,
        Object.fromEntries(
          Object.entries(coGrams).map(([sector, g]) => {
            const m = g.nox * 1e-3 * 2 * (sector === 'shipping' ? 2.75 : 0.69);
            const p = (x) => Number(x.toPrecision(4));
            return [sector, coRange(p(m), p(m * 0.8), p(m * 1.25))];
          }),
        ),
      ]),
    ),
    fair: Object.fromEntries(
      Object.keys(sectorGt).map((ssp) => [
        ssp,
        Object.fromEntries(
          Object.entries(coGrams).map(([sector, g]) => {
            const m = [1, 0.85, 0.67].map((k) => Number((g.nox * k * 1e-3 * 2).toPrecision(4)));
            return [sector, { median: m, low: m.map((v) => v * 0.985), high: m }];
          }),
        ),
      ]),
    ),
    chemistry: Object.fromEntries(
      Object.keys(sectorGt).map((ssp) => [
        ssp,
        Object.fromEntries(
          Object.entries(coGrams).map(([sector, g]) => {
            const m = g.nox * 1e-3 * (sector === 'shipping' ? 1.26 : 0.32);
            const p = (x) => Number(x.toPrecision(4));
            return [sector, coRange(p(m), p(m * 0.78), p(m * 1.45))];
          }),
        ),
      ]),
    ),
  },
  noxPlaceFactor: {
    hoor: Object.fromEntries(
      Object.keys(sectorGt).map((ssp) => [
        ssp,
        { land: coRange(0.69, 0.79, 0.58), sea: coRange(2.75, 2.15, 3.4) },
      ]),
    ),
    fair: Object.fromEntries(
      Object.keys(sectorGt).map((ssp) => [ssp, { land: coRange(1, 1, 1), sea: coRange(1, 1, 1) }]),
    ),
    chemistry: Object.fromEntries(
      Object.keys(sectorGt).map((ssp) => [
        ssp,
        { land: coRange(0.21, 0.16, 0.24), sea: coRange(0.83, 0.65, 1.22) },
      ]),
    ),
  },
  particleErfPerKgCo2: Object.fromEntries(
    Object.keys(sectorGt).map((ssp) => [
      ssp,
      Object.fromEntries(
        Object.entries(coGrams).map(([sector, g]) => {
          const m = (g.so2 * -6e-12 + g.bc * 26e-12 + g.oc * -7e-12 + g.nh3 * -0.62e-12) * 1e-3;
          const spread = 0.6 * Math.abs(m) + 2e-15;
          const p = (x) => Number(x.toPrecision(4));
          return [sector, coRange(p(m), p(m - spread), p(m + spread))];
        }),
      ),
    ]),
  ),
  ozoneErfPerKgCo2: Object.fromEntries(
    Object.keys(sectorGt).map((ssp) => [
      ssp,
      Object.fromEntries(
        Object.entries(coGrams).map(([sector, g]) => {
          const m = (g.co * 0.026e-12 + g.voc * 0.25e-12) * 1e-3;
          const p = (x) => Number(x.toPrecision(4));
          return [sector, coRange(p(m), p(-0.5 * m), p(2.5 * m))];
        }),
      ),
    ]),
  ),
  noxCh4PerKg: Object.fromEntries(Object.keys(sectorGt).map((ssp) => [ssp, coRange(2, 1.97, 2.0)])),
  vocCh4PerKg: Object.fromEntries(
    Object.keys(sectorGt).map((ssp) => [ssp, coRange(-0.116, -0.118, -0.114)]),
  ),
  vocCh4PerKgCo2: Object.fromEntries(
    Object.keys(sectorGt).map((ssp) => [
      ssp,
      Object.fromEntries(
        Object.entries(coGrams).map(([sector, g]) => {
          const m = -0.116 * g.voc * 1e-3;
          const p = (x) => Number(x.toPrecision(4));
          return [sector, coRange(p(m), p(m * 1.02), p(m * 0.98))];
        }),
      ),
    ]),
  ),
  source: 'Planetshift test fixture: sectors.md values, air pollution falling by a third',
});

// world population: a smooth history to 2023, then the medium variant peaking near 10.3 billion
// and the low and high ones apart from it by up to ~30% and ~40% in 2100; country ratios for
// all but Nigeria, which takes the world's
const LAST_ESTIMATE = 2023;
const popHistory = (y) => 1.28e9 + 6.81e9 * ((y - 1850) / (LAST_ESTIMATE - 1850)) ** 3;
const popMedium = (y) =>
  8.09e9 + 2.9e9 * (1 - Math.exp(-(y - LAST_ESTIMATE) / 35)) - 1.2e5 * (y - LAST_ESTIMATE) ** 2;
const popShare = (y) => (y - LAST_ESTIMATE) / (2100 - LAST_ESTIMATE);
const popSeries = (a, b, f) => ({ years: years(a, b), values: years(a, b).map((y) => r(f(y))) });
const ratioYears = [2025, 2030, 2040, 2050, 2060, 2070, 2080, 2090, 2100];
write('population.json', {
  world: {
    history: popSeries(1850, LAST_ESTIMATE, popHistory),
    medium: popSeries(LAST_ESTIMATE + 1, 2100, popMedium),
    low: popSeries(LAST_ESTIMATE + 1, 2100, (y) => popMedium(y) * (1 - 0.31 * popShare(y))),
    high: popSeries(LAST_ESTIMATE + 1, 2100, (y) => popMedium(y) * (1 + 0.41 * popShare(y))),
  },
  lastEstimate: LAST_ESTIMATE,
  ratioYears,
  byCountry: Object.fromEntries(
    ['FRA', 'USA', 'IND', 'BRA'].map((iso3, k) => [
      iso3,
      {
        low: ratioYears.map((y) => r(1 - (0.27 + 0.02 * k) * popShare(y), 4)),
        high: ratioYears.map((y) => r(1 + (0.34 + 0.02 * k) * popShare(y), 4)),
      },
    ]),
  ),
  source: 'Planetshift test fixture: smooth curves near UN WPP 2024',
});

// every human emission above its pre-industrial level, kg a year, straight lines between rounded
// SSP values in 2025, 2050 and 2100, each SSP's 2050 and 2100 values scaled together, and the
// forcing of their air pollution, W/m², with a range; each SSP's own population
const peopleKg = {
  co2: [42e12, 43e12, 10e12],
  ch4: [3.5e11, 3.2e11, 2.6e11],
  n2o: [1.1e10, 1.2e10, 0.8e10],
  so2: [7.7e10, 5.1e10, 2.9e10],
  bc: [6.3e9, 4.2e9, 0.6e9],
  oc: [1.7e10, 1.1e10, 0.1e10],
  nh3: [6.3e10, 6.9e10, 5.9e10],
  nox: [1.3e11, 1.0e11, 0.7e11],
  co: [5.2e11, 3.8e11, 0.4e11],
  voc: [1.6e11, 1.4e11, 0.6e11],
};
const peopleScale = { ssp126: 0.6, ssp245: 1, ssp370: 1.3 };
const peopleYears = years(2000, 2100);
write('people.json', {
  years: peopleYears,
  bySsp: Object.fromEntries(
    Object.entries(peopleScale).map(([ssp, k]) => [
      ssp,
      {
        ...Object.fromEntries(
          Object.entries(peopleKg).map(([species, [a, b, c]]) => {
            const f = through([
              [2000, a * 0.8],
              [2025, a],
              [2050, a + (b - a) * k],
              [2100, a + (c - a) * k],
            ]);
            return [species, peopleYears.map((y) => Number(f(y).toPrecision(4)))];
          }),
        ),
        erf: Object.fromEntries(
          Object.entries({ median: 1, low: 2, high: 0.15 }).map(([end, m]) => {
            const f = through([
              [2000, -1.0],
              [2025, -0.77],
              [2050, -0.77 + 0.22 * k],
              [2100, -0.77 + 0.58 * k],
            ]);
            return [end, peopleYears.map((y) => Number((f(y) * m).toPrecision(4)))];
          }),
        ),
      },
    ]),
  ),
  population: Object.fromEntries(
    Object.entries({ ssp126: [8.5e9, 7.0e9], ssp245: [9.2e9, 9.0e9], ssp370: [10e9, 12.6e9] }).map(
      ([ssp, [p2050, p2100]]) => {
        const f = through([
          [2000, 6.1e9],
          [2025, 8.0e9],
          [2050, p2050],
          [2100, p2100],
        ]);
        return [ssp, peopleYears.map((y) => Number(f(y).toPrecision(4)))];
      },
    ),
  ),
  source: 'Planetshift test fixture: straight lines near the SSP emissions and populations',
});

// direct fossil CO₂ of buildings and industry, kg a year, straight lines between the values of
// industry.md (2023, 2050, 2100), and the heat-pump, steel and cement factors
const industryGt = {
  ssp126: { buildings: [3.0, 2.87, 1.45], industry: [9.0, 3.92, 1.06] },
  ssp245: { buildings: [3.0, 2.75, 1.88], industry: [9.0, 10.41, 5.47] },
  ssp370: { buildings: [3.0, 3.05, 1.98], industry: [9.0, 10.81, 12.18] },
};
write('industry.json', {
  co2: Object.fromEntries(
    Object.entries(industryGt).map(([ssp, bySector]) => [
      ssp,
      Object.fromEntries(
        Object.entries(bySector).map(([sector, [a, b, c]]) => {
          const f = through([
            [2023, a],
            [2050, b],
            [2100, c],
          ]);
          return [
            sector,
            {
              years: sectorYears,
              values: sectorYears.map((y) => Number((f(y) * 1e12).toPrecision(4))),
            },
          ];
        }),
      ),
    ]),
  ),
  heatPumpKwhPerKgCo2: { median: 1.49, low: 0.8, high: 1.88 },
  industryParts: {
    steel: {
      share: 0.289,
      cut: { median: 0.9, low: 0.75, high: 0.95 },
      kwhPerKgCo2: { median: 1.5, low: 0.3, high: 2.2 },
    },
    cement: {
      share: 0.287,
      cut: { median: 0.8, low: 0.6, high: 0.95 },
      kwhPerKgCo2: { median: 0.25, low: 0.1, high: 1.0 },
    },
    chemicals: {
      share: 0.057,
      cut: { median: 0.8, low: 0.6, high: 0.93 },
      kwhPerKgCo2: { median: 1.9, low: 0.1, high: 5.2 },
    },
  },
  cementProcessCo2: { year: 2023, kg: 1.549e12 },
  source: 'Planetshift test fixture: industry.md values, straight lines between them',
});

// A few points of each deep-time series, already on 1850–1900 (synthetic shapes).
const MA = (m) => Math.round(1950 - m * 1e6);
const stages = [
  [486.85, 443.8, 20],
  [443.8, 252, 12],
  [252, 66, 15],
  [66, 2.58, 8],
  [2.58, 0.0117, -2],
  [0.0117, 0, -0.5],
];
const lgmrYears = Array.from({ length: 12 }, (_, i) => 1950 - 22_100 + i * 2000);
const deglaciation = (y, at) => r(at + (7 * (y + 20_000)) / 22_000, 2);
const centuries = years(0, 18);
write('deeptime.json', {
  baseline: '1850-1900',
  offsets: { phanda: -14.46, cenozoic: 0.36, lgmr: -13.49, pages2k: 0.37 },
  phanda: {
    from: stages.map(([a]) => MA(a)),
    to: stages.map(([, b]) => MA(b)),
    p05: stages.map(([, , v]) => v - 3),
    p16: stages.map(([, , v]) => v - 1.5),
    p50: stages.map(([, , v]) => v),
    p84: stages.map(([, , v]) => v + 1.5),
    p95: stages.map(([, , v]) => v + 3),
  },
  cenozoic: {
    years: [MA(33), MA(15), MA(3), MA(0.5), MA(0.03)],
    median: [4, 4.5, 1, -3, -5],
  },
  lgmr: {
    years: [...lgmrYears, 1850],
    mean: [...lgmrYears.map((y) => deglaciation(y, -7)), 0],
    p05: [...lgmrYears.map((y) => deglaciation(y, -7.6)), -0.3],
    p95: [...lgmrYears.map((y) => deglaciation(y, -6.4)), 0.3],
  },
  pages2k: {
    years: centuries.map((i) => 5 + i * 100),
    median: centuries.map((i) => r(-0.1 + 0.05 * Math.sin(i), 2)),
    p05: centuries.map((i) => r(-0.3 + 0.05 * Math.sin(i), 2)),
    p95: centuries.map((i) => r(0.1 + 0.05 * Math.sin(i), 2)),
  },
  extinctionThreshold: { warming: 5.2, degreesPerMyr: 10, source: 'Song et al. (2021)' },
});
