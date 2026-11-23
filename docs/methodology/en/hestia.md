# Emission intensities from HESTIA

Planetshift prefers HESTIA's aggregated data for the emissions of producing each food (tiers 1 and 2 of the intensities). This page explains what those aggregations are, how Planetshift reads them, and what it leaves out. The code is `pipeline/planetshift_pipeline/sources/hestia.py`; the product table is `pipeline/hestia_terms.csv`.

## What a HESTIA aggregation is

HESTIA collects farm-level data (Cycles), recalculates every emission with the same models, and publishes aggregations: the average impact of producing one product in one country over a period, weighted across production systems (conventional or organic, irrigated or not, by their share of production). A World aggregation combines the verified country aggregations of a product, weighted by each country's FAOSTAT production. Each aggregation is an ImpactAssessment whose emissions are expressed per kg of the product (its functional unit). HESTIA's team validates an aggregation before publishing it, by checking it against other sources such as Poore & Nemecek (2018).

HESTIA publishes its data in releases. A release is restricted to priority-access users for its first 182 days, then public. Planetshift pins the newest public release, v1.2 (2026-04-30), in `RELEASE`, so a new release changes the numbers only when someone changes that constant.

## How Planetshift reads them

1. One search (`POST https://api.hestia.earth/search`, with the `X-Data-Version` header set to the release date) lists every aggregated ImpactAssessment that has `aggregatedDataValidated` set. Unvalidated aggregations are in the index too, but HESTIA does not publish them, so they are not used.
2. For each product mapped in `hestia_terms.csv` and each area (country or World), the aggregation with the latest period is kept; older periods (1990–2009) are dropped.
3. Each kept aggregation is fetched in its recalculated form (`GET /impactassessments/<id>?dataState=recalculated`), four at a time, all of them, retried with exponential backoff on network errors and on 429 or 5xx answers. An aggregation that answers 401, 403 or 404 gives no row for that product and area; a request that still fails after the retries stops the build (with `--allow-missing`, the build goes on without HESTIA and without the literature tier, which reads it).
4. The emissions of CO₂, CH₄ and N₂O to air are summed by gas and by scope (below), converted to kg of gas per tonne of the FAOSTAT Food Balance Sheet (FBS) item, and written with the URL of the aggregation's page on hestia.earth.

Every response is cached in `pipeline/cache/hestia/<release>/`: the search results as `aggregations.json`, and each aggregation in `nodes/<key>/`, trimmed to its CO₂, CH₄ and N₂O rows without their distributions (a whole node is about 10 MB, the trimmed one under 100 kB); the key is a hash of the code that trims them, so a change to what is kept fetches the nodes anew. The glossary's region terms are cached in `pipeline/cache/hestia/glossary/`.

The area is the ISO 3166-1 alpha-3 code of a country aggregation (`GADM-FRA` gives `FRA`), `World` for the World aggregation, and `region:<HESTIA region id>` for a regional one; `region_members` lists the countries of each HESTIA region, from the `subClassOf` chain of the glossary's country terms (which follows the UN M49 regions). Release v1.2 has no regional aggregation, only countries and World.

## Matching products to Food Balance Sheet items

`hestia_terms.csv` maps each FBS item to the HESTIA product terms that represent it, with the kilograms of the HESTIA product per kilogram of the FBS item (`kg_product_per_kg_item`) and a note for each. The intensity per tonne of the item is the intensity per kg of the product × that factor × 1000. The factors were checked against the FBS itself (2022 world production):

- Rice: the current FBS counts rice and products as paddy (788.8 Mt in 2022, about paddy production), so paddy rice (`riceGrainInHuskFlooded`) is used with a factor of 1.
- Groundnuts (FBS code 2552): counted in shell (55.1 Mt), so `peanutInShell` has a factor of 1.
- Palm kernels (2562): its production equals the oil palm fruit harvest (408.9 Mt), so `oilPalmFruit` is used with a factor of 1.
- Oats: FAOSTAT counts oats in husk; dehulled oats (`oatGrain`) are a fallback at 0.7 kg of groats per kg of oats in husk, all emissions carried by the groats.
- Meat: the FBS counts carcass weight. Cold carcass weight is used as is; liveweight, a fallback, is converted with the dressing percentages of Poore & Nemecek (2018, table S5): 52–55% for cattle and buffalo, 47% for sheep and goats, 75% for pigs, 72% for poultry.
- Milk: fresh whole milk; fat and protein corrected milk (4% fat, 3.3% protein) is a fallback taken as equal.
- Eggs: in shell; eggs counted by number are a fallback at 16.7 eggs per kg (60 g an egg).

When several products map to one item, the products with the best `priority` available in that area are averaged without weights (wheat and durum wheat, the vegetables of "Vegetables, other"). The URL is the first of them by term id.

Processed products (oils, meals, refined rice, flour, wine) are not used: their aggregations count the whole crop as one background input, so the farm's emissions cannot be told apart from the processing's, nor land-use change from the rest. Vegetable oils therefore get no HESTIA row.

## From emissions to three gases

Every emission term of the glossary that starts with `co2ToAir`, `ch4ToAir` or `n2OToAir` is counted as that gas, in kg of the gas (not CO₂-equivalent). Each falls in one of four categories:

| Category | Terms | Counted in |
| --- | --- | --- |
| On farm | `ch4ToAir`: `EntericFermentation`, `Excreta`, `FloodedRice`, `CropResidueBurning`, `CropResidueDecomposition`, `FuelCombustion`, `AquacultureSystems`, `WasteTreatment`, `SoilFlux`, `Reservoirs`, `IndustrialProcessesNonFossil`; `n2OToAir`: `InorganicFertiliser`, `OrganicFertiliser`, `Excreta`, `CropResidueDecomposition`, `CropResidueBurning`, `FuelCombustion`, `AquacultureSystems`, `WasteTreatment`, `IndustrialProcesses` (each direct and indirect), `SoilFlux`; `co2ToAir`: `FuelCombustion`, `UreaHydrolysis`, `LimeNeutralisation`, `WasteTreatment` | both scopes |
| Background | `ch4ToAirInputsProductionFossil`, `ch4ToAirInputsProductionNonFossil`, `n2OToAirInputsProduction`, `co2ToAirInputsProduction`: the emissions of producing each input, one row per input | cradle to farm gate, except inputs of agricultural origin |
| Land use | every `…StockChange…`, `…LandUseChange…` and `…ManagementChange…` term (biomass, dead organic matter, soil carbon, diminishing soil carbon N₂O), `…NaturalVegetationBurning…`, `…OrganicSoilBurning…`, `…OrganicSoilCultivation…` | neither |
| Not counted | `co2ToAirCropResidueDecomposition` and `co2ToAirSoilFlux` (biogenic CO₂), `n2OToAirBackgroundSoilFluxDirect` (natural background flux) | neither |

The classification is by term id (`category_of`), so a term added to the glossary later falls in the right category if it follows the same naming. A test checks the sum of all three gases against each aggregation's own GWP100 (IPCC AR6, as HESTIA computes it): wheat in France gives 0.407 kg CO₂e/kg both ways, which shows no row is counted twice. Land use is left out here because land-use change has its own lever, [Deforestation](#method-deforestation); drained organic soils are left out with it, as in FAOSTAT's domains.

## The two scopes, and why feed is excluded

- `farmGate`: on-farm emissions only.
- `cradleToFarmGate`: on-farm emissions plus the emissions of producing the farm's inputs (fertilisers, pesticides, fuel, electricity, machinery, plastics, water, lime), **except inputs of agricultural origin**: feed, seed, live animals and other crops or animal products.

Feed is excluded because Planetshift counts it elsewhere. When the shift removes animals, the feed they would have eaten is removed too, and its crops' emissions fall through the crops' own intensities. Adding the feed's background emissions to the animal product would count the same crop twice. Seed and animals are the same case: they are agricultural products that the model already holds as FBS uses (seed is an FBS element). The rule is applied row by row: every background row of a HESTIA aggregation names the input it comes from (`inputs`), and a row is dropped when that input's term type is `crop`, `forage`, `animalProduct`, `liveAnimal`, `liveAquaticSpecies`, `processedFood` or `seed`. No approximation is needed. Feed additives (`feedFoodAdditive`, such as synthetic amino acids) and organic fertilisers are kept, since they are not crops the model counts.

## Coverage

With release v1.2 (run on 2026-11-21): 380 validated aggregations, 236 fetched (the latest period of each mapped product and area), giving 37 FBS items, 47 countries and World:

- tier 1 (country): 184 item × country cells per scope;
- tier 2 (World): 11 items: wheat, maize, potatoes, sugar cane, sugar beet, groundnuts, soybeans, rapeseed and mustard, olives, bananas, grapes;
- no regional aggregation.

HESTIA has not yet released aggregations of animal products (its documentation says they are under development); the index holds unvalidated ones, which are not used. Bovine meat, mutton and goat, pig meat, poultry, milk and eggs therefore get no HESTIA row, though the table maps them for a later release. Nor do vegetable oils, sugar, tea, yams, plantains, pineapples and dates.

Some values (cradle to farm gate, kg per tonne of the FBS item; CO₂e with AR5 factors 34 and 298 only for comparison):

| Item | Area | CO₂ | CH₄ | N₂O | CO₂e |
| --- | --- | --- | --- | --- | --- |
| Wheat | World | 230 | 1.0 | 0.75 | 488 |
| Wheat | France | 143 | 0.66 | 0.88 | 427 |
| Maize | World | 176 | 0.81 | 0.61 | 385 |
| Rice (paddy) | India | 136 | 17.6 | 0.13 | 772 |
| Rice (paddy) | China | 243 | 26.6 | 0.40 | 1265 |
| Soybeans | World | 216 | 1.6 | 0.41 | 391 |

Poore & Nemecek (2018) give, for the farm stage without land-use change, about 850 kg CO₂e per tonne of wheat, 475 for maize and 2,370 per tonne of paddy rice; HESTIA's values are lower; the gap has not been investigated. For rice methane, FAOSTAT's 2022 rice-cultivation emissions divided by paddy production give about 25 kg per tonne in China (HESTIA: 26.6), 25 in India (HESTIA: 17.6) and 31 for the world.

## Assumptions

- The newest public release (v1.2) is used, pinned; release v1.3 stays restricted until 2027-05-18.
- Only validated aggregations are used.
- The latest period of each product and area is used, whatever its length (2010–2026 for all kept rows).
- Products that share an FBS item are averaged without weights; the best priority available in the area wins.
- Conversion factors from HESTIA products to FBS items are those listed above and in `hestia_terms.csv`; dressing percentages are Poore & Nemecek's averages.
- Land-use change, drained organic soils, burning of natural vegetation and biogenic CO₂ are excluded from both scopes.
- Background emissions of agricultural inputs (feed, seed, animals, crops, processed food) are excluded from cradle to farm gate; feed additives and organic fertilisers are kept.
- CH₄ from fossil and non-fossil sources is summed into one CH₄ value.
- A product with no gas rows, or an area that is neither a country nor a HESTIA region, gives no row.

## Sources

- HESTIA, [Data Releases](https://www.hestia.earth/guide/guide-accessing-data-data-releases) and [Using the HESTIA Data API](https://www.hestia.earth/guide/guide-accessing-data-data-api): the release header, validated aggregations, the recalculated data state.
- HESTIA, [HESTIA Aggregated Data](https://www.hestia.earth/guide/guide-aggregated-data) and [Crop Aggregation](https://www.hestia.earth/guide/guide-aggregated-data-crop): how aggregations and World aggregations are computed.
- HESTIA [glossary](https://www.hestia.earth/glossary): emission terms and region terms.
- HESTIA, [Citation and Data Licence](https://www.hestia.earth/guide/guide-accessing-data-citation): public HESTIA data are licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); an aggregation is cited with HESTIA and the sources listed on its page, which each row's `url` links to.
- FAOSTAT, [Food Balances (2010-)](https://www.fao.org/faostat/en/#data/FBS): item codes and the units the conversion factors were checked against.
- Poore, J., & Nemecek, T. (2018). Reducing food's environmental impacts through producers and consumers. Science, 360(6392), 987–992. [doi:10.1126/science.aaq0216](https://doi.org/10.1126/science.aaq0216): dressing percentages (supplementary table S5).
