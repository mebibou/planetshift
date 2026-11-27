# Biodiversity: species, mammals and fish

Food and farming cause more biodiversity loss on land than anything else, and fishing causes the most in the ocean. Planetshift gives three measures, each today and once the levers are in full: the species that farmland commits to extinction, farmed mammals compared with wild ones, and the fish that fisheries target compared with an unfished ocean. All three are kept apart from warming, as the last section explains.

Farm animals now make up most of the world's mammals by weight. Planetshift weighs the farmed mammals of each country, today and once the levers are in full, and sets the world total against the wild mammals. The summary gives the world figure, *Farmed mammals to wild ones, by weight*. The map's *Farmed mammals* layer gives each country's farmed mammals per km² of land.

The figures are in `mammals.json`. The code is `pipeline/planetshift_pipeline/mammals.py`, with the live weights in `pipeline/mammals_live_weights.csv`, and `app/src/model/mammals.ts`.

## Farmed mammals today

A country's farmed mammals weigh its head of each animal times that animal's typical live weight in its region:

$$
B_c = \sum_s N_{c,s} \, m_{r(c),s}
$$

with $N_{c,s}$ the head of animal $s$ in country $c$ and $m_{r,s}$ the live weight of one animal $s$ in region $r$.

- **Head**: FAOSTAT's livestock stocks in its *Emissions from Livestock* domain (CC BY 4.0), in the base year (2024). That domain splits dairy cattle from other cattle and breeding swine from market swine, which weigh very differently. The animals are dairy cattle, other cattle, buffalo, sheep, goats, market and breeding swine, camels, llamas, horses, asses, and mules and hinnies.
- **Live weight**: the typical animal mass of the 2006 IPCC Guidelines for National Greenhouse Gas Inventories (Vol. 4, Ch. 10, Tables 10A-4 to 10A-9), by region: North America, Western Europe, Eastern Europe, Oceania, Latin America, Africa, the Middle East, Asia and the Indian subcontinent. Sheep, goats and horses have one mass for developed countries (North America, Europe and Oceania) and one for the rest. IPCC gives no mass for llamas, so they take the alpaca's 65 kg (Table 10.10), which counts them low. Each value and its reason are in `mammals_live_weights.csv`.
- **Regions**: each country takes the IPCC region of its UN sub-region, grouped as Greenspoon et al. (2023) did. Armenia, Azerbaijan and Georgia are in Asia, Iran and Pakistan in the Middle East, and India, Bangladesh and Bhutan form the Indian subcontinent.

These are the masses and the method Greenspoon et al. (2023) used for their own count of livestock, so the two can be compared. Table 10.10 of the same chapter gives higher weights for camels (570 kg against 217), horses (550 against 377 and 238) and mules and asses (245 against 130). They are kept out for that reason. The IPCC gives its masses within ±10% for dairy cows, ±20% for swine, ±25% for other cattle and ±30% for sheep, goats, camels, horses, mules and asses.

Left out:

- Poultry, which are birds.
- Rabbits, hares and farmed rodents, which FAOSTAT counts in another domain: about 0.5 Mt in Greenspoon et al.
- Dogs and cats, which are not farmed: about 24 Mt.
- Deer and reindeer, which FAOSTAT does not count by head.

In 2024 the farmed mammals of the model's 182 countries with stocks weigh 642 Mt. Cattle weigh 427 Mt, buffalo 71 Mt, sheep 42 Mt, pigs 36 Mt and goats 35 Mt. Horses, camels, asses, mules and llamas weigh 32 Mt together. Greenspoon et al. find about 630 Mt for 2018 with the same species and rabbits, cattle 416 Mt, buffalo 68 Mt, sheep 39 Mt, pigs 38 Mt and goats 32 Mt. The table they used gives Oceania's dairy cows 50 kg where the IPCC gives 500 kg. Planetshift uses the IPCC's value.

## Wild mammals

Greenspoon et al. (2023) estimate the world's wild land mammals at about 22 Mt (about 20 Mt in their abstract, 95% interval 13 to 38 Mt) and its wild marine mammals at about 39 Mt (95% interval 20 to 80 Mt). Planetshift uses 61 Mt. They give a world total only, so the map has no wild layer. No lever changes it, and farmland freed by a shift adds no wild mammals here.

Both sides are counted as live, or wet, weight. Greenspoon et al. convert to carbon by taking a third for the dry weight and half of that for the carbon, so the ratio is the same in carbon.

## The figure

The summary divides the world's farmed mammals by its wild mammals, today and once the levers are in full. Today the farmed mammals weigh 10.5 times the wild ones, and 29 times the wild land mammals. Greenspoon et al.'s own figures, about 630 Mt of livestock against about 60 Mt of wild mammals, give about 10 to 1, and they write that domesticated mammals outweigh wild land mammals "30 to 1". Bar-On et al. (2018) give 0.1 Gt C of livestock against 0.007 Gt C of wild mammals, about 14 to 1. The often-quoted "fifteen to one" comes from that earlier estimate only.

## With the levers

A herd grows or shrinks with the production of the food it gives, in its country. Planetshift already gives each country's change in each animal group's production once the levers are in full. It is the same relative change that moves its feed and its oilcakes, with butter and cream counted as the milk they are made from. The herds follow it:

$$
\Delta B_c = \sum_g B_{c,g} \, \frac{\Delta P_{c,g}}{P_{c,g}}
$$

with $B_{c,g}$ the farmed mammals of country $c$ that follow group $g$ and $P_{c,g}$ the country's production of that group. A group that disappears takes its herds with it.

Each herd is shared between the groups as its emissions are (see [Emissions](#method-emissions)):

- **Dairy cattle**: 88% to milk and 12% to beef, the culled cows.
- **Other cattle**: beef.
- **Buffalo, sheep, goats and camels**: milk and meat, by the protein each country's herd produces. Where it produces neither, meat.
- **Pigs**: pig meat.
- **Llamas**: the "other meat" item, in the ruminant meat group.
- **Animals not raised for food**: horses, asses and mules, and the share of cattle and buffalo found not raised for food (see [Emissions](#method-emissions)). They do not follow any food and stay as they are. They weigh 42 Mt.

With the whole diet shifted, only those 42 Mt remain: 0.7 to 1 against the wild mammals. Half the shift leaves 342 Mt, 5.6 to 1. The figure is the one once the levers are in full, like the farmland freed.

## The map layer

The *Farmed mammals* layer gives each country's farmed mammals with the levers, in tonnes of live weight per km² of its land area (FAOSTAT's land area, as for the *Land use* layer). Its bins are fixed (1, 2.5, 5, 10, 20 and 40 t/km²), so a shift shows as lighter colours. The tooltip and the table give the density today and with the levers, and the live weight in tonnes.

Today the Netherlands has 75 t/km², Ireland 47, India 25, New Zealand 19, France 16, Brazil 9.4, China 6.0, the United States 4.7 and Australia 1.9.

## What it leaves out

- A herd follows production at a fixed output per head. Higher milk yields or heavier carcasses would need fewer animals for the same production, and the levers here do not change them.
- Stocks are the herd standing on one day of the year, as Greenspoon et al. count it too.
- The herds are counted where they are kept, not where their products are eaten.
- Wild mammals are a world total with a wide range. Freed land is not modelled to bring them back.

## Species committed to extinction

Farmland takes the place of the habitat that species need. Planetshift counts the species of plants, mammals, birds, reptiles and amphibians that each country's cropland and pasture commit to extinction worldwide. The summary gives the world figure, *Species committed to extinction by farmland*. The map's *Species loss* layer gives each country's figure, as a count or per Mha of its farmland. Per Mha, France's farmland commits about 22 species, Madagascar's about 69 and Australia's about 5.

It is a loss committed over time, if the land stays farmed. It counts the species that would be lost in the long run, because their remaining habitat is too small to keep them. It is not the number of species lost by a given year, and it does not say which species they are.

The factors are in `species.json`. The code is `pipeline/planetshift_pipeline/species.py`, `app/src/model/species.ts` and `app/src/app/species.ts`.

### The factors

Scherer et al. (2023) give, for each country, land-use type and intensity, the share of each group's species that one m² of land use commits to global extinction. Their model weighs habitat loss and the fragmentation of what remains. It also weighs how threatened and how widespread each species is (its global extinction probability). LC-IMPACT v2 (2026) adopts these factors for land use. Planetshift reads their country file, `CF_country.csv` (CC BY 4.0), and takes:

- **Cropland**: light use for plants; for animals, light and intense use, which the model merges.
- **Pasture**: set by how densely it is grazed (see below).
- **Today's farmland**: the average factor, the land's share of the loss already caused.
- **Land newly farmed**: the marginal factor, the loss from the next hectare. It is higher, as each hectare taken loses more species once less habitat is left.

Each group's factor is multiplied by its described species (IUCN Red List 2025-1, Table 1a: 6,736 mammals, 11,195 birds, 12,386 reptiles, 8,863 amphibians and 381,913 vascular plants, 421,093 in all), and the five groups are added. A country's species committed today are:

$$
E_c = A_{c,\text{crop}} \, f_{c,\text{crop}} + A_{c,\text{pasture}} \, f_{c,\text{pasture}}
$$

with $A$ the farmland of the model (harvested cropland and permanent pasture, ha) and $f$ the species per ha. Bermuda, Hong Kong, Macao, New Caledonia, French Polynesia and Taiwan have no factors and are left out.

The intensity matters, mostly for plants on pasture, where minimal use scores about 30 times lower than light use. FAOSTAT's permanent pasture includes vast rangelands grazed at a few head per km². Australia counts 332 Mha of it, 43% of its land. Each country's pasture takes its intensity from its ruminants' livestock units per hectare of pasture (FAOSTAT's livestock patterns and stocks). At 0.15 or less, pasture is at minimal use. At 0.6 or more, it is at light use. In between, it is a linear mix of the two. Saudi Arabia (0.03), Kazakhstan, Mongolia, Madagascar and Australia (0.11) take minimal use. The United States (0.33) and China (0.37) are split about evenly between minimal and light use. Brazil (0.98), France (1.5) and the Netherlands (4.4) take light use. The thresholds are Planetshift's choice: with all pasture at light use the world total would be about 56,000, with all at minimal use about 33,000. Cropland takes light use everywhere, as the model has no intensity for it.

### Today

The world's farmland commits about 42,000 species to extinction, 10.0% of the 421,093 described. Pasture accounts for 47% of them. Brazil comes first, with about 6,000. Then come Madagascar (2,900), Indonesia (2,800), Mexico (2,500), Colombia (2,200), China (2,000) and Australia (1,900). France's farmland commits about 550, and the United States' about 1,200.

### With the levers

The farmland of each country changes with the levers as described in [Land](#method-land). Land newly farmed commits species at the marginal factor. Freed land regains its species as it regrows. The figure therefore depends on the *Freed farmland* option, as the CO₂ of regrowth does:

- **Left as it is** (the default): freed land regains no species. The figure can only rise, through land newly farmed. With the whole diet shifted it reaches about 44,000.
- **Grows back**: freed land regains its species at the average factor once it has grown back. With the whole diet shifted the figure falls to about 22,000, 5.3% of the species described. Half the shift gives about 32,000.

The figure applies once the levers are in full and freed land has grown back. Species return more slowly than vegetation, often over decades.

### Checked against HESTIA

HESTIA's v1.3 aggregations compute land-use damage with Chaudhary & Brooks (2018) (`damageToTerrestrialEcosystemsLandOccupation`). For wheat in Spain and France, maize in the United States and Brazil, and wheat in India, their factor per m² of cropland is 50 to 140 times Scherer et al.'s. The ratio differs between countries, so the two also differ in places. Most of the gap comes from the scale. Chaudhary & Brooks weigh species by a vulnerability score that is not scaled to the world's species, so their global factors cannot be added into a count. The global extinction probability that Scherer et al. use is scaled so that a group cannot lose more than all its species (LC-IMPACT v2, chapter 2). LC-IMPACT v2's own country table (`EQ_LandUse_gloPDF_Country_Aggregated`) has the same problem: multiplied by the world's farmland it gives more than the total number of species, so Planetshift reads Scherer et al.'s file instead.

### What it leaves out

- The intensity of cropland, and each country's crops: a hectare of wheat and one of oil palm count the same.
- Species in fresh water, and insects and fungi, which the factors do not cover.
- The clearing of forest for farming: only the farmland it becomes is counted.
- The time it takes for species to come back, and those lost for good before the land is freed.

## Fish and fishing

Fishing has reduced the fish it targets to about a third of their unfished biomass. Bianchi et al. (2021) model the fish that fisheries target, from 10 g to 100 kg: 3.3 Gt (±0.5) without fishing, and 1.1 Gt (±0.2) at the global peak catch of the late 1990s. Planetshift uses the peak-catch figure for today. Catches have fallen somewhat since, so this may understate today's fish a little. The summary gives *Fish the fisheries target, against an unfished ocean*: 33% today.

With the levers, the catch changes by the same share as the world's production of fish and seafood in the model. Planetshift assumes that the biomass fishing removes scales with the catch:

$$
B = B_0 - (B_0 - B_1) \, \frac{C'}{C}
$$

with $B_0$ the biomass without fishing, $B_1$ today's, $C$ today's catch and $C'$ the catch with the levers. Half the diet shift halves the catch and brings the fish to 67% of their unfished biomass. The whole shift ends fishing and brings them back to 100%.

This is a rough measure. Fish stocks do not rebuild as fast as the catch falls, and rebuilding takes years. The catch also follows farmed seafood as well as wild, because the model does not split seafood by system. Bianchi et al.'s article is under a CC BY-NC 4.0 licence, and Planetshift cites only its two figures.

## Kept apart from warming

Planetshift neither adds biodiversity loss to warming nor converts it into warming. In HESTIA's v1.3 aggregations, the damage to land ecosystems from climate change is about 600 times smaller than that from land use for Brazilian soybean, and about 1,250 times smaller for wheat in Spain. The warming each scenario avoids is in the climate figures. Its effects on species are among the impacts the IPCC assesses (see [What the warming means](#method-impacts)).

## Sources

- FAOSTAT, Emissions from Livestock (GLE): stocks by species, [fao.org/faostat](https://www.fao.org/faostat/en/#data/GLE). Licence: CC BY 4.0.
- IPCC (2006), *2006 IPCC Guidelines for National Greenhouse Gas Inventories*, Vol. 4, Ch. 10, *Emissions from Livestock and Manure Management*, Tables 10A-4 to 10A-9 and 10.10, [ipcc-nggip.iges.or.jp](https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol4.html). Values cited.
- Greenspoon et al. (2023), *The global biomass of wild mammals*, PNAS 120, e2204892120, [doi:10.1073/pnas.2204892120](https://doi.org/10.1073/pnas.2204892120). Licence: CC BY-NC-ND 4.0, figures cited. Their code and data, with the livestock masses they used: [gitlab.com/milo-lab-public/mammal_biomass](https://gitlab.com/milo-lab-public/mammal_biomass), MIT licence.
- Bar-On et al. (2018), *The biomass distribution on Earth*, PNAS 115, 6506–6511, [doi:10.1073/pnas.1711842115](https://doi.org/10.1073/pnas.1711842115). Licence: CC BY-NC-ND 4.0, figures cited.
- Scherer et al. (2023), *Biodiversity impact assessment considering land use intensities and fragmentation*, Environmental Science & Technology 57, 19612–19623. Factors: [zenodo.org/records/10114493](https://zenodo.org/records/10114493). Licence: CC BY 4.0.
- LC-IMPACT v2 (2026), [zenodo.org/records/18670560](https://zenodo.org/records/18670560). Licence: CC BY 4.0. Its land-use chapter and its chapter on global extinction probabilities.
- IUCN (2025), *The IUCN Red List of Threatened Species*, version 2025-1, Table 1a, [iucnredlist.org](https://www.iucnredlist.org/resources/summary-statistics). Figures cited.
- Chaudhary & Brooks (2018), *Land use intensity-specific global characterization factors to assess product biodiversity footprints*, Environmental Science & Technology 52, 5094–5104, [doi:10.1021/acs.est.7b05570](https://doi.org/10.1021/acs.est.7b05570), as HESTIA applies them ([hestia.earth/guide](https://www.hestia.earth/guide/damageToTerrestrialEcosystemsLandOccupation)).
- Bianchi et al. (2021), *Estimating global biomass and biogeochemical cycling of marine fish with and without fishing*, Science Advances 7, eabd7554, [doi:10.1126/sciadv.abd7554](https://doi.org/10.1126/sciadv.abd7554). Licence: CC BY-NC 4.0, figures cited.
