# Feed: which animals eat which crops

When fewer animal products are eaten, fewer animals are raised, and the crops grown to feed them are no longer needed. To work out which crops are no longer needed, Planetshift has to know which animals eat them. By default, the world's concentrate feed (the grain, oilseeds, pulses, roots and other crops fed to animals, as opposed to grass, hay and crop residues) is shared between the animal groups in the proportions that published surveys of feed by species report. Each region's share follows what it produces.

The Food Balance Sheets say how much of each item is used as feed in each country, but not by which animals. Planetshift splits each feed item's feed use between the six animal groups, by region, in two ways. You can switch between them under *Other options*.

## What is split

Every item with feed use somewhere in the world is split:

- cereals, rice, pulses, oilseeds, roots and tubers, and sugar crops;
- some fruit and vegetables (bananas, cassava leaves);
- milk, fed to calves and piglets;
- fish reduced to meal (the balance sheets record it as feed use of the fish items);
- a few others.

Grass, hay, crop residues and oil cakes are not items of the Food Balance Sheets, so they are not in the split. Grass and residues are most of what ruminants eat.

The shares are written for the world and for each M49 sub-region. The M49 sub-regions are the UN's grouping of countries into regions such as "Western Africa", as in the country table (see [Data](#method-data)). For each method, region and item, the shares sum to 1 over the animal groups.

## Method 1, by species (the default)

A single published split of the world's concentrate feed between species is applied to every feed item:

| Group | Share of concentrate feed |
| --- | --- |
| Ruminant meat | 12% |
| Dairy | 13% |
| Pig meat | 29% |
| Poultry meat | 33% |
| Eggs | 13% |

This split (`feed_species.csv`) is the world's compound feed by species in 2024, from the feed industry's annual survey (Alltech Agri-Food Outlook 2025, table "Feed Tonnage by Sector" and the layer table): 157.7 Mt for beef cattle and other ruminants, 165.5 Mt for dairy, 369.3 Mt for pigs, 422.8 Mt for poultry other than layers and 173.0 Mt for layers. Pet food, horses and other species are left out. FAO's GLEAM assessment of livestock feed intake (Mottet et al., 2017) gives about the same share to ruminants together and to pigs.

A region's split follows what it produces. Each group's world share is divided by its world production and multiplied by the region's production. A region that raises mostly cattle therefore gives most of its feed to cattle.

## Method 2, GLEAM-style rations

Each group needs a quantity of concentrate feed per tonne of product (`feed_gleam_intake.csv`). It is higher in high-income countries, where intensive systems feed more grain, than elsewhere:

| Product | High-income countries (t of feed per t) | Elsewhere (t of feed per t) |
| --- | --- | --- |
| Beef | 3.0 | 0.8 |
| Milk | 0.35 | 0.12 |
| Pig meat | 3.3 | 2.5 |
| Poultry meat | 2.6 | 2.3 |
| Eggs | 2.2 | 2.0 |

Each group's concentrate is made of feed classes in set proportions (`feed_gleam_rations.csv`): grain, oilseeds, pulses, roots (with fruit and vegetables), sugar crops and milk. Poultry eat more oilseeds, pigs more roots, and only cattle and pigs are fed milk.

For each region, the demand for a feed class by a group is the sum over the region's countries of:

production × concentrate per tonne × the class's share of the ration

Which value of concentrate per tonne applies depends on the country's income level. A feed item then goes to the groups in proportion to the demand for its class. Items in a class that no ration includes (nuts, spices and meat, for instance) use the species split.

These values give a world total of about 1.3 billion tonnes of concentrate feed. That is the same order of magnitude as the world's compound feed output. Its split between species is close to method 1's.

## Seafood

Farmed fish and shrimp eat aquafeed made of grain, oilseeds and fishmeal. The balance sheets' feed use already includes it. For seafood, the split uses each country's aquaculture of fed species, from FAO FishStat. It does not use the balance-sheet production, because most of that is wild or unfed.

- In method 1, seafood takes 5.5% of the world's concentrate feed. The other five groups keep their proportions in the remaining 94.5%: 11% becomes 10.4% for ruminant meat, and so on.
- In method 2, farmed fish need 1.6 t of feed per tonne in high-income countries and 0.87 t elsewhere. The ration is 30% grain, 40% oilseeds, 5% pulses and 25% fish.

Of the fish fed to animals, about 90% goes to aquaculture, 9% to pigs and 1% to poultry. For every other feed item, the five livestock groups keep the same shares relative to each other as before seafood was added. [Fish and seafood](#method-seafood) gives the sources.

## Assumptions

- The split is the same for every feed item in method 1, except the fish items, which have a split of their own. Maize and soybeans are therefore shared between species in the same proportions.
- Concentrate feed per tonne and ration shares are rounded values modelled on GLEAM 2.0's regional results. They are not a copy of its tables, which are not published in this form. They are a starting point, and should be reviewed.
- Two income levels stand for the many production systems GLEAM distinguishes.
- Regions without animal production (none at present) take the world shares.
- Grass, crop residues and oil cakes are outside the balance sheets, so they are not split here. The land of the oilseeds crushed for cake, and of temporary meadows, follows the animals in [Land](#method-land). So do the cake's emissions ([Emissions](#method-emissions)). Permanent pasture follows the ruminants.

## Where the code is

The code is `pipeline/planetshift_pipeline/feed.py` and the tables are `pipeline/feed_*.csv`.

## Sources

- FAOSTAT, Food Balances (2010–), feed use by item and country: <https://www.fao.org/faostat/en/#data/FBS>.
- FAO, Global Livestock Environmental Assessment Model (GLEAM): <https://www.fao.org/gleam/en/>.
- Mottet, A., de Haan, C., Falcucci, A., Tempio, G., Opio, C., Gerber, P. (2017). Livestock: on our plates or eating at our table? A new analysis of the feed/food debate. Global Food Security 14, 1–8: <https://doi.org/10.1016/j.gfs.2017.01.001>.
- Alltech (2025). Agri-Food Outlook 2025, world compound feed production by species in 2024 (table "Feed Tonnage by Sector"; layer feed production table): <https://www.alltech.com/agri-food-outlook>.
- Tacon, A. G. J., Metian, M., Parsons, G., Shumway, S. (2025). A Global Aquaculture and Aquafeed Production Update: 2010 to 2023. Reviews in Fisheries Science & Aquaculture; abstract: commercial aquafeed 69.42 Mt in 2023: <https://doi.org/10.1080/23308249.2025.2568830>.
- Tacon, A. G. J. (2020). Trends in global aquaculture and aquafeed production: 2000–2017. Reviews in Fisheries Science & Aquaculture 28, 43–56: <https://doi.org/10.1080/23308249.2019.1649634>.
- FAO FishStat, Global production by production source: <https://www.fao.org/fishery/en/collection/global_production>.
