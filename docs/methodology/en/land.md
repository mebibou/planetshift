# Land: cropland, pasture and regrowth

Planetshift gives, country by country, how much farmland each scenario uses and how much it frees. Eating fewer animal foods frees mostly pasture. A full shift to plant foods frees nearly all of it, 3.0 billion hectares, while cropland falls by 0.13 billion hectares, 8%. Planetshift can also count the carbon dioxide that freed land could take up if it were left to grow back into forest. This option is off by default.

## Farmland today

Farming uses about 4.7 billion hectares, a third of the world's land. That is roughly 1.6 billion hectares of cropland and 3.1 billion hectares of permanent meadows and pastures. These figures are from FAOSTAT's current land-use data for 2023. Our World in Data shows the same data as 36.9% of the world's land area in 2023 ([chart](https://ourworldindata.org/grapher/share-of-land-area-used-for-agriculture)).

FAO's earlier briefs gave about 4.8 and 3.2 billion hectares. They were based on earlier releases of the same data. The pipeline reads the total area of "permanent meadows and pastures", not only the cultivated part. The difference comes from FAOSTAT's revision of the series.

## Why a diet shift changes land

When people eat fewer animal products, less pasture is grazed and fewer feed crops are grown. When they eat more plant foods, more food crops are grown. Planetshift counts both, country by country, and gives the net change.

Freed land is land a country no longer uses for farming, whatever happens to it next. Land areas are given in billions of hectares or in millions of hectares (Mha).

The figures are in `land.json`. The code is `pipeline/planetshift_pipeline/land.py`.

## What land is counted

- **Cropland**: the area harvested for each food crop of the Food Balance Sheets (cereals, pulses, oilseeds, roots, sugar crops, fruit, vegetables, nuts, coffee, cocoa, tea and spices), from FAOSTAT's crop statistics. Harvested area counts a field twice when it gives two harvests in a year (multiple cropping). It leaves out fallow land, fodder crops and non-food crops (cotton lint, tobacco, rubber). FAOSTAT's cropland measures physical land, and is a little larger for these reasons. The model's food crops add up to 1.51 billion hectares in 2023. For the same year, FAOSTAT gives 1.42 billion hectares harvested and 1.58 billion hectares of cropland (see the checks below).
- **Oilcakes**: the part of the land of crushed oilseeds that goes to the cake fed to animals (see below): 0.11 billion hectares.
- **Fodder**: FAOSTAT's "temporary meadows and pastures", which is grass sown on arable land for grazing or hay: 0.14 billion hectares. It is counted as cropland, and shared between the ruminant groups as their pasture is.
- **Pasture**: FAOSTAT's "permanent meadows and pastures" in each country: 3.02 billion hectares in the model's countries, out of 3.10 billion in the world. Much of it is rangeland: dry grassland, steppe and shrubland grazed at low density, which was never forest.

Other fodder crops grown on arable land (silage maize, alfalfa, fodder beet) are no longer reported by crop in FAOSTAT, so they are not counted. They are part of the gap between harvested area and cropland. Grass and hay are not items of the Food Balance Sheets either (see [Feed](#method-feed)).

## How the model changes land

For each country, the model's cropland is the sum over items of hectares per tonne × production. For primary crops, production minus processing is used. The country's oilcake land and its temporary meadows are added.

When a scenario changes production, cropland changes with it, item by item, at the country's own hectares per tonne. This includes the feed crops no longer grown for fewer animals. The oilcake land changes with the animals that eat the cake.

Pasture changes with the production of the ruminant groups. Each group's share of a country's pasture changes in proportion to the group's production. If a country produces half as much beef, the pasture given to beef halves. Pasture never falls below zero. Temporary meadows change the same way.

**Example.** With a 50% shift, protein kept equal and the default options, the world frees 1.51 billion hectares of its 3.02 billion of pasture. It also frees 65 Mha of its 1.65 billion hectares of cropland, about 4%.

### Cropland under a full plant-based shift

With no animal products at all and protein kept equal, the model's cropland falls by 0.13 billion hectares, 8% of its 1.65 billion. With calories kept equal it falls by 24%, and with the legume mix by 10%. Nearly all pasture (3.0 billion hectares) is freed.

Poore and Nemecek (2018) find that such a diet would cut farmland by 76% (3.1 billion hectares), "including a 19% reduction in arable land use".

### What decides whether cropland rises or falls

Three modelling choices turn a rise in cropland into a fall. Each was tested on the real data, adding one choice at a time:

| Change | Cropland under a full shift, protein kept |
| --- | --- |
| Every plant food scaled up alike, the oil carrying all its oilseed's land, no fodder | +378 Mha (+25%) |
| Replacement by today's protein-rich plant foods only (cereals, rice, pulses, nuts, oilseeds) | +141 Mha |
| Oilseed land shared between oil and cake by value, the cake's part freed with the animals | +36 Mha |
| Temporary meadows counted as fodder for ruminants, and freed with them | −99 Mha (−6%) |
| All three, as in the model, with every animal group's food production taken to zero and the animals not raised for food kept | −130 Mha (−8%) |

- Scaling every plant food by the same factor to replace meat's protein would raise fruit by 80%, vegetables by 74%, and sugar, drinks and vegetable oils in proportion, although they bring almost no protein. More soybean oil would then mean more soybean fields. The default adds protein only to the plant foods eaten for it (see [The shift](#method-shift)). Restricting it further, to foods with at least 5% protein, gives about −2% before fodder. But that threshold is arbitrary. It drops rice (4.8%) and nuts, which are staples of plant protein in much of the world.
- If the oilcakes carried no land, the soybean fields grown for meal could not be freed. Sharing by value is the usual practice in life-cycle studies. Sharing by mass would give the oil less land and the cake more (soybean oil 19% of the land instead of 37%), and a full shift would free a little more.
- Fodder crops on arable land are counted through temporary meadows, the only fodder crop FAOSTAT still reports by area.

### The remaining gap with Poore and Nemecek

The remaining gap with Poore and Nemecek's −19% has three likely causes:

- Replacing animal protein with cereal-rich staples adds calories (2,437 to about 2,545 kcal a day in the France example), so more is grown than needed. Keeping calories equal instead gives −24%, close to their figure. Their diet keeps both protein and calories equal.
- Silage maize, alfalfa and other fodder crops are still not counted.
- Their arable land counts physical area, fallow included, where the model counts harvested area.

## Cropland per tonne

For each country and crop, the model uses the hectares harvested per tonne produced. The crops of FAOSTAT's production statistics are grouped into Food Balance Sheet items using the same table as for emissions (`qcl_items.csv`). For example, wheat goes to "Wheat and products", lentils and chickpeas to "Pulses, other", and 15% of a seed-cotton field to cottonseed (the rest is lint, outside the model).

- The hectares per tonne are averaged over three years around the base year, 2022 to 2024: the hectares of the three years divided by their tonnes. This way a drought or an unusually large harvest in 2023 does not set the value. Only crop-years with both an area and a production are used.
- It is then expressed per tonne of the Food Balance Sheet item, which is not always the crop as harvested. The hectares per tonne of crop are multiplied by the crop's tonnes in 2023 and divided by the item's production in the balance.
- A value more than 20 times above or below the item's production-weighted world median points to a mismatch between the two FAOSTAT domains. It is not used, as for emissions.

A country may have no value of its own for an item, because it does not grow it or because its value was set aside. It then takes the production-weighted median of its region, or of the world if its region has none. About 4,100 country-item values are a country's own, 3,100 come from its region and 2,300 from the world. The borrowed values mostly fill items a country does not grow, which matter only if the scenario moves production there.

Some world values, weighted by production: wheat 0.27 ha per tonne, maize 0.17, rice 0.21 (per tonne of paddy-equivalent production in the balance), soybeans 0.37, potatoes 0.045, coffee 1.0.

### Processed products

The land of processed products follows the rule for emissions (see [Emissions](#method-emissions)), so that no hectare is counted twice:

- A primary crop's land is its hectares per tonne × (production − processing).
- A processed item (vegetable oils, sugar, sweeteners, wine, beer and other drinks) carries the land of the crop it was made from. That is its primary item's hectares per tonne divided by the extraction rate, with the same rates and weights as for emissions.

A tonne of soybean oil, made from about 5.3 tonnes of soybeans, carries 2.3 ha. A tonne of palm oil carries 0.29 ha, and a tonne of raw sugar 0.12 ha. Rice bran oil and maize germ oil, by-products of milling, carry none. Butter and cream are made from milk, which uses no cropland of its own.

### Oil and oilcake

Crushing an oilseed gives oil and a cake (meal) that is fed to animals. The cake is not an item of the balance. Without a correction, the oil's hectares per tonne above would carry the whole crop, and no land would be freed when fewer animals eat soybean meal.

Planetshift shares the land between the two by their value, as life-cycle studies usually do for co-products. This is called economic allocation. The oil keeps its share of the hectares per tonne. The rest of the land the oil carried in the base year goes to the cake (`oilcakeHa` in `land.json`, by country and oilseed).

The shares come from `pipeline/oilcakes.csv`: tonnes of cake per tonne of oil from FAO's technical conversion factors (the median of their country tables), and world prices from FAOSTAT's trade data (export value over quantity, 2021–2023).

| Oil | Cake per tonne of oil | Oil, \$/t | Cake, \$/t | Oil's share of the land |
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

Palm oil and olive oil keep all their land, because the press cake of the oil palm's fruit and the olive's pomace are rarely fed to animals.

The cake's land changes with the production of the animal groups that eat it, weighted by the oilseed's feed shares (`feed.json`). With trade shares held, the cake's land follows the world's change in each group's production, because cake is traded like its oil. With each country producing its own change, it follows the country's own change. In all, oilcakes carry 0.11 billion hectares, soybean meal most of it. Emissions are shared the same way, and the cake's emissions follow the animals as its land does (see [Emissions](#method-emissions)).

## Pasture and the animals that graze it

Each country's pasture is shared between ruminant meat and dairy, in proportion to the livestock units of each, from FAOSTAT's Livestock Patterns. A livestock unit weighs animals by their feed needs. Its coefficients vary by region: a cow in North America counts more than a cow in sub-Saharan Africa, and a sheep or a goat counts about a tenth of a cow.

- Cattle: the dairy herd is the share of cattle that are milked cows (FAOSTAT's "milk animals" over cattle stocks). As for emissions, 85% of it goes to dairy and 15% to the beef of culled cows and calves. The rest of the herd goes to ruminant meat.
- Buffalo, sheep, goats and camels: split between milk and meat by the protein each country's herd produces, as for their emissions.
- Horses, asses and mules also graze, but are left out as they are for emissions (they are kept for work). The pasture they use is shared between the food ruminants. Pigs and poultry get no pasture.

A country missing from Livestock Patterns (Nicaragua, at present) takes its number of animals times the world's livestock units per head. A country with ruminants but no pasture in FAOSTAT (Egypt, small islands) has 0 ha of pasture. Worldwide, dairy takes 16% of pasture and ruminant meat 84%.

## Land use on the map

The map's *Land use* layer gives the farmland counted here, cropland and pasture, as a share of each country's land area (FAOSTAT's *Land area*, inland water excluded). It gives this share today and once the levers are fully in place. It shows how much of a country's land farming uses: 80% of Saudi Arabia (mostly rangeland), 73% of India, 34% of Brazil, 6% of Canada. Cropland is counted as harvested area, so land cropped twice a year counts twice, which raises the share where double cropping is common, as in India. Eating less meat lowers it where pasture and feed crops are freed. The bins are fixed (5%, 10%, 20%, 30%, 45%, 60%), so a scenario's change shows as a change of colour. The tooltip gives the hectares of cropland and pasture.

## Regrowth: an option, off by default

Farmland that is no longer farmed can, if left alone, grow back into forest or other natural vegetation. As it grows, it takes carbon dioxide out of the air. Planetshift can count this uptake (*Other options*, "Freed farmland": "Grows back"), but leaves it off by default, for several reasons:

- Freed land may not be left alone: it may be used for bioenergy, timber, other crops, or built on.
- Regrowth is slow and uncertain. It depends on the climate, the soil, seed sources nearby, fire and grazing by wild animals. Studies find rates that vary eightfold within the same kind of forest.
- Carbon stored in vegetation can be lost again, to fire, drought, pests or clearing.
- Much pasture is natural grassland or dry rangeland that would not become forest at all.

With regrowth on, a country's freed land takes up CO₂ for 30 years, at a rate that depends on how well forest grows there. Land a country newly farms is charged the uptake it gives up.

### The rates

Regrowth rates come from Cook-Patton et al. (2020). They compiled 13,112 measurements of carbon taken up by naturally regrowing forest, and mapped the rate for the first 30 years of regrowth at 1 km, in the forest and savanna biomes. Their supplementary data give, for each country:

- the mean aboveground rate, and the lowest and highest across the country;
- the mean belowground (root) rate;
- the carbon taken up if forest regrew on all the area judged able to support it (their "maximum scenario", which excludes cropland).

Planetshift uses:

- the rate where forest regrows: aboveground + belowground, in tonnes of carbon per hectare per year, × 44/12 to give tonnes of CO₂. The lowest and highest aboveground rates, with roots in the same proportion as on average, give the range;
- the area where forest could regrow: the maximum scenario's carbon divided by the mean rate;
- the share of the country's farmland (pasture and cropland, from FAOSTAT's land use) where forest would grow back. The smallest share is that area alone, the largest is that area and all cropland, and the central value is halfway between. Pasture on dry grassland outside that area takes up nothing.

The rate per hectare of freed farmland is then the regrowth rate × that share. The central rate goes with the central share, the lowest rate with the smallest share, and the highest with the largest.

In Ireland, nearly all farmland could grow back to forest, and the central rate is 12.5 t CO₂ per hectare per year. It is 10.3 in Brazil and 6.1 in France. In the United States it is 1.8, because much of its pasture is western rangeland. In Kazakhstan it is 0.3 and in Mongolia 0.1, mostly steppe.

Countries missing from the table (54 of the model's 188, mostly small islands and deserts) are filled as follows:

- A country with less than 10% of its land under forest (FAOSTAT's land use) is taken as dryland. It takes the table's lowest rate, on at most its cropland.
- Another missing country takes the rates of the lowest country of its region in the table, on anywhere between none and all of its farmland.

The rates apply for 30 years after the land is freed (`regrowthYears`), the period Cook-Patton et al. map. After that the model counts no more uptake. Forests take up carbon more slowly as they age, and the rates of older forests are not part of the source.

### What the rates add up to

If all the model's pasture were freed, regrowth would take up about 8.4 billion tonnes of CO₂ a year on the central rates (1.9 to 22 billion across the range), and more with the cropland grown for feed.

For comparison, Hayek et al. (2021) find that a shift to the EAT-Lancet diet would let native vegetation take up 332 billion tonnes of CO₂ by 2050 on the land it frees, and a vegan diet 547 billion, in vegetation. Soil and litter would add 135 and 225 billion. The vegan figure is about 18 billion tonnes a year over 30 years in vegetation alone. Planetshift's figure is lower, but of the same order of magnitude. Its rates are those of young natural forest where forest can grow, and none on dry rangeland.

### Land newly used: the uptake it forgoes

A scenario can also take land. A swap can add cropland: fish replaced by pulses uses land the fish did not. A shift also moves production to the countries that export plant foods, which then farm more than before.

Counting only the land freed would credit what a scenario frees and ignore what it takes. So, with regrowth on, the uptake is counted net, as a carbon opportunity cost (Hayek et al., 2021):

- Each country's change in farmland is netted first: cropland it gains against pasture or cropland it frees. The net is either freed or newly used.
- Net freed land takes up CO₂ at the country's rate, as above.
- Net newly used land is charged what the same hectare would take up if it were left to grow back. The charge is the country's rate, counted as CO₂ emitted, for `regrowthYears` years from the year the land is taken, with the same ramp and the same band of the rate. Over 30 years the charge adds up to the rate × 30 per hectare: about 310 t CO₂ in Brazil, 180 in France, 54 in the United States.

The charge is the uptake forgone, not the CO₂ of clearing standing forest:

- `deforestation.json` gives the clearing CO₂ by country and item but not the hectares cleared, so it gives no figure per hectare.
- The clearing tied to an item whose production rises is already counted by the deforestation module, which follows production (see [Deforestation](#method-deforestation)).

Every country of the model has a rate in `land.json`. A country missing from the table takes the median of the table's countries, band by band, rather than nothing. This can happen in a build or in the test fixtures. Freed and newly used land is summed over countries at each country's rate, so a hectare freed in Ireland and one taken in Kazakhstan do not cancel.

The table shows what netting changes, on the real data with FaIR, SSP2-4.5 and biological processes only (`scope=farmGate`; see [Climate](#method-climate) and [Options](#method-options)). "Before" is the result without netting. Warming avoided is the median, with the 5–95% range of the climate runs in brackets for 2100. Gt is billions of tonnes.

| Scenario, regrowth on | Net uptake when complete (Gt CO₂ a year) | Avoided in 2050 (°C) | Avoided in 2100 (°C) |
| --- | --- | --- | --- |
| Full shift, before | 9.25 | 0.182 | 0.367 (0.194–0.765) |
| Full shift, netted | 8.88 | 0.180 | 0.363 (0.194–0.750) |
| Half shift, before → netted | 4.63 → 4.44 | 0.091 → 0.090 | 0.183 → 0.181 |
| Dairy to plant milk, before → netted | 1.10 → 1.04 | 0.040 → 0.040 | 0.081 → 0.080 |
| Half the fish to legumes, before → netted | 0.01 → −0.10 | 0.0005 → −0.0003 | 0.0015 → 0.0004 |

Under the full shift, 12 countries farm more land overall than before, 44 Mha together. Under the fish swap, 105 countries do, 18 Mha together. With regrowth off, nothing changes.

## Land-use CO₂ by country

The map's Land-use CO₂ layer, beside the Land use layer's share of land farmed, gives each country's net CO₂ from all land-use change: forest cleared for any reason, peat drained and other changes, less the uptake of forest regrowing on abandoned land. It is the Global Carbon Budget 2025's national estimate, the mean of its three bookkeeping models (BLUE, OSCAR and LUCE), averaged over 2015–2024. The world's comes to 5.03 Gt of CO₂ a year, the 5.0 ± 2.6 Gt the Global Carbon Budget gives for that decade; the three models give 5.75, 4.73 and 4.60.

The countries of the model hold 5.01 Gt: 5.41 Gt from the 131 countries that release more than they take up and −0.39 Gt from the 46 net sinks. Brazil comes first (1.42 Gt), then Indonesia (0.84), the Democratic Republic of the Congo (0.61) and Russia (0.35). China is the largest sink (−0.19 Gt), with India (−0.07) and France (−0.03). The file has no figure for Bermuda, Hong Kong, Macao, New Caledonia, French Polynesia and Taiwan, which the map shows without data; the rest of the world total, a little land the source assigns to no country, stays in `world`.

The CO₂ of clearing for farming is a part of it (the Deforestation layer shows its area): DeDuCE's clearing for the foods in the model, about 2.0 Gt (see [Deforestation](#method-deforestation)), roughly 40% of the net total. The rest (clearing for timber, mining or towns, peat drainage, other land-use change, less regrowth) is in the Land use band of the causes chart as one world series, RCMIP's land-use CO₂ (see [Causes of global warming](#method-link)), and on this layer by country. The model changes only the clearing for farming, through the shift and the deforestation lever, and what freed or farmed land stores, through regrowth and the carbon-in-farmland levers. So the layer adds to each country's net land-use CO₂ what the levers change in it: the change in its clearing for farming and, with freed farmland growing back, the CO₂ that land takes up. The rest stays as it is, and the note says so; the tooltip gives both parts. Only the change is added, not one estimate taken from the other: DeDuCE amortises each clearing over five years and leaves peat drainage out, and the bookkeeping models count regrowth, so a country's clearing can be larger than its net land-use CO₂. Where it is, stopping the clearing can take the layer below what the bookkeeping models would give for that country without it.

The national inventories' LULUCF totals were not used: they count the uptake of managed forests, so they do not measure land-use change (see [Causes of global warming](#method-link)).

`pipeline/planetshift_pipeline/landuse.py` reads each model's sheet and checks that its countries and the columns no country holds add up to its world total, every year (within 0.1%; they do within 10⁻⁷). Country names are matched to ISO3 codes by FAOSTAT's English names, then by `pipeline/landuse_names.csv`.

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

The model's cropland is 6% above FAOSTAT's harvested area of the same crops. The processed items carry their crops' land at world extraction rates. These rates do not match every country's own processing exactly, mostly for vegetable oils.

Land used for animal products is all pasture, the land of the oilcakes and temporary meadows, and, for each crop, its cropland times the world share of its uses that is feed. That is 3.0 billion hectares of pasture and 0.58 billion of feed crops, cake and fodder: 77% of the model's farmland. Poore and Nemecek (2018) find that meat, aquaculture, eggs and dairy use about 83% of farmland. The model counts no fodder crop but temporary meadows, so its share is a little lower.

The FAOSTAT land-use data the pipeline reads give 1.58 billion hectares of cropland in 2023, in line with FAO's land statistics brief for 2001–2023.

## Assumptions

- Harvested area stands for cropland: a field harvested twice counts twice. Fallow, non-food crops and fodder crops other than temporary meadows are not counted.
- Hectares per tonne are averaged over 2022 to 2024, and expressed per tonne of the base year's Food Balance Sheet production.
- A processed item carries the land of the crop it is made from, at world extraction rates. A crushed oilseed's land is shared between its oil and its cake by their value, and the cake's part changes with the animals that eat it.
- Temporary meadows are fodder for ruminants, shared and changed as their pasture is.
- Countries borrow their region's, then the world's, production-weighted median hectares per tonne for items they do not grow.
- Pasture is shared between ruminant meat and dairy by FAOSTAT's livestock units. 85% of the dairy herd goes to milk. Horses, asses and mules are left out.
- A country's pasture changes in proportion to the production of the ruminant groups that graze it.
- Regrowth rates are Cook-Patton et al.'s country means and range for the first 30 years of natural forest regrowth, above and below ground, without soil carbon or dead wood.
- Forest grows back on the area Cook-Patton et al. map as able to support it, and on between none and all of the cropland. Elsewhere (natural grassland, dry rangeland) freed land takes up nothing.
- A country missing from Cook-Patton et al.'s table takes the lowest rate of its region. Where less than a tenth of its land is forest, it takes the table's lowest rate, on its cropland only.
- Regrowth is an option, off by default. When it is on, every hectare a country frees in net is left to grow back. Every hectare it newly uses in net is charged the uptake it forgoes, at the same rate.

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
- Global Carbon Project (2025). Supplemental data of Global Carbon Budget 2025, National Land Use Change Carbon Emissions 2025 v1.0 (BLUE, OSCAR and LUCE): <https://doi.org/10.18160/GCP-2025>, CC BY 4.0. Friedlingstein, P. et al. (2026). Global Carbon Budget 2025. Earth Syst. Sci. Data 18, 3211–3288.
