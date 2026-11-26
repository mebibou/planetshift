# Emissions per tonne of food

To turn a change in production into a change in emissions, Planetshift needs to know how much each food emits. For every country and every food item, it holds the kilograms of carbon dioxide (CO₂), methane (CH₄) and nitrous oxide (N₂O) emitted per tonne produced: the item's emission intensity. FAOSTAT's estimates give two thirds of the world's farm emissions in the model. HESTIA gives a fifth, and published averages and stand-in values give the rest. Added up over the world, they come close to FAOSTAT's totals: 137.7 Mt of methane a year against 142.4 Mt.

The three gases are kept separate all the way to the climate model.

## What is counted

The app offers two scopes:

- **Farm gate** (*Biological processes only* in the app): the emissions of the farm's biological processes. These are enteric fermentation (the methane made in ruminants' stomachs as they digest), manure management, manure left on pasture and spread on fields, synthetic fertiliser, crop residues, rice paddies and the burning of residues.
- **Cradle to farm gate** (*With inputs*, the default): the same, plus the farm's energy use (fuel and electricity) and the making of fertilisers and pesticides. The fuel burnt on the farm counts here, whichever source the intensity comes from.

Neither scope includes land-use change, drained organic soils, or anything after the farm: processing, transport, retail, cooking and waste. What happens after the farm is counted separately, in *After the farm* below. The forest cleared for farming and the CO₂ of drained organic soils are counted by the deforestation module (see [Deforestation](#method-deforestation)). The tooltip of the map's Emissions layer shows, beside the farm's emissions, the emissions after the farm and the CO₂ of the clearing and of the drained soils.

## Why animal products leave out their feed

When fewer animals are raised, the model removes their feed through the crops: less maize, soy and barley are grown (see [Feed](#method-feed)), and each crop carries its own emissions. If an animal product's intensity also included the emissions of growing its feed, those emissions would be counted twice, once on the animal and once on the crops.

An animal's intensity therefore covers only what happens on the livestock farm: enteric methane, manure, and the fertiliser spread on grassland. Grass is not a crop of the Food Balance Sheets, so its fertiliser stays with the animals.

FAOSTAT's emissions are already split this way. The [HESTIA](#method-hestia) and [literature](#method-literature) pages explain how their values leave feed out. Farmed fish follow the same rule: their intensity is the farm's water and energy, and their feed is counted on the crops and fish it is made of.

## Where each value comes from

Each value is drawn from the best source available. For each country, item and scope, Planetshift takes the first value it finds in this order, called tiers, and records which tier it came from:

1. **HESTIA, country**: HESTIA's aggregated impact assessment for the product in that country (see [HESTIA](#method-hestia)).
2. **HESTIA, region or world**: the smallest HESTIA region containing the country, then the world.
3. **FAOSTAT, country**: FAOSTAT's emissions for the country divided by its production (see *Tier 3* below).
4. **Published LCA**: world averages from Poore and Nemecek (2018), a life-cycle assessment (LCA) study (see [Published LCA data](#method-literature)).
5. **Proxy**: a stand-in value. For a processed item, it is its primary item's value over the extraction rate (see *Processed products* below). Otherwise, it is a similar item's tier 1–4 value in the same country, from the list in *Proxies* below. A proxy is never taken from another proxy or from a median.
6. **Group median**: the production-weighted median, over all countries, of the tier 1–4 values of the group's items.

Two items take FAOSTAT's value for the country (tier 3) before HESTIA's world average (tier 2): rice, whose methane depends on each country's water management (see *Rice methane*), and other fruits. HESTIA's only world aggregation for other fruits is peach, at 1.03 kg CO₂e per kg against about 0.35 in Poore and Nemecek.

Every country in the model has a value for every item and both scopes, including items it does not produce. The model can then move production to any country.

### How many cells each tier fills

The table counts the farm-gate country × item cells that each tier fills, by group, for the 187 countries and 90 items. The cradle-to-farm-gate scope is close.

Only seafood needs tier 6: 272 of its 1,496 cells. Almost all are landlocked countries that import all their fish. Their balance lists an item that FishStat does not list for them (see [Fish and seafood](#method-seafood)). For every other item, the published world averages of tier 4 cover the cells that have no proxy.

| Group | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- |
| cereals | 69 | 328 | 431 | 351 | 317 | 0 |
| dairy | 0 | 0 | 171 | 16 | 374 | 0 |
| eggs | 2 | 0 | 170 | 15 | 0 | 0 |
| fruit | 37 | 358 | 650 | 1012 | 0 | 0 |
| nuts | 4 | 183 | 0 | 0 | 0 | 0 |
| oilCrops | 50 | 891 | 327 | 1215 | 1818 | 0 |
| otherPlant | 0 | 0 | 154 | 0 | 1342 | 0 |
| pigMeat | 0 | 0 | 285 | 47 | 42 | 0 |
| poultryMeat | 0 | 0 | 167 | 20 | 0 | 0 |
| pulses | 28 | 0 | 287 | 246 | 0 | 0 |
| rice | 13 | 174 | 0 | 0 | 0 | 0 |
| rootsTubers | 16 | 177 | 286 | 110 | 346 | 0 |
| ruminantMeat | 0 | 0 | 542 | 64 | 142 | 0 |
| seafood | 0 | 0 | 0 | 1014 | 210 | 272 |
| stimulants | 9 | 0 | 123 | 429 | 0 | 0 |
| sugarCrops | 14 | 360 | 0 | 187 | 374 | 0 |
| vegetables | 19 | 180 | 271 | 91 | 0 | 0 |
| All | 261 | 2651 | 3864 | 4817 | 4965 | 272 |

Weighted by emissions rather than cells, FAOSTAT (tier 3) gives two thirds of the world's farm-gate emissions in the model, HESTIA (tiers 1 and 2) a fifth, and published averages and proxies the rest. Tiers 4 and 5 fill mostly items that a country does not produce, and processed products.

## Tier 3: FAOSTAT's emissions by item

FAOSTAT estimates agricultural emissions for every country with the IPCC Tier 1 methods, the IPCC's simplest default methods. FAOSTAT also lists the countries' own UNFCCC inventories for the same rows. Planetshift reads FAOSTAT's own estimates (source "FAO TIER 1"), for the emissions year closest to the base year (2024).

FAOSTAT gives most emissions by crop or by animal species. Planetshift shares them out among the food items as follows.

### Crops

The *Emissions from Crops* domain (GCE) gives rice cultivation methane, crop residue N₂O, and the CH₄ and N₂O of residue burning, by crop for the main crops. Each goes to the crop's FBS item through `qcl_items.csv`.

### Synthetic fertiliser

Synthetic fertiliser N₂O is a country total in FAOSTAT. Planetshift shares it between crops in proportion to each crop's harvested area × a nitrogen rate per hectare for its crop class. A hectare of maize or vegetables therefore takes more than a hectare of pulses.

The rate comes from the International Fertilizer Association's survey of fertiliser use by crop (Heffer et al., 2017). It is the class's share of world nitrogen use (wheat 18%, maize 18%, rice 15%, vegetables 7%, fruit 6%, and so on: the world N shares of its Annex 2), divided by the class's world harvested area.

The same survey finds 4.7% of nitrogen spread on grassland. That share goes to ruminant products (beef, mutton, other meat, milk) in proportion to their methane, in countries that have both crops and ruminants.

The shares add up to each country's total. The part that falls on non-food crops is left out of the model: fibres, tobacco, rubber, and 85% of seed cotton (its lint).

### Livestock

The *Emissions from Livestock* domain (GLE) gives, by species, the CH₄ of enteric fermentation and manure management, and the N₂O of manure management, manure on pasture and manure applied. It goes to the products as follows:

- **Dairy cattle**: 88% to milk and 12% to beef, the beef of culled cows and surplus calves. This is the International Dairy Federation's physical allocation, 1 − 6.04 × the kilograms of live weight sold per kilogram of milk, at the typical 0.02 kg it gives (IDF Bulletin 479/2015, section 6.3.3, p. 29). Its 2022 standard keeps the formula; its worked example gives 85.1% for one farm.
- **Other cattle**: beef, less the animals not raised for food (see below).
- **Buffalo, sheep, goats and camels**: split between milk and meat by the protein each country's herd produces (FAOSTAT production × protein content). Where no milk is recorded, all goes to meat. For buffalo, the animals not raised for food are taken off first.
- **Pigs** go to pig meat, **broilers, ducks and turkeys** to poultry meat, **laying hens** to eggs, and **llamas** to other meat.
- **Horses, asses and mules** are kept mainly for work. Their emissions are not on any product (see below).

**Offal and animal fats** share each country's meat emissions with the carcass by mass. If offal and fats weigh a tenth of the meat, they take a tenth of its emissions. Each tonne of carcass, offal or fat then carries the same emissions.

### Cradle to farm gate

This scope adds three FAOSTAT sources:

- on-farm energy use, shared between all products by their gross production value;
- fertiliser manufacturing, moved to the countries that apply the nitrogen and then shared like synthetic nitrogen. FAOSTAT counts it where the fertiliser is made, about 440 Mt CO₂e in 2024, so the crops of exporters such as Russia, Saudi Arabia or Qatar would carry the emissions of fertiliser spread in other countries. Each country's share is its nitrogen use (FAOSTAT's *Fertilizers by Nutrient*) times the world's emissions per tonne of nitrogen, about 3.8 t of CO₂e;
- pesticide manufacturing, shared by harvested area.

### From emissions to intensities

The emissions of each item are divided by its production in the Food Balance Sheets: per tonne of milled rice, of whole-milk equivalent, or of carcass.

Some intensities are more than 20 times the item's production-weighted world median (in CO₂-equivalent). Such a value points to a mismatch between FAOSTAT's emissions and the balance's production. The emissions are counted against a small recorded output. The value is not used, and the cell falls to the next tier. This applies to 73 of about 5,600 values, mostly "other meat" and pig meat.

## Processed products are counted once

A tonne of soybeans crushed into oil appears twice in the Food Balance Sheets: as soybean production, and as oil production. To count its emissions once, Planetshift applies this rule:

- a primary item's emissions are its intensity × (production − processing);
- a processed item carries its own intensity, per tonne of its own production. Processed items are vegetable oils, sugar, sweeteners, butter, cream, wine, beer and other drinks.

### Processed items with no value of their own

Some processed items have no intensity from tiers 1–4. They take their primary item's intensity divided by the extraction rate, the tonnes of product made from a tonne of the primary item. A tonne of soybean oil is made from 1 / 0.19 ≈ 5.3 t of soybeans, so it carries the emissions of those 5.3 t. Sugar is made from cane and beet, and the two are weighted by how much of each the country processes.

The rates are in `proxies.csv`. Most are the ratio of the world's 2023 output of the product to the primary item processed. The processed share of each crop is then counted once, in full, on its products.

| Processed item | Primary item and rate (t per t) | Basis |
| --- | --- | --- |
| 2541 Sugar non-centrifugal | 2536 cane: 0.09 | FAO technical conversion factors (India, the main producer) |
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
| 2586 Other oilcrop oils | 2570 other oilcrops: 0.35 | FAO technical conversion factors, linseed and safflower (the world ratio is above 1: the item holds oils of seeds listed elsewhere) |
| 2655 Wine | 2620 grapes: 0.63 | world balance 2023 |
| 2656 Beer | 2513 barley: 5.8 | world balance 2023 |
| 2657 Fermented beverages | 2518 sorghum: 4 | assumed (FAO's technical conversion factors give none for beverages) |
| 2658 Alcoholic beverages | 2514 maize: 0.9 | assumed (FAO's technical conversion factors give none for beverages) |
| 2740 Butter, ghee | 2848 milk: 0.056 | world balance 2023, 85% of the processed milk |
| 2743 Cream | 2848 milk: 0.09 | world balance 2023, 15% of the processed milk |

In the current Food Balance Sheets, item 2562 ("Palm kernels") holds the whole oil palm fruit, from which palm oil and palm kernel oil are pressed. The oil palm's emissions are counted on it.

### Oils and their cake

Crushing an oilseed gives oil and cake (the meal fed to animals). An oil whose intensity is derived this way shares the crush's emissions with the cake by value, as its land is shared (see [Land](#method-land), `pipeline/oilcakes.csv`). The oil keeps its share of the value: groundnut oil 80%, cottonseed oil 66%, palm kernel oil 87%, coconut oil 93%, sesame oil 92%.

The rest is the cake's share. It is written by country and oilseed as `oilcake` in `intensities.json`, in kg of each gas a year in the base year. Soybean, sunflower, rapeseed and other oilseed oils take Poore and Nemecek's values (tier 4), which already share the crop with the meal by value. Their cake's part is written in `oilcake` too.

The model adds the cakes' emissions to each country's farm emissions. The model changes the cakes' emissions as it changes the cake's land: with the production of the animal groups that eat the cake. A diet with fewer animals therefore removes them. A farm practice cuts them as it cuts the oilseed's own intensity.

### By-products with no emissions of their own

Two by-products of milling, rice bran oil and maize germ oil, are made from grain already counted as food, not from processing. Their intensity is zero.

Edible offal and raw animal fats are not processed from meat in the balance sheets either. They share the meat animals' emissions by mass with the carcass (see *Livestock* above).

## Fish and seafood

FAOSTAT's emissions do not cover fisheries or aquaculture, and HESTIA has no aquatic aggregations. The seafood items are therefore set at tier 4 from two studies: Parker et al. (2018) for the fuel of wild capture, and MacLeod et al. (2020) for the water N₂O and the energy of aquaculture. The two are blended by each country's capture and aquaculture of each species group in FAO FishStat. Where the blend is not possible, an item takes a proxy (tier 5) or the group's median (tier 6).

Fuel and electricity count in the cradle-to-farm-gate scope only, as for farms. Wild fish therefore have no farm-gate emissions. [Fish and seafood](#method-seafood) gives the method, the factors and the checks.

## Animals not raised for food

Some farm animals are not raised for food: oxen and buffalo kept to plough, horses, donkeys and mules kept for work and transport, and cattle kept for other reasons, as most of India's are. Their emissions stay in each country's farm emissions, but no product carries them and no lever changes them. A 100% shift leaves them in place.

They are written by country as `nonFood` in `intensities.json`. They add up to 211 Mt CO₂e a year in the base year, 113 Mt of it in India, then Niger (18), Brazil (9), Mexico (8) and Ethiopia (7).

### How they are found

The share comes from FAOSTAT's livestock and trade data (CC BY 4.0), by species. Within a species, every head emits the same: an animal not raised for food takes the species' emissions per head in its country.

- **Horses, asses and mules**: all their emissions, 70 Mt CO₂e. Some horses are eaten, but the herds are kept mainly for work. They make most of the baseline of Brazil, Mexico, Ethiopia and the United States.
- **Non-dairy cattle and buffalo**: a herd raised for food loses a share of its head every year, by slaughter or sale. This share is called the offtake. The animals kept for food are counted as follows, and the rest are not raised for food. This gives 137 Mt CO₂e of cattle and 4 Mt of buffalo.
- **Sheep, goats, camels, pigs and poultry** are all counted as raised for food.

For non-dairy cattle and buffalo, the head kept for food are:

- the animals milked (QCL element 5318). FAOSTAT's dairy cows are a species of their own, all kept for food;
- the animals slaughtered in the year (element 5320) plus the live animals exported net of those imported (TCL items 866 cattle and 946 buffalo, elements 5908 and 5608, in head), divided by 6.7%.

Net exports count only where they are positive, and a country with no trade row counts none. The rest of the stock (GLE element 5111) is not raised for food.

### Why the threshold is 6.7%

Otte and Chilonda (2002) reviewed the offtake of traditional cattle systems in sub-Saharan Africa, the systems that keep their cattle longest. They define offtake as the proportion of animals sold or consumed in a year. They find a mean of 9.9% (median 9%, range 1.2–20%), 12.0% in pastoral systems and 9.3% in mixed ones (chapter 5). By region, the mean is 6.7% in southern Africa, 10.8% in West, 12.3% in East and 13.6% in Central Africa.

The model takes the lowest of these means, southern Africa's 6.7%, as the threshold. Only herds clearly below any food herd then count as not raised for food. The review's appendices 6 and 7 give each zone's offtake only as the number of studies, mean, median, minimum and maximum, not study by study. A lower quartile therefore cannot be computed from them.

The threshold is a sub-Saharan figure applied to every country. No comparable review was found for other regions.

India is most of the baseline, and does not depend on the threshold. FAOSTAT records no cattle slaughter in India, so its 128 million non-dairy cattle are all in the baseline at any threshold. India's 20th Livestock Census counts 192.5 million cattle in 2019, of which 74.2 million milch cows (in milk or dry). That leaves 118.3 million other cattle, 47.4 million of them male (Department of Animal Husbandry and Dairying, 2019, tables 6 and 7). The census does not say what they are kept for.

No country source was found for the offtake of Niger's cattle. FAOSTAT records net exports of 36,000 head for Niger in 2024, and 301,000 for Mali. At 9.9%, these exports lowered their baselines from 20.2 and 9.0 Mt to 19.8 and 5.1 Mt. With the threshold at 6.7%, they are 18.1 and 1.1 Mt.

### What the threshold changes

The threshold moves the baseline, but it hardly moves the effect of a shift. A herd counted as not raised for food is left out of both the products' emissions and what a shift can avoid. The table gives the results of a build with each threshold, at SSP2-4.5 with the default options but biological processes only (`scope=farmGate`):

| Offtake threshold | Non-food baseline, Mt CO₂e | India | Niger | Ethiopia | Mali | Full shift: emissions avoided, Gt CO₂e | Full shift: warming avoided in 2100, °C |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 6.7% (southern Africa, used) | 211 | 113 | 18.1 | 6.9 | 1.1 | 5.17 | 0.281 |
| 9% (median) | 245 | 113 | 19.4 | 26.0 | 4.0 | 5.12 | 0.278 |
| 9.9% (mean) | 257 | 113 | 19.8 | 31.1 | 5.1 | 5.11 | 0.277 |
| 12% (pastoral systems) | 285 | 113 | 20.4 | 39.9 | 7.1 | 5.08 | 0.275 |

A half shift avoids half as much (2.53 to 2.58 Gt CO₂e, 0.137 to 0.140 °C). The likely range that the app shows covers only the climate response, not this choice.

### Limits of the rule

- Live exports that FAOSTAT does not record still look like animals not raised for food. Live animal trade across the Sahel often goes unrecorded.
- Slaughter that FAOSTAT does not record (Brazil's buffalo) has the same effect.
- The rule does not detect draught animals in a country that also slaughters many cattle.
- A working ox and a calf count the same per head.

No FAOSTAT domain counts draught animals. The rule therefore uses only stocks, milked and slaughtered animals, and live trade.

## After the farm

Food also causes emissions after it leaves the farm. It is processed, transported, packaged and sold, cooked at home, and thrown away. FAOSTAT's *Emissions from pre- and post-production* gives each country's CO₂, methane, N₂O and fluorinated gases from each of these stages, in its latest year. In 2024 the model's countries emit 6.0 Gt CO₂e after the farm:

| Stage | Mt CO₂e (GWP100) | Shared between foods by |
| --- | --- | --- |
| Food waste: solid waste, incineration and the food industry's wastewater | 1,638 | mass |
| Cooking at home | 1,506 | mass |
| Retail | 1,105 | Poore & Nemecek's stage |
| Transport | 566 | Poore & Nemecek's stage |
| Processing | 514 | Poore & Nemecek's stage |
| Domestic wastewater | 368 | mass |
| Packaging | 277 | Poore & Nemecek's stage |

The making of fertilisers and the making of pesticides are left out, as they are already counted from cradle to farm gate.

**Refrigerants.** The refrigerants that leak from the cold chain are fluorinated gases. FAOSTAT gives them for each stage in CO₂e, with AR5's GWP100. Planetshift counts them as HFC-134a, the main refrigerant: it converts each stage's CO₂e back to kg of HFC-134a with its AR5 GWP100 of 1,300. Their warming then follows HFC-134a's own response, from FaIR or from AR6's formulas (a lifetime of 14 years, a radiative efficiency of 0.167 W m⁻² ppb⁻¹). In CO₂e, they weigh 1,530 times CO₂ (AR6). They are most of retail's emissions in the table above. The model does not follow the Kigali amendment's phase-down of these gases. Like the rest of the chain, they scale with the baseline.

**Shared between foods.** For processing, transport, packaging and retail, each food's share of its country's total is its production times Poore and Nemecek's (2018) emissions per kg of that food at that stage. Our World in Data publishes these figures (CC BY 4.0). At processing, beef has 1.81 kg CO₂e per kg and wheat 0.21. `pipeline/chain_items.csv` says which of their 42 foods each food takes its stages from, with a note where it is a stand-in (tea uses coffee's stages). Cooking, food waste and wastewater are shared by mass, because Poore and Nemecek's stages end at retail. A country without FAOSTAT figures uses those of the model's countries together. A stage FAOSTAT leaves empty for a country is counted as zero.

In France, a tonne of beef has about 1.08 t CO₂e after the farm, and a tonne of wheat about 0.31 t. That is small compared with the beef's farm emissions, and close to the wheat's.

**What the levers change.** A change in production (a diet shift, less food waste, fewer supply losses) also changes the emissions after the farm. It does so food by food, at the country's figures. Like the farm's emissions, they scale with the baseline and ramp in with the shift. They count in the [causes of warming](#method-link) they belong to today: the energy stages in *Fossil fuels and industry*; food waste and wastewater in *Waste*; the refrigerants in *Other human emissions*. With them, the whole diet shift avoids about 1.6 Gt CO₂e a year more. Once the levers are in full, it avoids 7.3 Gt in all. That includes 329 kt of HFC-134a, about 0.5 Gt CO₂e, and 0.27 Gt of CO₂ from drained soils. It avoids 0.36 °C by 2100 rather than 0.28 °C.

**Simplifications.** Everything is placed where the food is produced, as for the farm's emissions, though shops and kitchens are where it is eaten. Cooking and food waste follow a food's mass, so a tonne of wheat and a tonne of beef have the same emissions at home. Less food waste also cuts the cooking emissions of the food no longer wasted. This slightly overstates the cut, because wasted food is not always cooked. The energy after the farm does not get cleaner over the years, unlike the scenario's grid.

## Food footprint per person

The map's Emissions layer counts emissions where food is produced. Its tooltip also shows *Food footprint per person*: what the food eaten in the country emits per person a year. Production per person looks high in an exporting country and low in an importing one, so the footprint is based on what people eat.

For each food, a country's footprint adds up:

- **How much is eaten**: the food supply of the Food Balance Sheets, times the supply needed per tonne (losses, processing and seed). The result is in farm tonnes, the unit the diet shift uses.
- **Where it comes from**: the part the country produces takes the country's own intensity. The imported share is imports over production plus imports. The imported part takes the intensity of the countries it comes from. Each origin is weighted by its share of the country's imports of that food in FAOSTAT's detailed trade matrix, 2022–2024 (`origins.json`). The main origins are kept until they cover 95% of the imports, at most ten, and none under 1%. The rest takes the world's intensity, which is each item's intensity averaged over the countries that produce it and weighted by their production. The trade matrix records the last country a food was shipped from, so a food re-exported through the Netherlands is treated as Dutch. It does not cover fish and seafood, which take the world's intensity.
- **What a tonne emits**: the farm's emissions in the chosen scope, plus the chain after the farm, plus the CO₂ from clearing forest for that food in that country.
- **The feed of animal products**: an animal product's intensity leaves out its feed (see above). The footprint therefore adds the emissions of the feed each animal group eats per tonne it produces. The feed crops a country's animals eat take the country's own intensity for the part it produces, and the intensity of its imports for the rest. The imported part of an animal product takes the feed per tonne of its origin countries, as above.
- **Oilseeds**: most oilseeds are crushed into oil and cake, including 90% of the world's soybeans. The clearing for an oilseed is shared the same way. The share of the world's crop that is crushed is divided between the oil and the cake in proportion to their value: the cake takes 63% for soy (`pipeline/oilcakes.csv`). The rest stays on the seed. The model trades cake and oil worldwide, so the cake's emissions and clearing are pooled over the world. The animal groups share them by what they eat, per tonne they produce. The oil's clearing is pooled per tonne of oil eaten.

The total is divided by the country's population in the base year. With the levers, the diet shift and less food waste change the food eaten. The farm's intensities change with the farm practices. The chain after the farm and the clearing per tonne do not change.

In CO₂e per person a year, France's footprint is 2.19 t, the United States' 2.66 t, China's 2.12 t, India's 0.91 t and Brazil's 4.38 t. The refrigerants are 0.05 t of France's footprint and 0.15 t of the United States'. Drained organic soils add 0.16 t to France's, through the dairy and beef it imports from its neighbours and through palm oil. In Brazil, clearing for farming is about half of the footprint, 2.19 t. In France it is 0.04 t. France's imported beef comes mostly from its neighbours, the Netherlands, Ireland and the United Kingdom first. Much of its soy arrives as cake, which is given the world's average. With the whole diet shifted, France's footprint falls to 0.94 t.

Published estimates for France are often higher. Planetshift's intensities explain little of the difference. Its meat and milk, which make most of a French diet's footprint, are close to Poore and Nemecek's or above them once both are in the same unit and with the same factors. Its crops and eggs are 20% to 50% below theirs (see *Per kilogram, against Poore and Nemecek*).

## Proxies

A proxy is a similar item's value in the same country, used when an item has no value of its own from tiers 1–4. Each item tries its proxies in order:

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

Milk has no proxy: no other item is a fair stand-in per tonne. A country without a value for milk takes the dairy median.

## Checks against FAOSTAT's totals

A test recomputes world emissions from the built files and compares them with FAOSTAT's world totals for the same processes in 2024. Methane comes within a few percent. N₂O is higher, and CO₂ differs most, for reasons given below.

| | Planetshift, test | FAOSTAT | Tolerance | Planetshift with the oilcakes, as the app counts |
| --- | --- | --- | --- | --- |
| Farm gate, CH₄ (Mt) | 137.7 | 142.4 | 10% | 137.8 |
| Farm gate, N₂O (Mt) | 8.39 | 7.32 | 20% | 8.53 |
| Cradle to farm gate, CH₄ (Mt) | 142.0 | 142.9 | 10% | 142.4 |
| Cradle to farm gate, N₂O (Mt) | 8.71 | 7.61 | 20% | 8.86 |
| Cradle to farm gate, CO₂ (Mt) | 1,881 | 1,322 | 50% | 1,941 |

### How the check is computed

`pipeline/tests/test_validation.py` sums intensity × (production − processing) over every country and item, and adds the animals not raised for food.

The test leaves out the oilcakes' emissions, which the model adds to each country's farm emissions (`oilcake` in `intensities.json`, see *Oils and their cake* above): 0.16 Mt of methane, 0.14 Mt of N₂O and 8.5 Mt of CO₂ a year at the farm gate, and 0.35 Mt, 0.15 Mt and 60 Mt from cradle to farm gate. The last column of the table adds them. That column gives the world's emissions in the base year in a run of the model with no lever. Without the oilcakes, these totals are within 0.1% of the test's.

From FAOSTAT's data alone (tier 3 everywhere, before the other tiers are merged), the allocation recovers 99% of FAOSTAT's farm-gate methane and 97% of its N₂O, with the animals not raised for food. What is missing is non-food crops and countries outside the model. The mixed tiers move the totals a few percent either way, because HESTIA and published LCA studies use other methods. CO₂ differs most because HESTIA's scopes count some CO₂ (urea, lime, machinery) that FAOSTAT files elsewhere.

### Against published budgets

Farm-gate methane is within the published budgets. Enteric fermentation and manure management together give 114 Mt: 98 and 9 Mt from the animals raised for food, and 6 Mt from the animals that are not. The Global Methane Budget gives 112 (107–118) Tg a year for 2010–2019 (Saunois et al., 2025).

FAO's farm-gate total for 2023 is 8.1 Gt CO₂-equivalent (FAOSTAT Analytical Brief 115). It includes drained organic soils, which Planetshift counts under land use (see [Deforestation](#method-deforestation)), and the farm's energy use, fuel and electricity, which Planetshift counts from cradle to farm gate only.

Direct agricultural N₂O was 6.1 Mt in 2020 (3.9 Tg N, Tian et al., 2024). Planetshift's 8.4 Mt also includes indirect emissions, as FAOSTAT's figure does.

### Rice methane

Rice methane is 23.0 Mt in the model, against 25.3 Mt in FAOSTAT for 2024 and 32 (25–37) Tg in the Global Methane Budget. Most of the gap is India.

Rice methane depends on how each country manages the water of its paddies, and a world average cannot capture that. So for rice, FAOSTAT's value for the country (tier 3) comes before HESTIA's world average (tier 2). In the Philippines, which HESTIA does not cover, FAOSTAT gives 82 kg of methane per tonne of paddy, against 25.5 kg for HESTIA's world. Taking FAOSTAT's country values raised the world total from 20.8 Mt to 23.0 Mt.

India's intensity is HESTIA's (tier 1): 16.7 kg of methane from flooding per tonne of paddy, and 17.1 kg with the rest. FAOSTAT's is 24.5 kg (5.33 Mt over 217.9 Mt of paddy). Both are per tonne of paddy, the unit the balance uses for rice, so the gap is not a conversion error. Per hectare, HESTIA gives about 72 kg of methane and FAOSTAT about 106.

HESTIA's model applies the IPCC's 2019 Refinement to the water regimes and amendments of its Indian rice data. FAOSTAT applies the IPCC's Tier 1 method with its own assumptions on water regimes. The difference is one of method, so the model keeps the HESTIA value, which is better documented. With FAOSTAT's intensity for India, the world total would be about 24.7 Mt.

### Per kilogram, against Poore and Nemecek

Poore and Nemecek (2018) give each food's emissions by stage of the supply chain. Their farm stage is the one that compares with Planetshift's intensities, which leave out feed (counted on the crops), land-use change and everything after the farm. Our World in Data shows it per kg of the retail product, such as boneless meat, bread or milled rice. Their data S2 gives it per kg of the FAOSTAT item, Planetshift's unit: meat in carcass weight, grain, rice as paddy. `pipeline/literature_terms.csv` keeps those figures. They weigh methane and N₂O with AR5's factors, which include climate-carbon feedbacks (34 and 298). Planetshift uses AR6's (27 and 273). Their totals are not split by gas, so each is converted to AR6's factors with the item's gas mix in Planetshift. World averages weighted by production, from cradle to farm gate, in kg of CO₂-equivalent per kg of the item:

| Item | Planetshift | Poore and Nemecek, AR5 | Poore and Nemecek, AR6 | Ratio |
| --- | --- | --- | --- | --- |
| Beef | 24.4 | 29.0 | 24.0 | 1.02 |
| Sheep and goat meat | 21.2 | 19.5 | 16.4 | 1.29 |
| Pig meat | 1.68 | 1.69 | 1.46 | 1.15 |
| Poultry meat | 0.87 | 0.67 | 0.63 | 1.39 |
| Eggs | 0.77 | 1.32 | 1.22 | 0.64 |
| Milk | 1.20 | 1.46 | 1.21 | 1.00 |
| Rice (paddy) | 1.23 | 2.37 | 2.01 | 0.61 |
| Wheat | 0.49 | 0.85 | 0.80 | 0.61 |
| Maize | 0.37 | 0.48 | 0.45 | 0.82 |
| Potatoes | 0.132 | 0.193 | 0.185 | 0.72 |
| Peas | 0.36 | 0.72 | 0.68 | 0.53 |

The ratio is Planetshift's figure divided by theirs with AR6's factors. Their beef is the beef and dairy herds together, weighted by their production. In the same unit and with the same factors, the animal products are close to theirs or above. Beef and milk are within 3% of theirs, and pig meat, sheep and goat meat and poultry are 15% to 39% above. Crops and eggs are 20% to 50% below. Planetshift's crops come mostly from HESTIA's aggregated assessments (tiers 1 and 2), and its eggs mostly from FAOSTAT (tier 3). Poore and Nemecek's totals do not show which of their sources make the gap. Their data are a meta-analysis of studies from around 2010, and their paddy emissions come from field measurements. Moving their totals to AR6 with Planetshift's gas mix is approximate. For animal products, where that mix is mostly methane, a little more CO₂ in theirs would raise their AR6 figure by a few percent.

`uv run python -m planetshift_pipeline.against_literature` prints the comparison for every item both have, from a build. A test checks this table against it.

## Emissions by source

Each intensity is also split by source in `breakdown.json`: enteric fermentation, manure management, rice, synthetic and organic fertiliser, residues, fuel, electricity, the making of inputs, and other. The split comes from the same computation. The FAOSTAT allocation above keeps each process apart, and the HESTIA rows keep their emission terms. [Farm practices](#method-practices) explains the split and the practices that use it.

## Code and tables

The code is `pipeline/planetshift_pipeline/intensities.py`. Its tables are `pipeline/qcl_items.csv` and `pipeline/proxies.csv`. The intensities are in `intensities.json`.

## Assumptions

- FAOSTAT's Tier 1 estimates stand for every country, rather than the countries' own inventories.
- Synthetic nitrogen is shared by area × a world rate per crop class. Real rates vary between countries.
- 4.7% of each country's synthetic nitrogen goes on grassland, as in the world average.
- 88% of a dairy herd's emissions go to milk everywhere.
- Mixed herds (buffalo, sheep, goats, camels) are split by protein, with 15% protein in carcass meat.
- Energy use is shared by the value of production, pesticide manufacture by area.
- Offal and fats carry the same emissions per tonne as the carcass.
- Of a country's non-dairy cattle and buffalo, two groups are raised for food: the milked animals, and the head that, at an offtake of 6.7% a year, would supply its slaughter and net live exports. The rest, and all horses, asses and mules, are not. 6.7% is the lowest regional mean offtake of traditional cattle in sub-Saharan Africa, applied to every country.
- Within a species, every head in a country emits the same, whether raised for food or not.
- Extraction rates are world values, the same in every country.
- An intensity over 20 times the item's world median is a data mismatch, not a real value.
- Proxies are judgement calls, listed above for review.
- Seafood's intensities are literature values blended by each country's production. See [Fish and seafood](#method-seafood) for their own assumptions.

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
- Heffer, P., Gruère, A., Roberts, T. (2017). Assessment of Fertilizer Use by Crop at the Global Level 2014–2014/15. International Fertilizer Association and International Plant Nutrition Institute, Annex 2: <https://www.fertilizer.org/wp-content/uploads/2023/01/2017_IFA_AgCom_17_134-rev_FUBC-assessment-2014.pdf>.
- International Dairy Federation (2015). A common carbon footprint approach for the dairy sector. Bulletin of the IDF 479/2015: <https://fil-idf.org/>.
- International Dairy Federation (2022). The IDF global Carbon Footprint standard for the dairy sector. Bulletin of the IDF 520/2022, equation 2 and appendix 10.5.
- FAO, Technical Conversion Factors for Agricultural Commodities: <https://www.fao.org/statistics/en/>.
- IPCC (2006, refined 2019). Guidelines for National Greenhouse Gas Inventories, volume 4: <https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol4.html>.
- Poore, J., Nemecek, T. (2018). Reducing food's environmental impacts through producers and consumers. Science 360, 987–992: <https://doi.org/10.1126/science.aaq0216>.
- Our World in Data, Food: greenhouse gas emissions across the supply chain (Poore and Nemecek, 2018): <https://ourworldindata.org/grapher/food-emissions-supply-chain>.
- Saunois, M. et al. (2025). The Global Methane Budget 2000–2020. Earth System Science Data 17, 1873–1958: <https://doi.org/10.5194/essd-17-1873-2025>.
- Tian, H. et al. (2024). Global nitrous oxide budget (1980–2020). Earth System Science Data 16, 2543–2604: <https://doi.org/10.5194/essd-16-2543-2024>.
- FAO (2025). Greenhouse gas emissions from agrifood systems: global, regional and country trends, 2001–2023. FAOSTAT Analytical Brief 115: <https://doi.org/10.4060/cd7300en>.
