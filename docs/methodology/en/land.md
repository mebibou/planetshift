# Land: cropland, pasture and regrowth

Farming uses about 4.7 billion hectares, a third of the world's land: roughly 1.6 billion hectares of cropland and 3.1 billion hectares of permanent meadows and pastures in FAOSTAT's current land-use data for 2023. FAO's earlier briefs, on earlier releases of the same data, gave about 4.8 and 3.2 billion hectares; the pipeline reads the total area of "permanent meadows and pastures" (not only the cultivated part), and the difference is FAOSTAT's revision of the series. When fewer animal products are eaten, less pasture is grazed and fewer feed crops are grown; when more plant foods are eaten, more food crops are grown. Planetshift counts how much farmland each scenario uses and frees, country by country, and, as an option, the carbon that freed land could take up if it were left to grow back into forest. The figures are in `land.json`; the code is `pipeline/planetshift_pipeline/land.py`.

## What land is counted

- **Cropland**: the area harvested for each food crop of the Food Balance Sheets (cereals, pulses, oilseeds, roots, sugar crops, fruit, vegetables, nuts, coffee, cocoa, tea and spices), from FAOSTAT's crop statistics. Harvested area counts a field twice when it gives two harvests in a year (multiple cropping), and leaves out fallow land, fodder crops and non-food crops (cotton lint, tobacco, rubber); FAOSTAT's cropland, a measure of physical land, is a little larger for these reasons. The model's food crops add up to 1.51 billion hectares in 2023 against 1.42 billion hectares harvested and 1.58 billion hectares of cropland in FAOSTAT (see the checks below).
- **Oilcakes**: the part of crushed oilseeds' land that goes to the cake fed to animals (see below): 0.11 billion hectares.
- **Fodder**: FAOSTAT's "temporary meadows and pastures", grass sown on arable land for grazing or hay, 0.14 billion hectares, counted as cropland and shared between the ruminant groups as their pasture is.
- **Pasture**: FAOSTAT's "permanent meadows and pastures" in each country: 3.02 billion hectares in the model's countries, out of 3.10 billion in the world. Much of it is rangeland: dry grassland, steppe and shrubland grazed at low density, which was never forest.

Other fodder crops grown on arable land (silage maize, alfalfa, fodder beet) are no longer reported by crop in FAOSTAT, so they are not counted; they are part of the gap between harvested area and cropland. Grass and hay are not items of the Food Balance Sheets either (see [Feed](#method-feed)).

## Cropland per tonne

For each country and crop, the hectares harvested per tonne produced. The crops of FAOSTAT's production statistics are grouped into Food Balance Sheet items with the same table as for emissions (`qcl_items.csv`): wheat to "Wheat and products", lentils and chickpeas to "Pulses, other", 15% of a seed-cotton field to cottonseed (the rest is lint, outside the model), and so on.

- The yield is averaged over three years, 2022 to 2024, around the base year: the hectares of the three years divided by their tonnes, so that a drought or a bumper harvest in 2023 does not set the value. Only crop-years with both an area and a production are used.
- It is then expressed per tonne of the Food Balance Sheet item, which is not always the crop as harvested: the hectares per tonne of crop are multiplied by the crop's tonnes in 2023 and divided by the item's production in the balance.
- A value more than 20 times above or below the item's production-weighted world median points to a mismatch between the two FAOSTAT domains and is not used, as for emissions.

A country without a value of its own for an item (it does not grow it, or its value was set aside) takes the production-weighted median of its region, else of the world. About 4,100 country-item values are a country's own, 3,100 come from its region and 2,300 from the world; the borrowed values mostly fill items a country does not grow, which matter only if the scenario moves production there.

Some world values, weighted by production: wheat 0.27 ha per tonne, maize 0.17, rice 0.21 (per tonne of paddy-equivalent production in the balance), soybeans 0.37, potatoes 0.045, coffee 1.0.

### Processed products

The land of processed products follows the rule for emissions (see [Emissions](#method-emissions)), so that no hectare is counted twice. A primary crop's land is its hectares per tonne × (production − processing), and a processed item (vegetable oils, sugar, sweeteners, wine, beer and other drinks) carries the land of the crop it was made from: its primary item's hectares per tonne divided by the extraction rate, with the same rates and weights as for emissions. A tonne of soybean oil, made from about 5.3 tonnes of soybeans, carries 2.3 ha; a tonne of palm oil 0.29 ha; a tonne of raw sugar 0.12 ha. Rice bran oil and maize germ oil, by-products of milling, carry none. Butter and cream are made from milk, which uses no cropland of its own.

### Oil and oilcake

Crushing an oilseed gives oil and a cake (meal) fed to animals. The cake is not an item of the balance, so the oil's hectares per tonne above would carry the whole crop, and no land would be freed when fewer animals eat soybean meal. Planetshift shares the land between the two by their value, as life-cycle studies usually do for co-products (economic allocation): the oil keeps its share of the hectares per tonne, and the rest of the land the oil carried in the base year goes to the cake (`oilcakeHa` in `land.json`, by country and oilseed). The shares come from `pipeline/oilcakes.csv`: tonnes of cake per tonne of oil from FAO's technical conversion factors, and world prices from FAOSTAT's trade data (export value over quantity, 2021–2023).

| Oil | Cake per tonne of oil | Oil, $/t | Cake, $/t | Oil's share of the land |
| --- | --- | --- | --- | --- |
| Soybean | 4.4 | 1,277 | 495 | 37% |
| Rapeseed and mustard | 1.4 | 1,413 | 354 | 74% |
| Sunflower | 1.15 | 1,295 | 283 | 80% |
| Groundnut | 1.2 | 1,944 | 398 | 80% |
| Cottonseed | 2.9 | 1,362 | 247 | 66% |
| Palm kernel | 1.1 | 1,321 | 182 | 87% |
| Coconut (copra) | 0.53 | 1,571 | 229 | 93% |
| Sesame | 1.0 | 4,720 | 414 | 92% |
| Other oilseeds | 1.8 | 2,272 | 430 | 75% |

Palm oil and olive oil keep all their land: the press cake of the oil palm's fruit and the olive's pomace are hardly fed. The cake's land changes with the production of the animal groups that eat it, weighted by the oilseed's feed shares (`feed.json`): with trade shares held, by the world's change in each group's production, as cake is traded like its oil; with each country producing its own change, by the country's own. In all, oilcakes carry 0.11 billion hectares, soybean meal most of it. Emissions are shared the same way (see [Emissions](#method-emissions)).

## Pasture and the animals that graze it

Each country's pasture is shared between ruminant meat and dairy, in proportion to the livestock units of each, from FAOSTAT's Livestock Patterns. A livestock unit weighs animals by their feed needs, with coefficients that vary by region (a cow in North America counts more than a cow in sub-Saharan Africa; a sheep or a goat counts about a tenth of a cow).

- Cattle: the dairy herd is the share of cattle that are cows milked (FAOSTAT's "milk animals" over cattle stocks); as for emissions, 85% of it goes to dairy and 15% to the beef of culled cows and calves. The rest of the herd goes to ruminant meat.
- Buffalo, sheep, goats and camels: split between milk and meat by the protein each country's herd produces, as for their emissions.
- Horses, asses and mules also graze, but are left out as they are for emissions (they are kept for work); the pasture they use is shared between the food ruminants. Pigs and poultry get no pasture.

A country missing from Livestock Patterns (Nicaragua, at present) takes its herds' heads times the world's livestock units per head. A country with ruminants but no pasture in FAOSTAT (Egypt, small islands) has 0 ha of pasture. Worldwide, dairy takes 16% of pasture and ruminant meat 84%.

## How the model changes land

For each country, the model's cropland is the sum over items of hectares per tonne × production (production − processing for primary crops), plus its oilcake land and its temporary meadows. When a scenario changes production, cropland changes with it, item by item, at the country's own hectares per tonne, including the feed crops no longer grown for fewer animals; the oilcake land changes with the animals that eat the cake.

Pasture changes with the production of the ruminant groups: each group's share of a country's pasture changes in proportion to the group's production. If a country produces half as much beef, the pasture given to beef halves; pasture never falls below zero. Temporary meadows change the same way. Freed land is land a country no longer uses for farming, whatever happens to it next.

### Cropland under a full plant-based shift

With no animal products at all and protein kept equal, the model's cropland falls by 0.10 billion hectares, 6% of its 1.65 billion; with calories kept equal it falls by 22%, and with the legume mix by 8%. Nearly all pasture (3.0 billion hectares) is freed. Poore and Nemecek (2018) find that such a diet would cut farmland by 76% (3.1 billion hectares), "including a 19% reduction in arable land use".

The model used to find the opposite, a rise of 0.38 billion hectares (+25%). Three things caused it, each tested on the real data:

| Change | Cropland under a full shift, protein kept |
| --- | --- |
| Before: every plant food scaled up alike, the oil carrying all its oilseed's land, no fodder | +378 Mha (+25%) |
| Replacement by today's protein-rich plant foods only (cereals, rice, pulses, nuts, oilseeds) | +141 Mha |
| Oilseed land shared between oil and cake by value, the cake's part freed with the animals | +36 Mha |
| Temporary meadows counted as fodder for ruminants, and freed with them | −99 Mha (−6%) |

- The replacement scaled every plant food by the same factor, so replacing meat's protein raised fruit by 80%, vegetables by 74%, and sugar, drinks and vegetable oils in proportion, although they bring almost no protein; more soybean oil then meant more soybean fields. The default now adds protein only to the plant foods eaten for it (see [The shift](#method-shift)). Restricting it further, to foods with at least 5% protein, gave about −2% before fodder, but the threshold is arbitrary and drops rice (4.8%) and nuts, staples of plant protein in much of the world.
- The oilcakes carried no land, so the soybean fields grown for meal could not be freed. Sharing by value is the usual practice in life-cycle studies; by mass, the oil would keep less land and the cake more (soybean oil 19% of the land instead of 37%), and a full shift would free a little more.
- Fodder crops on arable land were not counted. Temporary meadows are the only one FAOSTAT still reports by area.

The remaining gap with Poore and Nemecek's −19% has three likely causes. Replacing animal protein with cereal-rich staples adds calories (2,437 to about 2,545 kcal a day in the France example), so more is grown than needed; keeping calories instead gives −22%, close to their figure, and their diet holds both. Silage maize, alfalfa and other fodder crops are still not counted. And their arable land counts physical area, fallow included, where the model counts harvested area.

## Regrowth: an option, off by default

Farmland that is no longer farmed can, if left alone, grow back into forest or other natural vegetation, taking carbon dioxide out of the air as it grows. Planetshift can count this uptake (Options, "Freed farmland": "Grows back"), but leaves it off by default, for several reasons:

- Freed land may not be left alone: it may be used for bioenergy, timber, other crops, or built on.
- Regrowth is slow and uncertain: it depends on the climate, the soil, seed sources nearby, fire and grazing by wild animals; studies find rates that vary eightfold within the same kind of forest.
- Carbon stored in vegetation can be lost again, to fire, drought, pests or clearing.
- Much pasture is natural grassland or dry rangeland that would not become forest at all.

### The rates

Regrowth rates come from Cook-Patton et al. (2020), who compiled 13,112 measurements of carbon taken up by naturally regrowing forest and mapped the rate for the first 30 years of regrowth at 1 km, in the forest and savanna biomes. Their supplementary data give each country's mean aboveground rate, its lowest and highest across the country, its mean belowground (root) rate, and the carbon taken up if forest regrew on all the area judged able to support it (their "maximum scenario", which excludes cropland). Planetshift uses:

- the rate where forest regrows: aboveground + belowground, in tonnes of carbon per hectare per year, × 44/12 to give tonnes of CO₂; the lowest and highest aboveground rates, with roots in the same proportion as on average, give the range;
- the area where forest could regrow: the maximum scenario's carbon divided by the mean rate;
- the share of the country's farmland (pasture and cropland, from FAOSTAT's land use) where forest would grow back: at least that area alone, at most that area and all cropland, and halfway between for the central value. Pasture on dry grassland outside that area takes up nothing.

The rate per hectare of freed farmland is then the regrowth rate × that share: the central rate with the central share, the lowest rate with the smallest share, the highest with the largest. In Ireland, nearly all farmland could grow back to forest, and the central rate is 12.5 t CO₂ per hectare per year; in Brazil 10.3; in France 6.1; in the United States 1.8, where much pasture is western rangeland; in Kazakhstan 0.3 and Mongolia 0.1, mostly steppe.

Countries missing from the table (54 of the model's 188, mostly small islands and deserts) are filled as follows. A country with less than 10% of its land under forest (FAOSTAT's land use) is taken as dryland: it takes the table's lowest rate, on at most its cropland. Another missing country takes the rates of the lowest country of its region in the table, on anywhere between none and all of its farmland.

The rates apply for 30 years after the land is freed (`regrowthYears`), the period Cook-Patton et al. map; after that the model counts no more uptake, as forests take up carbon more slowly as they age, and the rates of older forests are not part of the source.

### What the rates add up to

If all the model's pasture were freed, regrowth would take up about 8.4 billion tonnes of CO₂ a year on the central rates (1.9 to 22 billion across the range), and more with the cropland grown for feed. For comparison, Hayek et al. (2021) find that a shift to the EAT-Lancet diet would let native vegetation take up 332 billion tonnes of CO₂ by 2050 on the land it frees, and a vegan diet 547 billion, in vegetation; soil and litter would add 135 and 225 billion. The vegan figure is about 18 billion tonnes a year over 30 years in vegetation alone, so Planetshift's lower figure is the same order of magnitude; its rates are those of young natural forest where forest can grow, and none on dry rangeland.

### Land newly used: the uptake it forgoes

A scenario can also take land. A swap can add cropland (fish replaced by pulses uses land the fish did not), and a shift moves production to the countries that export plant foods, which then farm more than before. Counting only the land freed would credit what a scenario frees and ignore what it takes, so with regrowth on the uptake is counted net, as a carbon opportunity cost (Hayek et al., 2021):

- Each country's change in farmland is netted first: cropland it gains against pasture or cropland it frees. The net is either freed or newly used.
- Net freed land takes up CO₂ at the country's rate, as above.
- Net newly used land is charged what the same hectare would take up if it were left to grow back: the country's rate, as CO₂ emitted, for `regrowthYears` years from the year it is taken, with the same ramp and the same band of the rate. Over 30 years the charge adds up to the rate × 30 per hectare: about 310 t CO₂ in Brazil, 180 in France, 54 in the United States.

The charge is the uptake forgone, not the CO₂ of clearing standing forest. `deforestation.json` gives the clearing CO₂ by country and item but not the hectares cleared, so it gives no figure per hectare; and the clearing tied to an item whose production rises is already counted by the deforestation module, which follows production (see [Deforestation](#method-deforestation)). Every country of the model has a rate in `land.json`; one missing from the table (a build or the fixtures without it) takes the median of the table's countries, band by band, rather than nothing. Freed and newly used land is summed over countries at each country's rate, so a hectare freed in Ireland and one taken in Kazakhstan do not cancel.

What this changes, on the real data with FaIR and SSP2-4.5 (warming avoided, median, and 5–95% in 2100):

| Scenario, regrowth on | Net uptake when complete (Gt CO₂ a year) | Avoided in 2050 (°C) | Avoided in 2100 (°C) |
| --- | --- | --- | --- |
| Full shift, before | 9.10 | 0.182 | 0.365 (0.194–0.759) |
| Full shift, netted | 8.70 | 0.179 | 0.361 (0.193–0.743) |
| Half shift, before → netted | 4.68 → 4.49 | 0.094 → 0.093 | 0.188 → 0.186 |
| Dairy to plant milk, before → netted | 1.18 → 1.13 | 0.043 → 0.042 | 0.086 → 0.085 |
| Half the fish to legumes, before → netted | 0.01 → −0.11 | 0.0005 → −0.0003 | 0.0014 → 0.0002 |

Under the full shift, 12 countries farm more land in all than before, 48 Mha together; under the fish swap, 107 countries, 19 Mha. With regrowth off nothing changes.

## Checks

`pipeline/tests/test_land_validation.py` compares the built `land.json` with FAOSTAT and the literature:

| | Planetshift | Reference | Tolerance |
| --- | --- | --- | --- |
| Cropland of food crops with their oilcakes, 2023 (billion ha) | 1.51 | 1.42 harvested (FAOSTAT, same countries and crops) | 10% |
| Temporary meadows (billion ha) | 0.14 | 0.14 (FAOSTAT world) | 10% |
| Pasture (billion ha) | 3.02 | 3.10 (FAOSTAT world) | 5% |
| Wheat, world (ha per tonne) | 0.27 | 0.25 to 0.4 | |
| Land for animal products, share of farmland | 77% | about 83%, with aquaculture (Poore and Nemecek, 2018) | 65% to 85% |
| Regrowth if all pasture were freed (billion t CO₂ a year) | 8.4 | about 11 (EAT-Lancet diet) to 18 (vegan) in vegetation, 2020–2050 (Hayek et al., 2021) | |

The model's cropland is 6% above FAOSTAT's harvested area of the same crops: the processed items carry their crops' land at world extraction rates, which do not match every country's own processing exactly, mostly for vegetable oils.

Land used for animal products is all pasture, the oilcakes' and temporary meadows' land, and, for each crop, its cropland times the world share of its uses that is feed: 3.0 billion hectares of pasture and 0.58 billion of feed crops, cake and fodder, 77% of the model's farmland. Poore and Nemecek (2018) find that meat, aquaculture, eggs and dairy use about 83% of farmland; the model counts no fodder crop but temporary meadows, so its share is a little lower.

FAO's land statistics brief for 2001–2023 puts cropland at 1.57 billion hectares in 2023, as the data the pipeline reads do.

## Assumptions

- Harvested area stands for cropland: a field harvested twice counts twice; fallow, non-food crops and fodder crops other than temporary meadows are not counted.
- Hectares per tonne are averaged over 2022 to 2024, and expressed per tonne of the base year's Food Balance Sheet production.
- A processed item carries the land of the crop it is made from, at world extraction rates; a crushed oilseed's land is shared between its oil and its cake by their value, and the cake's part changes with the animals that eat it.
- Temporary meadows are fodder for ruminants, shared and changed as their pasture is.
- Countries borrow their region's, then the world's, production-weighted median hectares per tonne for items they do not grow.
- Pasture is shared between ruminant meat and dairy by FAOSTAT's livestock units; 85% of the dairy herd goes to milk; horses, asses and mules are left out.
- A country's pasture changes in proportion to the production of the ruminant groups that graze it.
- Regrowth rates are Cook-Patton et al.'s country means and range for the first 30 years of natural forest regrowth, above and below ground, without soil carbon or dead wood.
- Forest grows back on the area Cook-Patton et al. map as able to support it, and on between none and all of the cropland; elsewhere (natural grassland, dry rangeland) freed land takes up nothing.
- A country missing from Cook-Patton et al.'s table takes the lowest rate of its region, or the table's lowest rate on its cropland only where less than a tenth of its land is forest.
- Regrowth is an option, off by default; when on, every hectare a country frees in net is left to grow back, and every hectare it newly uses in net is charged the uptake it forgoes, at the same rate.

## Sources

- FAOSTAT, Crops and livestock products (area harvested, production, stocks, milk animals): <https://www.fao.org/faostat/en/#data/QCL>, CC BY 4.0.
- FAOSTAT, Land Use (cropland, permanent and temporary meadows and pastures, forest land, land area): <https://www.fao.org/faostat/en/#data/RL>, CC BY 4.0.
- FAOSTAT, Livestock Patterns (livestock units by species): <https://www.fao.org/faostat/en/#data/EK>, CC BY 4.0.
- FAOSTAT, Food Balances (production and processing): <https://www.fao.org/faostat/en/#data/FBS>, CC BY 4.0.
- Cook-Patton, S. C. et al. (2020). Mapping carbon accumulation potential from global natural forest regrowth. Nature 585, 545–550, Supplementary Data 1 (country rates): <https://doi.org/10.1038/s41586-020-2686-x>. The article is published under exclusive licence to Springer Nature; the country rates are reused with this citation, and the underlying maps are on Global Forest Watch under CC BY 4.0.
- Griscom, B. W. et al. (2017). Natural climate solutions. PNAS 114, 11645–11650 (the reforestation area behind Cook-Patton et al.'s maximum scenario): <https://doi.org/10.1073/pnas.1710465114>.
- Hayek, M. N., Harwatt, H., Ripple, W. J., Mueller, N. D. (2021). The carbon opportunity cost of animal-sourced food production on land. Nature Sustainability 4, 21–24: <https://doi.org/10.1038/s41893-020-00603-4>.
- Poore, J., Nemecek, T. (2018). Reducing food's environmental impacts through producers and consumers. Science 360, 987–992: <https://doi.org/10.1126/science.aaq0216>.
- FAOSTAT, Trade, crops and livestock products (export value and quantity of oils and oilcakes, 2021–2023): <https://www.fao.org/faostat/en/#data/TCL>, CC BY 4.0.
- FAO (2000). Technical Conversion Factors for Agricultural Commodities (oil and cake per tonne of oilseed crushed): <https://www.fao.org/economic/the-statistics-division-ess/methodology/methodology-systems/technical-conversion-factors-for-agricultural-commodities/en/>.
- FAO (2025). Land statistics 2001–2023: global, regional and country trends. FAOSTAT Analytical Brief 107: <https://doi.org/10.4060/cd5765en>.
- FAO (2023). Land statistics and indicators 2000–2021. FAOSTAT Analytical Brief 71 (pasture 3.2 and farmland 4.8 billion hectares in 2021, on an earlier release).
