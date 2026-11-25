# How a shift becomes production changes

A diet shift changes what people eat, then what farms produce, and then the warming from farming. People eat less of the animal foods and get the same protein (or the same calories) from plant foods. Fewer animals then need less feed, so the output of crops can fall as well as that of livestock. The change in what farms produce becomes a change in emissions and in temperature.

Planetshift's sliders change what people eat. The map shows what farms produce, and the chart shows the warming from producing it.

## The steps in brief

1. **The kept basis.** Each person keeps the same protein (by default) or the same calories.
2. **What is removed.** Each animal group loses the share of its food supply that the sliders set.
3. **What is added.** The protein (or calories) removed is added back as plant foods, in the chosen mix.
4. **Losses and seed.** More food needs a little more supply, because some is lost and some grain is kept as seed.
5. **Feed.** Fewer animals eat less feed, so the production of feed crops falls.
6. **Where production changes.** The world's change in demand for each food is shared among the countries that produce it.
7. **Emissions.** Each country's change in production is multiplied by the emissions per tonne of each product.
8. **Land.** The change in production gives the cropland and pasture used or freed, and, as an option, the CO₂ that freed land takes up.
9. **Over time.** The change ramps in from this year to the chosen year, on top of a baseline that, by default, follows population.
10. **Temperature.** The yearly change in each gas is turned into a change in temperature.

Everything starts from the FAOSTAT Food Balance Sheets (FBS) of the base year, the latest year with complete data (see [Data](#method-data)). For each country and item, they give production, imports and exports. They also give how the supply is used: food, feed, losses, processing, seed and other uses. Quantities are in tonnes of primary equivalent: a processed food is counted as the amount of raw crop or animal product it stands for.

## Worked example

This example uses the test fixtures (`app/public/fixtures/`), whose numbers are made up but plausible. It takes France, a 10% shift, protein kept, today's protein-rich plant foods as the replacement, and domestic production:

1. Removed: 10% of each animal item, such as 152 kt of bovine meat and 1,724 kt of milk, and the fish.
2. Added: the same protein shared by France's protein-rich plant foods, most of it wheat. Wheat food supply rises by 1,261 kt, maize by 115 kt, rice by 80 kt, oats by 34 kt and beans by 23 kt.
3. Supply: wheat's losses and seed are 8% of its supply, so its supply rises by 1,261 × 1.087 tonnes.
4. Feed: France's animal production falls by a little more than 10%. Each animal item falls by the share of its world use removed (step 5), and feed falls with it. Maize feed is 9.9 Mt, so maize production falls by 1,106 kt, although maize food rises by 115 kt. Wheat production rises by only 606 kt, as its feed use (6.0 Mt) falls.
5. Result: protein stays at 107.8 g a day, and energy rises from 2,437 to 2,545 kcal. France's farm emissions fall by about 224 kt of CH₄ (methane), 5.6 kt of N₂O (nitrous oxide) and 0.6 Mt of CO₂ a year.

## 1. The kept basis: protein or calories

A shift removes part of each animal group's food supply. It adds back the same amount of protein (the default) or of energy (kcal). Each country's intake on that basis is therefore unchanged.

The other nutrient changes. Replacing meat protein with wheat protein brings more calories. Replacing it calorie for calorie brings less protein.

The protein and calorie contents per tonne are the FBS's own: the food supply in protein and in kcal, divided by the food supply in tonnes.

## 2. What is removed

The animal groups are ruminant meat, pig meat, poultry meat, dairy, eggs, and fish and seafood. For each group, the controls give a share: the main slider, or a per-group slider that overrides it. Each animal item in the group loses that share of its food supply.

A 100% shift means no animal farmed for food: every animal group's production falls to zero. Animals not raised for food (draught oxen and buffalo, horses and donkeys, most of India's cattle) stay, and so do their emissions (see [Emissions](#method-emissions)).

With *high-income countries only*, countries outside the World Bank's high-income group keep their diet.

## 3. What is added

The protein (or kcal) removed is added to plant items in the chosen replacement mix:

- **Today's protein-rich plant foods** (default): each of these foods gets a share of the added protein (or kcal) equal to its share of the country's current protein (or kcal) from them. They are the foods that supply most plant protein: cereals, rice, pulses, nuts, and the oilseeds eaten for their protein (soybeans, groundnuts, sesame and others with at least 10% protein). Fruit, vegetables, roots, sugar, oils, drinks, coffee, cocoa and spices keep their current amounts.
- **Mostly legumes**: 60% to pulses, 20% to soybeans and 20% to cereals. Each part is split by the country's current mix within it. These weights are a starting value to review, not taken from a study.
- **Soy and oat drinks**: half to soybeans and half to oats, the two main plant-milk bases.

When a country eats none of the items in a part of the mix, that part follows the world's mix. When no item exists at all, the part is dropped and the others are scaled up.

### Why the default mix keeps to protein-rich foods

A mix that scaled every plant food by the same factor would raise fruit by 88% and vegetables by 74% to replace the protein of meat. Sugar, beer and vegetable oils would rise in proportion, although they bring almost no protein. Cropland would rise by nearly a quarter under a full plant-based shift, against a fall of a fifth in Poore and Nemecek (2018).

So the replacement keeps to the foods people eat for protein, and the land of oilcakes and fodder is counted (see [Land](#method-land)). Together, these turn that rise into a fall of 8% with protein kept and 24% with calories kept.

## 4. From food to supply: losses and seed

A tonne more food needs more than a tonne of supply. Some is lost between farm and shop, and some grain is kept as seed. Losses and seed are held as fixed shares of each item's domestic supply. A change in food or feed use therefore changes supply by that change ÷ (1 − the share of losses and seed). This multiplier is capped at 3, to limit the effect of unusual rows in the data.

Processing is held fixed, so it does not scale with the shift. An item can be processed into another: soybeans crushed into oil and cake, sugar cane into sugar, milk into butter. The derived item is in the FBS, with its own production and its own emission intensity (emissions per tonne). A change in demand for soybean oil therefore changes the production of soybean oil, and its emissions, not the soybeans crushed for it.

Oilcakes are not FBS items. The land of the oilseeds crushed for them, and the part of their emissions the cake carries, follow the animals that eat them (see [Land](#method-land)).

## 5. Fewer animals, less feed

Animals eat crops. For each animal group, emissions and land are counted on the country's production less what it processes. When that falls by a fraction, every feed item's feed use falls by that fraction × the share of the item fed to that group.

The shares come from `feed.json`, per region. A region that has none uses the world's shares. The *Feed shared out* option picks the table (see [Feed](#method-feed) and [Options](#method-options)).

Grass and pasture are not in the FBS, so they do not appear here. Feed often falls more than food rises, so total cropland and crop output can go down under a shift.

Animal production is placed first (step 6). The feed change is computed where the animals are, before plant production is placed.

Some feed items are animal items: milk fed to calves and piglets, and fish reduced to meal and fed to farmed fish, pigs and poultry. Their feed use follows the world's change in the groups they feed, which comes from the change in food. That change is treated as a change in demand, on top of the change in food. It is done once. The fish caught for meal are wild and eat no feed, so a change in them does not change feed again. The change in milk fed to calves is small. See [Fish and seafood](#method-seafood). The crops' feed use then follows each country's change in animal production, the fish and milk fed included.

An animal item also has uses that are neither food nor feed: tallow and lard for soap and fuel, milk for industry, and the gap between the world's recorded imports and exports. They come from animals raised for food, so they change with them. Each animal item's production changes by the same fraction as its world use as food and as feed. A change in use is multiplied by the world's production of the item less processing, divided by that use. Raw animal fats, half of whose supply goes to such uses, fall by half under a 50% shift, not by a quarter.

## 6. Where production changes

- **Fixed trade shares** (default): the world change in supply of an item is shared among countries by their share of the world's production of it. Only what is not processed into another item counts (production − processing). A country that grows 10% of the world's beef loses 10% of the fall in world beef demand, wherever that demand was. Shares are taken on production less processing because that is the part whose emissions the model counts. A country that imports soybeans to crush them grows few soybeans of its own, so it takes little of a change in soybean demand.
- **Domestic**: each country's production changes by its own change in supply, as if it grew everything it eats, as far as its own production allows. A cut can be larger than what a country grows, for a country that eats more beef than it raises. That cut falls on its suppliers: the part the country cannot make itself is shared among the world's producers, as under fixed trade shares.

An item no country produces stays where it is eaten.

A change could take a country's production below what it processes (production − processing below zero). The change stops there, and the country is listed as clipped. A diet shift alone does not do this, even at 100%, because animal production falls by the share of its use removed.

The production shown by group is production less what is processed into another item: the tonnes whose emissions are counted. Milk made into butter or cream is counted on the butter and cream, so it is not counted twice, and a 100% shift takes the dairy group to zero.

## 7. Emissions

A country's emissions, for each item and gas, are the intensity (kg of CO₂, CH₄ and N₂O per tonne) × (production − processing). Subtracting processing avoids counting a crop twice: the processed share is counted on the derived item. The change from a shift is the production change × the same intensity.

The gases are kept separate until the temperature is computed. The CO₂-equivalent (CO₂e) adds them up with their 100-year warming weights (GWP100, see [Climate](#method-climate)). It is only shown as a total.

## 8. Land

A country's farmland has two parts, from `land.json` (see [Land](#method-land)):

- **Cropland**: for each item, its hectares harvested per tonne × its production less processing. These are the same tonnes whose emissions are counted. The area of a processed crop is therefore counted on the derived item, when the data gives that item hectares of its own.
- **Pasture**: the country's permanent meadows and pastures, shared among the ruminant groups that graze it (ruminant meat and dairy).

At the full shift, cropland changes by each item's change in production × its hectares per tonne. Each ruminant group's share of the pasture changes by the same fraction as that group's production in the country. For example, if beef production falls by 40% and beef cattle graze 80% of the pasture, pasture falls by 32%. Pasture never falls below zero.

The land a country frees is the fall in its cropland and pasture, added together. A country that needs more land in total frees none.

### Regrowth on freed land

With *natural regrowth* under *Other options*, freed land grows back to natural vegetation. It takes up CO₂ at the country's rate (tonnes of CO₂ per hectare per year) for `regrowthYears` years after it is freed (30 in the data).

Land is freed as the shift ramps in. The land freed in a year starts taking up CO₂ that year and stops 30 years later. The uptake in year $t$ is, over countries $c$, with $h_c$ their net freed hectares:

$$
\text{uptake}(t) = \sum_{c} h_c \times \text{rate} \times \big(\text{ramp}(t) - \text{ramp}(t - 30)\big)
$$

A country that farms more land in all than before has negative net freed hectares. The uptake that land forgoes is counted against it (see [Land](#method-land)).

The uptake is taken off the scenario's CO₂ before the temperature is computed (step 10). It therefore shows in the temperature, in the warming avoided and in the CO₂ avoided.

The median temperature uses the median rate. The 5% bound uses the slower end of the rate's range, and the 95% bound the faster end. A weak climate response is therefore paired with slow regrowth, which makes the range as wide as the two allow.

### What the summary shows

The summary shows the farmland freed at the full shift, split into cropland and pasture, and as a share of the world's farmland in the base year. With regrowth on, it also shows the CO₂ taken up in a single year, the year the shift is complete. That is the uptake at its peak, and it is already part of the CO₂ avoided shown above it.

## 9. Over time

The model computes the change at the full shift. Over the years from now to 2100:

- **Baseline**: with the default *today's diet × population*, each year's emissions are the base year's × world population that year ÷ world population in the base year. With the *SSP2 path*, they follow SSP2-4.5's agricultural emissions, gas by gas, relative to the base year. SSP2-4.5 is the middle-of-the-road future among the Shared Socioeconomic Pathways (SSPs), the published scenarios the IPCC uses (see [Climate](#method-climate)).
- **Shift**: the baseline plus ramp(t) × the full-shift change, scaled the same way as the baseline. The ramp is 0 in the current year. It rises in a straight line to 1 in the chosen year (2035 by default), and stays at 1. With natural regrowth, the CO₂ taken up by freed land (step 8) is subtracted. It is not scaled with the baseline.
- **Farm electricity**: the part of the change that is the CO₂ of the grid electricity farms use (in the cradle-to-farm-gate scope, see [Farm practices](#method-practices)) also follows the grid. Each year it is multiplied by the chosen SSP's world grid intensity that year over this year's: on SSP2-4.5, 0.58 in 2050 and none in 2100. Electricity a diet shift saves therefore avoids less CO₂ as the grid gets cleaner. Without `sectors.json`, it stays at this year's grid.

The avoided emissions shown in the summary are those of the year the shift is complete.

## 10. Temperature

Each gas warms the world in its own way over time. The absolute global temperature change potential (AGTP) of a gas is how much warmer the world is, year by year, after one kilogram of it is emitted (see [Climate](#method-climate)). The warming from a change in emissions adds up over gases and years. Each year's change is multiplied by the gas's AGTP for the number of years since that change:

$$
\Delta T(t) = \sum_{\text{gas}} \sum_{\tau \le t} \Delta E_{\text{gas}}(\tau) \cdot \mathrm{AGTP}_{\text{gas}}(t - \tau)
$$

The AGTP curves come from pulse runs of FaIR, a simple climate model, or from the AR6 fallback (see [Options](#method-options)).

The baseline temperature is the chosen SSP's published temperature. With the *population* baseline, a correction is added: the warming from the difference between population-scaled agricultural emissions and the SSP's own agricultural path, from the base year on. The baseline curve then matches the baseline emissions. The shift's curve is the baseline + ΔT, for the median and for the 5–95% range of the AGTP.

## Assumptions

- Diets change by shares of each animal group's current supply; the mix within a group does not change.
- The kept basis is conserved exactly per country. The other nutrient is not.
- The default replacement is today's mix of protein-rich plant foods (cereals, rice, pulses, nuts, oilseeds with at least 10% protein). The legume mix is 60% pulses, 20% soybeans, 20% cereals, and soy and oat drinks 50% soybeans, 50% oats: starting values to review.
- Losses and seed are fixed shares of supply. Processing is fixed in tonnes. The supply multiplier is capped at 3.
- Feed falls in proportion to each group's production less processing in the same country, as pasture and fodder do. An animal group a country does not produce has no feed to lose.
- Milk and fish fed to animals change once, with the animals they feed. That change does not change feed again.
- Fixed trade shares or domestic production: no change in who exports what.
- Production cannot fall below what is processed. Such cases are clipped and listed.
- An animal item's uses other than food and feed, and the world's trade gap, follow its production.
- Intensities per tonne do not change with the amount produced.
- Hectares per tonne and the pasture's shares stay as in the base year: yields and grazing intensity do not change with the shift.
- An oilseed's land is shared between its oil and its cake by their value. The cake's part follows the animals that eat it, and temporary meadows follow the ruminants, as pasture does.
- Pasture follows the ruminant production of the same country, group by group. It never falls below zero.
- With regrowth on, land freed and land newly used are netted in each country. Net newly used land is charged the uptake it forgoes at the country's regrowth rate, not the CO₂ of clearing standing forest. With regrowth off, neither counts.
- With regrowth on, all freed land is left to natural vegetation. It takes up CO₂ at a constant rate for 30 years and then nothing. A country with no rate in the data takes the median rate of the others. The uptake is not scaled with population.
- The baseline holds today's diet. Population and the SSP2 path are the only drivers of change to 2100.
- The ramp rises in a straight line from the current year.
- Temperature responses are linear in the change of emissions (small changes around the SSP scenario).

## Where the code is

The code is in `app/src/model/`: `diet.ts`, `replacement.ts`, `feed.ts`, `supplyChain.ts`, `location.ts`, `emissions.ts`, `land.ts`, `timePath.ts` and `run.ts`.

## Sources

- FAOSTAT, Food Balance Sheets: https://www.fao.org/faostat/en/#data/FBS
- FAO, Global Livestock Environmental Assessment Model (GLEAM), feed rations: https://www.fao.org/gleam/en/
- Leach N. J. et al. (2021), FaIR v2.0.0, Geoscientific Model Development: https://doi.org/10.5194/gmd-14-3007-2021
- IPCC AR6 WG1, Chapter 7, metrics and AGTP: https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-7/
- UN DESA (2024). World Population Prospects 2024: Summary of Results. UN DESA/POP/2024/TR/NO. 9; the WPP 2024 data: <https://population.un.org/wpp/>, CC BY 3.0 IGO.
- KC, S., Lutz, W. (2017). The human core of the shared socioeconomic pathways: population scenarios by age, sex and level of education for all countries to 2100. Global Environmental Change 42, 181–192: <https://doi.org/10.1016/j.gloenvcha.2014.06.004>.
- KC, S. et al. (2024). Updating the Shared Socioeconomic Pathways (SSPs) global population and human capital projections. IIASA Working Paper WP-24-003.
- Our World in Data, Population (long-run series from HYDE 3.3, Gapminder v7 and WPP 2024): <https://ourworldindata.org/population-growth>, CC BY 4.0.
- Klein Goldewijk, K. et al. (2017). Anthropogenic land use estimates for the Holocene: HYDE 3.2. Earth System Science Data 9, 927–953: <https://doi.org/10.5194/essd-9-927-2017>.
- Poore, J., Nemecek, T. (2018). Reducing food's environmental impacts through producers and consumers. Science 360, 987–992: https://doi.org/10.1126/science.aaq0216
