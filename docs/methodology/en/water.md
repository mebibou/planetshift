# Freshwater

Farming takes about 70% of the freshwater withdrawn worldwide (FAO AQUASTAT). Planetshift gives the freshwater each country's farming withdraws, today and once the levers are in full. The summary gives the world figure, *Freshwater withdrawn for farming*. The map's *Freshwater withdrawals* layer gives each country's litres a year. A second layer, *Water scarcity (crops)*, gives the scarcity-weighted water use of the crops HESTIA covers.

Water does not change the warming. The levers change it only by changing what is grown.

The figures are in `water.json`. The code is `pipeline/planetshift_pipeline/water.py`, with HESTIA's part in `sources/hestia.py` (`fetch_water`), and `app/src/model/water.ts`.

## What is counted

Withdrawals are the water taken from rivers, lakes and aquifers, whether or not it returns to them. They are what AQUASTAT's national figures and Poore & Nemecek (2018) measure. Rain that falls on a field is not withdrawn, so rainfed crops withdraw almost nothing on the farm.

For each item and country, Planetshift keeps one value, in litres per tonne of the Food Balance Sheet (FBS) item:

- the water withdrawn on the farm, mostly for irrigation, and for animals' drinking and cleaning;
- the water withdrawn to make the farm's inputs (fertilisers, fuel, electricity, machinery), except the agricultural ones: seed, feed and animals, which their own items count, as for emissions.

A country's water is each item's litres per tonne times its production, less the water of the part processed into another item, which that item counts (sugar from cane, oil from oilseeds), as for emissions. The cake of a crushed oilseed carries the share of the seed's water that the oil does not take, by the value of the crush. Like its land, the cake follows the animals it feeds.

The litres per tonne do not change with any lever. The water therefore moves with production: the diet shift, food waste and the other levers that change what is grown.

## Where the values come from: the tiers

The tiers are those of the emission intensities (see [Emissions](#method-emissions)):

1. HESTIA, the country's own aggregation.
2. HESTIA, its region's or the world's.
4. Poore & Nemecek (2018), world averages.
5. A proxy item's value (`proxies.csv`), or a processed item's primary items over their extraction rate (oils times their share of the crush's value).
6. The group's production-weighted world median of tiers 1 to 4.

There is no tier 3: FAOSTAT publishes no water by crop.

### HESTIA

HESTIA's aggregations (release v1.3) give, per kg of product at the farm gate:

- `freshwaterWithdrawalsDuringCycle`: the water withdrawn on the farm;
- `freshwaterWithdrawalsInputsProduction`: the water withdrawn to make each input, one row per input. The rows are summed, except those of agricultural inputs (term types `crop`, `forage`, `animalProduct`, `liveAnimal`, `liveAquaticSpecies`, `processedFood`, `seed`). Seed matters: it is 20 of the 25 L/kg of rice in China.

An aggregation without an on-farm withdrawal row gives no value. The kg of product are converted to tonnes of the FBS item with the factors of the emissions (`hestia_terms.csv`, see [HESTIA](#method-hestia)), and products sharing an item are averaged the same way.

HESTIA's consumption terms (the water that does not return) are not used, so withdrawals and consumption are never mixed.

### Poore & Nemecek

Poore & Nemecek (2018) give one world value per food, in litres withdrawn per kg of retail product. Planetshift reads them from Our World in Data's extract (CC BY 4.0). It maps the study's products to FBS items as the emissions' literature tier does (`literature_terms.csv`). It averages the products of an item, weighting each by its food and waste in 2009–11.

**From retail product to FBS item.** HESTIA's values are per kg at the farm gate. The literature tier of the emissions is per kg of the study's FBS unit (carcass, grain, fresh milk). The water extract is per kg of retail product (boneless meat, bread, meal). Planetshift converts it with the study's own numbers. It divides the farm-stage emissions per kg of the FBS unit, transcribed in `literature_terms.csv`, by the farm-stage emissions per kg of retail product, from Our World in Data's extract of the supply-chain stages. That ratio is the kg of retail product per kg of the FBS unit: 0.70 for beef, 0.68 for pig meat, 0.72 for poultry, 0.97 for milk, and about 1 for wheat, rice and eggs. The value per kg of the FBS unit is then turned into the current FBS item with `kg_product_per_kg_item`, as for emissions (0.667 for rice, counted as paddy today).

Products the extract has no water for are left out of their item's average: buffalo, the vegetable oils, soybeans, and the miscellaneous cereals, oilcrops and stimulants. Their items take tier 5 or 6.

**Animal products.** Poore & Nemecek's value for an animal product includes the water of its feed. Planetshift counts the feed crops' water on the crops, as it does their emissions. A shift that removes animals then removes the feed's water once. Each animal product's value is therefore the study's, less the water of its concentrate feed:

$$
W_{g,c} = \max\left(0,\; W^{PN}_g - F_{g,c} \sum_k r_{k,g}\, w_k\right)
$$

with $W^{PN}_g$ the study's litres per tonne, $F_{g,c}$ the concentrate per tonne of product in country $c$ (high-income or not) and $r_{k,g}$ the share of feed class $k$ in the ration, both the GLEAM-style values of [Feed](#method-feed), and $w_k$ the litres per tonne of class $k$: the model's own crop values (tiers 1 to 6) averaged over the world, weighted by each crop's feed use in the Food Balance Sheets. The classes give 228,000 L/t for grain, 202,000 for oilseeds, 562,000 for pulses, 19,000 for roots and 93,000 for sugar crops. Milk and fish fed to animals are given no water here.

What is left is the water of the farm itself: drinking, cleaning, and irrigated pasture and fodder, which the Food Balance Sheets do not count as crops. Beef keeps 800,000 L/t in high-income countries and 1,260,000 elsewhere, milk 538,000 and 583,000, pig meat 531,000 and 700,000, eggs 85,000 and 130,000, and poultry none, because its feed accounts for all of the study's value.

**Eggs.** HESTIA has egg aggregations for Canada and the United States, at 8.5 and 23 L/kg, far below the study's 578 L/kg. They have no feed rows, so they count the farm's own water, the boundary used here. They are kept as tier 1 for those two countries. The study's value less its feed is larger (85–130 L/kg), so the other countries' eggs may be counted high.

### Fish farms

Seafood items are 0. Freshwater fish farms withdraw water to fill and top up their ponds. Poore & Nemecek count that water, about 3,700 L/kg of farmed fish. The model's seafood items mix wild and farmed fish, of fresh and salt water, so they are left out (see [Limitations](#method-limitations)).

## Coverage

With release v1.3:

- HESTIA gives tier 1 for 35 items in 56 countries (230 item × country cells), and tier 2, World averages, for 15 items: wheat, maize, rice, potatoes, sugar cane, sugar beet, nuts, groundnuts, soybeans, sunflower seed, rapeseed and mustard, olives, other vegetables, grapes and other fruit.
- Poore & Nemecek give tier 4 for 26 items, among them bovine meat, mutton and goat, pig meat, poultry, milk, eggs, oats, rye, pulses, cassava, citrus, bananas, apples, coffee and cocoa.
- Proxies and processed items (tier 5) fill most of the rest: oils, sugar, butter and other dairy products, beer and spirits, and the crops without a value of their own. Tier 6 is used for 366 cells.

Of the world's 2,812 km³ a year, HESTIA's countries give 1,364, HESTIA's World averages 294, Poore & Nemecek 783 and the proxies and processed items 321; the oilcakes account for 49.

**Brazilian soybeans.** In v1.2, HESTIA gave almost no withdrawal for them (0.000656 L/kg) but 255 L eq of scarcity-weighted use. In v1.3 the scarcity-weighted use is 18.9 L eq, consistent with the withdrawals: 0.00078 L/kg on the farm, which is plausible for rainfed soybeans, and about 7 L/kg for making the inputs.

## Against AQUASTAT

The build logs the totals against AQUASTAT's agricultural withdrawals: its total withdrawals times agriculture's share, as the World Bank serves them (indicators `ER.H2O.FWTL.K3` and `ER.H2O.FWAG.ZS`, 2022). The build never fails on the comparison.

The world's 2,812 km³ a year is 1.03 times AQUASTAT's 2,736 km³. Countries differ more: the median country is 1.7 times its AQUASTAT figure. China gives 612 km³ against 353, India 552 against 585, Pakistan 163 against 168, the United States 123 against 176, Viet Nam 80 against 78 and Indonesia 79 against 190. Bangladesh gives 185 km³ against 32: HESTIA's own aggregation of its flooded rice withdraws 2,680 L/kg of paddy, more than twice India's 1,110, and rice is most of what Bangladesh grows. After Bangladesh, the least reliable countries are those whose crops take world averages, and so the world's irrigation.

AQUASTAT's agriculture also counts aquaculture and the irrigation of non-food crops, which the model leaves out. The model counts the water of making the farm's inputs, which AQUASTAT counts under industry.

## Scarcity-weighted water use

A litre withdrawn where water is scarce matters more than one where it is plentiful. HESTIA weights each litre consumed by the AWARE 2.0 factor of where it is used (`scarcityWeightedWaterUse`, method `aware2-0`), in litres-equivalent (L eq). Planetshift keeps it only where a country has its own HESTIA aggregation of a crop: AWARE's factors are local, so a World average applied to a country would not be meaningful. It covers 228 item × country cells in 55 countries, crops only.

The map shows it as its own layer, *Water scarcity (crops)*. It is never added to the litres withdrawn: it counts consumption, not withdrawals, and its unit is a weighted one. Countries cannot be compared on it, as each counts only the crops HESTIA covers there.

## Land equipped for irrigation

The tooltip of the *Freshwater withdrawals* layer gives each country's land area equipped for irrigation, from FAOSTAT's Land Use domain (item 6690, *Land area equipped for irrigation*, in the base year or the latest year before it). It is shown for context only and does not enter the litres.

## What a full diet shift does

A full diet shift lowers the world's withdrawals from 2,811 to 2,736 km³ a year (−2.7%). Fewer animals need less irrigated pasture and fodder, and less feed. Some of the reduction is offset by the plant foods that replace them, rice and pulses in particular, which are irrigated in the countries that grow most of them. The United States withdraws 58 km³ less and Brazil 34 km³ less. Bangladesh withdraws 85 km³ more, India 11 more and Pakistan 21 more. The scarcity-weighted use of the crops HESTIA covers rises, as more of the replacing crops are grown where water is scarce.

## Sources

- HESTIA, aggregated impact assessments, release v1.3: `freshwaterWithdrawalsDuringCycle`, `freshwaterWithdrawalsInputsProduction` and `scarcityWeightedWaterUse` ([hestia.earth/guide](https://www.hestia.earth/guide/freshwaterWithdrawalsDuringCycle)). Licence: CC BY 4.0.
- Poore & Nemecek (2018), *Reducing food's environmental impacts through producers and consumers*, Science 360, 987–992, [doi:10.1126/science.aaq0216](https://doi.org/10.1126/science.aaq0216), through Our World in Data, *Freshwater withdrawals per kilogram of food product* ([ourworldindata.org](https://ourworldindata.org/grapher/water-withdrawals-per-kg-poore)) and *Food: greenhouse gas emissions across the supply chain*. Licence: CC BY 4.0.
- Boulay et al. (2018), *The WULCA consensus characterization model for water scarcity footprints: assessing impacts of water consumption based on available water remaining (AWARE)*, International Journal of Life Cycle Assessment 23, 368–378, [doi:10.1007/s11367-017-1333-8](https://doi.org/10.1007/s11367-017-1333-8), as HESTIA applies AWARE 2.0.
- FAOSTAT, Land Use (RL): land area equipped for irrigation, [fao.org/faostat](https://www.fao.org/faostat/en/#data/RL). Licence: CC BY 4.0.
- FAO AQUASTAT, total and agricultural water withdrawals, through the World Bank's World Development Indicators ([data.worldbank.org](https://data.worldbank.org/indicator/ER.H2O.FWAG.ZS)). Licence: CC BY 4.0. Used only for the logged comparison.
