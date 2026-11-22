# Deforestation

Clearing forest for pasture and crops releases the carbon held in the trees, their roots and the soil beneath them. It is the largest single source of CO₂ from the food system after fossil fuels, about 2 Gt of CO₂ a year in the early 2020s, and the farm emissions in `intensities.json` leave it out. `deforestation.json` gives it, by producer country and Food Balance Sheet item, so that the model can count it and act on it as a lever. The code is `pipeline/planetshift_pipeline/deforestation.py`; its table is `pipeline/deforestation_items.csv`.

## The data

The source is DeDuCE (Deforestation Driven Carbon Emissions), version 2.1, by Singh, Persson, Croft, Kastner and West, published on Zenodo under CC BY 4.0. DeDuCE combines satellite maps of forest loss and of what replaced the forest with FAOSTAT's statistics on cropland, pasture and plantations, and attributes each country's deforestation to the expansion of pastures, of 180-odd crops and of forest plantations, from 2001 to 2023. Where the maps show what grows on the cleared land, the land is given to that crop directly; elsewhere, a land balance gives it to the crops and pastures that expanded in the country that year (in Brazil, in each municipality). The emissions are the net loss of carbon in above-ground biomass, below-ground biomass and soil, less the carbon the replacing land use holds.

DeDuCE gives two series. The unamortised one puts all the emissions of a hectare in the year it is cleared. The amortised one spreads them over the five years after clearing, which is how much deforestation is "embodied" in each year's harvest; Planetshift uses it, because the model scales emissions with production. The years averaged are 2019 to 2023, the latest five, so that one dry year or one policy swing does not dominate.

DeDuCE also reports the CO₂ from draining peatland under crops (mostly oil palm in Indonesia and Malaysia), about 0.23 Gt a year. It is left out: it is an emission of land already cleared, which goes on whether or not more forest is cut, so it belongs with the land the food occupies rather than with deforestation.

## From commodities to foods

DeDuCE's commodities are FAOSTAT's production items, so most are mapped with the same table as the farm emissions (`qcl_items.csv`): soybeans to soyabeans (2555), oil palm fruit to the Food Balance Sheets' oil palm fruit (2562, which the model turns into palm oil and palm kernel oil), cocoa beans to 2633, coffee to 2630, maize to 2514, cassava to 2532, and so on. `deforestation_items.csv` adds the names DeDuCE spells differently and the commodities that are not crops:

- **Pasture** is given by DeDuCE to cattle meat and leather. Cattle meat goes to bovine meat (2731). None goes to milk: DeDuCE attributes no pasture to dairy, and the cattle on the deforestation frontiers of the Amazon, the Cerrado and the Chaco are beef herds. Leather, a non-food co-product, is left out (about 55 Mt of CO₂ a year).
- **Seed cotton** keeps the split of the farm emissions: 15% goes to cottonseed (2559), the 85% that is lint is left out (about 11 Mt).
- **Rubber, tobacco, jute and other fibres** are not food and are left out (rubber is net negative in DeDuCE, −13 Mt, because the plantation can hold more carbon than the degraded forest it replaced).
- **Forest plantations** (pulp, timber) are left out (about 9 Mt).

A crop that replaces forest can hold more carbon than it removed; DeDuCE then reports a net negative emission. After summing the commodities of each country and item, the cells that remain negative (23 Mt in all, mostly tree crops) are left out rather than counted as removals, since deforestation is not a way to store carbon. Countries outside the model (South Sudan, Equatorial Guinea, Burundi and a few others, about 1 Mt together) drop out.

## The numbers

Over 2019–2023, the food items in the model carry 1.99 Gt of CO₂ a year, out of 2.04 Gt for all of DeDuCE's commodities (without peat drainage). This is in the published range: Pendrill et al. (2019) found about 2.6 Gt a year for 2010–2014 from the expansion of agriculture and tree plantations into tropical forests, with cattle and oilseeds over half of it. Singh and Persson (2026) give 1.9 ± 0.3 Gt a year over 2001–2022, pasture 52% of it, plus peat drainage. Wider totals count more: FAO puts deforestation at 2.8 Gt CO₂-equivalent in 2023 (FAOSTAT Analytical Brief 115), and the Global Carbon Budget 2025 puts all net land-use emissions at 5.0 ± 2.6 Gt CO₂ a year over 2015–2024, with gross deforestation about 7.0, forestry and other causes included. FAO's Global Forest Resources Assessment 2025 reports about 10.9 million hectares of forest lost a year over 2015–2025. In the model, bovine meat carries half of the 1.99 Gt, 1.04 Gt, followed by cassava (0.14), maize (0.11), rice (0.11), soybeans (0.07) and oil palm (0.06). The countries where it happens are Brazil (0.75 Gt, 94% of it from pasture), the Democratic Republic of the Congo (0.24 Gt, from smallholder clearing for cassava, rice, maize and other staples), Bolivia (0.10), Colombia (0.09), Indonesia (0.09), Peru (0.06), India (0.06), Mexico (0.04), Côte d'Ivoire (0.04) and Nigeria (0.04).

The emissions are by country of production. A diet shift in Europe acts on Brazil's deforestation through trade: the model's rule that each country's farms change in proportion to its share of world output carries a fall in world beef or soy demand to the countries that clear forest for them.

## Deforestation in the model

The file gives the baseline: tonnes of CO₂ a year from clearing for each country and item at today's production. The model can use it in two ways, which the interface can offer side by side.

**Deforestation follows production.** The CO₂ of an item in a country changes in proportion to the change in its production, as if deforestation were driven by the output of the commodity. A diet with half the beef then halves pasture deforestation, and a diet with more soy raises soy-driven clearing. This is the reading behind consumption-based deforestation footprints. It is generous to diet shifts in one way, since what drives clearing is the growth of production rather than its level, and land prices, roads and law enforcement matter as much as demand. It is conservative in another: if demand for beef falls, the frontier may stop moving altogether, not just slow in proportion.

**Deforestation is cut directly.** A lever sets the share of deforestation stopped (zero-deforestation supply chains, forest protection), whatever the diet. The CO₂ avoided is that share of the file's total, per item or for all. With both a diet shift and this lever, the lever applies to what remains after the shift: the two multiply, they do not add.

In either case the avoided CO₂ is a CO₂ emission that does not happen each year, entered in the climate model like any other CO₂. The carbon released by clearing is land-use CO₂, which the climate response treats as fossil CO₂ (see the climate page); the difference, the change in surface albedo, is small next to the uncertainty of the emissions. The regrowth of forest on farmland freed by a shift is a separate effect, counted on the land page; it should not be added to deforestation avoided on the same hectare.

## Assumptions

- Each year's emissions are DeDuCE's amortised ones, averaged over 2019–2023: the emissions of clearing spread over the five years of harvest after it.
- Peat drainage is not deforestation and is left out.
- Pasture deforestation is all bovine meat; leather, dairy and other grazing animals take none.
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
