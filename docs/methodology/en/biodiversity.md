# Biodiversity: farmed and wild mammals

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

A herd grows or shrinks with the production of the food it gives, in its country. Planetshift already gives each country's change in each animal group's production once the levers are in full (the same relative change that moves its feed and its oilcakes). The herds follow it:

$$
\Delta B_c = \sum_g B_{c,g} \, \frac{\Delta P_{c,g}}{P_{c,g}}
$$

with $B_{c,g}$ the farmed mammals of country $c$ that follow group $g$ and $P_{c,g}$ the country's production of that group. A group that disappears takes its herds with it.

Each herd is shared between the groups as its emissions are (see [Emissions](#method-emissions)):

- **Dairy cattle**: 85% to milk and 15% to beef, the culled cows.
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

## Sources

- FAOSTAT, Emissions from Livestock (GLE): stocks by species, [fao.org/faostat](https://www.fao.org/faostat/en/#data/GLE). Licence: CC BY 4.0.
- IPCC (2006), *2006 IPCC Guidelines for National Greenhouse Gas Inventories*, Vol. 4, Ch. 10, *Emissions from Livestock and Manure Management*, Tables 10A-4 to 10A-9 and 10.10, [ipcc-nggip.iges.or.jp](https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol4.html). Values cited.
- Greenspoon et al. (2023), *The global biomass of wild mammals*, PNAS 120, e2204892120, [doi:10.1073/pnas.2204892120](https://doi.org/10.1073/pnas.2204892120). Licence: CC BY-NC-ND 4.0, figures cited. Their code and data, with the livestock masses they used: [gitlab.com/milo-lab-public/mammal_biomass](https://gitlab.com/milo-lab-public/mammal_biomass), MIT licence.
- Bar-On et al. (2018), *The biomass distribution on Earth*, PNAS 115, 6506–6511, [doi:10.1073/pnas.1711842115](https://doi.org/10.1073/pnas.1711842115). Licence: CC BY-NC-ND 4.0, figures cited.
