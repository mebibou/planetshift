# Food loss and waste

Some of the food farms grow is never eaten. Wasting less of it means farms need to grow less for the same meals, and so use less land and emit less. Worldwide, about 74 kg of edible food per person is wasted each year after it reaches shops. The lever lets you cut that waste, and the losses before shops, by a share you choose.

## Losses and waste

The two are counted in different places, and the lever can act on each.

- **Losses** happen in the supply chain before food reaches shops: on the farm after harvest, in storage, transport and processing. The Food Balance Sheets record some of them, as each item's `losses` in `supply.json` (see [Data](#method-data)). The model holds these as a fixed share of each item's domestic supply (see [How a shift becomes production changes](#method-shift), step 4). They leave out processing and are 5.3% of production worldwide. FAO's Food Loss Percentage (SDG indicator 12.3.1(a)) counts every step from harvest up to shops. It is 13.3% of food produced worldwide in 2023, and by group 8.4% for cereals and pulses, 25.4% for fruit and vegetables, 12.3% for roots and tubers and 14% for animal products. The lever cuts FAO's losses: `waste.json` gives each country its sub-region's share, by group of items.
- **Waste** happens after food reaches shops: in retail, in food service (restaurants, canteens, hotels) and in households. The Food Balance Sheets do not separate it. It is inside each item's `food`, which is the food available to consumers, not what they eat. `waste.json` gives it per country, in kg per person per year, in three sectors.

## How the lever works

There are two reductions, each between 0 and 1, and you can set them separately:

- $r_L$ for losses before shops;
- $r_W$ for waste after shops.

The reference is SDG target 12.3 (one of the UN's Sustainable Development Goals): halve per capita food waste at the retail and consumer levels by 2030 ($r_W = 0.5$), and reduce losses along production and supply chains.

Wasting less does not change what people eat. It lowers the food supply a country needs for the same meals. Cutting losses lowers the supply needed to bring the same food to shops. The lower supply then goes through the model like a diet shift: it changes production where the item is grown (step 6 of the [model](#method-shift)). Wasting less meat, milk or eggs also lowers the feed the animals need (step 5).

**Example.** A country's food supply is 800 kg per person, of which 100 kg is wasted after shops ($w = 0.125$). It halves its waste ($r_W = 0.5$). Its food supply falls by 0.5 × 0.125 = 6.25%, to 750 kg, for the same 700 kg eaten. Say wheat's losses are 5% of its supply and seed 3%. Halving losses as well lowers wheat's multiplier from 1 ÷ 0.92 to 1 ÷ 0.945, and saves 0.5 × 5% ÷ 0.945 = 2.6% of its supply.

### Waste after shops: the formula

For a country, the share of its food supply that is wasted is

$$
w = \min\left(\frac{\text{retail} + \text{foodService} + \text{household}}{\text{food supply per person, kg}},\ 0.4\right)
$$

where the food supply per person is the sum of `food` over the country's items in `supply.json` × 1000 ÷ its population in the base year. The same share is applied to every item: food eaten = food × (1 − $w$), and food wasted = food × $w$. With a reduction $r_W$, the same food is eaten and less is wasted:

$$
\text{new food} = \text{eaten} + (1 - r_W) \times \text{wasted} = \text{food} \times (1 - r_W\, w)
$$

It is applied after the diet shift, to the food the shifted diet needs. A country that eats less meat and wastes less therefore needs both less meat and less of the rest. In the steps of the [model](#method-shift), it multiplies each item's food use before step 4.

### Losses before shops: the formula

Each item's loss share of domestic supply is the larger of FAO's share for its group and the Food Balance Sheets' own:

$$
\ell = \max\left(\text{FAO's share},\ \frac{\text{losses}}{\text{domestic supply}}\right)
$$

The database splits FAO's shares by group for the world only, so a country's share for a group is its sub-region's share for all products × the world's share for the group ÷ the world's for all products. Items outside FAO's four groups (oil crops, sugar crops, nuts, stimulants and others) take the all-products share. With a reduction $r_L$, $\ell$ becomes $(1 - r_L)\,\ell$.

With $s$ the seed share, the supply needed for a change in use is multiplied by

$$
\frac{1 - \ell - s}{1 - (1 - r_L)\,\ell - s}
$$

so that with no reduction the model is unchanged. The base year's supply falls by $r_L \times \ell \times$ domestic supply × the new multiplier. This counts the losses avoided. It also counts the losses and seed that the smaller supply no longer carries, because both stay shares of it. With a quarter of the supply lost and half the losses avoided, that is 14% more than the losses avoided alone. FAO's losses beyond the Food Balance Sheets' are assumed to be inside the supply the balances give, mostly in `food`, so the balances are left as they are.

## What it changes

Less food supply means less production, by country and item, where trade shares place it. That means less cropland and pasture, and less of every emission that scales with production: enteric methane, manure, rice paddies, fertiliser. Freed land can take up carbon as natural regrowth (see [Land](#method-land)). A cut in wasted animal products also cuts the feed grown for the animals.

## The data

The data is `waste.json`, built by `pipeline/planetshift_pipeline/waste.py`.

### Where the estimates come from

The waste estimates are those of UNEP's *Food Waste Index Report 2024*, for the year 2022: the SDG indicator 12.3.1(b). The pipeline reads them from the UN SDG Global Database (series `AG_FOOD_WST_PC`). The database publishes the report's country estimates sector by sector, with the confidence the report gives each one. For the 27 European countries that report to Eurostat, the database keeps Eurostat's measured 2022 figures rather than the report's. The pipeline takes those. The report itself relies on the same measurements for them.

The report estimates 1.05 billion tonnes of food wasted in 2022, 132 kg per person: 79 kg in households, 36 kg in food service and 17 kg in retail. That is a fifth of the food available to consumers. The pipeline's file, weighted by the base year's population and with the inedible parts added back, gives the same world averages (17 kg in retail, 36 in food service and 79 in households).

### How confident the estimates are

Confidence varies by sector. 159 countries have their own estimate outside Eurostat. Among them, the household estimate has high or medium confidence in 64 countries and very low confidence in 19. The food service and retail estimates have very low confidence in about 135 countries, because they are extrapolated from a few measured countries.

Every country in `countries.json` except one has its own estimate. Taiwan, which the UN database does not list, takes the median of its region (Eastern Asia), sector by sector. Any country missing in a later release is filled the same way, from its M49 sub-region (`Country.region`). When its region has no estimate, it takes the world's median.

### Edible parts only

The Index counts food and the inedible parts that go with it: bones, peels, shells, stones. Only the edible part can be avoided, so the pipeline keeps the edible part only, with these shares:

| Sector | High-income countries | Other countries |
| --- | --- | --- |
| Household | 0.75 | 0.35 |
| Food service | 0.75 | 0.75 |
| Retail | 0.85 | 0.85 |

The household share for high-income countries follows the United Kingdom's measurements, where 74% of household food waste is edible (WRAP, 2021/22: 4.7 of 6.4 million tonnes). Other high-income countries measure less: 77% in Switzerland, but 54% in Israel, 49% in New Zealand and 33% in Japan (UNEP, 2024, Table 19). In lower-income countries more food is bought raw and prepared at home, so a larger part of household waste is peels, husks and bones. The only measurements outside high-income countries find 31% in Brazil, 34% in Indonesia (UNEP, 2024, Table 19) and 39% in Rio de Janeiro (Box 2), so the share is 0.35. Food service and retail waste is mostly unsold or unserved food, so most of it is edible: 74% in British food service (WRAP, 2025), 72% in German food service and 84% in German retail (Schmidt et al., 2019). WRAP takes all retail waste as edible.

With these shares, the world's edible waste after shops is about 599 million tonnes, 74 kg per person a year: 33 kg in households, 27 kg in food service and 14 kg in retail. By country, household edible waste runs from 6 to 99 kg per person, with a median of 32 kg.

### A cap at 40% of the food supply

The edible waste is also capped at 40% of a country's food supply in the Food Balance Sheets (all items kept in the model, kg per person). No country reaches the cap. The share runs from 3% (Spain) to 29% (Yemen), with a median of 10%, and nine countries in ten are below 17%. The highest shares are in countries with a small food supply per person, where the Index's estimates are extrapolated (Yemen, Syria, Chad, Afghanistan).

## Caveats

- **Rebound.** Food that is not wasted saves money. Households and businesses spend it on something else, more or better food among other things. The lower demand also lowers food prices, which raises consumption elsewhere. Hegwood et al. (2023) find that this rebound effect could offset 53–71% of the emissions avoided by wasting less. The model does not count it, so the lever's effect is an upper bound.
- **Uncertain estimates.** Most countries' food service and retail figures, and many household ones, are extrapolations of very low confidence. Measurement methods differ. Some use diaries, which miss waste, and others use waste composition analysis. The Eurostat figures for some countries, such as France, leave out household food waste that is composted at home or recycled separately.
- **Edible shares.** The shares are rounded values from few measurements. The true share varies by country, diet and how food is bought.
- **The same share for every item.** Waste is spread over items in proportion to their food supply. In reality fruit, vegetables and bakery products are wasted more, by weight, than meat or dairy. Emissions come mostly from animal products, so the lever's effect on emissions is likely overstated.
- **Weights.** The Index weighs food as it is thrown away (bread, cooked food), while the Food Balance Sheets count primary equivalents (grain, carcass weight). The waste share w mixes the two, which slightly misstates it.
- **Waste is not free to avoid.** Halving waste is a target, not a measure with a known cost or a known rate of adoption.

## Assumptions

- Waste after shops comes from the Food Waste Index Report 2024 (2022), with Eurostat's 2022 figures for European countries as published in the UN SDG Global Database.
- A country without an estimate takes the median of its M49 sub-region, sector by sector, or the world's median when its sub-region has none.
- The file holds the edible part only, with the shares above by sector and income group.
- Edible waste after shops is at most 40% of a country's food supply per person.
- The waste share is the same for every item of a country, and is applied to food use after the diet shift.
- Losses before shops are FAO's Food Loss Percentage, by sub-region and group of items, or the Food Balance Sheets' where higher; a reduction lowers each item's loss share in proportion. FAO's shares weigh products by economic value, not mass, and its split by group is the world's.
- No rebound effect.

## Sources

- United Nations Environment Programme (2024). Food Waste Index Report 2024. Think Eat Save: Tracking Progress to Halve Global Food Waste. Nairobi: <https://wedocs.unep.org/20.500.11822/45230>. Reproduction for educational or non-profit services is allowed with acknowledgement of the source.
- United Nations Statistics Division, SDG Global Database, indicator 12.3.1(b), series AG_FOOD_WST_PC (food waste per capita, by sector): <https://unstats.un.org/sdgs/dataportal>. Free to copy and distribute with the United Nations cited as the source; commercial redistribution needs the UN's permission.
- Eurostat, Food waste and food waste prevention by NACE Rev. 2 activity (env_wasfw), the European figures reported to the SDG database: <https://ec.europa.eu/eurostat/web/waste/food-waste>.
- WRAP (2023). Household Food and Drink Waste in the United Kingdom 2021/22, executive summary (edible share of household food waste): <https://www.wrap.ngo/sites/default/files/2024-05/WRAP-Household-Food-and-Drink-Waste-in-the-United-Kingdom-2021-22-v6.1.pdf>.
- WRAP (2025). UK Food Waste & Food Surplus – Key Facts, Tables 3 and 5 (edible share of food service waste).
- Schmidt, T., Schneider, F., Leverenz, D., Hafner, G. (2019). Lebensmittelabfälle in Deutschland – Baseline 2015. Thünen Report 71, Table K.1 (avoidable share of food service and retail waste): <https://www.zugutfuerdietonne.de/fileadmin/zgfdt/inhalt/hintergrund/Thuenen_Kurzfassung.pdf>.
- FAO, SDG indicator 12.3.1(a), food loss percentage (series AG_FLS_PCT), by region and group of products, 2023, UN SDG Global Database: <https://unstats.un.org/sdgs/dataportal>; metadata: <https://unstats.un.org/sdgs/metadata/files/Metadata-12-03-01A.pdf>.
- FAO (2019). The State of Food and Agriculture 2019. Moving forward on food loss and waste reduction (food loss index, SDG indicator 12.3.1(a)): <https://www.fao.org/publications/sofa>.
- United Nations, Sustainable Development Goal target 12.3: <https://sdgs.un.org/goals/goal12>.
- Hegwood, M., Burgess, M. G., Costigliolo, E. M., Smith, P., Bajželj, B., Saunders, H., Davis, S. J. (2023). Rebound effects could offset more than half of avoided food loss and waste. Nature Food: <https://doi.org/10.1038/s43016-023-00792-z>.
