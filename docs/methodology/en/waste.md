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

## Waste by stage, by type and where it goes

The map's Waste layer and the Waste chart show three measures. Only the first changes when the levers move.

**Food lost and wasted, by stage.** The model counts, for each country, the food lost before shops and the food wasted in shops, in food service and at home, in tonnes a year. After shops, the model multiplies the country's share of its food supply wasted (above) by its food supply, and shares the result between the three sectors as UNEP's estimate does. Before shops, it is each item's loss share (FAO's or the food balance's, above) times its supply. With the levers, the waste after shops is the same share of the food supply after the diet shift, less the cut of Food wasted after shops. The losses before shops follow the change in the country's production of each item, less the cut of Losses before shops. In the built data, the 187 countries of the model lose 1.75 Gt before shops and waste 599 Mt after them: 114 Mt in shops, 221 Mt in food service and 264 Mt at home, 2.35 Gt in all. The levers start at 0, so the page opens on these figures for both bars. With both levers at 50%, the total falls to 1.01 Gt (714 Mt lost before shops, 299 Mt wasted after them). With both at 100%, it falls to nothing. A 50% diet shift alone brings the losses before shops down to 1.60 Gt, as less is grown, and leaves the waste after shops about the same. These tonnes are larger than the figures usually quoted, and cannot be compared with them directly. FAO puts the food lost between harvest and retail at 13.3% of it in 2023, a share weighted by economic value ([FAO, SDG indicator 12.3.1(a)](https://www.fao.org/sustainable-development-goals-data-portal/data/indicators/1231-global-food-losses)), and UNEP puts the food wasted in 2022 at 1.05 Gt, inedible parts included ([UNEP Food Waste Index Report 2024](https://wedocs.unep.org/20.500.11822/45230)). The model counts the losses before shops in the food balance's own items, by their fresh weight as harvested, the crops grown for feed included, so heavy, watery crops weigh most: sugar crops (sugar cane and beet) account for 340 Mt of the 1.75 Gt, vegetables for 293 Mt, fruit for 213 Mt and cereals for 199 Mt. After shops, it counts the edible part only (above), 599 Mt, less than UNEP's 1.05 Gt.

**Municipal solid waste, by type and treatment.** This is the household and commercial waste that towns collect, or should collect. The figures come from the World Bank's What a Waste 3.0 country dataset (March 2026). Each country's tonnes are the World Bank's estimate for 2022 from its latest figure, so all 217 countries and territories share one year. The dataset's composition is grouped into food and green waste, paper and cardboard, plastic, glass, metal, textiles and other (rubber and leather, wood, electronic, hazardous, nappies and the rest). Its treatment is grouped into landfill (sanitary, controlled and unspecified), open dumps, incineration (with refuse-derived fuel), recycling, composting (with anaerobic digestion and mechanical-biological treatment), other or unaccounted for, and the waste never collected. A country's shares are kept when they add up to 1 within 10%, then scaled to 1. A country without them takes its income group's, weighted by tonnes. This applies to 38 countries for the types and 36 for the treatment, and the tooltip says so. In the built data, the world's municipal solid waste is 2.33 Gt a year, about 293 kg per person. By type, 47.0% is food and green waste, 13.1% paper and cardboard, 12.6% plastic (295 Mt), 3.9% glass, 3.5% textiles, 3.2% metal and 16.7% other. By treatment, 33.9% goes to landfill, 22.9% is incinerated, 10.4% recycled, 4.9% composted or digested, 4.8% dumped in the open, 15.2% goes elsewhere or is not accounted for and 7.8% is never collected. The chart shows the world and each World Bank income group. The food and green waste here counts the food wasted in homes and shops above a second time, with its inedible parts and garden waste, so the two are not added.

**Plastic reaching the ocean.** Meijer et al. (2021) model the plastic that rivers carry from land to the ocean. They multiply the plastic waste each place mismanages by its chance of reaching the sea, and sum the result over each river basin. That chance depends on rain, wind, land use, slope and the distance to a river and to the coast. Their Table S8 gives each country's total, which Our World in Data publishes and dates 2019. In the built data, 163 countries send 979 kt a year to the ocean, about 0.3% of the plastic in the world's municipal waste. The Philippines send 36.4%, India 12.9%, Malaysia 7.5%, China 7.2% and Indonesia 5.8%. The figures leave out plastic waste exported for treatment, which can end up in the sea elsewhere, microplastics, and plastic held on river beds or behind dams. The estimates are uncertain: Our World in Data's notes say a river's true figure can be a quarter to four times its estimate.

**What the levers change.** Only food. The levers Food wasted after shops and Losses before shops cut the food lost and wasted, and a diet shift changes how much food is grown and eaten. No lever changes the municipal waste of other types, where it goes, or the plastic reaching the ocean. The interface says so wherever they are shown: the map's tooltip and note, the table, which has today's column only, and the chart's caption. A plastics lever could change them later. The food levers do not lower the food and green share of the municipal waste either: the two sources measure different things in different years, and tying them would need a model of how much of each country's food waste its towns collect.

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
- World Bank (2026). What a Waste 3.0: Global Snapshot of Solid Waste Management Toward Circularity until 2050, country dataset (Cook, E., Ionkova, K., Bhada-Tata, P., Yadav, S., Van Woerden, F.), World Bank Data Catalog, dataset 0039597: <https://datacatalog.worldbank.org/search/dataset/0039597>. CC BY 4.0.
- Meijer, L. J. J., van Emmerik, T., van der Ent, R., Schmidt, C., Lebreton, L. (2021). More than 1000 rivers account for 80% of global riverine plastic emissions into the ocean. Science Advances 7(18), eaaz5803, Table S8: <https://doi.org/10.1126/sciadv.aaz5803>. CC BY-NC 4.0. Read through Our World in Data, Plastic pollution entering the ocean through rivers: <https://ourworldindata.org/grapher/plastic-entering-ocean>.
