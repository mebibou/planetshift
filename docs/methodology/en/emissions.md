# Emissions per tonne of food

To turn a change in production into a change in emissions, Planetshift needs, for every country and every food item, the kilograms of carbon dioxide (CO₂), methane (CH₄) and nitrous oxide (N₂O) emitted per tonne produced. These are the emission intensities in `intensities.json`. The gases stay separate all the way to the climate model. This page explains where each intensity comes from, what it covers, and how the gaps are filled. The code is `pipeline/planetshift_pipeline/intensities.py`; its tables are `pipeline/qcl_items.csv` and `pipeline/proxies.csv`.

## Two scopes

- **Farm gate** (the default): emissions from the farm's biological processes: enteric fermentation in ruminants' stomachs, manure management, manure left on pasture and spread on fields, synthetic fertiliser, crop residues, rice paddies and residue burning.
- **Cradle to farm gate**: the same, plus the farm's energy use (fuel and electricity) and the making of fertilisers and pesticides.

Neither includes land-use change, drained organic soils, or anything after the farm (processing, transport, retail, cooking, waste).

## Why animal intensities leave out feed

The model removes the feed of animals that are no longer raised through the crops: fewer animals means less maize, soy and barley grown (see the feed page), and each crop carries its own emissions. If an animal product's intensity also included the emissions of growing its feed, those emissions would be counted twice, once on the animal and once on the crops. So an animal's intensity covers only what happens on the livestock farm: enteric methane, manure, and the fertiliser spread on grassland (grass is not a crop of the Food Balance Sheets). FAOSTAT's emissions are split this way already; the HESTIA and literature pages explain how their values leave feed out. Farmed fish follow the same rule: their intensity is the farm's water and energy, and their feed is counted on the crops and fish it is made of.

## Fish and seafood

FAOSTAT's emissions do not cover fisheries or aquaculture, and HESTIA has no aquatic aggregations, so the seafood items are set at tier 4 from Parker et al. (2018) for the fuel of wild capture and MacLeod et al. (2020) for the water N₂O and the energy of aquaculture, blended by each country's capture and aquaculture of each species group in FAO FishStat; then a proxy (tier 5) or the group's median (tier 6). Fuel and electricity count in cradle to farm gate only, as for farms, so wild fish have no farm-gate emissions. [Fish and seafood](#method-seafood) gives the method, the factors and the checks.

## Counting processed products once

A tonne of soybeans crushed into oil appears twice in the Food Balance Sheets: as soybean production, and as oil production. The rule is:

- a primary item's emissions are its intensity × (production − processing);
- a processed item (vegetable oils, sugar, sweeteners, butter, cream, wine, beer and other drinks) carries its own intensity, per tonne of its own production.

When a processed item has no intensity of its own (tiers 1–4 below), it takes its primary item's intensity divided by the extraction rate, the tonnes of product made from a tonne of the primary item. A tonne of soybean oil, made from 1 / 0.19 ≈ 5.3 t of soybeans, then carries the emissions of those 5.3 t. For sugar, made from cane and beet, the two are weighted by how much of each the country processes. The rates are in `proxies.csv`; most are the ratio of the world's 2023 output of the product to the primary item processed, so that the processed share of each crop is counted on its products once, in full:

| Processed item | Primary item and rate (t per t) | Basis |
| --- | --- | --- |
| 2541 Sugar non-centrifugal | 2536 cane: 0.10 | FAO technical conversion factors |
| 2542 Sugar (raw equivalent) | 2536 cane: 0.11; 2537 beet: 0.16 | world balance 2023 |
| 2543 Sweeteners, other | 2514 maize: 1.7 | world balance 2023 (molasses, a sugar by-product, is part of the item) |
| 2571 Soybean oil | 2555 soybeans: 0.19 | world balance 2023 |
| 2572 Groundnut oil | 2552 groundnuts: 0.26 | world balance 2023 |
| 2573 Sunflower oil | 2557 sunflower seed: 0.44 | world balance 2023 |
| 2574 Rape and mustard oil | 2558 rapeseed: 0.41 | world balance 2023 |
| 2575 Cottonseed oil | 2559 cottonseed: 0.17 | world balance 2023 |
| 2576 Palm kernel oil | 2562 oil palm fruit: 0.22 | world balance 2023, a tenth of the processed fruit |
| 2577 Palm oil | 2562 oil palm fruit: 0.23 | world balance 2023, nine tenths of the processed fruit |
| 2578 Coconut oil | 2560 coconuts: 0.13 | world balance 2023 |
| 2579 Sesame oil | 2561 sesame: 0.46 | world balance 2023 |
| 2580 Olive oil | 2563 olives: 0.16 | world balance 2023 |
| 2586 Other oilcrop oils | 2570 other oilcrops: 0.35 | FAO technical conversion factors (the world ratio is above 1: the item holds oils of seeds listed elsewhere) |
| 2655 Wine | 2620 grapes: 0.63 | world balance 2023 |
| 2656 Beer | 2513 barley: 5.8 | world balance 2023 |
| 2657 Fermented beverages | 2518 sorghum: 4 | FAO technical conversion factors |
| 2658 Alcoholic beverages | 2514 maize: 0.9 | FAO technical conversion factors |
| 2740 Butter, ghee | 2848 milk: 0.056 | world balance 2023, 85% of the processed milk |
| 2743 Cream | 2848 milk: 0.09 | world balance 2023, 15% of the processed milk |

In the current Food Balance Sheets, item 2562 ("Palm kernels") holds the whole oil palm fruit, from which palm oil and palm kernel oil are pressed; the oil palm's emissions are counted on it.

An oil taken from its oilseed this way shares the crush's emissions with the cake by value, as its land is shared (see [Land](#method-land), `pipeline/oilcakes.csv`): it keeps the oil's share of the value (groundnut oil 80%, cottonseed oil 66%, palm kernel oil 87%, coconut oil 93%, sesame oil 92%), and the rest, the cake's, is written by country and oilseed as `oilcake` in `intensities.json`, in kg of each gas a year in the base year. Soybean, sunflower, rapeseed and other oilseed oils take Poore and Nemecek's values (tier 4), which already share the crop with the meal by value; their cake's part is written in `oilcake` too. The model adds the cakes' emissions to each country's farm emissions and changes them as the cake's land: with the production of the animal groups that eat the cake, so a diet with fewer animals removes them. A farm practice cuts them as it cuts the oilseed's own intensity.

Two by-products of milling, rice bran oil and maize germ oil, are made from grain already counted as food, not from processing; their intensity is zero. Edible offal and raw animal fats are not processed from meat in the balance sheets either: they share the meat animals' emissions by mass with the carcass (below).

## Tiers

Each country × item × scope takes the first value available in this order, and records which tier it came from:

1. **HESTIA, country**: HESTIA's aggregated impact assessment for the product in that country (see the HESTIA page).
2. **HESTIA, region or world**: the smallest HESTIA region containing the country, then the world.
3. **FAOSTAT, country**: FAOSTAT's emissions for the country divided by its production (below).
4. **Published LCA**: world averages from Poore and Nemecek (2018) (see the literature page).
5. **Proxy**: for a processed item, its primary item over the extraction rate (above); otherwise a similar item's tier 1–4 value in the same country, from the list below. A proxy never borrows another proxy or a median.
6. **Group median**: the production-weighted median, over all countries, of the tier 1–4 values of the group's items.

Every country in the model has a value for every item and both scopes, including items it does not produce, so that the model can move production to any country.

## Tier 3: FAOSTAT's emissions by item

FAOSTAT estimates agricultural emissions for every country with the IPCC Tier 1 methods. Planetshift reads its own estimates (source "FAO TIER 1"), not the countries' UNFCCC inventories that FAOSTAT also lists for the same rows, for the emissions year closest to the base year (2023).

- **Crops** (*Emissions from Crops*, GCE): rice cultivation methane, crop residue N₂O and residue burning CH₄ and N₂O, given by crop for the main crops, go to the crop's FBS item through `qcl_items.csv`.
- **Synthetic fertiliser N₂O** is a country total in FAOSTAT. It is shared between crops in proportion to each crop's harvested area × a nitrogen rate per hectare for its crop class. The rate is the class's share of world nitrogen use from the International Fertilizer Association's survey of fertiliser use by crop (Heffer et al., 2017: wheat 18%, maize 16%, rice 16%, vegetables 10%, fruit 7%, and so on) divided by the class's world harvested area, so a hectare of maize or vegetables takes more than a hectare of pulses. The 3.6% of nitrogen that the same survey finds spread on grassland goes to ruminant products (beef, mutton, other meat, milk) in proportion to their methane, in countries that have both crops and ruminants. The shares conserve each country's total; the part that falls on non-food crops (fibres, tobacco, rubber, and 85% of seed cotton, its lint) is left out of the model.
- **Livestock** (*Emissions from Livestock*, GLE): enteric fermentation and manure management CH₄, manure management, manure on pasture and manure applied N₂O, by species:
  - dairy cattle: 85% to milk and 15% to beef, the beef of culled cows and surplus calves, a physical allocation close to the International Dairy Federation's global default;
  - other cattle: beef, less the animals not raised for food (below);
  - buffalo, sheep, goats and camels: split between milk and meat by the protein each country's herd produces (FAOSTAT production × protein content), all to meat where no milk is recorded; for buffalo, less the animals not raised for food;
  - pigs to pig meat, broilers, ducks and turkeys to poultry meat, laying hens to eggs, llamas to other meat;
  - horses, asses and mules are kept mainly for work: their emissions are not on any product (below).
- **Offal and animal fats** share each country's meat emissions with the carcass by mass: if offal and fats weigh a tenth of the meat, they take a tenth of its emissions, and each tonne of carcass, offal or fat carries the same.
- **Cradle to farm gate** adds FAOSTAT's on-farm energy use (shared between all products by their gross production value), fertiliser manufacturing (shared like synthetic nitrogen) and pesticide manufacturing (shared by harvested area).

The emissions of each item are divided by its production in the Food Balance Sheets: per tonne of milled rice, of whole-milk equivalent, of carcass. An intensity more than 20 times the item's production-weighted world median (in CO₂-equivalent) points to a mismatch between FAOSTAT's emissions and the balance's production, usually a crop with a large area and a small recorded output, and is not used (93 of about 5,600 values, mostly cassava, yams, plantains, cocoa and "other meat"); the cell falls to the next tier.

## Animals not raised for food

Some farm animals are not raised for food: oxen and buffalo kept to plough, horses, donkeys and mules kept for work and transport, and cattle kept for other reasons, as most of India's. Their emissions stay in each country's farm emissions, but no product carries them, and no lever changes them: a 100% shift leaves them in place. They are written by country as `nonFood` in `intensities.json`: 211 Mt CO₂e a year in the base year, 115 Mt of it in India, then Niger (15), Brazil (9), Mexico (8) and Ethiopia (6).

The share comes from FAOSTAT's livestock and trade data (CC BY 4.0), by species. Within a species, every head emits the same: an animal not raised for food takes the species' emissions per head in its country.

- **Horses, asses and mules**: all their emissions, 70 Mt CO₂e. Some horses are eaten, but the herds are kept mainly for work. They make most of the baseline of Brazil, Mexico, Ethiopia and the United States.
- **Non-dairy cattle and buffalo**: a herd raised for food takes off, by slaughter or sale, a share of its head every year. Otte and Chilonda (2002) reviewed the offtake of traditional cattle systems in sub-Saharan Africa, those that keep their cattle longest, defined as the proportion of animals sold or consumed in a year: a mean of 9.9% (median 9%, range 1.2–20%), 12.0% in pastoral systems and 9.3% in mixed ones, and by region 6.7% in southern Africa, 10.8% in West, 12.3% in East and 13.6% in Central Africa (chapter 5). The model takes the lowest of these means, southern Africa's 6.7%, as the threshold, so that only herds clearly below any food herd count as not raised for food. The review's appendices 6 and 7 give the offtake of each zone only as the number of studies, mean, median, minimum and maximum, not study by study, so a lower quartile cannot be computed from them. The head kept for food are the animals milked (QCL element 5318; FAOSTAT's dairy cows are a species of their own, all for food), and the animals slaughtered in the year (element 5320) plus the live animals exported net of those imported (TCL items 866 cattle and 946 buffalo, elements 5908 and 5608, in head) over 6.7%. Net exports count only where positive, and a country with no trade row counts none. The rest of the stock (GLE element 5111) is not raised for food. This gives 137 Mt CO₂e of cattle and 4 Mt of buffalo.
- **Sheep, goats, camels, pigs and poultry** are all counted as raised for food.

The threshold is a sub-Saharan figure applied to every country; no comparable review was found for other regions. India is most of the baseline, and does not depend on it: FAOSTAT records no cattle slaughter in India, so its 131 million non-dairy cattle are all in the baseline at any threshold. India's 20th Livestock Census counts 192.5 million cattle in 2019, of which 74.2 million milch cows (in milk or dry), leaving 118.3 million other cattle, 47.4 million of them male (Department of Animal Husbandry and Dairying, 2019, tables 6 and 7); it does not say what they are kept for. No country source was found for the offtake of Niger's cattle. Niger's net exports in FAOSTAT (113,000 head in 2023) and Mali's (206,000) took their baselines from 18.7 and 9.1 Mt to 17.2 and 6.5 Mt at 9.9%; with the threshold at 6.7%, they are 15.0 and 2.2 Mt.

The rule has limits. Live exports that FAOSTAT does not record, as trade on the hoof across the Sahel often is, and slaughter FAOSTAT does not record (Brazil's buffalo) still look like animals not raised for food. Draught animals in a country that also slaughters many cattle are not seen. A working ox and a calf count the same per head. No FAOSTAT domain counts draught animals, so the rule uses only stocks, milked and slaughtered animals, and live trade.

The threshold moves the baseline, but hardly the effect of a shift: a herd counted as not raised for food leaves both the products' emissions and what the shift can avoid. Built with each threshold, at SSP2-4.5 with the default options:

| Offtake threshold | Non-food baseline, Mt CO₂e | India | Niger | Ethiopia | Mali | Full shift: emissions avoided, Gt CO₂e | Full shift: warming avoided in 2100, °C |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 6.7% (southern Africa, used) | 211 | 115 | 15.0 | 6.4 | 2.2 | 5.12 | 0.271 |
| 9% (median) | 242 | 115 | 16.8 | 23.7 | 5.6 | 5.08 | 0.268 |
| 9.9% (mean) | 255 | 115 | 17.2 | 28.6 | 6.5 | 5.07 | 0.267 |
| 12% (pastoral systems) | 281 | 115 | 18.1 | 37.3 | 8.1 | 5.04 | 0.266 |

A half shift avoids half as much (2.51 to 2.56 Gt CO₂e, 0.133 to 0.135 °C). The likely range the app shows covers only the climate response, not this choice.

## How many cells each tier fills

Farm-gate scope, country × item cells, by group, for the 188 countries and 90 items (the cradle-to-farm-gate scope is close). Only seafood needs tier 6: 278 of its 1,504 cells, almost all landlocked countries that import all their fish and whose balance lists an item FishStat does not give them (see [Fish and seafood](#method-seafood)). For every other item the published world averages of tier 4 cover what has no proxy.

| Group | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- |
| cereals | 44 | 347 | 439 | 354 | 320 | 0 |
| dairy | 0 | 0 | 169 | 19 | 376 | 0 |
| eggs | 0 | 0 | 172 | 16 | 0 | 0 |
| fruit | 31 | 363 | 727 | 947 | 0 | 0 |
| nuts | 3 | 0 | 100 | 85 | 0 | 0 |
| oilCrops | 39 | 722 | 388 | 1225 | 1950 | 0 |
| otherPlant | 0 | 0 | 155 | 0 | 1349 | 0 |
| pigMeat | 0 | 0 | 288 | 45 | 43 | 0 |
| poultryMeat | 0 | 0 | 168 | 20 | 0 | 0 |
| pulses | 16 | 0 | 294 | 254 | 0 | 0 |
| rice | 11 | 0 | 95 | 82 | 0 | 0 |
| rootsTubers | 8 | 182 | 282 | 110 | 358 | 0 |
| ruminantMeat | 0 | 0 | 543 | 67 | 142 | 0 |
| seafood | 0 | 0 | 0 | 1018 | 208 | 278 |
| stimulants | 8 | 0 | 120 | 436 | 0 | 0 |
| sugarCrops | 12 | 364 | 0 | 188 | 376 | 0 |
| vegetables | 12 | 0 | 451 | 101 | 0 | 0 |
| All | 184 | 1978 | 4391 | 4967 | 5122 | 278 |

Weighted by emissions rather than cells, FAOSTAT (tier 3) gives two thirds of the world's farm-gate emissions in the model, HESTIA (tiers 1 and 2) a fifth, and published averages and proxies the rest. Tiers 4 and 5 fill mostly items a country does not produce, and processed products.

## Proxies

| Item | Proxies, in order | Why |
| --- | --- | --- |
| 2511 Wheat | 2513 barley, 2515 rye | another temperate cereal |
| 2513 Barley | 2511 wheat, 2516 oats | another temperate cereal |
| 2514 Maize | 2518 sorghum, 2511 wheat | another cereal grown with similar inputs |
| 2515 Rye | 2513 barley, 2511 wheat | another temperate cereal |
| 2516 Oats | 2513 barley, 2511 wheat | another temperate cereal |
| 2517 Millet | 2518 sorghum, 2514 maize | another dryland cereal |
| 2518 Sorghum | 2517 millet, 2514 maize | another dryland cereal |
| 2520 Cereals, other | 2513 barley, 2511 wheat | mostly triticale, buckwheat and mixed grain, grown like barley |
| 2807 Rice | 2514 maize, 2511 wheat | another cereal (misses rice's paddy methane) |
| 2531 Potatoes | 2533 sweet potatoes, 2534 other roots | another root or tuber |
| 2532 Cassava | 2535 yams, 2533 sweet potatoes | another tropical root |
| 2533 Sweet potatoes | 2531 potatoes, 2532 cassava | another root or tuber |
| 2534 Roots, other | 2535 yams, 2531 potatoes | taro, yautia and other tubers, grown like yams |
| 2535 Yams | 2532 cassava, 2534 other roots | another tropical root |
| 2536 Sugar cane | 2537 sugar beet | the other sugar crop |
| 2537 Sugar beet | 2536 sugar cane | the other sugar crop |
| 2546 Beans | 2547 peas, 2549 other pulses | another pulse |
| 2547 Peas | 2546 beans, 2549 other pulses | another pulse |
| 2549 Pulses, other | 2546 beans, 2547 peas | chickpeas, lentils and other pulses, grown like beans |
| 2551 Nuts | 2625 other fruit | tree crops, grown like orchard fruit |
| 2552 Groundnuts | 2555 soybeans, 2561 sesame | another legume oilseed |
| 2555 Soybeans | 2552 groundnuts, 2546 beans | another legume |
| 2557 Sunflower seed | 2558 rapeseed, 2570 other oilcrops | another annual oilseed |
| 2558 Rape and mustard seed | 2557 sunflower, 2570 other oilcrops | another annual oilseed |
| 2559 Cottonseed | 2555 soybeans, 2557 sunflower | an annual oilseed |
| 2560 Coconuts | 2562 oil palm fruit, 2570 other oilcrops | another tropical oil tree crop |
| 2561 Sesame seed | 2552 groundnuts, 2570 other oilcrops | another small annual oilseed |
| 2562 Oil palm fruit | 2560 coconuts, 2570 other oilcrops | another tropical oil tree crop |
| 2563 Olives | 2625 other fruit, 2560 coconuts | a tree crop |
| 2570 Oilcrops, other | 2557 sunflower, 2558 rapeseed | linseed, safflower and other annual oilseeds |
| 2601 Tomatoes | 2605 other vegetables, 2602 onions | another vegetable |
| 2602 Onions | 2605 other vegetables, 2601 tomatoes | another vegetable |
| 2605 Vegetables, other | 2601 tomatoes, 2602 onions | another vegetable |
| 2611 Oranges, mandarins | 2614 other citrus, 2625 other fruit | another citrus fruit |
| 2612 Lemons, limes | 2611 oranges, 2614 other citrus | another citrus fruit |
| 2613 Grapefruit | 2611 oranges, 2614 other citrus | another citrus fruit |
| 2614 Citrus, other | 2611 oranges, 2625 other fruit | another citrus fruit |
| 2615 Bananas | 2616 plantains, 2625 other fruit | the other banana |
| 2616 Plantains | 2615 bananas, 2625 other fruit | the other banana |
| 2617 Apples | 2625 other fruit, 2620 grapes | another orchard fruit |
| 2618 Pineapples | 2625 other fruit, 2615 bananas | another tropical fruit |
| 2619 Dates | 2625 other fruit, 2620 grapes | another tree fruit |
| 2620 Grapes | 2625 other fruit, 2617 apples | another perennial fruit |
| 2625 Fruits, other | 2617 apples, 2611 oranges | another fruit |
| 2630 Coffee | 2633 cocoa, 2635 tea | another tropical stimulant crop |
| 2633 Cocoa beans | 2630 coffee, 2635 tea | another tropical stimulant crop |
| 2635 Tea | 2630 coffee, 2633 cocoa | another stimulant crop |
| 2640 Pepper, 2641 Pimento, 2642 Cloves, 2645 Spices, other | 2605 other vegetables | spices, grown like vegetables |
| 2731 Bovine meat | 2732 mutton and goat, 2735 other meat | another ruminant meat |
| 2732 Mutton and goat meat | 2731 bovine, 2735 other meat | another ruminant meat |
| 2733 Pig meat | 2734 poultry | the other monogastric meat |
| 2734 Poultry meat | 2733 pig meat | the other monogastric meat |
| 2735 Meat, other | 2732 mutton and goat, 2731 bovine | camels, llamas and rabbits: other herbivores |
| 2736 Offal | 2731 bovine, 2733 pig meat | the matching meat (cattle and pig offal dominate) |
| 2737 Animal fats | 2733 pig meat, 2731 bovine | the matching meat (mostly pig fat) |
| 2744 Eggs | 2734 poultry | the same birds and feed |

Milk has no proxy: no other item is a fair stand-in per tonne, so a country without a value takes the dairy median.

## Checks against FAOSTAT's totals

`pipeline/tests/test_validation.py` recomputes world emissions from the built files, intensity × (production − processing) summed over every country and item, plus the animals not raised for food, and compares them with FAOSTAT's world totals for the same processes in 2023:

| | Planetshift | FAOSTAT | Tolerance |
| --- | --- | --- | --- |
| Farm gate, CH₄ (Mt) | 138.1 | 141.8 | 10% |
| Farm gate, N₂O (Mt) | 8.01 | 7.26 | 20% |
| Cradle to farm gate, CH₄ (Mt) | 140.6 | 142.3 | 10% |
| Cradle to farm gate, N₂O (Mt) | 8.14 | 7.56 | 20% |
| Cradle to farm gate, CO₂ (Mt) | 1,688 | 1,348 | 50% |

Farm-gate methane is within the published budgets: enteric fermentation and manure together give 112 Mt (102 + 10), the Global Methane Budget's 112 (107–118) Tg a year for 2010–2019 (Saunois et al., 2025), and FAO's farm-gate total for 2023 is 8.1 Gt CO₂-equivalent with drained organic soils and on-farm electricity, which Planetshift leaves out (FAOSTAT Analytical Brief 115). Direct agricultural N₂O was 6.1 Mt in 2020 (3.9 Tg N, Tian et al., 2024); Planetshift's 8.0 Mt also holds indirect emissions, as FAOSTAT's does.

**Rice methane** is 22.6 Mt in the model, against 24.9 Mt in FAOSTAT for 2023 and 32 (25–37) Tg in the Global Methane Budget. Most of the gap is India. Its intensity is HESTIA's (tier 1): 16.7 kg of methane from flooding per tonne of paddy, 17.1 kg with the rest, against FAOSTAT's 24.6 kg (5.08 Mt over 206.7 Mt of paddy). Both are per tonne of paddy, the unit of the balance's rice, so it is not a conversion error; per hectare, HESTIA gives about 72 kg of methane and FAOSTAT about 106. HESTIA's model applies the IPCC's 2019 Refinement to the water regimes and amendments of its Indian rice data, FAOSTAT the IPCC's Tier 1 method with its own assumptions on water regimes; the difference is one of method, so the HESTIA value is kept as the better-documented tier. With FAOSTAT's intensity for India the world total would be about 24.1 Mt.

From FAOSTAT's data alone (tier 3 everywhere, before the other tiers are merged), the allocation recovers 99% of FAOSTAT's farm-gate methane and 97% of its N₂O, with the animals not raised for food; what is missing is non-food crops and countries outside the model. The mixed tiers move the totals a few percent either way, as HESTIA and published LCA studies use other methods; CO₂ differs most because HESTIA's scopes count some CO₂ (urea, lime, machinery) that FAOSTAT files elsewhere.

## Emissions by source

Each intensity is also split by source (enteric fermentation, manure management, rice, synthetic and organic fertiliser, residues, energy, the making of inputs, other) in `breakdown.json`, from the same computation: the FAOSTAT allocation above keeps each process apart, and the HESTIA rows keep their emission terms. [Farm practices](#method-practices) explains the split and the practices that use it.

## Assumptions

- FAOSTAT's Tier 1 estimates stand for every country, rather than the countries' own inventories.
- Synthetic nitrogen is shared by area × a world rate per crop class; real rates vary between countries.
- 3.6% of each country's synthetic nitrogen goes on grassland, as in the world average.
- 85% of a dairy herd's emissions go to milk everywhere.
- Mixed herds (buffalo, sheep, goats, camels) are split by protein, with 15% protein in carcass meat.
- Energy use is shared by the value of production, pesticide manufacture by area.
- Offal and fats carry the same emissions per tonne as the carcass.
- Of a country's non-dairy cattle and buffalo, the milked animals and the head that would take off its slaughter and net live exports at 6.7% a year are raised for food; the rest, and all horses, asses and mules, are not. 6.7% is the lowest regional mean offtake of traditional cattle in sub-Saharan Africa, applied to every country.
- Within a species, every head in a country emits the same, whether raised for food or not.
- Extraction rates are world values, the same in every country.
- An intensity over 20 times the item's world median is a data mismatch, not a real value.
- Proxies are judgement calls, listed above for review.
- Seafood's intensities are literature values blended by each country's production; see [Fish and seafood](#method-seafood) for their own assumptions.

## Sources

- FAOSTAT, Emissions from Crops: <https://www.fao.org/faostat/en/#data/GCE>, CC BY 4.0.
- FAOSTAT, Emissions from Livestock: <https://www.fao.org/faostat/en/#data/GLE>, CC BY 4.0.
- FAOSTAT, Emissions totals: <https://www.fao.org/faostat/en/#data/GT>, CC BY 4.0.
- FAOSTAT, Crops and livestock products (areas and production): <https://www.fao.org/faostat/en/#data/QCL>, CC BY 4.0.
- FAOSTAT, Value of Agricultural Production: <https://www.fao.org/faostat/en/#data/QV>, CC BY 4.0.
- FAOSTAT, Trade of crops and livestock products (live cattle and buffalo, head): <https://www.fao.org/faostat/en/#data/TCL>, CC BY 4.0.
- FAOSTAT, Food Balances (production and processing): <https://www.fao.org/faostat/en/#data/FBS>, CC BY 4.0.
- Otte, M. J., Chilonda, P. (2002). Cattle and Small Ruminant Production Systems in sub-Saharan Africa: A Systematic Review. FAO, Rome: <https://www.fao.org/4/y4176e/y4176e00.htm>; chapter 5: <https://www.fao.org/4/y4176e/y4176e08.htm>; appendices 6 and 7: <https://www.fao.org/4/y4176e/y4176e0i.htm>, <https://www.fao.org/4/y4176e/y4176e0j.htm>.
- Department of Animal Husbandry and Dairying, Government of India (2019). 20th Livestock Census 2019: Key Results, tables 6 and 7: <https://static.pib.gov.in/WriteReadData/userfiles/key%20results.pdf>.
- Heffer, P., Gruère, A., Roberts, T. (2017). Assessment of Fertilizer Use by Crop at the Global Level 2014–2014/15. International Fertilizer Association and International Plant Nutrition Institute: <https://www.ifastat.org/>.
- International Dairy Federation (2015). A common carbon footprint approach for the dairy sector. Bulletin of the IDF 479/2015: <https://fil-idf.org/>.
- FAO, Technical Conversion Factors for Agricultural Commodities: <https://www.fao.org/statistics/en/>.
- IPCC (2006, refined 2019). Guidelines for National Greenhouse Gas Inventories, volume 4: <https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol4.html>.
- Poore, J., Nemecek, T. (2018). Reducing food's environmental impacts through producers and consumers. Science 360, 987–992: <https://doi.org/10.1126/science.aaq0216>.
- Saunois, M. et al. (2025). The Global Methane Budget 2000–2020. Earth System Science Data 17, 1873–1958: <https://doi.org/10.5194/essd-17-1873-2025>.
- Tian, H. et al. (2024). Global nitrous oxide budget (1980–2020). Earth System Science Data 16, 2543–2604: <https://doi.org/10.5194/essd-16-2543-2024>.
- FAO (2025). Greenhouse gas emissions from agrifood systems: global, regional and country trends, 2001–2023. FAOSTAT Analytical Brief 115: <https://doi.org/10.4060/cd7300en>.
