# How a shift becomes production changes

Planetshift's sliders change what people eat. The map shows what farms produce, and the chart shows the warming from producing it. This page follows a shift from the plate to the farm, then to emissions over time. The code is in `app/src/model/`: `diet.ts`, `replacement.ts`, `feed.ts`, `supplyChain.ts`, `location.ts`, `emissions.ts`, `land.ts`, `timePath.ts` and `run.ts`.

Everything starts from the FAOSTAT Food Balance Sheets (FBS) of the base year. For each country and item they give production, imports, exports, and how the supply is used: food, feed, losses, processing, seed and other uses, in tonnes of primary equivalent.

## 1. The kept basis: protein or calories

A shift removes part of each animal group's food supply and adds back the same amount of protein (the default) or of energy (kcal), so each country's intake on that basis is unchanged. The other one moves: replacing meat protein with wheat protein brings more calories, and replacing it calorie for calorie brings less protein. The protein and calorie contents per tonne are the FBS's own (food supply in protein and kcal divided by food supply in tonnes).

## 2. What is removed

For each animal group (ruminant meat, pig meat, poultry meat, dairy, eggs, fish and seafood) the controls give a share: the main slider, or a per-group slider that overrides it. Each animal item in the group loses that share of its food supply. With *high-income countries only*, countries outside the World Bank's high-income group keep their diet.

## 3. What is added

The protein (or kcal) removed is added to plant items by the chosen replacement mix:

- **Today's protein-rich plant foods** (default): today's protein-rich plant foods, each by its share of the country's current protein (or kcal) from them. They are the foods that supply most plant protein: cereals, rice, pulses, nuts, and the oilseeds eaten for their protein (soybeans, groundnuts, sesame and others with at least 10% protein). Fruit, vegetables, roots, sugar, oils, drinks, coffee, cocoa and spices keep their current amounts.
- **Mostly legumes**: 60% to pulses, 20% to soybeans, 20% to cereals, each part split by the country's current mix within it. These weights are a starting value to review, not taken from a study.
- **Soy and oat drinks**: half to soybeans and half to oats, the two main plant-milk bases.

The default mix changed in November 2026. It used to scale every plant food alike, so that replacing the protein of meat raised fruit by 80%, vegetables by 74%, and sugar, beer and vegetable oils in proportion, although they bring almost no protein; cropland rose by a quarter under a full plant-based shift, against a fall of a fifth in Poore and Nemecek (2018). Keeping the replacement to the foods people eat for protein, and counting the land of oilcakes and fodder (see [Land](#method-land)), turns that rise into a fall of 6% with protein kept and 22% with calories kept.

When a country eats none of the items in a part of the mix, that part follows the world's mix; when no item exists at all, the part is dropped and the others are scaled up.

## 4. From food to supply: losses and seed

A tonne more food needs more than a tonne of supply, because some is lost between farm and shop and some grain is kept as seed. Losses and seed are held as fixed shares of each item's domestic supply, so a change in food or feed use changes supply by that change ÷ (1 − the share of losses and seed). The multiplier is capped at 3 as a guard against odd rows.

Processing is held fixed, so it does not scale with the shift. An item processed into another one (soybeans crushed into oil and cake, sugar cane into sugar, milk into butter) has that derived item in the FBS with its own production and its own emission intensity. A change in demand for soybean oil therefore changes the production of soybean oil, and its emissions, not the soybeans crushed for it. Oilcakes are not FBS items; the land of the oilseeds crushed for them follows the animals that eat them (see [Land](#method-land)).

## 5. Fewer animals, less feed

Animals eat crops. When a country's production of an animal group, less what it processes (the herd whose emissions and land are counted), falls by a fraction, every feed item's feed use falls by that fraction times the share of the item fed to that group. The shares come from `feed.json`, per region, with the world's shares for a region that has none; the *Feed shared out* option picks the table (see [Options](#method-options)). Grass and pasture are not in the FBS, so they do not appear here. Feed often falls more than food rises, so total cropland and crop output can go down under a shift.

Animal production is placed first (step 6), and the feed change is computed where the animals are, before plant production is placed.

Some feed items are animal items: milk fed to calves and piglets, and fish reduced to meal and fed to farmed fish, pigs and poultry. Their feed use changes in the same way, and that change is placed like a change in demand, on top of the change in food. It is done once: the fish caught for meal are wild and eat no feed, so a change in them does not change feed again, and the change in milk fed to calves is small. See [Fish and seafood](#method-seafood).

## 6. Where production changes

- **Fixed trade shares** (default): the world change in supply of an item is shared among countries by their share of the world's production of it, counting only what is not processed into another item (production − processing). A country that grows 10% of the world's beef loses 10% of the fall in world beef demand, wherever that demand was. Shares are taken on production less processing because that is the part whose emissions the model counts; a country that imports soybeans to crush them grows few soybeans of its own and so takes little of a change in soybean demand.
- **Domestic**: each country's production changes by its own change in supply, as if it grew everything it eats, as far as its own production allows. A cut larger than what a country grows (a country that eats more beef than it raises) falls on its suppliers: the part it cannot make itself is shared among the world's producers as under fixed trade shares.

An item no country produces stays where it is eaten. A change that would take a country's production below what it processes (production − processing below zero) is stopped there, and the country is listed as clipped. With both options this happens only when a shift removes a whole group (100%): the cut in a primary item such as milk then reaches its processed share, which is counted on the processed item (butter, cheese) and removed there.

## 7. Emissions

A country's emissions are, for each item and gas, the intensity (kg of CO₂, CH₄ and N₂O per tonne) × (production − processing). Subtracting processing avoids counting a crop twice: the processed share is counted on the derived item. The change from a shift is the production change × the same intensity. Gases stay separate all the way to the temperature; CO₂-equivalent (GWP100) is only shown as a total.

## 8. Land

A country's farmland has two parts, from `land.json` (see [Land](#method-land)). Cropland is, for each item, its hectares harvested per tonne × its production less processing: the same tonnes whose emissions are counted, so the area of a processed crop is counted on the derived item when the data gives that item hectares of its own. Pasture is the country's permanent meadows and pastures, shared among the ruminant groups that graze it (ruminant meat and dairy).

At the full shift, cropland changes by each item's change in production × its hectares per tonne. Each ruminant group's share of the pasture changes by the same fraction as that group's production in the country: if beef production falls by 40% and beef cattle graze 80% of the pasture, pasture falls by 32%. Pasture never falls below zero. A country frees the fall in its cropland and pasture together; a country that needs more land in total frees none.

With *natural regrowth* under Options, freed land grows back to natural vegetation and takes up CO₂ at the country's rate (tonnes of CO₂ per hectare per year) for `regrowthYears` years after it is freed (30 in the data). Land is freed as the shift ramps in: the land freed in a year starts taking up CO₂ that year and stops 30 years later, so the uptake in year t is Σ over countries of freed hectares × rate × (ramp(t) − ramp(t − 30)). The uptake is taken off the scenario's CO₂ before the temperature is computed (step 10), so it shows in the temperature, in the warming avoided and in the CO₂ avoided. The median temperature uses the median rate, the 5% bound the slower end of the rate's range and the 95% bound the faster end, so a weak climate response goes with slow regrowth and the range is the widest the two allow.

The summary shows the farmland freed at the full shift, split into cropland and pasture, and as a share of the world's farmland in the base year. With regrowth on, it also shows the CO₂ taken up in the year the shift is complete, a year: that is the uptake at its peak, and it is already part of the CO₂ avoided shown above it.

## 9. Over time

The model computes the change at the full shift. Over the years from now to 2100:

- **Baseline**: with the default *today's diet × population*, each year's emissions are the base year's × world population that year ÷ world population in the base year. With the *SSP2 path*, they follow SSP2-4.5's agricultural emissions, gas by gas, relative to the base year.
- **Shift**: the baseline plus ramp(t) × the full-shift change, scaled the same way as the baseline. The ramp is 0 in the current year, rises linearly to 1 in the chosen year (2035 by default), and stays at 1. With natural regrowth, the CO₂ taken up by freed land (step 8) is subtracted; it is not scaled with the baseline.

The avoided emissions shown in the summary are those of the year the shift is complete.

## 10. Temperature

The warming from a change in emissions is the sum, over gases and years, of each year's change × the gas's absolute global temperature change potential (AGTP) after the years since: ΔT(t) = Σ_gas Σ_τ≤t ΔE_gas(τ) · AGTP_gas(t − τ). The AGTP curves come from FaIR pulse runs (or the AR6 fallback); see [Options](#method-options).

The baseline temperature is the chosen SSP's published temperature. With the *population* baseline, the warming from the difference between population-scaled agricultural emissions and the SSP's own agricultural path (from the base year on) is added, so the baseline curve matches the baseline emissions. The shift's curve is the baseline + ΔT, for the median and for the 5–95% range of the AGTP.

## Worked example

From the test fixtures (`app/public/fixtures/`, made-up but plausible numbers), France, a 10% shift, protein kept, today's protein-rich plant foods, domestic production:

1. Removed: 10% of each animal item, such as 152 kt of bovine meat and 1,724 kt of milk, and the fish.
2. Added: the same protein shared by France's protein-rich plant foods, most of it wheat: wheat food supply rises by 1,261 kt, maize by 115 kt, rice by 80 kt, oats by 34 kt, beans by 23 kt.
3. Supply: wheat's losses and seed are 8% of its supply, so its supply needs 1,261 × 1.087 more tonnes.
4. Feed: with 10% fewer animals, feed falls by 10%. Maize feed is 9.9 Mt, so maize production falls by 959 kt although maize food rises by 115 kt. Wheat production rises by only 702 kt, as its feed use (6.0 Mt) falls.
5. Result: protein stays at 107.8 g a day, energy rises from 2,437 to 2,545 kcal, and France's farm emissions fall by about 195 kt of CH₄, 4.8 kt of N₂O and 0.5 Mt of CO₂ a year.

## Assumptions

- Diets change by shares of each animal group's current supply; the mix within a group does not change.
- The kept basis is conserved exactly per country; the other nutrient is not.
- The default replacement is today's mix of protein-rich plant foods (cereals, rice, pulses, nuts, oilseeds with at least 10% protein); the legume mix is 60% pulses, 20% soybeans, 20% cereals, and soy and oat drinks 50% soybeans, 50% oats: starting values to review.
- Losses and seed are fixed shares of supply; processing is fixed in tonnes; the supply multiplier is capped at 3.
- Feed falls in proportion to each group's production less processing in the same country, as pasture and fodder do; an animal group a country does not produce has no feed to lose.
- Milk and fish fed to animals change once, with the animals they feed; that change does not change feed again.
- Fixed trade shares or domestic production: no change in who exports what.
- Production cannot fall below what is processed; such cases are clipped and listed.
- Intensities per tonne do not change with the amount produced.
- Hectares per tonne and the pasture's shares stay as in the base year: yields and grazing intensity do not change with the shift.
- An oilseed's land is shared between its oil and its cake by their value; the cake's part follows the animals that eat it, and temporary meadows follow the ruminants, as pasture does.
- Pasture follows the ruminant production of the same country, group by group; it never falls below zero.
- Land freed in one country is not set against land newly used in another, and land newly used is not charged with the emissions of clearing it; only freed land counts, and only with regrowth on.
- With regrowth on, all freed land is left to natural vegetation, takes up CO₂ at a constant rate for 30 years and then nothing; a country with no rate in the data takes up nothing. The uptake is not scaled with population.
- The baseline holds today's diet; population and the SSP2 path are the only drivers of change to 2100.
- The ramp is linear from the current year.
- Temperature responses are linear in the change of emissions (small changes around the SSP scenario).

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
