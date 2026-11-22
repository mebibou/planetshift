# Emission intensities from published LCA data

Where HESTIA has no aggregation for an item, Planetshift can fall back on a published life-cycle meta-analysis (tier 4 of the intensities): Poore & Nemecek (2018), the largest such study, which covers about 38,700 farms in 119 countries. Its values are world averages, so every row has the area `World`. The code is `pipeline/planetshift_pipeline/sources/literature.py`; the product table is `pipeline/literature_terms.csv`.

## The data

Poore & Nemecek publish, in Data S2 of their supplementary materials, the GHG emissions of each product by stage of the supply chain, per kg of the product's Food Balance Sheet (FBS) unit, without consumer waste (sheet "Results - Global Totals"). The stages are land-use change, feed, farm, processing, transport, packaging and retail. Their supplementary materials define the farm stage as, for crops, "inputs production, field emissions, drying and grading", and for animals, the livestock stage: "pasture irrigation and fertilization, manure management, aquaculture emissions, enteric fermentation and energy use". Feed is a stage of its own.

`literature_terms.csv` holds, for each FBS item, the Poore & Nemecek products that represent it, their farm-stage emissions (`farm_kg_co2e_per_kg`, transcribed from that sheet), their food and waste in 2009–11 (`weight_kt`, from the same sheet), a conversion to the current FBS quantity, and the gas profile to split them with. The values are a fixed 2018 publication in a spreadsheet format the pipeline does not read, so they are kept in the table rather than downloaded; every value was checked against the spreadsheet once, when transcribed.

## Scopes

Only the farm stage is used. Land-use change is left out, as in the HESTIA rows; feed is left out because Planetshift counts feed through the crops it reduces; processing, transport, packaging and retail are after the farm gate.

- `cradleToFarmGate` = the farm stage, which for crops already includes the production of inputs other than feed.
- `farmGate` = the farm stage × the share of on-farm emissions in HESTIA's cradle-to-farm-gate emissions of the same item (CO₂e, with the factors below). For crops, HESTIA's split of on-farm and input-production emissions is the only one available; Poore & Nemecek do not publish it.
- For animal products, the livestock stage is almost entirely on-farm (enteric fermentation and manure), so both scopes take the whole farm stage. The emissions of fertilising pasture and of the energy used on the farm are kept in both.

## Splitting CO₂e into gases

Poore & Nemecek report CO₂-equivalents, with the IPCC AR5 100-year factors including climate-carbon feedbacks: 34 for CH₄ and 298 for N₂O (their table S2). Planetshift needs each gas apart. Each product's farm stage is split in the proportions of a gas profile, then each gas's CO₂e is divided by its factor:

kg of gas = farm CO₂e × (gas's CO₂e in the profile / profile's total CO₂e) / GWP of the gas

so the result, multiplied back by 34 and 298, returns Poore & Nemecek's value exactly.

- Crops: the profile is HESTIA's intensities of the same FBS item (`hestia:<code>`), from its World aggregation if there is one, otherwise the mean of its countries. Where HESTIA lacks the item, a close item's profile is named instead: palm oil takes oil palm fruit's, soybean oil soybeans', tea coffee's, plantains bananas', pineapples and dates other fruit's, grapefruit and other citrus oranges'.
- Animal products: HESTIA has no animal aggregation yet, so the profile is FAOSTAT's on-farm emissions of the species in the world's latest year (Emissions from livestock): CH₄ from enteric fermentation and manure management, N₂O from manure management and from manure left on pasture (`faostat:<species>`). Manure applied to soils is left out of the profile, since it fertilises crops. Bovine meat from the beef herd takes non-dairy cattle's profile, from the dairy herd and milk dairy cattle's, mutton and goat sheep and goats', pig meat swine's, poultry meat broilers', eggs layers'.

FAOSTAT's livestock emissions have no CO₂, so the animal rows carry none: the energy and pasture-fertiliser part of the livestock stage is counted as CH₄ and N₂O in the species' proportions. It is a small share for ruminants, larger for pigs and poultry.

## Units

Poore & Nemecek's FBS units are those of FAOSTAT's earlier Food Balance Sheets (before 2010), which differ from the current ones in two items. `kg_product_per_kg_item` converts them:

- Rice: their unit is milled rice; the current FBS counts paddy, of which milled rice is 66.7%, so 0.667.
- Groundnuts: their unit is shelled groundnuts; the current FBS counts them in shell, of which kernels are 70%, so 0.7.
- Sugar cane and sugar beet: their unit is raw sugar; per kg of cane, 0.11 kg of raw sugar, per kg of beet, 0.15. The FBS item "Sugar (Raw Equivalent)" takes the sugar values directly.
- All other items: 1. Meat is per kg of carcass weight, milk per kg of milk, eggs per kg in shell, coffee per kg of green coffee, cocoa per kg of beans, oils per kg of oil, nuts per kg in shell. (The retail-weight figures often quoted from the study, such as 99 kg CO₂e per kg of beef, are per kg of boneless meat and include all stages.)

When several products share an item, they are averaged with their 2009–11 food and waste as weights: bovine meat is beef herd (40.6 Mt), dairy herd (31.4 Mt) and buffalo (6.6 Mt); "Vegetables, other" is other vegetables, brassicas and root vegetables.

## Coverage

46 FBS items get a literature row in both scopes. 19 of them have no HESTIA row at all: bovine meat, mutton and goat meat, pig meat, poultry meat, milk, eggs, the five vegetable oils and other oils (2571, 2573, 2574, 2577, 2580, 2586), sugar (raw equivalent), grapefruit, other citrus, plantains, pineapples, dates and tea. 19 more have HESTIA rows for some countries but no World aggregation, so the literature row is their only world value: rice, oats, rye, other cereals, cassava, beans, peas, other pulses, nuts, other oil crops, tomatoes, onions, other vegetables, oranges, lemons, apples, other fruit, coffee, cocoa. Barley, millet, sorghum, sweet potatoes, yams, soybeans, sunflower seed, rapeseed, sesame, palm kernels and olives get none (Poore & Nemecek report barley only as beer, and soybeans as tofu, soy milk and oil).

Some values (farm gate, kg per tonne of the FBS item):

| Item | CO₂ | CH₄ | N₂O | CO₂e (AR5) |
| --- | --- | --- | --- | --- |
| Bovine meat | 0 | 703 | 17.3 | 29,040 |
| Mutton and goat | 0 | 387 | 21.3 | 19,510 |
| Pig meat | 0 | 39.6 | 1.16 | 1,694 |
| Poultry meat | 0 | 4.2 | 1.78 | 672 |
| Milk | 0 | 37.1 | 0.66 | 1,458 |
| Eggs | 0 | 12.1 | 3.04 | 1,317 |
| Rice (paddy) | 186 | 50.2 | 0.63 | 2,078 |
| Wheat | 153 | 0.44 | 1.21 | 530 |

## Assumptions

- Poore & Nemecek's farm stage is cradle to farm gate without feed and land-use change.
- HESTIA's on-farm share of cradle-to-farm-gate CO₂e for an item applies to Poore & Nemecek's farm stage of the same item.
- An item's gas profile is HESTIA's for that item (or the close item named), or FAOSTAT's on-farm livestock emissions for animal products; the profile is a world average.
- Animal products carry no CO₂, and both scopes are equal for them.
- GWP100 factors are AR5 with climate-carbon feedbacks, 34 for CH₄ and 298 for N₂O, for both fossil and biogenic CH₄.
- Conversions to the current FBS quantity are those listed above; sugar extraction rates of 11% (cane) and 15% (beet) are typical values, not taken from the study.
- Products sharing an item are weighted by their 2009–11 food and waste.
- Poore & Nemecek's estimates for the FBS items they did not survey ("Cereals & Oilcrops Misc.", "Oils Misc.", "Stimulants & Spices Misc.") are used for other cereals, other oil crops, other oils and tea.
- No second literature source is used. Clune et al. (2017) compiles mostly the same studies, in a paywalled article whose data licence could not be confirmed; Agribalyse describes French production only. The items Poore & Nemecek miss (barley as grain, soybeans, sunflower seed, rapeseed, sesame, olives, sweet potatoes, yams, millet, sorghum) are mostly covered by HESTIA's countries, and the rest is left to the proxy and group tiers.

## Sources

- Poore, J., & Nemecek, T. (2018). Reducing food's environmental impacts through producers and consumers. Science, 360(6392), 987–992. [doi:10.1126/science.aaq0216](https://doi.org/10.1126/science.aaq0216). Data S2 and the supplementary materials are on the [first author's site](https://josephpoore.com/). HESTIA lists the dataset under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) on its [Data Sources and Licences](https://www.hestia.earth/guide/guide-accessing-data-data-sources) page.
- Our World in Data, [Food: greenhouse gas emissions across the supply chain](https://ourworldindata.org/grapher/food-emissions-supply-chain): the same stages per kg at retail weight, a public mirror of the study.
- FAOSTAT, [Emissions from livestock](https://www.fao.org/faostat/en/#data/GLE) (CC BY 4.0): gas profiles of animal products.
- HESTIA aggregations: gas profiles of crops, see the [HESTIA page](#method-hestia).
