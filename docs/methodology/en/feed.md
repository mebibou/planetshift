# Feed: which animals eat which crops

When fewer animal products are eaten, fewer animals are raised, and the crops grown to feed them are no longer needed. The Food Balance Sheets say how much of each item is used as feed in each country, but not by which animals. Planetshift splits each feed item's feed use between the six animal groups, by region, in two ways; the reader can switch between them under Options. The code is `pipeline/planetshift_pipeline/feed.py` and the tables are `pipeline/feed_*.csv`.

## What is split

Every item with feed use somewhere in the world: cereals, rice, pulses, oilseeds, roots and tubers, sugar crops, some fruit and vegetables (bananas, cassava leaves), milk (fed to calves and piglets), fish reduced to meal (the balance sheets record it as feed use of the fish items) and a few others. Grass, hay, crop residues and oil cakes are not items of the Food Balance Sheets, so they are not in the split; grass and residues are most of what ruminants eat.

The shares are written for the world and for each M49 sub-region (as in the country table). For each method, region and item, the shares sum to 1 over the animal groups.

## Method 1, by species (the default)

A single published split of the world's concentrate feed between species, applied to every feed item: ruminant meat 11%, dairy 16%, pig meat 28%, poultry meat 28%, eggs 17% (`feed_species.csv`). This split is rounded from FAO's GLEAM assessment of livestock feed intake (Mottet et al., 2017) and the industry's annual survey of compound feed by species (Alltech Agri-Food Outlook), which agree on pigs and poultry eating a little over half of the concentrates.

A region's split follows what it produces: each group's world share is divided by its world production and multiplied by the region's production. A region that raises mostly cattle gives most of its feed to cattle.

## Method 2, GLEAM-style rations

Each group needs a quantity of concentrate feed per tonne of product (`feed_gleam_intake.csv`), higher in high-income countries, where intensive systems feed more grain, than elsewhere: for example 3.0 t per tonne of beef in high-income countries and 0.8 t elsewhere, 0.35 t and 0.12 t per tonne of milk, 3.3 t and 2.5 t per tonne of pig meat, 2.6 t and 2.3 t per tonne of poultry meat, 2.2 t and 2.0 t per tonne of eggs. Each group's concentrate is made of feed classes in set proportions (`feed_gleam_rations.csv`): grain, oilseeds, pulses, roots (with fruit and vegetables), sugar crops and milk. Poultry eat more oilseeds, pigs more roots, and only cattle and pigs are fed milk.

For each region, the demand for a feed class by a group is the sum over the region's countries of production × concentrate per tonne (the country's income level decides which value) × the class's share of the ration. A feed item then goes to the groups in proportion to the demand for its class. Items whose class no ration has (nuts, spices, meat, for instance) use the species split.

The world totals these values give, about 1.2 billion tonnes of concentrate feed, match the order of magnitude of the world's compound feed output, and their split between species is close to method 1's.

## Seafood

Farmed fish and shrimp eat aquafeed made of grain, oilseeds and fishmeal, which the balance sheets' feed use already includes. Seafood's production in the split is each country's aquaculture of fed species from FAO FishStat, not its balance-sheet production, most of which is wild or unfed. In method 1 seafood takes 5.5% of the world's concentrate feed and the other five groups keep their proportions in the remaining 94.5% (11% becomes 10.4% for ruminant meat, and so on); in method 2 farmed fish need 1.6 t of feed per tonne in high-income countries and 0.87 t elsewhere, 30% grain, 40% oilseeds, 5% pulses and 25% fish. Fish fed to animals go about 70% to aquaculture, 23% to pigs and 7% to poultry. For every other feed item the five livestock groups keep the same shares relative to each other as before seafood was added. [Fish and seafood](#method-seafood) gives the sources.

## Assumptions

- The split is the same for every feed item in method 1, except the fish items, which have a split of their own, so maize and soybeans are shared between species alike.
- Concentrate feed per tonne and ration shares are rounded values in the spirit of GLEAM 2.0's regional results, not a copy of its tables, which are not published in this form; they are a starting point to review.
- Two income levels stand for the many production systems GLEAM distinguishes.
- Regions without animal production (none at present) take the world shares.
- Grass, crop residues and oil cakes are outside the balance sheets, so they are not split here. The land of the oilseeds crushed for cake, and of temporary meadows, follows the animals in [Land](#method-land), and so do the cake's emissions ([Emissions](#method-emissions)); permanent pasture follows the ruminants.

## Sources

- FAOSTAT, Food Balances (2010–), feed use by item and country: <https://www.fao.org/faostat/en/#data/FBS>.
- FAO, Global Livestock Environmental Assessment Model (GLEAM): <https://www.fao.org/gleam/en/>.
- Mottet, A., de Haan, C., Falcucci, A., Tempio, G., Opio, C., Gerber, P. (2017). Livestock: on our plates or eating at our table? A new analysis of the feed/food debate. Global Food Security 14, 1–8: <https://doi.org/10.1016/j.gfs.2017.01.001>.
- Alltech Agri-Food Outlook (world compound feed production by species): <https://www.alltech.com/agri-food-outlook>.
- Tacon, A. G. J. et al. (2025), compound aquafeed production in 2023 (69.4 Mt): <https://doi.org/10.1080/23308249.2025.2568830>.
- Tacon, A. G. J. (2020). Trends in global aquaculture and aquafeed production: 2000–2017. Reviews in Fisheries Science & Aquaculture 28, 43–56: <https://doi.org/10.1080/23308249.2019.1649634>.
- FAO FishStat, Global production by production source: <https://www.fao.org/fishery/en/collection/global_production>.
