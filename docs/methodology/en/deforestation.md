# Deforestation

Clearing forest to make room for pasture and crops releases the carbon held in the trees, their roots and the soil beneath them. For the foods in the model this comes to about 2 Gt (billion tonnes) of CO₂ a year, and half of it is linked to beef. Below are where the figure comes from, which foods and countries it falls on, and how the diet shift and the deforestation lever reduce it.

## What clearing forest emits

Deforestation is the largest single source of CO₂ from the food system after fossil fuels. It was about 2 Gt of CO₂ a year in the early 2020s. The farm emissions of each food in `intensities.json` (see [Emissions](#method-emissions)) do not include deforestation, so Planetshift counts it separately. Its CO₂ is given by producer country and by item of the Food Balance Sheets, FAOSTAT's table of what each country produces, trades and eats (see [Data](#method-data)). The model can then count it and reduce it with a lever.

Over 2019–2023, the food items in the model carry 1.99 Gt of CO₂ a year.

- **By food**: bovine meat carries half of it, 1.04 Gt. It is followed by cassava (0.14), maize (0.11), rice (0.11), soybeans (0.07) and oil palm (0.06).
- **By country**: Brazil comes first, with 0.75 Gt, 94% of it from pasture. Then come the Democratic Republic of the Congo (0.24 Gt, from smallholders clearing land for cassava, rice, maize and other staples), Bolivia (0.10), Colombia (0.09), Indonesia (0.09), Peru (0.06), India (0.06), Mexico (0.04), Côte d'Ivoire (0.04) and Nigeria (0.04).

The emissions are counted in the country of production, where the forest is cleared. A diet shift in Europe still acts on Brazil's deforestation, through trade. In the model, each country's farms change in proportion to their share of world output. A fall in world demand for beef or soy therefore lowers production in the countries that clear forest to produce them.

## How the model reduces it

The data give the baseline: the tonnes of CO₂ emitted each year by clearing, for each country and item, at today's production. The model uses this baseline in two ways at once.

**Deforestation follows production.** The CO₂ of an item in a country changes in proportion to the change in its production. This treats deforestation as driven by the output of the commodity. A diet with half the beef then halves the deforestation for pasture, and a diet with more soy raises the clearing for soy. Consumption-based deforestation footprints rest on the same assumption.

In one way, this assumption favours diet shifts. What drives clearing is the growth of production rather than its level, and land prices, roads and law enforcement matter as much as demand. In another way, it understates their effect. If demand for beef falls, the deforestation frontier may stop moving altogether, not only slow down in proportion.

**Deforestation is cut directly.** The deforestation lever sets the share of deforestation stopped, whatever the diet. It stands for zero-deforestation supply chains and forest protection. The CO₂ avoided is that share of the total, per item or for all items. With both a diet shift and this lever, the lever applies to what remains after the shift. The two effects multiply rather than add up.

**A worked example.** Bovine meat carries 1.04 Gt of CO₂ a year. If world beef production were halved, and every country's beef fell by the same share, beef's deforestation would fall to 0.52 Gt. With the lever at 50%, half of what remains is stopped, leaving 0.26 Gt. The lever then avoids 0.26 Gt, not half of the original 1.04 Gt.

### How the avoided CO₂ enters the temperature

In either case the avoided CO₂ is a CO₂ emission that does not happen, year after year. It enters the climate model like any other CO₂. The carbon released by clearing is land-use CO₂, which the climate model treats as fossil CO₂ (see [From emissions to temperature](#method-climate)). The difference between the two is the change in surface albedo (how much sunlight the ground reflects). That change is small compared with the uncertainty of the emissions.

Forest growing back on farmland freed by a diet shift is a separate effect, counted on the [Land](#method-land) page. It should not be added to the deforestation avoided on the same hectare.

## The data in detail

The data are in `deforestation.json`. The code is `pipeline/planetshift_pipeline/deforestation.py`, and its table is `pipeline/deforestation_items.csv`.

### DeDuCE

The source is DeDuCE (Deforestation Driven Carbon Emissions), version 2.1, by Singh, Persson, Croft, Kastner and West, published on Zenodo under CC BY 4.0. DeDuCE combines two kinds of data. Satellite maps show where forest was lost and what replaced it. FAOSTAT's statistics give the areas of cropland, pasture and plantations. From these, DeDuCE attributes each country's deforestation from 2001 to 2023 to the expansion of pastures, of about 180 crops and of forest plantations.

Where the maps show what grows on the cleared land, the land is given to that crop directly. Elsewhere, a land balance gives it to the crops and pastures that expanded in the country that year. In Brazil, the balance is made for each municipality. The emissions are the net loss of carbon in above-ground biomass, below-ground biomass and soil, less the carbon held by the land use that replaces the forest.

### Which series and which years

DeDuCE gives two series:

- The **unamortised** series puts all the emissions of a hectare in the year it is cleared.
- The **amortised** series spreads them over the five years after clearing. This measures how much deforestation is "embodied" in each year's harvest.

Planetshift uses the amortised series, because the model scales emissions with production. It averages the years 2019 to 2023, the latest five, so that one dry year or one policy change does not dominate.

The map shows the forest area cleared instead: DeDuCE's unamortised attribution, in hectares, averaged over the same years and given to foods the same way as the CO₂. It totals about 4.2 million hectares a year on the foods in the model, 1.5 million in Brazil. The model moves it with each food's production and with the lever, the same way it moves the CO₂. The map's tooltip gives both.

### Drained organic soils

Draining peat and other organic soils for farming exposes their carbon to the air. Its emissions come from land already cleared and continue whether or not more forest is cut, so the deforestation lever does not stop them. They belong with the land the food occupies, and they follow each food's production.

FAOSTAT's *Emissions from Drained organic soils* gives each country's CO₂ on cropland and on grassland. For 2024, the countries of the model emit 0.81 Gt of CO₂ a year: 0.65 Gt on cropland and 0.16 Gt on grassland. Indonesia comes first with 0.24 Gt, then Russia, the United States, Belarus and Canada.

- Cropland's CO₂ goes to the crops by DeDuCE's peat drainage by commodity where DeDuCE has such data for the country, so Indonesia's goes mostly to oil palm (0.18 Gt). Elsewhere it goes to the crops by their harvested area.
- Grassland's CO₂ goes to the ruminant products (beef, mutton and goat meat, other meat, milk) in proportion to their methane.

The CO₂ moves with each food's production, as the clearing does, and counts in the Land use cause. When the shift frees drained land, the model assumes the land is rewetted, so its emission stops. Land left drained would keep emitting, so this is the most the shift could avoid. The full shift avoids 0.27 Gt of it a year. The N₂O of drained soils, 0.35 Mt a year, is left out. DeDuCE's own peat drainage (about 0.23 Gt) is not used as an emission, only to split the cropland's CO₂ among the crops.

### From commodities to foods

DeDuCE's commodities are FAOSTAT's production items. Most of them are therefore mapped with the same table as the farm emissions (`qcl_items.csv`): soybeans to soyabeans (2555), oil palm fruit to the Food Balance Sheets' oil palm fruit (2562, which the model turns into palm oil and palm kernel oil), cocoa beans to 2633, coffee to 2630, maize to 2514, cassava to 2532, and so on. `deforestation_items.csv` adds the names DeDuCE spells differently and the commodities that are not crops:

- **Pasture** is given by DeDuCE to cattle meat and leather. Cattle meat goes to bovine meat (2731). None goes to milk. DeDuCE attributes no pasture to dairy, and the cattle on the deforestation frontiers of the Amazon, the Cerrado and the Chaco are beef herds. Leather, a non-food co-product, is left out (about 55 Mt of CO₂ a year).
- **Seed cotton** keeps the split used for the farm emissions: 15% goes to cottonseed (2559). The 85% that is lint is left out (about 11 Mt).
- **Rubber, tobacco, jute and other fibres** are not food and are left out. Rubber is net negative in DeDuCE (−13 Mt), because the plantation can hold more carbon than the degraded forest it replaced.
- **Forest plantations** (pulp, timber) are left out (about 9 Mt).

A crop that replaces forest can hold more carbon than the clearing removed. DeDuCE then reports a net negative emission. After the commodities of each country and item are summed, the cells that remain negative (23 Mt in all, mostly tree crops) are left out rather than counted as removals, since deforestation is not a way to store carbon. Countries outside the model (South Sudan, Equatorial Guinea, Burundi and a few others, about 1 Mt together) drop out.

### Comparison with published estimates

The food items in the model carry 1.99 Gt of CO₂ a year over 2019–2023, out of 2.04 Gt for all of DeDuCE's commodities (without peat drainage). This is within the published range:

- Pendrill et al. (2019) found about 2.6 Gt a year for 2010–2014 from the expansion of agriculture and tree plantations into tropical forests, with cattle and oilseeds over half of it.
- Singh and Persson (2026) give 1.9 ± 0.3 Gt a year over 2001–2022, 52% of it from pasture, plus peat drainage.

Wider totals count more:

- FAO puts deforestation at 2.8 Gt CO₂-equivalent in 2023 (FAOSTAT Analytical Brief 115). CO₂-equivalent (CO₂e) adds different gases into one figure (see [From emissions to temperature](#method-climate)).
- The Global Carbon Budget 2025 puts all net land-use emissions at 5.0 ± 2.6 Gt CO₂ a year over 2015–2024, with gross deforestation about 7.0, forestry and other causes included.
- FAO's Global Forest Resources Assessment 2025 reports about 10.9 million hectares of forest lost a year over 2015–2025. Our World in Data shows FAO's deforestation by half-decade, 8.5 million hectares a year around 2020 ([chart](https://ourworldindata.org/grapher/annual-deforestation)). Both count all forest lost, where Planetshift counts the clearing DeDuCE attributes to the foods in the model.

## Assumptions

- Each year's emissions are DeDuCE's amortised ones, averaged over 2019–2023: the emissions of clearing spread over the five years of harvest after it.
- Peat drainage is not deforestation. Drained organic soils are counted apart, from FAOSTAT, and taken to be rewetted when the shift frees them.
- Pasture deforestation is all bovine meat. Leather, dairy and other grazing animals get none of it.
- Non-food commodities (leather, rubber, fibres, tobacco, the lint share of cotton) and forest plantations are left out.
- Net negative cells (a tree crop holding more carbon than the forest it replaced) are dropped, not counted as removals.
- Emissions are where the forest is cleared, not where the food is eaten.

## Sources

- Singh, C., Persson, U. M., Croft, S., Kastner, T. and West, C. D. (2026). Commodity-driven deforestation, associated carbon emissions and trade 2001–2023 (version 2.1). Zenodo, doi:10.5281/zenodo.18953516. CC BY 4.0.
- Singh, C. and Persson, U. M. (2026). Global patterns of commodity-driven deforestation and associated carbon emissions. Nature Food 7, 138–151, doi:10.1038/s43016-026-01305-4.
- Pendrill, F., Persson, U. M., Godar, J., Kastner, T., Moran, D., Schmidt, S. and Wood, R. (2019). Agricultural and forestry trade drives large share of tropical deforestation emissions. Global Environmental Change 56, 1–10, doi:10.1016/j.gloenvcha.2019.03.002.
- FAO (2025). Greenhouse gas emissions from agrifood systems: global, regional and country trends, 2001–2023. FAOSTAT Analytical Brief 115, doi:10.4060/cd7300en.
- Friedlingstein, P. et al. Global Carbon Budget 2025. Earth System Science Data 18, 3211 (2026) (land-use emissions 2015–2024).
- FAO (2025). Global Forest Resources Assessment 2025 (deforestation 2015–2025).
