# Fish and seafood

Fish and other aquatic animals are a sixth animal group, `seafood`. A diet shift can move them to plant foods like meat, milk and eggs. Fish come from two very different systems, wild capture and aquaculture, in different shares in every country and for every kind of fish, so Planetshift blends the two by each country's own production. The code is `pipeline/planetshift_pipeline/seafood.py` and `pipeline/planetshift_pipeline/sources/fishstat.py`; the tables are `pipeline/seafood_isscaap.csv` and `pipeline/seafood_factors.csv`.

## Items

The Food Balance Sheets list eight aquatic animal items, now all in the group `seafood`:

| FBS item | What it holds | World production, 2021–2023 (Mt a year): capture / aquaculture |
| --- | --- | --- |
| 2761 Freshwater Fish | carps, tilapias, catfishes, salmons, trouts and other freshwater and diadromous fish | 12.4 / 57.9 |
| 2762 Demersal Fish | cods, hakes, flatfish, coastal fish | 19.6 / 2.4 |
| 2763 Pelagic Fish | herrings, sardines, anchovies, tunas, mackerels | 36.8 / 0.5 |
| 2764 Marine Fish, Other | sharks, rays, marine fish not identified | 9.1 / 0.9 |
| 2765 Crustaceans | shrimps, prawns, crabs, lobsters, krill | 6.1 / 12.8 |
| 2766 Cephalopods | squids, cuttlefishes, octopuses | 4.0 / 0.0 |
| 2767 Molluscs, Other | oysters, mussels, clams, scallops | 2.3 / 18.9 |
| 2769 Aquatic Animals, Others | sea cucumbers, sea urchins, frogs, turtles | 0.4 / 1.3 |

Their supply rows, kcal and protein per tonne come from the balance sheets as for every other item. FAO keeps the fish items in live weight equivalent (whole fish as caught, molluscs with their shell), which is also the unit of FishStat, of Parker et al. and of MacLeod et al., so no conversion is needed; it is why molluscs carry only 0.036 t of protein per tonne.

Left out, each with its reason in `groups.csv`:

- **Aquatic plants (2775)**: seaweeds, about 36 Mt a year, of which a third goes to gums (agar, carrageenan, alginate) and other non-food uses. They bring almost no energy or protein to the diet (0.2 g of protein a person a day), are not an animal food that a shift would replace, and none of the sources used here gives their emissions, which come only from the boats and lines that farm them. Putting them in `otherPlant` would have given them that group's median emissions and cropland, which they do not have.
- **Aquatic mammals (2768)**: whales and seals, with no supply in the base year.
- **Fish body oil and fish liver oil (2781, 2782)**: made from fish reduced to meal, whose catch is already in the fish items; the oils are mostly fed to farmed fish, and their food use is under 0.1 Mt.

## Capture and aquaculture in each country

FAO FishStat (global production, release 2025.1.0) gives each country's production by species and by source: capture, or aquaculture in fresh, brackish or marine water. Each species belongs to an ISSCAAP group, and `seafood_isscaap.csv` puts each group in an FBS item, a group of Parker et al. for capture and a group of MacLeod et al. for aquaculture. For each country and item, Planetshift sums the three years up to the base year (2021–2023) and weights the factors of the groups by the tonnes of each. A country's intensity of crustaceans, for example, is that of its own mix of farmed shrimp and trawled prawns, crabs and lobsters.

FishStat is published under CC BY 4.0 (FAO's statistical database terms of use). The pipeline downloads it into its cache and writes only derived intensities and aquaculture tonnages into the app's files, not FishStat's own records.

## Intensities

FAOSTAT's emissions domains do not cover fisheries or aquaculture, so there is no tier 3, and HESTIA's current release has no aquatic aggregations, so there are no tiers 1 and 2. A seafood item's intensity is set at tier 4 from the literature, blended by the country's own production as above. A country whose balance has an item that FishStat does not list for it gets the first proxy of `proxies.csv` (another fish, or another shellfish, at tier 5), and failing that the group's production-weighted world median (tier 6). In the base year, 1,018 of the 1,504 cells of seafood are tier 4, 208 tier 5 and 278 tier 6; the tier-6 cells are almost all landlocked countries that import all their fish.

**Wild capture** burns fuel at sea. Parker et al. (2018) give the fuel used per tonne landed for each group of species in 2011 (Table 1), from 42 litres for small pelagic fish to 1,739 litres for crustaceans; their Methods count 2.8 kg CO₂e for each litre burnt and 0.5 kg for its extraction, refining and delivery. Planetshift uses these as CO₂. Parker et al. also add 1.1 kg CO₂e per litre for vessels, gear and lost refrigerant; Planetshift leaves this out, as it leaves out the making of tractors and farm buildings, and refrigerants are not one of its three gases. Inland fisheries are outside Parker et al.'s data; they are mostly small boats, many without engines, and are given the lowest marine intensity, that of small pelagic fish.

| Capture group | Litres per tonne landed | kg CO₂ per tonne, cradle to farm gate |
| --- | --- | --- |
| Pelagic fish under 30 cm (herrings, sardines, anchovies) | 42 | 139 |
| Pelagic fish over 30 cm (tunas, mackerels, jacks, sharks) | 430 | 1,419 |
| Demersal molluscs | 523 | 1,726 |
| Demersal fish | 539 | 1,779 |
| Cephalopods | 613 | 2,023 |
| Crustaceans | 1,739 | 5,739 |
| All fisheries (fish not identified, freshwater species caught at sea) | 489 | 1,614 |
| Inland fisheries (assumption) | 42 | 139 |

**Aquaculture** has no enteric methane. MacLeod et al. (2020) count, besides feed, the nitrous oxide given off by the water of the farm, 1.69 g of N₂O-N per kg of live weight produced (2.66 kg of N₂O per tonne), and the energy used on the farm for pumping, aeration, lighting and vehicles (their Supplementary Table D, by species group, in electricity, diesel and petrol). Diesel and petrol burn 0.074 and 0.070 kg CO₂ per MJ (their Table E); electricity is taken at the world's average of 480 g CO₂ per kWh in 2023 (Ember). Pond fertiliser, which they include and which is small, is left out.

| Aquaculture group | Energy on the farm (MJ per tonne): electricity / diesel / petrol | kg CO₂ per tonne, cradle to farm gate | kg N₂O per tonne |
| --- | --- | --- | --- |
| Bivalves (and other unfed invertebrates) | 1,067 / 1,790 / 0 | 275 | 2.66 |
| Cyprinids | 258 / 424 / 119 | 74 | 2.66 |
| Tilapias, and freshwater fish in general | 2,653 / 586 / 207 | 412 | 2.66 |
| Salmonids, and marine fish | 0 / 551 / 617 | 84 | 2.66 |
| Shrimps and prawns (all crustaceans) | 14,068 / 4,511 / 2 | 2,210 | 2.66 |

**Scopes.** As for crops and livestock, the farm gate counts what the farm's biology emits and cradle to farm gate adds the energy. Aquatic N₂O is in both; fuel and electricity are in cradle to farm gate only. Wild fish therefore have nothing at the farm gate: their emissions are almost all fuel, which appears only when the reader chooses cradle to farm gate under Options. This is the same rule that keeps tractors' diesel out of the farm-gate intensity of wheat, but its effect is larger here, so the interface says so: in the hint of *Emissions counted* under Options and in the summary's note on what is counted.

Weighted by world production in 2021–2023, the intensities come to (kg CO₂e per tonne, cradle to farm gate, AR6 factors): freshwater fish 817 (18% caught), demersal fish 1,666 (89% caught), pelagic fish 807 (99% caught), other marine fish 1,527, crustaceans 3,729 (32% caught), cephalopods 2,023 (all caught), other molluscs 1,065 (11% caught), other aquatic animals 1,225. At the farm gate, only the farmed share's N₂O remains: 597 for freshwater fish, 646 for molluscs, 492 for crustaceans, 0 to 80 for the mostly wild items.

## Feed

Aquaculture feed follows the livestock rule: a farmed fish's intensity leaves out the growing of its feed, which is counted on the crops and fish it eats. The Food Balance Sheets' feed use of maize, soybeans, wheat and the other feed items already includes what goes into aquafeed, so `feed.json` now gives seafood a share of it. Seafood's production in the feed split is each country's aquaculture of fed species (FishStat, fish and crustaceans; bivalves and other filter feeders are not fed), 75 Mt a year in 2021–2023, not the balance sheets' production, most of which is wild or unfed.

- **By species**: seafood takes 5.5% of the world's concentrate feed, the other groups keeping their published proportions scaled to the remaining 94.5% (`feed_species.csv`). Compound aquafeed was 69.4 Mt in 2023 (Tacon et al., 2025), against some 1.2 to 1.3 Gt of compound feed for all animals. The share was 4% until November 2026, from about 50 Mt of aquafeed in 2017 (Tacon, 2020), which is dated against the 2023 base year.
- **GLEAM-style**: farmed fish eat 1.6 t of feed per tonne in high-income countries (salmon and trout, fed on pellets) and 0.87 t elsewhere (carps and tilapias, partly fed on the pond's own food), which gives about 69 Mt of aquafeed for the world, the 2023 total. Their ration is 30% grain, 40% oilseeds, 5% pulses and 25% fish, in the live-weight tonnes the balance sheets use for fish (`feed_gleam_intake.csv`, `feed_gleam_rations.csv`).

**Fish fed to animals.** The balance sheets record the fish reduced to meal and oil as feed use of the fish items (24 Mt of fish in 2023, 20 Mt of it pelagic), so the fish items are feed items too. Their feed use goes about 70% to aquaculture, 23% to pigs and 7% to poultry: a split of its own (`fishmeal` in `feed_species.csv`) in the species method, and a `fish` class of the rations (0.25 of the aquafeed ration, 0.01 of pigs', 0.003 of poultry's) in the GLEAM-style method, which gives 74%, 20% and 6%. When less farmed fish is eaten, less fish is caught for its feed, and the emissions of that catch fall with it. The fish oils themselves are left out (see Items).

**What changed for the other groups.** For every feed item that existed before, in every region and both methods, the five livestock groups keep the same proportions to each other: their shares are the old ones times one minus seafood's share. `tests/test_seafood_built.py` checks this against the last data without seafood, to within the rounding of the shares (largest difference 0.0003). World seafood shares are 5.5% of every crop in the species method, and in the GLEAM-style one 2.6% of grain and rice, 5.9% of pulses and 9.1% of soybeans.

## Breakdown and land

In `breakdown.json`, seafood's CO₂ is all `energy` (fishing fuel, the farm's fuel and electricity) and its N₂O all `other` (the water of fish farms, which no other source names). Nothing is `inputsManufacture`, as vessels, gear and pond fertiliser are left out. The farm-energy practice therefore acts on seafood in cradle to farm gate, as it does on other farms' energy.

Seafood has no pasture and no cropland of its own: the cropland of its feed is the crops' and comes through the feed shares, as for pigs and poultry. `land.py` counts cropland only for plant items and pasture only for ruminants, so seafood is in neither, and `land.json` is unchanged.

## Validation

| Check | Planetshift | Published |
| --- | --- | --- |
| World food supply of fish and seafood, base year 2023 | 20.1 kg a person a year | 20.7 kg in 2022 (FAO, SOFIA 2024) |
| Seafood's share of animal protein | 14.2% | about 15% (FAO, SOFIA 2024; 17% in older editions, which counted differently) |
| Seafood's share of all protein | 6.0% | about 6% (FAO, SOFIA 2024) |
| World capture production, FishStat 2023 | 90 Mt | about 91 Mt in 2022, aquatic animals (SOFIA 2024) |
| Fuel burnt by fisheries | 39 billion litres (2023 catches) | 40 billion litres in 2011 (Parker et al.) |
| Capture emissions, cradle to farm gate | 130 Mt CO₂ | 132 Mt CO₂e from fuel and 179 Mt CO₂e in all in 2011 (Parker et al.) |
| Aquaculture emissions without feed | 120 Mt CO₂e for 98 Mt (1.22 t per tonne) | 43% of 263 Mt CO₂e for about 80 Mt in 2017 (1.40 t per tonne; MacLeod et al.) |
| Aquaculture emissions with feed | feed counted on the crops and fish | 263 Mt CO₂e in 2017, 57% of it feed (MacLeod et al.) |
| Compound aquafeed | about 69 Mt (GLEAM-style intake) | 69.4 Mt in 2023 (Tacon et al., 2025); about 50 Mt in 2017 (Tacon, 2020) |

All seafood items together, weighted by the balance sheets' production, give 66 Mt CO₂e a year at the farm gate and 236 Mt CO₂e cradle to farm gate. The capture total is within a few percent of Parker et al.'s fuel emissions because world catches have hardly changed since 2011. Aquaculture comes out lower per tonne than MacLeod et al.'s non-feed share because N₂O is weighed with AR6's 273 instead of 298 and pond fertiliser is left out. The intensities of every other item, the supply, items and breakdown of every other item, and `land.json` are the same as before seafood was added (`tests/test_seafood_built.py`).

## In the app

Fish and seafood shift like the other animal foods: the main slider moves them, and *Fish and seafood* under "Shift each animal food" sets their own share (`sea` in the address). The protein or calories they bring are replaced by plants, as for meat. Because wild fish are low in emissions at the farm gate (none) and moderate with inputs, replacing them with plant foods can avoid little warming, or add a little: the plants that replace them have emissions of their own.

The fish items are also feed items. When the animals they feed (farmed fish, pigs, poultry) produce less, the fish fed to them fall by the same share of their feed use, and this change is placed like a change in demand for fish, on top of the change in what people eat. It is done once and does not loop: the fish caught for meal are wild and eat no feed themselves, so less of them changes no feed (`run.ts`, `productionChanges`; the same step applies to milk fed to calves). Aquaculture's share of the feed crops falls with the whole group's production, wild included, as no split of the group's production by system is kept in the app.

## Does eating less fish let the ocean store more carbon?

Two pathways are sometimes put forward; neither is in Planetshift's numbers.

**Fish carbon.** A large fish that dies at sea sinks, and the carbon in its body reaches the deep ocean, where it stays for centuries; a fish that is caught releases its carbon within days. Mariani et al. (2020) estimate that fisheries removed 318 Mt of tunas, mackerels, billfishes and sharks between 1950 and 2014, holding 37.5 Mt of carbon, of which 21.8 Mt would have sunk below the depths that keep it, after accounting for predation. With the fuel burnt to catch them, this makes their headline 0.73 Gt CO₂ since 1950, but the fuel is most of it: the carbon that did not sink is about 80 Mt CO₂ over 65 years, roughly 1 Mt a year, under 1% of the fuel emissions of the world's fisheries. Whales do the same at a larger scale per animal, and fertilise the surface with their faeces (the "whale pump"); aquatic mammals are not eaten in any quantity and are out of the model.

**Bottom trawling.** Trawls dragged over the sea floor stir up its sediments, and part of their carbon may be oxidised to CO₂. Sala et al. (2021) estimated 0.6 to 1.5 Gt CO₂ a year dissolved in the water, as much as all the world's farm emissions of CO₂; Hiddink et al. (2023) answered that the rates of remineralisation used were far too high and that the true figure could be an order of magnitude smaller, and how much of the dissolved CO₂ reaches the air, and how fast, is still debated. There is no agreed figure per tonne of fish.

**Why they are left out.** The fish-carbon pathway is small, and the bottom-trawling one contested; both depend on where and how a fish is caught far more than on how much of it is eaten. A per-tonne factor follows from Mariani et al. for a later lever: 21.8 Mt of carbon over 318 Mt of fish is about 0.25 t CO₂ per tonne of tuna, billfish, mackerel or shark caught in deep water, about a sixth more than the fuel burnt to catch it (1.42 t CO₂ per tonne). It would act on part of the pelagic and other marine fish items only, and would count as carbon not stored rather than as an emission, like the regrowth of freed farmland. It is not implemented.

## Assumptions

- Fish and seafood items are in live weight, as FAO keeps them in the balance sheets and FishStat; molluscs include their shell.
- Each country's mix of capture and aquaculture, and of species groups, is the average of FishStat's three years up to the base year.
- Fuel per tonne by species group is Parker et al.'s for 2011, the same in every country; national fleets differ (they show 1.6 t CO₂e per tonne for the United States against 5.2 for Australia, whose fleets target rock lobsters and prawns), and that variation is lost.
- Inland fisheries burn as little fuel per tonne as small pelagic fisheries.
- Freshwater species caught at sea, unidentified marine fish and miscellaneous aquatic invertebrates take the average of all fisheries or of demersal molluscs; mackerels and jacks count with tunas as pelagic fish over 30 cm, and sharks with them; krill with crustaceans.
- Farmed crustaceans are all shrimp-like in their energy use, farmed molluscs and other unfed invertebrates all bivalve-like, farmed marine fish salmon-like, and farmed frogs and turtles like freshwater fish.
- The N₂O factor of fish-farm water applies to every farmed species, bivalves included, as in MacLeod et al.; it is uncertain, and they ask for it to be treated with caution. Methane from ponds, which some studies find large, is not counted, as MacLeod et al. do not count it.
- Electricity on fish farms emits the world's average per kWh, in every country.
- Vessels, gear, refrigerants, pond fertiliser and the building of farms are left out, as are post-landing processing, transport and cold chains.
- Wild capture has no farm-gate emissions; its fuel counts in cradle to farm gate.
- Aquafeed is 5.5% of the world's concentrate feed; fish fed to animals go 70% to aquaculture, 23% to pigs and 7% to poultry. The shares and the GLEAM-style intakes and ration are rounded values, chosen to match the published aquafeed total.
- Fish oils and aquatic plants are left out; the fish reduced to meal and oil are in the fish items.
- The ocean's carbon pathways (fish carcasses, sediments) are not counted.

## Sources

- FAO FishStat, Global production by production source 1950–2023, release 2025.1.0: <https://www.fao.org/fishery/en/collection/global_production>, CC BY 4.0.
- FAOSTAT, Food Balances (2010–): <https://www.fao.org/faostat/en/#data/FBS>, CC BY 4.0.
- Parker, R. W. R., Blanchard, J. L., Gardner, C., Green, B. S., Hartmann, K., Tyedmers, P. H. and Watson, R. A. (2018). Fuel use and greenhouse gas emissions of world fisheries. Nature Climate Change 8, 333–337. <https://doi.org/10.1038/s41558-018-0117-x>
- MacLeod, M. J., Hasan, M. R., Robb, D. H. F. and Mamun-Ur-Rashid, M. (2020). Quantifying greenhouse gas emissions from global aquaculture. Scientific Reports 10, 11679. <https://doi.org/10.1038/s41598-020-68231-8>, CC BY 4.0.
- Ember (2024). Global Electricity Review 2024: <https://ember-energy.org/latest-insights/global-electricity-review-2024/>.
- Tacon, A. G. J. et al. (2025), compound aquafeed production in 2023 (69.4 Mt): <https://doi.org/10.1080/23308249.2025.2568830>
- Tacon, A. G. J. (2020). Trends in global aquaculture and aquafeed production: 2000–2017. Reviews in Fisheries Science & Aquaculture 28, 43–56. <https://doi.org/10.1080/23308249.2019.1649634>
- Naylor, R. L. et al. (2021). A 20-year retrospective review of global aquaculture. Nature 591, 551–563. <https://doi.org/10.1038/s41586-021-03308-6>
- FAO (2024). The State of World Fisheries and Aquaculture 2024. <https://doi.org/10.4060/cd0683en>
- Mariani, G. et al. (2020). Let more big fish sink: fisheries prevent blue carbon sequestration—half in unprofitable areas. Science Advances 6, eabb4848. <https://doi.org/10.1126/sciadv.abb4848>
- Sala, E. et al. (2021). Protecting the global ocean for biodiversity, food and climate. Nature 592, 397–402. <https://doi.org/10.1038/s41586-021-03371-z>
- Hiddink, J. G. et al. (2023). Quantifying the carbon benefits of ending bottom trawling. Nature 617, E1–E2. <https://doi.org/10.1038/s41586-023-06014-7>
