# Carbon stored in farmland

Farming can take CO₂ out of the air as well as emit it: plants put carbon into the soil, trees store it in wood, and some materials spread on fields lock it away. `removals.json` gives four such practices as levers, with how much CO₂ a hectare takes up each year, on which land, on how much of it at most, and for how long. The values and one line of reasoning for each are in `pipeline/removals.csv`; the code that expands them to countries is `pipeline/planetshift_pipeline/removals.py`, with the climate zone of each country in `pipeline/removals_zones.csv`.

## The four practices

| Practice | Land | Median (likely range), t CO₂/ha/yr | Most of the land | Years at that rate |
| --- | --- | --- | --- | --- |
| Cover crops | cropland | 1.17 (0.6–2.0) in moist climates, 0.45 (0.2–0.8) in dry ones | 25% | 20 |
| Trees on farms (agroforestry) | cropland and pasture | 8.7 (4.4–17.5) tropical moist, 6.1 tropical dry, 4.3 (2.2–8.7) temperate moist, 3.0 temperate dry | 5% | 20 |
| Biochar | cropland | 1.9 (0.6–4.9) everywhere | 20% | 100 (no saturation) |
| Rock dust (enhanced weathering) | cropland | 3.0 (1.0–5.0) tropical moist, 2.0 (0.5–3.5) temperate moist, 1.0 tropical dry, 0.8 temperate dry | 20% | 100 (no saturation) |

The cropland is the model's, 1.65 billion hectares: the food crops' harvested area, with the oilcakes' land and temporary meadows (see [Land](#method-land)).

**Cover crops** are plants sown between two main crops, in a winter or dry-season fallow, and left on or ploughed into the field. Their roots and residues add carbon to the soil. The meta-analysis of Poeplau and Don (2015) found a mean gain of 0.32 t of carbon per hectare a year (1.17 t of CO₂), with no clear effect of climate among the field trials, which are mostly in moist climates. In dry climates water limits what a cover crop can grow; the IPCC's factor for high carbon inputs is 1.04 there against 1.11 in moist climates, so the gain is about a third of the moist one. The share of cropland is a quarter, the area Poeplau and Don's global estimate assumed has room for a cover crop. At that cap, Planetshift's cover crops store about 0.37 Gt of CO₂ a year, 0.10 Pg of carbon, close to Poeplau and Don's global estimate (0.12 ± 0.03 Pg C a year).

**Trees on farms** (agroforestry) puts trees into fields of crops (silvoarable systems, alley cropping) or into pastures (silvopasture). The trees store carbon in their wood and roots, and their litter adds to the soil. Cardinael et al. (2018) synthesised 542 observations into rates by system and climate; averaged over silvoarable systems and silvopasture, trees and soil take up about 8.6 t of CO₂ per hectare a year in temperate climates and 17.5 t in the tropics. Those are the plots studied, with a median of 1250 trees per hectare and a median age of 8 to 11 years, growing fast; systems adopted on a large scale have fewer trees, so the median is half the synthesis' mean, the low a quarter and the high the mean itself. Dry climates take 0.7 of the moist rate, the IPCC's ratio of tree growth in dry to moist tropics. Five percent of cropland and pasture is a realistic most: on about 4.7 billion hectares of farmland, it gives about 1.4 Gt of CO₂ a year, between the cost-effective and the technical potentials of Roe et al. (2021) and the IPCC's Sixth Assessment Report (agroforestry: 0.8, 0.4–1.1, Gt CO₂-equivalent a year at up to $100 a tonne; 4.1, 0.3–9.4, technically).

**Biochar** is biomass (crop residues, manure, wood waste) heated without oxygen into a charcoal, then spread on fields. About two thirds of its mass is carbon, and most of it is so stable that 97% has a mean residence time of centuries in soil (Wang et al., 2016). The rate assumes 1 t of biochar per hectare a year, what spare biomass can supply without clearing land for it, with 0.65 t of carbon per tonne of which 80% remains after a hundred years, the IPCC's 2019 rule for counting it (2019 Refinement, volume 4, chapter 2, appendix 4: Table 4Ap.1 for the carbon content, 0.65 for herbaceous feedstock by pyrolysis, and Table 4Ap.2 for the share kept, 0.80 for char made at 450–600 °C): 1 × 0.65 × 0.8 × 44/12 = 1.9 t of CO₂. The range spans 0.5 t of poorly carbonised char to 2 t of char made at high temperature. It does not depend on climate. A fifth of cropland is the most the sustainable feedstock of Woolf et al. (2010) can supply at that rate. At that cap it stores about 0.63 Gt of CO₂ a year, below the IPCC's Sixth Assessment Report's potential for biochar (1.1, 0.3–1.8, Gt CO₂-equivalent a year at up to $100 a tonne; 2.6 technically): a conservative reading.

**Rock dust** (enhanced weathering) spreads crushed silicate rock, usually basalt, on fields. As it dissolves, it turns CO₂ from soil air into bicarbonate that drains to rivers and the ocean, where it stays for many thousands of years. A four-year field trial in the US Corn Belt measured 10.5 ± 3.8 t of CO₂ per hectare from 50 t of basalt a hectare each year (Beerling et al., 2024), 2.6 t a year; less about a fifth for quarrying, grinding and transport, 2 t. Weathering is faster where it is warm and wet and slow where water does not move through the soil, so the tropics get more and dry croplands less. A fifth of cropland is the most that rock supply and haulage allow: with a typical 2 t per hectare it gives about 0.6 Gt a year, within the 0.5–2 Gt that Beerling et al. (2020) found for the main agricultural countries.

## Countries and climate

Where the evidence differs by climate, the rate is given for four zones, tropical or temperate and moist or dry, and each country takes the zone of most of its cropland (`removals_zones.csv`, set by hand from the IPCC's climate zones: Brazil, Indonesia and Nigeria are tropical moist, India, Mexico and the Sahel tropical dry, the United States, China and Western Europe temperate moist, Russia, Ukraine, Canada, Australia and Spain temperate dry). A country with no zone takes the `World` value. A large country spans several zones; its one zone is a simplification.

## How long the uptake lasts

`years` is read differently for the two kinds of practice.

**Cover crops and agroforestry fill a store that saturates.** Soil and trees reach a new equilibrium: the gain is fastest at first and slows as the stock approaches its new level. Planetshift counts it at the full rate for `years` after adoption (20, the IPCC's default time to a new soil equilibrium, and about the age at which agroforestry trees are harvested or stop gaining much), then zero. The total stored is the rate times the years. Poeplau and Don's response function keeps gaining for over a century, ever more slowly, so 20 years is the conservative reading. When adoption ramps up, each year's new hectares start their own 20 years.

**Biochar and enhanced weathering accrue while applied.** Each year's char and rock add carbon that does not come back, so the stock keeps growing as long as the practice goes on. `years` is 100, meaning no saturation before 2100: the rate holds every year the practice is in place. When it stops, the uptake stops, but what was stored stays.

## Permanence

Carbon in soil and trees can be lost again. Ploughing up a field of cover crops, felling the trees of an agroforestry system, a drought, a fire or a warmer climate that speeds up decomposition release part of what was stored, and stopping the practice lets the soil drift back to its old level over decades. The rates here assume the practice is kept up; a model that stops the practice should give back the stock over about the same time it took to build. Biochar and weathering are far more permanent: biochar loses a few percent in its first years and very little after, and bicarbonate in the ocean stays for millennia.

## Why the numbers are uncertain

The ranges are wide, and for good reasons. Soil carbon is measured as a small difference between two large stocks, often only in the top 30 cm, and gains in the topsoil can be offset by losses deeper down. Field trials are where the practice works well and are short, so extrapolating them to a country and to decades is a stretch. The agroforestry rates depend on how many trees are planted and how they are managed, which no global figure can capture. Enhanced weathering has few field trials, and some find slower uptake than models predict; how much of the dissolved carbon reaches the ocean is still being measured. Biochar's benefit depends on what the biomass would otherwise have done: burning residues for biochar that would otherwise have rotted into the soil gains less than the rate says. None of these rates counts side effects on yields, on nitrous oxide from soils, or the emissions of making the rock powder and the char beyond the transport share for weathering.

## Assumptions

- Rates are per hectare of land where the practice is adopted, in tonnes of CO₂ a year, median and likely range.
- Cover crops: 0.32 t C/ha/yr in moist climates, a third of the gain in dry ones; at most a quarter of cropland; 20 years.
- Trees on farms: half the mean of Cardinael et al. (2018) for silvoarable and silvopastoral systems, trees and soil together; dry climates 0.7 of moist; at most 5% of farmland; 20 years.
- Biochar: 1 t/ha/yr, 0.65 t C/t, 80% kept after a century; at most a fifth of cropland; no saturation.
- Rock dust: 2 t CO₂/ha/yr net in moist temperate croplands from a field trial at 50 t of basalt/ha/yr, more in the tropics, less in dry croplands; at most a fifth of cropland; no saturation.
- Each country takes one climate zone, that of most of its cropland.
- Practices are counted independently; their uptakes on the same hectare are added, though a cover crop and biochar on one field may not add up in full.

## Sources

- Poeplau, C. and Don, A. (2015). Carbon sequestration in agricultural soils via cultivation of cover crops – A meta-analysis. Agriculture, Ecosystems & Environment 200, 33–41, doi:10.1016/j.agee.2014.10.024.
- IPCC (2006, refined 2019). Guidelines for National Greenhouse Gas Inventories, volume 4, chapter 5, Cropland, and chapter 2, appendix 4, biochar (Tables 4Ap.1 and 4Ap.2).
- Cardinael, R. et al. (2018). Revisiting IPCC Tier 1 coefficients for soil organic and biomass carbon storage in agroforestry systems. Environmental Research Letters 13, 124020, doi:10.1088/1748-9326/aaeb5f. CC BY 3.0.
- Roe, S. et al. (2021). Land-based measures to mitigate climate change: potential and feasibility by country. Global Change Biology 27, 6025–6058, doi:10.1111/gcb.15873. CC BY 4.0.
- Nabuurs, G.-J., Mrabet, R. et al. (2022). Agriculture, Forestry and Other Land Uses (AFOLU). In Climate Change 2022: Mitigation of Climate Change, IPCC AR6 WGIII, chapter 7 (Table 7.3, potentials of agroforestry, biochar and soil carbon management in croplands), doi:10.1017/9781009157926.009.
- Wang, J., Xiong, Z. and Kuzyakov, Y. (2016). Biochar stability in soil: meta-analysis of decomposition and priming effects. GCB Bioenergy 8, 512–523, doi:10.1111/gcbb.12266. CC BY 4.0.
- Lehmann, J. et al. (2021). Biochar in climate change mitigation. Nature Geoscience 14, 883–892, doi:10.1038/s41561-021-00852-8.
- Woolf, D. et al. (2010). Sustainable biochar to mitigate global climate change. Nature Communications 1, 56, doi:10.1038/ncomms1053.
- Beerling, D. J. et al. (2020). Potential for large-scale CO₂ removal via enhanced rock weathering with croplands. Nature 583, 242–248, doi:10.1038/s41586-020-2448-9.
- Beerling, D. J. et al. (2024). Enhanced weathering in the US Corn Belt delivers carbon removal with agronomic benefits. PNAS 121, e2319436121, doi:10.1073/pnas.2319436121. CC BY 4.0.
