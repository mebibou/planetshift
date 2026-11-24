# Assumptions

Every assumption and starting value in Planetshift is listed here, in one place. Each line gives the value, why it was chosen, and the section that explains it. Start with the table of choices you can change under *Other options*. The rest of the page is a reference for looking things up.

Some values are marked as starting values. These are judgement calls to review. The last part of the page lists what has to be checked before a public release.

## Choices you can change

Each choice below is set in the panel and has a default and one or more alternatives. The name in brackets is the value that appears in the page's URL.

| Choice | Default | Alternatives |
| --- | --- | --- |
| Emissions counted | on the farm (`farmGate`) | with inputs (`cradleToFarmGate`) |
| Feed shared out | by species (`species`) | regional rations (`gleam`) |
| Farming's future without the levers | population growth (`population`) | SSP2 path (`ssp2`) |
| Where production changes | trade shares held (`fixedTrade`) | each country itself (`domestic`) |
| Kept equal | protein (`protein`) | calories (`kcal`) |
| Replaced by | today's protein-rich plant foods (`current`) | mostly legumes (`legumes`), soy and oat drinks (`plantMilk`) |
| Observed temperature | HadCRUT5 (`hadcrut5`) | Berkeley Earth (`berkeley`) |
| Climate response | FaIR (`fair`) | AR6 tables (`ar6`) |
| Rest of the world's emissions | middle, SSP2-4.5 (`ssp245`) | low, SSP1-2.6 (`ssp126`); high, SSP3-7.0 (`ssp370`) |
| Freed farmland | left as it is (`none`) | grows back (`natural`) |
| AI data centres | growth added, IEA (`iea`) | as in the scenario (`ssp`) |
| Permafrost | left out (`off`) | thaws (`on`) |
| World population | UN medium projection (`medium`) | UN low (`low`), UN high (`high`) |
| All levers fully in place by | 2035 | any year from 2025 to 2050 |

The URL keys of the options, the diet controls and the levers are listed under [Options](#method-options).

## Terms used on this page

- **Farm gate** and **cradle to farm gate** are the two scopes of farm emissions. Farm gate counts what happens on the farm. Cradle to farm gate adds the making of the farm's inputs, such as fertiliser and energy. See [Emissions](#method-emissions).
- **An intensity** is the amount of each gas emitted to produce one tonne of a food. **Tiers** are the six sources an intensity can come from, best first.
- **CO₂e** (CO₂-equivalent) adds the gases up after weighting each by how much it warms over 100 years compared with CO₂ (its **GWP100**). Planetshift shows CO₂e as a total only.
- **FaIR** is the simple climate model that turns emissions into temperature. **AGTP** is the warming one kilogram of a gas causes, year by year after it is emitted. See [Climate](#method-climate).
- **SSPs** (Shared Socioeconomic Pathways) are the published scenarios for the rest of the world's emissions, such as SSP2-4.5.
- **The Shapley value** shares out what overlapping levers avoid together, so that the order in which they are counted does not matter. See [Levers](#method-levers).

## Data and countries

- **Base year 2023**: the latest year whose Food Balance Sheets cover at least 95% as many countries as the best-covered year. Today's food system is then the most recent one that is nearly complete. See [Data](#method-data).
- **The base-year balance stands for today's food system**: the current FAOSTAT series (2010 onwards) as published. Nothing is averaged over several years. See [Data](#method-data).
- **`other` closes each item's balance**: production + imports − exports = food + feed + losses + processing + seed + other. Stock changes and statistical residuals are therefore kept rather than spread over the other uses. See [Data](#method-data).
- **Kcal and protein per tonne are world values**: FAOSTAT's world food supply of kcal and protein divided by world food supply in tonnes, in the base year. They are the same in every country. See [Data](#method-data).
- **188 countries**: single countries only (FAOSTAT area codes below 5000). The "China" sum of its four parts and areas that no longer exist are left out, so nothing is counted twice. See [Data](#method-data).
- **Countries missing from the base year keep their latest diet per person**, rather than being left blank. These are Cuba (2019), the Democratic People's Republic of Korea (2018), and ten countries from the historic series ending in 2013. Each is scaled by its population growth since. See [Data](#method-data).
- **Countries with no balance at all are left out**: among them Somalia, Burundi, South Sudan, Singapore, Palestine and Eritrea. See [Data](#method-data).
- **A country's region is its M49 sub-region** (a UN grouping such as "Western Africa"), used for feed shares and regional averages. Natural Earth and FAOSTAT both use it. See [Data](#method-data).
- **High income is the World Bank's classification for fiscal year 2027**, used for the high-income scenario and the feed rations. See [Data](#method-data).
- **Population to 2100 is FAOSTAT's annual population**, which carries the UN World Population Prospects (WPP) estimates and medium-variant projection. See [Data](#method-data).
- **The low and high population projections come from WPP 2024.** Each is applied to each country as its ratio to the medium projection in 2025, 2030 and every ten years to 2100. In between, the ratio changes in a straight line. The world's history before 1950, for the chart only, is Our World in Data's long-run series. See [Options](#method-options).

## Groups and items

- **90 Food Balance Sheet items in 17 groups**: 6 animal (ruminant meat, pig meat, poultry meat, dairy, eggs, seafood) and 11 plant, from `pipeline/groups.csv`. See [Data](#method-data).
- **Rice is a group of its own**, because of its paddy methane. See [Data](#method-data).
- **"Other meat" (camels, llamas, horses, rabbits, game) is ruminant meat**, as meat of other herbivores. See [Data](#method-data).
- **Edible offal goes with ruminant meat and raw animal fats with pig meat.** Each is grouped with its largest source, although both come from several species. See [Data](#method-data).
- **Fish and seafood are an animal group.** Wild capture and aquaculture are combined in proportion to each country's FishStat production. Aquatic plants, aquatic mammals and fish oils are left out. See [Fish and seafood](#method-seafood).
- **Honey, non-food alcohol, infant food and the miscellaneous item are left out.** Honey has no farm emissions in FAOSTAT and almost no protein. The others are made from items already counted. See [Data](#method-data).
- **Every item with a world production above 100 kt has a group**, which a test checks. See [Data](#method-data).

## Emission intensities and the six tiers

- **Three gases, kept separate**: kg of CO₂, CH₄ and N₂O per tonne of each item. They are never added up before the climate model. See [Emissions](#method-emissions).
- **Farm gate by default**: the farm's biological processes only. Cradle to farm gate adds energy and the making of fertilisers and pesticides. Neither includes land-use change, drained organic soils or anything after the farm. See [Emissions](#method-emissions).
- **Animal intensities leave out feed**, because the model removes feed through the crops' own intensities. Counting it on the animal too would count it twice. See [Emissions](#method-emissions).
- **A primary item's emissions are counted on production − processing**, and the processed share is counted on the products made from it, so that each tonne is counted once. See [Emissions](#method-emissions).
- **A processed item without its own value takes its primary item's intensity divided by the extraction rate.** The extraction rate is the tonnes of product made from a tonne of the primary item. It is mostly the world's 2023 output of the product over the primary item processed: soybean oil 0.19, sugar 0.11 from cane and 0.16 from beet, butter 0.056 for 85% of processed milk. It is the same in every country. See [Emissions](#method-emissions).
- **Rice bran oil and maize germ oil carry no emissions**: they come from grain already counted as food. See [Emissions](#method-emissions).
- **Six tiers, best first**: HESTIA for the country, HESTIA for its region or the world, FAOSTAT for the country, a published world average, a proxy, and the group's world median. Each cell takes the first value available. See [Emissions](#method-emissions).
- **Every country has a value for every item**, including items it does not grow, so that production can shift to any country. See [Emissions](#method-emissions).
- **HESTIA release v1.2 (2026-04-30), pinned**: the newest public release. The numbers change only when the constant does. See [HESTIA](#method-hestia).
- **Only validated HESTIA aggregations, the latest period of each product and area**: HESTIA does not publish unvalidated ones. See [HESTIA](#method-hestia).
- **HESTIA products that share an item are averaged without weights.** The best priority available in the area is used. See [HESTIA](#method-hestia).
- **HESTIA conversion factors**: oats in husk to groats 0.7; Poore & Nemecek's dressing percentages for meat counted live (52–55% cattle and buffalo, 47% sheep and goats, 75% pigs, 72% poultry); 16.7 eggs per kg; fat- and protein-corrected milk taken as whole milk. See [HESTIA](#method-hestia).
- **Some HESTIA emissions are left out of both scopes**: land use, burning of natural vegetation, biogenic CO₂ and natural background N₂O. The production of agricultural inputs (feed, seed, animals, crops, processed food) is also left out of cradle to farm gate. Feed additives and organic fertilisers are kept. See [HESTIA](#method-hestia).
- **Processed products' HESTIA aggregations are not used**: they count the whole crop as one background input. See [HESTIA](#method-hestia).
- **FAOSTAT's own Tier 1 estimates, not countries' inventories**, for the emissions year closest to 2023, so that every country is estimated the same way. See [Emissions](#method-emissions).
- **Synthetic nitrogen is shared by harvested area × a world rate per crop class.** The rates come from the shares of world nitrogen use in Heffer et al. (2017): wheat 18%, maize 18%, rice 15%, vegetables 7%, fruit 6%, and so on. Real rates vary between countries. See [Emissions](#method-emissions).
- **4.7% of each country's synthetic nitrogen goes on grassland**, as in the world average of the same survey. It is given to ruminant products in proportion to their methane. See [Emissions](#method-emissions).
- **A dairy herd's emissions go 85% to milk and 15% to beef** everywhere. This is a physical allocation, as the International Dairy Federation's standard asks; its worked example gives 85.1% for one farm, but the standard sets no global default. See [Emissions](#method-emissions).
- **Mixed herds (buffalo, sheep, goats, camels) are split between milk and meat by protein**, with 15% protein in carcass meat and 3.2–5.5% in milk depending on the species. See [Emissions](#method-emissions).
- **Horses, asses and mules are left out**: they are kept mainly for work. See [Emissions](#method-emissions).
- **Offal and animal fats carry the same emissions per tonne as the carcass**, sharing the meat's emissions by mass. See [Emissions](#method-emissions).
- **In cradle to farm gate, the inputs are shared out three ways**: on-farm energy by gross production value, fertiliser manufacture the same way as synthetic nitrogen, and pesticide manufacture by harvested area. See [Emissions](#method-emissions).
- **An intensity over 20 times the item's world median (in CO₂e) is a data mismatch** and falls to the next tier (93 of about 5,600 values). See [Emissions](#method-emissions).
- **Poore & Nemecek's farm stage is cradle to farm gate without feed and land-use change.** Farm gate is that × HESTIA's on-farm share for the same item. For animal products, both scopes are the whole farm stage. See [Published LCA data](#method-literature).
- **Poore & Nemecek's CO₂e is split into gases with a world gas profile**: HESTIA's for crops, and FAOSTAT's on-farm livestock emissions for animals. The split uses AR5 factors with climate-carbon feedbacks (34 for CH₄, 298 for N₂O), as the study did. Animal products carry no CO₂. See [Published LCA data](#method-literature).
- **Poore & Nemecek's units are converted to the current FBS**: milled rice 0.667 of paddy, groundnut kernels 0.7 of in-shell, raw sugar 0.11 per kg of cane and 0.15 per kg of beet. Products sharing an item are weighted by their 2009–11 food and waste. See [Published LCA data](#method-literature).
- **No second literature source**: Clune et al. (2017) has an unconfirmed data licence and Agribalyse covers France only. See [Published LCA data](#method-literature).
- **Proxies are judgement calls**, listed item by item for review. A proxy never borrows another proxy or a median, and milk has none. See [Emissions](#method-emissions).
- **The group median is production-weighted over tiers 1–4.** No cell needs it at present. See [Emissions](#method-emissions).
- **If an intensity is missing in the chosen scope, the other scope's intensity is used. If it is missing in both, the item adds nothing.** See [Options](#method-options).
- **Intensities per tonne do not change with the amount produced.** See [The shift](#method-shift).

## Feed

- **Only Food Balance Sheet items are split.** Grass, hay, crop residues and oil cakes are not items, so they are outside the split, although grass and residues are most of what ruminants eat. See [Feed](#method-feed).
- **By species (default): one world split for every feed item**: ruminant meat 11%, dairy 16%, pig meat 28%, poultry meat 28%, eggs 17%. These are rounded from GLEAM (FAO's livestock model) and the industry's compound feed survey. A region's split follows what it produces. See [Feed](#method-feed).
- **GLEAM-style rations give the concentrate feed per tonne of product**, in high-income countries / elsewhere: beef 3.0 / 0.8 t, milk 0.35 / 0.12 t, pig meat 3.3 / 2.5 t, poultry meat 2.6 / 2.3 t, eggs 2.2 / 2.0 t. See [Feed](#method-feed).
- **Ration shares by feed class**: grain is 55–70% of each group's concentrate and oilseeds 12–30%. The rest is pulses, roots, sugar crops and milk (milk is fed only to cattle and pigs). The shares broadly follow GLEAM 2.0. They are not a copy of its tables. See [Feed](#method-feed).
- **Two income levels stand for the many production systems GLEAM distinguishes.** See [Feed](#method-feed).
- **Feed items whose class has no ration use the species split.** See [Feed](#method-feed).
- **A region without animal production takes the world shares** (none at present). See [Feed](#method-feed).
- **Feed falls in proportion to each group's production in the same country.** A group a country does not raise has no feed to lose. See [The shift](#method-shift).
- **Milk and fish fed to animals change once, when the animals they feed change.** The fish caught for meal are wild and eat no feed, so their change does not change feed again. See [The shift](#method-shift) and [Fish and seafood](#method-seafood).

## The shift

- **Protein is kept equal by default** (calories as the alternative), exactly, in every country. The other nutrient moves. See [The shift](#method-shift).
- **A shift removes a share of each animal group's food supply.** The mix of items within a group does not change. See [The shift](#method-shift).
- **By default, the replacement is each country's own mix of protein-rich plant foods**: cereals, rice, pulses, nuts and protein-rich oilseeds. Nobody is asked to eat foods new to them. Fruit, vegetables, sugar, oils and drinks are not scaled up to replace protein they do not bring. See [The shift](#method-shift).
- **Mostly legumes: 60% pulses, 20% soybeans, 20% cereals**, each part split by the country's current mix. This is a starting value to review, not taken from a study. See [The shift](#method-shift).
- **Soy and oat drinks: 50% soybeans, 50% oats**, the two main plant-milk bases. This is a starting value to review. See [The shift](#method-shift).
- **If a country eats no item of a part of the mix, that part follows the world's mix.** If no item fills a part, that part is dropped and the others are scaled up. See [The shift](#method-shift).
- **Losses and seed are fixed shares of each item's domestic supply.** A tonne more food therefore needs 1 ÷ (1 − that share) tonnes more supply. The multiplier is capped at 3 as a guard against odd rows. See [The shift](#method-shift).
- **Processing is fixed in tonnes**: a change in demand for a processed product changes that product's production, not the crop processed for it. See [The shift](#method-shift).
- **Fixed trade shares (default)**: the world change in an item is shared among countries by their share of world production less processing. Who exports what does not change. See [The shift](#method-shift).
- **Domestic (alternative)**: each country produces its own change as far as its own production allows. The rest goes to the world's producers by their shares. See [The shift](#method-shift).
- **Production cannot fall below what is processed.** Such cases stop at that limit and are listed as clipped. See [The shift](#method-shift).
- **An item no country produces stays where it is eaten.** See [The shift](#method-shift).
- **The ramp is linear**: 0 in the current year, 1 in the year chosen (2035 by default, 2025–2050 allowed), then held until 2100. See [The shift](#method-shift).
- **The baseline is today's diet × world population** by default. The alternative is SSP2-4.5's agricultural emissions, gas by gas, relative to the base year. The shift's change is scaled the same way. See [The shift](#method-shift).
- **The avoided emissions shown are those of the year the shift is complete.** See [The shift](#method-shift).
- **World population is a method option, not a lever**: the UN's medium projection by default, or its low or high one. The baseline and the scenario use the same population, so it is never counted as warming avoided. With the SSP2 path for farm emissions, the population chosen changes nothing. See [Options](#method-options).
- **The population chosen does not change the scenario world**: fossil fuels, aerosols and land use keep the population of the SSP. The low projection with SSP3-7.0 and the high one with SSP1-2.6 are allowed, with a note. See [Options](#method-options).

## Levers

- **Every lever is a share adopted, 0–100%, ramping in linearly** from the current year to the year *All levers fully in place by*, then held to 2100. The diet's shift ramps the same way. See [Levers](#method-levers).
- **The breakdown by lever group is each group's Shapley value** over the acting groups. It is split by cause, by gas and source. Farm emissions count in farming. Clearing, regrowth and stored carbon count in land use. Fossil CO₂ and aviation's forcing count in fossil fuels and industry. The panel orders the causes by the warming they cause by the horizon, and the groups by what each avoids alone in full. See [Levers](#method-levers).
- **Farm practices cut a share of the sources they act on** (`breakdown.json`). The cut is adoption × the share of the emissions that could adopt them in each country (a judgement) × a published reduction. Practices on the same source multiply. See [Farm practices](#method-practices).
- **Food waste and losses**: waste after shops lowers the food supply by the lever × each country's waste share. Losses before shops lower each item's loss share. What people eat does not change. See [Food loss and waste](#method-waste).
- **Deforestation CO₂ is a constant stream** that moves with each item's production in the country cleared, between none and double today's. The lever stops its share of what remains. See [Deforestation](#method-deforestation).
- **Carbon in farmland**: adoption × the largest share of the land a practice can reach × hectares × the country's rate. It lasts 20 years from each hectare's adoption (cover crops, trees) or runs to 2100 (biochar, rock dust). See [Carbon in farmland](#method-removals).

## Energy and transport

- **The sectors are part of each SSP's fossil CO₂, scaled to 2023 inventories**: road 6.1 (passengers 60%, freight 40%), aviation 0.95, shipping 0.85 and electricity 14.15 Gt CO₂. A lever takes a share of a sector's emissions away. See [Energy and transport](#method-sectors).
- **An electric vehicle saves its tailpipe CO₂ × (1 − kWh per kg avoided × the grid's intensity after renewable electricity).** The kWh per kg avoided are 1.11 for passengers and 1.47 for freight, in every year. Making vehicles and batteries is not counted. See [Energy and transport](#method-sectors).
- **Renewable electricity lowers the electricity sector's CO₂ and the grid's intensity by the share adopted.** The intensity never goes below zero. See [Energy and transport](#method-sectors).
- **Aviation's non-CO₂ forcing is 6.44 × 10⁻¹⁴ W/m² per kg a year of aviation CO₂**, the 2018 ratio. It comes from the flights themselves, so less flying cuts it and clean fuel does not. See [Energy and transport](#method-sectors).
- **Less flying and clean fuel combine**: clean fuel acts on the flights left. See [Energy and transport](#method-sectors).
- **AI data centres' electricity beyond 2024 is added to the baseline by default**: the IEA base case, 785 TWh from 2035, held flat after, at each year's grid intensity. Renewable electricity cleans it in the scenario. See [Options](#method-options).
- **The temperature response to forcing is taken from FaIR's response to solar forcing on SSP2-4.5 in 2035.** It is used for every year and scenario. See [Energy and transport](#method-sectors).
- **Each kg of a sector's fossil CO₂ cut also removes CEDS's 2022 methane, SO₂, black and organic carbon and NOx for that sector**, from producing its fuel and burning it. They change with the scenario's emission factors (never above today's, held once the sector's CO₂ halves). Electricity drawn brings the grid's emissions of the same pollutants. For aviation, only the emissions of supplying its fuel are counted, because those of burning it are in its non-CO₂ forcing. Clean shipping keeps its NOx. See [Energy and transport](#method-sectors).
- **Air pollution's forcing per kg comes from FaIR, linearised at the scenario's emissions of each year.** In FaIR a kg less NOx leaves 0.4–4 kg of methane in the air each year (its methane lifetime). Planetshift takes that methane from the chemistry models instead, by where the NOx is emitted (Hoor et al. 2009): 0.27 of FaIR's on land and 0.83 at sea, 0.54 and 1.65 kg in 2023 in SSP2-4.5, following FaIR's change with the scenario. Both count under *air pollution*. The fuel's methane counts under *fossil fuels and industry*. See [Energy and transport](#method-sectors).
- **The low end of the range takes the most electricity per kg avoided, the least non-CO₂ forcing and the lowest data-centre demand.** See [Levers](#method-levers).

## Buildings and industry

- **Buildings' and industry's direct CO₂ are part of each SSP's fossil CO₂, scaled to 2023**: 3.0 and 9.0 Gt CO₂ (IEA). Steel is 28.9%, cement 28.7% and chemicals without ammonia 5.7% of industry's, in every year and scenario. Ammonia's CO₂ is cut only by nitrogen efficiency, on the farm side. See [Buildings and industry](#method-industry).
- **A heat pump saves the boiler's CO₂ × (1 − 1.49 kWh per kg avoided × the grid's intensity after renewable electricity).** See [Buildings and industry](#method-industry).
- **Clean industry cuts 90%, 80% and 80% of steel's, cement's and chemicals' direct CO₂ at full adoption**, less 1.5, 0.25 and 1.9 kWh of electricity per kg avoided on the same grid. Making the equipment is not counted. See [Buildings and industry](#method-industry).

## Climate

- **The temperature is computed from each gas separately.** CO₂e (GWP100 from the IPCC's Sixth Assessment Report, AR6: 27 for CH₄, 273 for N₂O) is only shown as a total. See [Climate](#method-climate).
- **The warming per kilogram (AGTP) comes from FaIR v2.2.5 with the fair-calibrate v1.4.1 ensemble**, all 841 members. The app keeps the median and the 5th and 95th percentiles. See [Climate](#method-climate).
- **Pulses of 1 Gt CO₂, 1 Mt CH₄ and 0.1 Mt N₂O on SSP2-4.5 in 2035** are used for every year and every scenario. Pulses in 2025 and 2045 give curves within 7%. See [Climate](#method-climate).
- **The response is proportional to the change in emissions**, so the warming is the convolution of each year's change with the AGTP. A pulse ten times larger agrees within 0.2%. See [Climate](#method-climate).
- **Agricultural methane is biogenic** (no CO₂ from its oxidation), **and farm CO₂ (urea, liming) is fossil CO₂** in FaIR. See [Climate](#method-climate).
- **A year's emissions are spread evenly over the year.** A calendar year's temperature is the mean of FaIR's values at its two ends. See [Climate](#method-climate).
- **The AR6 alternative is one curve**, from AR6 Chapter 7's expressions, so its range is zero, not unknown. See [Climate](#method-climate) and [Options](#method-options).
- **The band covers only the climate response**, not the uncertainty in intensities, diets or feed, so the real range is wider. See [Climate](#method-climate).
- **Scenario temperatures are FaIR's 841 members on RCMIP v5.1.0 emissions**, history included, relative to 1850–1900. SSP2-4.5 is the default. See [Climate](#method-climate).
- **With the population baseline, a correction is added to the SSP's temperature**: the warming from the gap between population-scaled agricultural emissions and the SSP's own agricultural path. The baseline curve then matches its emissions. See [The shift](#method-shift).
- **Permafrost is off by default.** Switched on, it releases 18.3 (3.2–41.7) PgC per °C of warming over 20 years, 1.6% of it as methane (AR6's 2.8 PgCeq of methane feedback is about 0.28 PgC of methane). It is computed from the baseline temperature and from the scenario's. The carbon released is not taken back up when the temperature falls, and it is computed in one pass only. See [Climate](#method-climate).
- **Observed temperature is HadCRUT5 by default, Berkeley Earth as the alternative**, each re-baselined to its own 1850–1900 mean. HadCRUT5's current year is left out until complete. See [Climate](#method-climate).

## Causes of warming

- **Attribution by removal**: FaIR is run with everything, then with one cause's emissions taken out. The difference is that cause's warming, relative to 1850–1900, for all 841 members. See [Causes of global warming](#method-link).
- **Agriculture is PRIMAP-hist v2.8's IPCC category M.AG**: world total, country-reported scenario (HISTCR), from 1750 to 2023. Land-use change is outside it. See [Causes of global warming](#method-link).
- **From 2024, each scenario's agricultural CH₄ and N₂O are scaled by one constant** so that they meet PRIMAP-hist in 2023. 2024 and 2025 come from the scenarios because PRIMAP-hist extrapolates its latest years. See [Causes of global warming](#method-link).
- **Agricultural CO₂ (urea, liming) is held at its 2023 level after 2023.** PRIMAP-hist has none before 1990. See [Causes of global warming](#method-link).
- **Land use is RCMIP's land-use CO₂ with its albedo effect** (Global Carbon Budget 2016 from 1959, PRIMAP-hist v1.0 before), to stay consistent with FaIR's emissions. PRIMAP-hist's LULUCF (land use, land-use change and forestry) is not used. See [Causes of global warming](#method-link).
- **Fossil fuels and industry are FaIR's fossil CO₂ less urea and liming**, with PRIMAP-hist's energy and industrial CH₄ and N₂O up to 2023, then the scenario's, scaled to meet them. See [Causes of global warming](#method-link).
- **Air pollution is a cause of its own**: sulphur dioxide, black and organic carbon, ammonia and nitrogen oxides from every source, farming's ammonia included, brought back to 1750 levels. Carbon monoxide and volatile organic compounds stay in *other human emissions*. See [Causes of global warming](#method-link).
- **The natural factors are FaIR's run with natural forcing alone**, relative to its 1850–1900 mean, so volcanic eruptions show as natural. See [Causes of global warming](#method-link).
- ***Other human emissions* is the total less every named cause and the natural factors.** Its median is set so that the medians add up to the total. The interactions between causes are included in it (0.03 °C today among the three greenhouse causes, more with air pollution). See [Causes of global warming](#method-link).
- **Warming from farming before 1850–1900 (about 0.10 °C) is part of the baseline**, not of agriculture's share. See [Causes of global warming](#method-link).
- **A removal never takes a species' emissions below zero. The exception is net CO₂, which the scenarios' carbon removal takes below zero.** See [Causes of global warming](#method-link).

## To review before public release

### Data licences that restrict reuse

- **PRIMAP-hist v2.8 is CC BY-NC-SA 4.0**: non-commercial and share-alike. Its world agricultural totals are in the published `climate.json`, and the attribution is computed from it.
- **Berkeley Earth is CC BY-NC 4.0**: non-commercial. Its observed series is in the published `climate.json`.
- **RCMIP v5.1.0 is CC BY-SA 4.0**: share-alike. The scenario emissions and temperatures derive from it.

The other sources are CC BY 4.0, public domain, the Open Government Licence, Apache 2.0 or MIT.

### Values recalled rather than checked against the source

- The feed split by species (11/16/28/28/17). GLEAM's grain intakes (Mottet et al., 2017, Table SI 2) and the feed industry's survey give about the same share to ruminants together and to pigs, but neither gives dairy 16% or poultry meat as little as 28%. See [Feed](#method-feed).
- The GLEAM-style concentrate intakes and rations, which no published table gives in this form, and aquafeed's 30/40/5/25 ration. See [Feed](#method-feed).
- Compound aquafeed in 2023 (69.4 Mt, Tacon et al., 2025), behind seafood's 5.5% of concentrate feed: the article could not be read. See [Fish and seafood](#method-seafood).
- The 85% of a dairy herd's emissions given to milk. The International Dairy Federation's 2022 standard gives the allocation formula and an 85.1% worked example for one farm, but no global default; its 2015 bulletin could not be read. See [Emissions](#method-emissions).
- The grain per tonne of fermented (0.25 t) and alcoholic (1.1 t) beverages, which FAO's technical conversion factors do not give. See [Emissions](#method-emissions).
- The legume mix (60% pulses, 20% soybeans, 20% cereals). See [The shift](#method-shift).
- The plant-milk mix (50% soybeans, 50% oats). See [The shift](#method-shift).
- Each practice's applicable share by country, a judgement no source gives. See [Farm practices](#method-practices).
- Cover crops' quarter of cropland and their rate's independence from climate, and enhanced weathering's ratios between climate zones (1.5 in the moist tropics, 0.4–0.5 in dry croplands): the meta-analysis could be read only in its abstract, and the weathering studies give no such ratio. See [Carbon in farmland](#method-removals).
- Shipping's 0.85 Gt, read only where others quote the IEA, and the road split of 60% passengers and 40% freight, which the IEA's shares bound (over 60% for cars and vans, about a third for trucks) without giving vans'. See [Energy and transport](#method-sectors).
- An electric car's 0.15–0.22 kWh/km. See [Energy and transport](#method-sectors).
- Steel's and cement's cuts at full adoption (90%, 80%) and cement's electricity per kg avoided, and buildings' 3.0 Gt of direct CO₂, read only in a search summary of the IEA's page. See [Buildings and industry](#method-industry).
- Chemicals' median and low cuts (80%, 60%), a judgement, and their capture route's 0.1 kWh/kg, taken from cement kilns. See [Buildings and industry](#method-industry).

### HESTIA has no animal products yet

HESTIA has not released aggregations of animal products: they are under development, and the unvalidated ones in its index are not used. The intensities of beef, mutton and goat, pig meat, poultry, milk and eggs therefore come from FAOSTAT (tier 3) and Poore & Nemecek (2018) (tier 4), not from HESTIA. See [HESTIA](#method-hestia) and [Published LCA data](#method-literature).
