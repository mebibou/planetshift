# Food loss and waste

Some of the food farms grow is never eaten. Wasting less of it means farms need to grow less for the same meals, and so use less land and emit less. This page describes the data behind that lever (`waste.json`, built by `pipeline/planetshift_pipeline/waste.py`) and how the model is meant to use it.

## Losses and waste

The two are counted in different places, and the lever can act on each.

- **Losses** happen in the supply chain before food reaches shops: in storage, transport and processing. They are in the Food Balance Sheets already, as each item's `losses` in `supply.json`, and the model holds them as a fixed share of each item's domestic supply (see [How a shift becomes production changes](#method-shift), step 4). FAO puts them at 13.3% of food produced worldwide in 2023, between harvest and retail (SDG indicator 12.3.1(a), FAO's SDG data portal).
- **Waste** happens after food reaches shops: in retail, in food service (restaurants, canteens, hotels) and in households. The Food Balance Sheets do not separate it: it is inside each item's `food`, which is the food available to consumers, not what they eat. `waste.json` gives it per country, in kg per person per year, in three sectors.

## The data

The waste estimates are those of UNEP's *Food Waste Index Report 2024*, for the year 2022, the SDG indicator 12.3.1(b). The pipeline reads them from the UN SDG Global Database (series `AG_FOOD_WST_PC`), which publishes the report's country estimates sector by sector, with the confidence the report gives each one. For the 27 European countries that report to Eurostat, the database keeps Eurostat's measured 2022 figures rather than the report's, and the pipeline takes those; the report itself relies on the same measurements for them.

The report estimates 1.05 billion tonnes of food wasted in 2022, 132 kg per person: 79 kg in households, 36 kg in food service and 17 kg in retail, a fifth of the food available to consumers. The pipeline's file, weighted by the base year's population and with the inedible parts added back, gives the same world averages (17, 36 and 79 kg).

Confidence varies by sector. Of the countries with their own estimate outside Eurostat (160), household waste is of high or medium confidence in 65 and of very low confidence in 19, while food service and retail are of very low confidence in about 135, because they are extrapolated from a few measured countries. Every country of `countries.json` but one has its own estimate; Taiwan, which the UN database does not list, takes the median of its region (Eastern Asia), sector by sector. Any country missing in a later release is filled the same way, from its M49 sub-region (`Country.region`), or from the world's median when its region has no estimate.

## Edible parts only

The Index counts food and the inedible parts that go with it: bones, peels, shells, stones. Only the edible part can be avoided, so the pipeline keeps the edible part only, with these shares:

| Sector | High-income countries | Other countries |
| --- | --- | --- |
| Household | 0.75 | 0.50 |
| Food service | 0.75 | 0.75 |
| Retail | 0.85 | 0.85 |

The household share for high-income countries follows the United Kingdom's measurements, where "around three-quarters" of household food waste is edible (WRAP, 2021/22: about 4.7 of 6.4 million tonnes, 73%). In lower-income countries more food is bought raw and prepared at home, so a larger part of household waste is peels, husks and bones; 0.5 is an assumption in the range of the few studies available. Food service and retail waste is mostly unsold or unserved food, so most of it is edible; their shares are assumptions, as no country-wide measurement was found.

With these shares the world's edible waste after shops is about 674 million tonnes, 84 kg per person a year: 43 kg in households, 27 kg in food service and 14 kg in retail. By country, household edible waste runs from 9 to 141 kg per person, with a median of 46 kg.

The edible waste is also capped at 40% of a country's food supply in the Food Balance Sheets (all items kept in the model, kg per person). No country reaches the cap: the share runs from 3% (Spain) to 35% (Yemen), with a median of 12% and nine countries in ten below 19%. The highest shares are in countries with a small food supply per person, where the Index's estimates are extrapolated (Yemen, Syria, Chad, Afghanistan).

## How the lever works

Two reductions, between 0 and 1, can be set apart: r<sub>L</sub> for losses before shops, and r<sub>W</sub> for waste after them. SDG target 12.3 is the reference: halve per capita food waste at the retail and consumer levels by 2030 (r<sub>W</sub> = 0.5), and reduce losses along production and supply chains.

**Waste after shops.** For a country, the share of its food supply that is wasted is

w = min((retail + foodService + household) ÷ (food supply per person, kg), 0.4)

where the food supply per person is the sum of `food` over its items in `supply.json` × 1000 ÷ its population in the base year. The same share is applied to every item: food eaten = food × (1 − w), food wasted = food × w. With a reduction r<sub>W</sub>, the same food is eaten and less is wasted:

new food = eaten + (1 − r<sub>W</sub>) × wasted = food × (1 − r<sub>W</sub> × w)

It is applied after the diet shift, to the food the shifted diet needs, so a country that eats less meat and wastes less needs both less meat and less of the rest. In the steps of the [model](#method-shift), it multiplies each item's food use before step 4.

**Losses before shops.** Each item's loss share of domestic supply, ℓ = losses ÷ domestic supply, becomes (1 − r<sub>L</sub>) × ℓ. The supply needed for a change in use becomes that change ÷ (1 − (1 − r<sub>L</sub>) × ℓ − seed share), and the base year's supply falls by r<sub>L</sub> × losses ÷ (1 − (1 − r<sub>L</sub>) × ℓ − seed share): the losses avoided, and the losses and seed that supply no longer carries, as both stay shares of it. With a quarter of the supply lost and half the losses avoided, that is 14% more than the losses avoided alone.

The change in food supply then travels through the model like a diet shift: it changes supply, which changes production where the item is grown (step 6), and the feed animals need (step 5) when less meat, milk or eggs are wasted.

**Example.** A country whose food supply is 800 kg per person, of which 100 kg is wasted after shops (w = 0.125), halves its waste (r<sub>W</sub> = 0.5): its food supply falls by 0.5 × 0.125 = 6.25%, to 750 kg, for the same 700 kg eaten. If wheat's losses are 5% of its supply and seed 3%, halving losses as well lowers wheat's multiplier from 1 ÷ 0.92 to 1 ÷ 0.945, and saves 0.5 × 5% ÷ 0.945 = 2.6% of its supply.

## What it changes

Less food supply means less production, by country and item where trade shares place it, so less cropland and pasture, and less of every emission that scales with production: enteric methane, manure, rice paddies, fertiliser. Freed land can take up carbon as natural regrowth (see [Land](#method-land)). A cut in wasted animal products also cuts the feed grown for the animals.

## Caveats

- **Rebound.** Food that is not wasted is money not spent: households and businesses spend it on something else, more or better food among other things, and the lower demand lowers food prices, which raises consumption elsewhere. Hegwood et al. (2023) find that this rebound effect could offset 53–71% of the emissions avoided by wasting less. The model does not count it, so the lever's effect is an upper bound.
- **Uncertain estimates.** Most countries' food service and retail figures, and many household ones, are extrapolations of very low confidence. Measurement methods differ (diaries, which miss waste, against waste composition analysis); the Eurostat figures for some countries, such as France, leave out household food waste that is composted at home or recycled separately.
- **Edible shares.** The shares are rounded values from few measurements; the true share varies by country, diet and how food is bought.
- **The same share for every item.** Waste is spread over items in proportion to their food supply. In reality fruit, vegetables and bakery products are wasted more, by weight, than meat or dairy, so the lever's effect on emissions, which come mostly from animal products, is likely overstated.
- **Weights.** The Index weighs food as it is thrown away (bread, cooked food), while the Food Balance Sheets count primary equivalents (grain, carcass weight). The waste share w mixes the two, which slightly misstates it.
- **Waste is not free to avoid.** Halving waste is a target, not a measure with a known cost or a known rate of adoption.

## Assumptions

- Waste after shops comes from the Food Waste Index Report 2024 (2022), with Eurostat's 2022 figures for European countries as published in the UN SDG Global Database.
- A country without an estimate takes the median of its M49 sub-region, sector by sector, or the world's median when its sub-region has none.
- The file holds the edible part only, with the shares above by sector and income group.
- Edible waste after shops is at most 40% of a country's food supply per person.
- The waste share is the same for every item of a country, and is applied to food use after the diet shift.
- Losses before shops are the Food Balance Sheets' own, and a reduction lowers each item's loss share in proportion.
- No rebound effect.

## Sources

- United Nations Environment Programme (2024). Food Waste Index Report 2024. Think Eat Save: Tracking Progress to Halve Global Food Waste. Nairobi: <https://wedocs.unep.org/20.500.11822/45230>. Reproduction for educational or non-profit purposes is allowed with acknowledgement of the source.
- United Nations Statistics Division, SDG Global Database, indicator 12.3.1(b), series AG_FOOD_WST_PC (food waste per capita, by sector): <https://unstats.un.org/sdgs/dataportal>. Free to reuse with attribution.
- Eurostat, Food waste and food waste prevention by NACE Rev. 2 activity (env_wasfw), the European figures reported to the SDG database: <https://ec.europa.eu/eurostat/web/waste/food-waste>.
- WRAP (2023). Household Food and Drink Waste in the United Kingdom 2021/22 (edible share of household food waste): <https://wrap.ngo/resources/report/household-food-and-drink-waste-united-kingdom-202122>.
- FAO, SDG indicator 12.3.1(a), food loss percentage: 13.3% in 2023, FAO SDG indicators data portal: <https://www.fao.org/sustainable-development-goals-data-portal/data/indicator/1231a-global-food-loss-index/en>.
- FAO (2019). The State of Food and Agriculture 2019. Moving forward on food loss and waste reduction (food loss index, SDG indicator 12.3.1(a)): <https://www.fao.org/publications/sofa>.
- United Nations, Sustainable Development Goal target 12.3: <https://sdgs.un.org/goals/goal12>.
- Hegwood, M., Burgess, M. G., Costigliolo, E. M., Smith, P., Bajželj, B., Saunders, H., Davis, S. J. (2023). Rebound effects could offset more than half of avoided food loss and waste. Nature Food: <https://doi.org/10.1038/s43016-023-00792-z>.
