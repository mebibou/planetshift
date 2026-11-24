# Emission intensities from published LCA data

When HESTIA has no data for a food, Planetshift can take its emissions from a published meta-analysis of life-cycle assessments: Poore & Nemecek (2018), the largest such study, which covers about 38,700 farms in 119 countries. The study gives one world average per food. Together with FAOSTAT, it supplies the emissions of meat, milk and eggs, which HESTIA does not cover yet.

## What the study adds

A life-cycle assessment (LCA) counts the emissions of a product at every stage, from making the inputs to the shop. An emission intensity is the amount of each greenhouse gas emitted to produce one tonne of a food. Planetshift takes each intensity from the best source available, in six steps called tiers (see [Emissions](#method-emissions)). Poore & Nemecek are tier 4. They are used where HESTIA (tiers 1 and 2) and FAOSTAT (tier 3) give no value.

Their values are world averages, so every row has the area `World`. Planetshift uses only the emissions on the farm. It splits the study's single CO₂-equivalent figure back into the three gases, because the climate model needs each gas separately. It also converts a few of the study's units to those of today's Food Balance Sheets.

The code is `pipeline/planetshift_pipeline/sources/literature.py`. The product table is `pipeline/literature_terms.csv`.

## The data

Poore & Nemecek publish the greenhouse gas (GHG) emissions of each product in Data S2 of their supplementary materials (sheet "Results - Global Totals"). The values are given by stage of the supply chain. They are per kg of the product's Food Balance Sheet (FBS) unit. They leave out consumer waste. The stages are land-use change, feed, farm, processing, transport, packaging and retail.

Their supplementary materials define the farm stage as follows:

- for crops, "inputs production, field emissions, drying and grading";
- for animals, the livestock stage: "pasture irrigation and fertilization, manure management, aquaculture emissions, enteric fermentation and energy use".

Feed is a stage of its own.

For each FBS item, `literature_terms.csv` holds:

- the Poore & Nemecek products that represent it;
- their farm-stage emissions (`farm_kg_co2e_per_kg`, transcribed from that sheet);
- their food and waste in 2009–11 (`weight_kt`, from the same sheet);
- a conversion to the current FBS quantity;
- the gas profile used to split them.

The values come from a fixed 2018 publication, in a spreadsheet format the pipeline does not read. They are therefore kept in the table rather than downloaded. Every value was checked against the spreadsheet once, when it was transcribed.

## Which emissions are used

Only the farm stage is used:

- Land-use change is left out, as in the HESTIA rows.
- Feed is left out, because Planetshift counts feed through the crops it reduces.
- Processing, transport, packaging and retail happen after the farm gate (the point where the product leaves the farm), so they are left out too.

Planetshift has two scopes, set under *Other options* (see [Emissions](#method-emissions)). Farm gate counts what happens on the farm. Cradle to farm gate also counts the making of the farm's inputs, such as fertiliser. The study's farm stage is turned into the two scopes as follows:

- `cradleToFarmGate` = the farm stage. For crops, the farm stage already includes the production of inputs other than feed.
- `farmGate` = the farm stage × the share of on-farm emissions in HESTIA's cradle-to-farm-gate emissions of the same item (in CO₂e, with the factors below). For crops, HESTIA's split between on-farm and input-production emissions is the only one available. Poore & Nemecek do not publish it.
- For animal products, the livestock stage is almost entirely on the farm (enteric fermentation and manure), so both scopes take the whole farm stage. The emissions of fertilising pasture and of the energy used on the farm are kept in both.

## Splitting CO₂e into gases

Poore & Nemecek report CO₂-equivalents (CO₂e). A CO₂e figure adds the gases up after weighting each one by how much it warms over 100 years compared with CO₂. The study uses the factors of the IPCC's Fifth Assessment Report (AR5) that include climate-carbon feedbacks: 34 for CH₄ and 298 for N₂O (their table S2).

Planetshift needs each gas separately. Each product's farm stage is split in the proportions of a gas profile, a typical mix of the gases for that kind of product. Each gas's CO₂e is then divided by its factor:

$$
\text{kg of gas} = \text{farm CO}_2\text{e} \times \frac{\text{gas's CO}_2\text{e in the profile}}{\text{profile's total CO}_2\text{e}} \div \text{GWP of the gas}
$$

Multiplying each gas back by 34 and 298 gives Poore & Nemecek's value exactly.

**Example.** Bovine meat has a farm-stage value of 29,040 kg CO₂e per tonne (table below). After the split it carries 703 kg of CH₄ and 17.3 kg of N₂O per tonne. Multiplied back, 703 × 34 ≈ 23,900 and 17.3 × 298 ≈ 5,160. Together they make the study's 29,040 kg CO₂e, apart from the rounding of the table.

The profiles come from two sources:

- **Crops.** The profile is HESTIA's intensities of the same FBS item (`hestia:<code>`), from its World aggregation if there is one, otherwise the mean of its countries. Where HESTIA does not have the item, the profile of a close item is used instead:
  - palm oil takes the profile of oil palm fruit;
  - soybean oil takes that of soybeans;
  - tea takes that of coffee;
  - plantains take that of bananas;
  - pineapples and dates take that of other fruit;
  - grapefruit and other citrus take that of oranges.
- **Animal products.** HESTIA has no animal aggregation yet. The profile is therefore FAOSTAT's on-farm emissions of the species in the world's latest year (Emissions from livestock): CH₄ from enteric fermentation and manure management, and N₂O from manure management and from manure left on pasture (`faostat:<species>`). Manure applied to soils is left out of the profile, since it fertilises crops. The species are matched as follows:
  - bovine meat from the beef herd takes non-dairy cattle's profile;
  - bovine meat from the dairy herd, and milk, take that of dairy cattle;
  - mutton and goat take that of sheep and goats;
  - pig meat takes that of swine;
  - poultry meat takes that of broilers;
  - eggs take that of layers.

FAOSTAT's livestock emissions have no CO₂, so the animal rows carry none. The energy and pasture-fertiliser part of the livestock stage is counted as CH₄ and N₂O, in the species' proportions. That part is small for ruminants and larger for pigs and poultry.

## Units

Poore & Nemecek's FBS units are those of FAOSTAT's earlier Food Balance Sheets (before 2010). They differ from the current ones for two items, rice and groundnuts. `kg_product_per_kg_item` converts these units and the others below:

- **Rice**: their unit is milled rice. The current FBS counts paddy, of which milled rice is 66.7%, so 0.667.
- **Groundnuts**: their unit is shelled groundnuts. The current FBS counts them in shell, of which kernels are 70%, so 0.7.
- **Sugar cane and sugar beet**: their unit is raw sugar. A kg of cane gives 0.11 kg of raw sugar, and a kg of beet 0.15. The FBS item "Sugar (Raw Equivalent)" takes the sugar values directly.
- **All other items**: 1. Meat is per kg of carcass weight, milk per kg of milk, eggs per kg in shell, coffee per kg of green coffee, cocoa per kg of beans, oils per kg of oil, and nuts per kg in shell.

The retail-weight figures often quoted from the study, such as 99 kg CO₂e per kg of beef, are a different measure. They are per kg of boneless meat and include all stages.

When several products share an item, they are averaged with their 2009–11 food and waste as weights:

- bovine meat is beef herd (40.6 Mt), dairy herd (31.4 Mt) and buffalo (6.6 Mt);
- "Vegetables, other" is other vegetables, brassicas and root vegetables.

## Coverage

46 FBS items get a literature row in both scopes.

- **19 have no HESTIA row at all**: bovine meat, mutton and goat meat, pig meat, poultry meat, milk, eggs, the five vegetable oils and other oils (2571, 2573, 2574, 2577, 2580, 2586), sugar (raw equivalent), grapefruit, other citrus, plantains, pineapples, dates and tea.
- **19 more have HESTIA rows for some countries but no World aggregation**, so the literature row is their only world value: rice, oats, rye, other cereals, cassava, beans, peas, other pulses, nuts, other oil crops, tomatoes, onions, other vegetables, oranges, lemons, apples, other fruit, coffee and cocoa.
- **Some items get none**: barley, millet, sorghum, sweet potatoes, yams, soybeans, sunflower seed, rapeseed, sesame, palm kernels and olives. Poore & Nemecek report barley only as beer, and soybeans as tofu, soy milk and oil.

Farm-gate values for some items, in kg per tonne of the FBS item:

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
- An item's gas profile is HESTIA's for that item (or for the close item named), or FAOSTAT's on-farm livestock emissions for animal products. The profile is a world average.
- Animal products carry no CO₂, and both scopes are equal for them.
- The GWP100 factors (the 100-year weights that turn each gas into CO₂e) are AR5's with climate-carbon feedbacks: 34 for CH₄ and 298 for N₂O, for both fossil and biogenic CH₄.
- Conversions to the current FBS quantity are those listed above. The sugar extraction rates of 11% (cane) and 15% (beet) are not taken from the study. They are FAO's technical conversion factors for raw sugar in the main producers: 11% in India and the United States, 15% in France and Germany.
- Products sharing an item are weighted by their 2009–11 food and waste.
- Poore & Nemecek's estimates for the FBS items they did not survey ("Cereals & Oilcrops Misc.", "Oils Misc.", "Stimulants & Spices Misc.") are used for other cereals, other oil crops, other oils and tea.
- No second literature source is used:
  - Clune et al. (2017) compiles mostly the same studies, in a paywalled article whose data licence could not be confirmed.
  - Agribalyse describes French production only.
  - The items Poore & Nemecek miss (barley as grain, soybeans, sunflower seed, rapeseed, sesame, olives, sweet potatoes, yams, millet, sorghum) are mostly covered by HESTIA's countries. The others fall back to the proxy and group tiers.

## Sources

- Poore, J., & Nemecek, T. (2018). Reducing food's environmental impacts through producers and consumers. Science, 360(6392), 987–992. [doi:10.1126/science.aaq0216](https://doi.org/10.1126/science.aaq0216). Data S2 and the supplementary materials are on the [first author's site](https://josephpoore.com/). HESTIA lists the dataset under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) on its [Data Sources and Licences](https://www.hestia.earth/guide/guide-accessing-data-data-sources) page.
- Our World in Data, [Food: greenhouse gas emissions across the supply chain](https://ourworldindata.org/grapher/food-emissions-supply-chain): the same stages per kg at retail weight, a public mirror of the study.
- FAOSTAT, [Emissions from livestock](https://www.fao.org/faostat/en/#data/GLE) (CC BY 4.0): gas profiles of animal products.
- HESTIA aggregations: gas profiles of crops, see the [HESTIA page](#method-hestia).
