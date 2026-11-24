# Fish and seafood

Fish and other aquatic animals are the sixth animal food group in Planetshift, `seafood`. Like meat, milk and eggs, a diet shift can replace them with plant foods. Replacing wild fish with plants avoids little warming, and can even add a little. Wild fish emit almost nothing but the fuel their boats burn, and the plants that replace them have emissions of their own.

## What fish and seafood emit

Fish come from two very different systems: wild capture and aquaculture (fish farming). Their shares differ in every country and for every kind of fish, so Planetshift blends the two by each country's own production.

- **Wild fish** emit almost only the fuel their boats burn. Planetshift counts that fuel as CO₂.
- **Farmed fish** have no methane from digestion, unlike cattle. Their farms give off nitrous oxide (N₂O) from the water, and use fuel and electricity for pumping, aeration, lighting and vehicles.
- **Feed** for farmed fish is counted on the crops and the fish they eat, as for pigs and poultry (see [Feed](#method-feed)).

Planetshift counts emissions in one of two scopes, chosen under *Other options* (see [Emissions](#method-emissions)):

- **Farm gate** counts what the farm's biology emits. For seafood this is only the N₂O of fish farms.
- **Cradle to farm gate** adds the energy used: the fuel of fishing boats and the fuel and electricity of fish farms.

Wild fish therefore have no emissions at the farm gate. Their fuel appears only in the cradle-to-farm-gate scope (*With inputs*), the default; *Biological processes only* under *Other options* leaves it out. The same rule keeps tractors' diesel out of the farm-gate emissions of wheat, but its effect is larger for fish. The hint of *Emissions counted* under *Other options* says so, and so does the summary's note on what is counted.

All seafood items together emit 66 Mt (million tonnes) CO₂e a year at the farm gate and 235 Mt CO₂e cradle to farm gate, weighted by the Food Balance Sheets' production. CO₂e (CO₂-equivalent) adds the gases into one figure with their 100-year weights (see [From emissions to temperature](#method-climate)).

### In the app

A diet shift changes fish and seafood in the same way as the other animal foods. The main slider moves them, and *Fish and seafood* under "Shift each animal food" sets their own share (`sea` in the address). The protein or calories they bring are replaced by plants, as for meat.

Wild fish have no emissions at the farm gate, and moderate ones when inputs are counted. Replacing them with plant foods can therefore avoid little warming, or add a little, because the plants that replace them have emissions of their own.

Large fish left uncaught also sink carbon to the deep ocean when they die. *Uncaught large fish* under *Other options* counts it, off by default. It is under 1% of seafood's emissions (see *Uncaught large fish: an option, off by default* below).

The fish items are also feed items, because some fish are caught to make fish meal for animals. When the animals they feed (farmed fish, pigs, poultry) produce less, the fish fed to them fall by the same share of their feed use. The model treats this change as a change in demand for fish, on top of the change in what people eat. It is done once and does not loop. The fish caught for meal are wild and eat no feed themselves, so catching fewer of them changes no feed use (`run.ts`, `productionChanges`; the same step applies to milk fed to calves). Aquaculture's share of the feed crops falls with the whole group's production, wild fish included, because the app does not split the group's production by system.

## Items

The Food Balance Sheets (FAOSTAT's table of what each country produces, trades and eats; see [Data](#method-data)) list eight aquatic animal items. All are in the group `seafood`:

| FBS item | What it holds | World production, 2021–2023 (Mt a year): capture / aquaculture |
| --- | --- | --- |
| 2761 Freshwater Fish | carps, tilapias, catfishes, salmons, trouts and other freshwater and diadromous fish | 12.4 / 57.9 |
| 2762 Demersal Fish | cods, hakes, flatfish, coastal fish, sharks and rays | 20.2 / 2.4 |
| 2763 Pelagic Fish | herrings, sardines, anchovies, tunas, mackerels | 36.8 / 0.5 |
| 2764 Marine Fish, Other | marine fish not identified | 8.5 / 0.9 |
| 2765 Crustaceans | shrimps, prawns, crabs, lobsters, krill | 6.1 / 12.8 |
| 2766 Cephalopods | squids, cuttlefishes, octopuses | 4.0 / 0.0 |
| 2767 Molluscs, Other | oysters, mussels, clams, scallops | 2.3 / 18.9 |
| 2769 Aquatic Animals, Others | sea cucumbers, sea urchins, frogs, turtles | 0.4 / 1.3 |

Their supply rows, kcal and protein per tonne come from the balance sheets, as for every other item. FAO keeps the fish items in live weight equivalent: whole fish as caught, and molluscs with their shell. This is also the unit of FishStat, of Parker et al. and of MacLeod et al., so no conversion is needed. It is why molluscs carry only 0.036 t of protein per tonne.

Three kinds of item are left out, each with its reason in `groups.csv`:

- **Aquatic plants (2775)**: seaweeds, about 36 Mt a year, of which a third goes to gums (agar, carrageenan, alginate) and other non-food uses. They bring almost no energy or protein to the diet (0.2 g of protein a person a day). They are not an animal food that a shift would replace. None of the sources used here gives their emissions, which come only from the boats and lines that farm them. Putting them in `otherPlant` would have given them that group's median emissions and cropland, which they do not have.
- **Aquatic mammals (2768)**: whales and seals, with no supply in the base year.
- **Fish body oil and fish liver oil (2781, 2782)**: made from fish reduced to meal, whose catch is already in the fish items. The oils are mostly fed to farmed fish, and their food use is under 0.1 Mt.

## Capture and aquaculture in each country

FAO FishStat (global production, release 2025.1.0) gives each country's production by species and by source: capture, or aquaculture in fresh, brackish or marine water. Each species belongs to an ISSCAAP group (FAO's classification of aquatic species). `seafood_isscaap.csv` puts each group in an FBS item, in a group of Parker et al. for capture, and in a group of MacLeod et al. for aquaculture.

For each country and item, Planetshift sums the three years up to the base year (2021–2023). It then weights the emission factors of the groups by the tonnes of each. A country's emissions per tonne of crustaceans, for example, are those of its own mix of farmed shrimp and trawled prawns, crabs and lobsters.

FishStat is published under CC BY 4.0 (FAO's statistical database terms of use). The pipeline downloads it into its cache. It writes only derived intensities and aquaculture tonnages into the app's files, not FishStat's own records.

## Intensities

An intensity is the emissions of producing one tonne of a food. Planetshift takes each intensity from the best source available, ranked in tiers from tier 1 (HESTIA's data for the product in that country) to tier 6 (the food group's median over all countries); see [Emissions](#method-emissions).

FAOSTAT's emissions domains do not cover fisheries or aquaculture, so there is no tier 3. HESTIA's current release has no aquatic aggregations, so there are no tiers 1 and 2. A seafood item's intensity is therefore set at tier 4, from the literature, and blended by the country's own production as above. A country whose balance has an item that FishStat does not list for it gets the first proxy of `proxies.csv` (another fish, or another shellfish, at tier 5). Otherwise, it gets the group's production-weighted world median (tier 6). In the base year, 1,014 of the 1,496 cells of seafood are tier 4, 210 tier 5 and 272 tier 6. The tier-6 cells are almost all landlocked countries that import all their fish.

### Wild capture

Wild capture burns fuel at sea. Parker et al. (2018) give the fuel used per tonne landed for each group of species in 2011 (Table 1), from 42 litres for small pelagic fish to 1,739 litres for crustaceans. Their Methods count 2.8 kg CO₂e for each litre burnt and 0.5 kg for its extraction, refining and delivery. Planetshift uses these as CO₂.

**A worked example.** Small pelagic fish such as sardines need 42 litres of fuel per tonne landed. Each litre counts 2.8 + 0.5 = 3.3 kg of CO₂, so a tonne of sardines carries 42 × 3.3 = 139 kg of CO₂. A tonne of crustaceans, at 1,739 litres, carries 5,739 kg.

Parker et al. also add 1.1 kg CO₂e per litre for vessels, gear and lost refrigerant. Planetshift leaves this out, as it leaves out the making of tractors and farm buildings. Refrigerants are not one of its three gases. Inland fisheries are outside Parker et al.'s data, and FAO finds too few data to estimate their energy use (FAO, 2025, section 2.3). Three quarters of their fishing uses no boat or one without an engine, and most of the rest outboard motors under 25 hp. Planetshift gives them the lowest marine intensity, that of small pelagic fish.

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

### Aquaculture

Aquaculture has no enteric methane (the methane animals such as cattle produce while digesting). Besides feed, MacLeod et al. (2020) count two sources:

- the nitrous oxide given off by the water of the farm: 1.69 g of N₂O-N per kg of live weight produced, which is 2.66 kg of N₂O per tonne;
- the energy used on the farm for pumping, aeration, lighting and vehicles (their Supplementary Table D, by species group, in electricity, diesel and petrol).

Diesel and petrol burn 0.074 and 0.070 kg CO₂ per MJ (their Table E). Electricity is taken at the world's average of 480 g CO₂ per kWh in 2023 (Ember). Pond fertiliser, which they include and which is small, is left out.

| Aquaculture group | Energy on the farm (MJ per tonne): electricity / diesel / petrol | kg CO₂ per tonne, cradle to farm gate | kg N₂O per tonne |
| --- | --- | --- | --- |
| Bivalves (and other unfed invertebrates) | 1,067 / 1,790 / 0 | 275 | 2.66 |
| Cyprinids | 258 / 424 / 119 | 74 | 2.66 |
| Tilapias, and freshwater fish in general | 2,653 / 586 / 207 | 412 | 2.66 |
| Salmonids, and marine fish | 0 / 551 / 617 | 84 | 2.66 |
| Shrimps and prawns (all crustaceans) | 14,068 / 4,511 / 2 | 2,210 | 2.66 |

### Scopes

As for crops and livestock, the farm gate counts what the farm's biology emits, and cradle to farm gate adds the energy. Aquatic N₂O is in both. Fuel and electricity are in cradle to farm gate only. This is why wild fish have nothing at the farm gate, as explained at the top of this page.

### The intensities by item

Weighted by world production in 2021–2023, the intensities come to the following, in kg CO₂e per tonne, cradle to farm gate, with the AR6 factors (the IPCC Sixth Assessment Report's 100-year weights):

| Item | kg CO₂e per tonne | Share caught wild |
| --- | --- | --- |
| Freshwater fish | 817 | 18% |
| Demersal fish | 1,666 | 89% |
| Pelagic fish | 807 | 99% |
| Other marine fish | 1,527 | |
| Crustaceans | 3,729 | 32% |
| Cephalopods | 2,023 | all |
| Other molluscs | 1,065 | 11% |
| Other aquatic animals | 1,225 | |

At the farm gate, only the farmed share's N₂O remains: 597 for freshwater fish, 646 for molluscs, 492 for crustaceans, and 0 to 80 for the mostly wild items.

## Feed

Aquaculture feed follows the livestock rule. A farmed fish's intensity leaves out the growing of its feed, which is counted on the crops and fish it eats. The Food Balance Sheets' feed use of maize, soybeans, wheat and the other feed items already includes what goes into aquafeed, so `feed.json` gives seafood a share of it.

Seafood's production in the feed split is each country's aquaculture of fed species (FishStat, fish and crustaceans): 75 Mt a year in 2021–2023. Bivalves and other filter feeders are not fed. The balance sheets' production is not used here, because most of it is wild or unfed.

The two feed methods (see [Feed](#method-feed)) give seafood its share as follows:

- **By species**: seafood takes 5.5% of the world's concentrate feed. The other groups keep their published proportions, scaled to the remaining 94.5% (`feed_species.csv`). Compound aquafeed was 69.4 Mt in 2023 (Tacon et al., 2025), against some 1.2 to 1.3 Gt of compound feed for all animals.
- **GLEAM-style**: farmed fish eat 1.6 t of feed per tonne in high-income countries (salmon and trout, fed on pellets) and 0.87 t elsewhere (carps and tilapias, partly fed on the pond's own food). This gives about 69 Mt of aquafeed for the world, the 2023 total. Their ration is 30% grain, 40% oilseeds, 5% pulses and 25% fish, in the live-weight tonnes the balance sheets use for fish (`feed_gleam_intake.csv`, `feed_gleam_rations.csv`).

### Fish fed to animals

The balance sheets record the fish reduced to meal and oil as feed use of the fish items: 23 Mt of fish in 2024, 19 Mt of it pelagic. The fish items are therefore feed items too. Their feed use goes about 90% to aquaculture, 9% to pigs and 1% to poultry, the split of fishmeal in 2020 (FAO, SOFIA 2022, from IFFO: 86%, 9% and 1%, the other 4% mainly to pet food):

- in the species method, as a split of its own (`fishmeal` in `feed_species.csv`);
- in the GLEAM-style method, as a `fish` class of the rations (0.25 of the aquafeed ration, 0.01 of pigs', 0.003 of poultry's), which gives 74%, 20% and 6%.

When less farmed fish is eaten, less fish is caught for its feed, and the emissions of that catch fall with it. The fish oils themselves are left out (see Items).

### What changed for the other groups

For every feed item that existed before, in every region and both methods, the five livestock groups keep the same proportions to each other. Each of their shares is the old share × (1 − seafood's share). `tests/test_seafood_built.py` checks this against the last data without seafood, to within the rounding of the shares (largest difference 0.0003). World seafood shares are 5.5% of every crop in the species method. In the GLEAM-style one they are 2.6% of grain and rice, 5.8% of pulses and 9.0% of soybeans.

## Breakdown and land

In `breakdown.json`, seafood's CO₂ is `fuel` (fishing fuel, the farm's diesel and petrol) and `electricity` (the farm's electricity). The farmed share is split by each item's world production of the aquaculture groups. Its N₂O is all `other` (the water of fish farms, which no other source names). Nothing is `inputsManufacture`, as vessels, gear and pond fertiliser are left out. The farm-energy practice therefore acts on seafood's fuel in cradle to farm gate, as it does on other farms' fuel.

Seafood has no pasture and no cropland of its own. The cropland of its feed belongs to the crops and comes through the feed shares, as for pigs and poultry. `land.py` counts cropland only for plant items and pasture only for ruminants, so seafood is in neither, and `land.json` is unchanged.

## Validation

| Check | Planetshift | Published |
| --- | --- | --- |
| World food supply of fish and seafood, base year 2024 | 20.1 kg a person a year | 20.7 kg in 2022 (FAO, SOFIA 2024) |
| Seafood's share of animal protein | 14.1% | about 15% (FAO, SOFIA 2024; 17% in older editions, which counted differently) |
| Seafood's share of all protein | 6.0% | about 6% (FAO, SOFIA 2024) |
| World capture production, FishStat 2023 | 90 Mt | about 91 Mt in 2022, aquatic animals (SOFIA 2024) |
| Fuel burnt by fisheries | 39 billion litres (2023 catches) | 40 billion litres in 2011 (Parker et al.) |
| Capture emissions, cradle to farm gate | 130 Mt CO₂ | 132 Mt CO₂e from fuel and 179 Mt CO₂e in all in 2011 (Parker et al.) |
| Aquaculture emissions without feed | 120 Mt CO₂e for 98 Mt (1.22 t per tonne) | 43% of 263 Mt CO₂e for about 80 Mt in 2017 (1.40 t per tonne; MacLeod et al.) |
| Aquaculture emissions with feed | feed counted on the crops and fish | 263 Mt CO₂e in 2017, 57% of it feed (MacLeod et al.) |
| Compound aquafeed | about 69 Mt (GLEAM-style intake) | 69.4 Mt in 2023 (Tacon et al., 2025); about 50 Mt in 2017 (Tacon, 2020) |

All seafood items together, weighted by the balance sheets' production, give 66 Mt CO₂e a year at the farm gate and 235 Mt CO₂e cradle to farm gate. The capture total is within a few percent of Parker et al.'s fuel emissions, because world catches have hardly changed since 2011. Aquaculture comes out lower per tonne than MacLeod et al.'s non-feed share for two reasons: N₂O is weighed with AR6's 273 instead of 298, and pond fertiliser is left out. Adding seafood leaves the intensities, supply, items and breakdown of every other item, and `land.json`, unchanged (`tests/test_seafood_built.py`).

## Does eating less fish let the ocean store more carbon?

Two pathways are sometimes put forward. The first, fish carbon, can be counted with an option, off by default. The second is not in Planetshift's numbers.

**Fish carbon.** A large fish that dies at sea sinks, and the carbon in its body reaches the deep ocean, where it stays for centuries. A fish that is caught releases its carbon within days. Mariani et al. (2020) estimate that fisheries removed 318 Mt of tunas, mackerels, billfishes and sharks between 1950 and 2014. These fish held 39.9 Mt of carbon, at 12.5% of their weight; 37.5 Mt of it went back to the air once they were eaten, and the rest, in bones, ended in landfills. Of the 39.9 Mt, 21.8 Mt would have sunk below the depths that keep it, after accounting for predation. Adding the fuel burnt to catch them gives their headline figure of 0.73 Gt CO₂ since 1950. Most of that figure is fuel. The carbon that would have sunk, and did not, is about 80 Mt CO₂ over 65 years, roughly 1 Mt a year. That is under 1% of the fuel emissions of the world's fisheries. Whales do the same at a larger scale per animal, and fertilise the surface with their faeces (the "whale pump"). Aquatic mammals are not eaten in any quantity and are out of the model.

**Bottom trawling.** Trawls dragged over the sea floor stir up its sediments, and part of their carbon may be oxidised to CO₂. Sala et al. (2021) estimated 0.6 to 1.5 Gt CO₂ a year dissolved in the water, as much as all the world's farm emissions of CO₂. Hiddink et al. (2023) replied that the rates of remineralisation used were far too high, and that the true figure could be an order of magnitude smaller. How much of the dissolved CO₂ reaches the air, and how fast, is still debated. There is no agreed figure per tonne of fish.

**Why fish carbon is an option and bottom trawling is left out.** The fish-carbon pathway is small, and the bottom-trawling one is contested. Both depend far more on where and how a fish is caught than on how much of it is eaten. Mariani et al.'s figures give a per-tonne factor: 21.8 Mt of carbon over 318 Mt of fish is about 0.25 t CO₂ per tonne of tuna, billfish, mackerel or shark caught in deep water. That adds about a sixth to the fuel burnt to catch it (1.42 t CO₂ per tonne). It counts as carbon stored rather than as an emission avoided, like the regrowth of freed farmland. Bottom trawling has no such factor, so it is not counted.

### Uncaught large fish: an option, off by default

*Uncaught large fish* under *Other options* (`deadfall=on` in the address) counts the carbon that large fish sink to the deep ocean when they die uncaught. It is small: under 1% of seafood's emissions. With all fish and seafood shifted to plants, the storage reaches 1.6 Mt CO₂ a year once built up, against seafood's 235 Mt CO₂e a year cradle to farm gate (0.7%).

**What counts.** Only the three ISSCAAP groups of large pelagic fish (`pipeline/seafood_isscaap.csv`): tunas, bonitos and billfishes; miscellaneous pelagic fishes (mackerels and jacks); and sharks, rays and chimaeras. These are the fish Mariani et al. count: large (over 30 cm), dense, and likely to die of old age or disease rather than be eaten. Small pelagic fish, which mostly end as prey, and the other groups are left out, as are fish caught in inland waters. Their faeces and their daily migrations up and down the water column also carry carbon down (Saba et al., 2021; Bianchi et al., 2021; Pinti et al., 2023). These are natural fluxes, with no change per tonne of catch, and are not counted.

**Per tonne of catch avoided.** The CO₂ kept in the deep ocean is

> catch avoided × deep-water share × sinking fraction × 12.5% carbon × 44/12

The sinking fraction is the share of a fish's carbon that would sink and stay if it had not been caught, net of the fish that would have been eaten. Mariani et al. give it by taxon (`pipeline/seafood_deadfall.csv`):

| Taxon | Sinking fraction | Share of the carbon caught, 1950–2014 | Where it is given |
| --- | --- | --- | --- |
| Tunas | 60.5% | 56.2% | fig. S2, median about 0.6; 60.5% makes the four taxa add up to 21.8 of 39.9 Mt of carbon with Fig. 1B's shares |
| Billfishes | 89% | 1.9% | fig. S2, median, read from the chart |
| Mackerels | 28.8% | 31.2% | main text and fig. S2, the lowest of their range of 28.8–94.6% |
| Sharks | 94.6% | 10.5% | main text and fig. S2, the highest of their range |

Tunas and billfishes share an ISSCAAP group, so the group takes their fractions weighted by their shares of the carbon caught: 61.4%.

**The deep-water share is an assumption: 0.44.** Mariani et al. count only fish caught where the mean depth is over 200 m, outside the four eastern boundary upwelling systems (California, Humboldt, Canary and Benguela), where a carcass's carbon may come back up. They count 1.09 Mt of carbon of large fish caught there in 2014, which is 8.7 Mt of fish at 12.5% carbon. FishStat records 19.6 Mt of capture of the three groups that year. The ratio, 0.44, is applied to every country's catch of every group. It also covers what their species list leaves out, such as most jacks, and the difference between their reconstructed catches and FAO's. It is a single constant, `DEEP_WATER_SHARE` in `pipeline/planetshift_pipeline/deadfall.py`.

The CO₂ kept per tonne of catch avoided is then:

| ISSCAAP group | Sinking fraction | t CO₂ per tonne caught in deep water | t CO₂ per tonne of catch (× 0.44) |
| --- | --- | --- | --- |
| Tunas, bonitos, billfishes | 61.4% | 0.28 | 0.12 |
| Miscellaneous pelagic fishes | 28.8% | 0.13 | 0.058 |
| Sharks, rays, chimaeras | 94.6% | 0.43 | 0.19 |

The world's 19.8 Mt a year of large pelagic catch at sea (FishStat 2021–2023) would keep 1.77 Mt CO₂ a year: 0.089 t CO₂ per tonne of catch, or 0.20 t per tonne caught in deep water. That is below Mariani et al.'s 0.25 t, because their catch is mostly tunas, while FishStat's miscellaneous pelagic fishes are as large a catch and sink the least.

**Per country.** The model changes the production of Food Balance Sheet items, not of species. For each country and item, `deadfall.json` gives the CO₂ kept per tonne less of the item, in kg. It is the large pelagic catch at sea that the country lands, times its factor, divided by the item's whole FishStat production (capture and aquaculture, over the three years up to the base year). A cut in the item is shared among its species in proportion to their production. Tunas, mackerels and jacks are in 2763 Pelagic Fish, and sharks in 2762 Demersal Fish. France, for example, keeps 82 kg CO₂ per tonne less of Pelagic Fish and 18 kg per tonne less of Demersal Fish; Japan 38 and 7.5; Peru, whose pelagic catch is mostly anchoveta, 8.4 and 31.

**How the storage builds up.** A stock that is fished less takes years to rebuild, and only then do more of its fish die of old age and sink. Planetshift takes a first-order recovery with a time constant of 10 years (`buildUpYears` in `deadfall.json`): a fall in catch in one year stores 1 − e^(−t/10) of its full amount t years later, 63% after 10 years and 95% after 30. With the ramp, each year's further fall in catch builds up in the same way. Storing it in full from the year catch falls would overstate the early years. The time constant is an assumption, not a measured rate.

**Counted as permanent.** Mariani et al. give decades to hundreds of years for carbon that deep-sea scavengers return to the deep water, and millions of years for carcasses buried in the sediment. Planetshift counts it as stored for good. Up to 2100, the end of its horizon, that makes no difference. It enters the model as negative CO₂, each year, in farming, with the rest of seafood. It is credited to the lever group whose change in production changes the catch: the diet, through fish and seafood, and less waste. It has no group of its own in the breakdown. A step that catches more large fish is charged the carbon they no longer sink, as land newly farmed is charged its forgone regrowth.

**What it changes.** With fish and seafood fully shifted to plants (`sea=100`, the ramp ending in 2035), the storage is 0.49 Mt CO₂ a year in 2035, still building up, and 1.6 Mt once built up. The warming avoided grows by about 0.000006 °C in 2050 and 0.00003 °C in 2100. With the whole diet shifted, it grows by about the same: 1.7 Mt a year once built up, 0.00004 °C in 2100.

## Data and code

The code is `pipeline/planetshift_pipeline/seafood.py` and `pipeline/planetshift_pipeline/sources/fishstat.py`. The tables are `pipeline/seafood_isscaap.csv` and `pipeline/seafood_factors.csv`. The carbon of uncaught large fish is `pipeline/planetshift_pipeline/deadfall.py`, with the sinking fractions in `pipeline/seafood_deadfall.csv`; it writes `deadfall.json`, which the app's `deadfall` module reads (`app/src/levers/deadfall/`).

## Assumptions

- Fish and seafood items are in live weight, as FAO keeps them in the balance sheets and FishStat; molluscs include their shell.
- Each country's mix of capture and aquaculture, and of species groups, is the average of FishStat's three years up to the base year.
- Fuel per tonne by species group is Parker et al.'s for 2011, the same in every country. National fleets differ (Parker et al. show 1.6 t CO₂e per tonne for the United States against 5.2 for Australia, whose fleets target rock lobsters and prawns), and that variation is lost.
- Inland fisheries burn as little fuel per tonne as small pelagic fisheries.
- Freshwater species caught at sea, unidentified marine fish and miscellaneous aquatic invertebrates take the average of all fisheries or of demersal molluscs. Mackerels and jacks count with tunas as pelagic fish over 30 cm, and so do sharks. Krill count with crustaceans.
- Farmed crustaceans are all shrimp-like in their energy use, farmed molluscs and other unfed invertebrates all bivalve-like, farmed marine fish salmon-like, and farmed frogs and turtles like freshwater fish.
- The N₂O factor of fish-farm water applies to every farmed species, bivalves included, as in MacLeod et al. It is uncertain, and they ask for it to be treated with caution. Methane from ponds, which some studies find large, is not counted, as MacLeod et al. do not count it.
- Electricity on fish farms emits the world's average per kWh, in every country.
- Vessels, gear, refrigerants, pond fertiliser and the building of farms are left out, as are post-landing processing, transport and cold chains.
- Wild capture has no farm-gate emissions. Its fuel counts in cradle to farm gate.
- Aquafeed is 5.5% of the world's concentrate feed. Fish fed to animals go 90% to aquaculture, 9% to pigs and 1% to poultry. The shares and the GLEAM-style intakes and ration are rounded values, chosen to match the published aquafeed total.
- Fish oils and aquatic plants are left out. The fish reduced to meal and oil are in the fish items.
- Sediments stirred by trawls are not counted. Carcasses of uncaught large fish are counted only with *Uncaught large fish* on, for the three large pelagic groups, with 44% of their catch taken over deep water, a stock recovery with a 10-year time constant, and the stored carbon held for good. Faeces and daily migrations are not counted.

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
- FAO (2022). The State of World Fisheries and Aquaculture 2022, Utilization and processing (uses of fishmeal in 2020): <https://www.fao.org/4/cc0461en/online/sofia/2022/utilization-processing-fisheries-production.html>
- FAO (2025). The role and potential of inland fisheries in low-emission food production and climate change mitigation. Fisheries and Aquaculture Circular C1284, section 2.3.
- FAO, Fishery and Aquaculture Statistics Yearbook 2016, food balance sheets, introduction (species in each group): <https://www.fao.org/fishery/static/Yearbook/YB2016_USBcard/root/food_balance/introduction.pdf>
- Mariani, G. et al. (2020). Let more big fish sink: fisheries prevent blue carbon sequestration—half in unprofitable areas. Science Advances 6, eabb4848, Fig. 1 and fig. S2. <https://doi.org/10.1126/sciadv.abb4848>, CC BY-NC 4.0.
- Saba, G. K. et al. (2021). Toward a better understanding of fish-based contribution to ocean carbon flux. Limnology and Oceanography 66, 1639–1664. <https://doi.org/10.1002/lno.11709>
- Bianchi, D. et al. (2021). Estimating global biomass and biogeochemical cycling of marine fish with and without fishing. Science Advances 7, eabd7554. <https://doi.org/10.1126/sciadv.abd7554>
- Pinti, J. et al. (2023). Model estimates of metazoans' contributions to the biological carbon pump. Biogeosciences 20, 997–1009. <https://doi.org/10.5194/bg-20-997-2023>
- Sala, E. et al. (2021). Protecting the global ocean for biodiversity, food and climate. Nature 592, 397–402. <https://doi.org/10.1038/s41586-021-03371-z>
- Hiddink, J. G. et al. (2023). Quantifying the carbon benefits of ending bottom trawling. Nature 617, E1–E2. <https://doi.org/10.1038/s41586-023-06014-7>
