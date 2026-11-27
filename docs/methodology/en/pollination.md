# Pollinators

Most crops are pollinated by animals, mostly insects, and many yield more when they are. IPBES (2016) found that more than three quarters of the leading types of food crop benefit from animal pollination. It also found that 5–8% of the world's crop production is directly attributable to animal pollination. Wild pollinators have declined in many places. Smith et al. (2022) estimated that inadequate pollination already lowers the world's fruit, vegetable and nut production by 3–5%. They linked this to about 427,000 excess deaths a year from the healthy food not eaten.

Planetshift shows how much of each country's crop production depends on pollinators, today and once the levers are in full. With a plant-rich diet, more fruit, vegetables and nuts are grown, and many of them need pollinators. Less feed is grown: maize, which does not need them, and soybeans, which need them in part. Whether the total goes up or down is not obvious in advance. The summary gives the world figure, *Crop production from pollinator-dependent crops*. The map's *Pollinators* layer gives each country's share.

These figures show how much production depends on pollinators. They are not a measure of loss: no scenario here removes pollinators. They do not change the warming.

The figures are in `pollination.json`. The code is `pipeline/planetshift_pipeline/pollination.py`, with the crops' classes in `pipeline/pollination_classes.csv`, and `app/src/model/pollination.ts`.

## Two shares

Klein et al. (2007) put each crop in one of five classes by how much its yield falls without animal pollinators: none, little (more than 0% and up to 10%), modest (10–40%), great (40–90%) and essential (more than 90%). Aizen et al. (2009) turned each class into a ratio, the middle of its range: 0, 0.05, 0.25, 0.65 and 0.95. Planetshift gives two shares of crop production, each by weight and by calories:

- **From pollinator-dependent crops**: the production of the crops whose class is above none, whatever their ratio. This is Klein et al.'s measure. Rapeseed counts in full, though pollinators give a quarter of its yield.
- **Due to pollination**: each crop's production times its ratio, the part of the yield that would be lost without pollinators. This is the measure behind IPBES's 5–8%.

The map and the summary's headline give the first share by weight. The tooltip and the summary's detail give the other three.

## The crops' classes

The classes are those of Aizen et al. (2019, Appendix S1), which gives a class for 114 FAOSTAT crops. Most come from Klein et al. (2007). Aizen et al. classed eleven crops themselves from other studies (areca nuts, castor oil seed, gooseberries, hazelnuts, jojoba, pistachios, poppy seed, quinces, walnuts, yautia, and anise with coriander and fennel). Planetshift takes Appendix S1 under its licence, CC BY 4.0. It maps each of its crops by name to the current FAOSTAT crop code (`pollination_classes.csv`). It gives plantains the class of bananas, as Aizen et al. list the plantain's species under bananas.

These FAOSTAT crops have no class: the "n.e.c." crops (other vegetables, other fruit, other citrus, other pulses), tea, mushrooms, artichokes, cloves, ginger and a few others.

## From crops to Food Balance Sheet items

The model counts production by Food Balance Sheet (FBS) item. Each item covers one or more FAOSTAT crops (`qcl_items.csv`, as for land and emissions). For each item and country, Planetshift weights its classified crops by the country's production of each, summed over the three years up to the base year (FAOSTAT's *Crops and livestock products*). It gives two numbers per item:

$$
r_{i,c} = \frac{\sum_k t_{k,c}\, r_k}{\sum_k t_{k,c}}, \qquad d_{i,c} = \frac{\sum_k t_{k,c}\, [r_k > 0]}{\sum_k t_{k,c}}
$$

with $t_{k,c}$ the tonnes of crop $k$ of item $i$ in country $c$ and $r_k$ its ratio. A crop without a class is left out of both sums, so it takes the mean of its item's classified crops. *Vegetables, other*, for example, takes the mean of cucumbers, pumpkins, cabbages, carrots and the other vegetables with a class.

A processed item takes its primary items' crops, from the same extraction table as the emissions (`proxies.csv`): soybean oil takes soybeans, palm oil the oil palm fruit, wine the grapes, and sugar the cane and the beet. Rice bran oil takes rice, and maize germ oil takes maize. A country without production of an item's classified crops takes the world's values, the same sums over every country. The file keeps the world's values for each item, and a country's own only where they differ from the world's.

Animal products are left out of both shares: no class covers them. The crops grown to feed animals count where they are grown, as crops.

## A country's shares

A country's crop production is each rated item's production, less the part processed into another item. That other item counts the part, as for emissions. Its tonnes from pollinator-dependent crops are each item's tonnes times $d_{i,c}$, and its tonnes due to pollination each item's tonnes times $r_{i,c}$. For calories, each item's tonnes are multiplied by its kcal per tonne. Each share is divided by the country's crop production in the same unit.

The ratios do not change with any lever. The shares move with what is grown: the diet shift, food waste and the other levers that change production. The model recalculates them in every run, from the run's production change, at no measurable cost.

## The world's figures

The rated items are 99.4% of the world's crop production by weight, 7.9 Gt a year in the base year.

| | Today | Full diet shift |
|---|---|---|
| From pollinator-dependent crops, by weight | 23.1% | 23.4% |
| From pollinator-dependent crops, by calories | 26.2% | 26.4% |
| Due to pollination, by weight | 7.4% | 7.4% |
| Due to pollination, by calories | 5.7% | 5.6% |

Pollination accounts for 7.4% of the world's crop production by weight, within IPBES's 5–8%, and 5.7% of its calories. Klein et al. (2007) found 35% of the world's production by volume from crops that depend on pollinators, 60% from crops that do not, and 5% unevaluated. Their total is the production of the leading crops they studied. The 23.1% here counts every rated FBS item in the base year, each processed item as produced.

With the world's ratios, the other vegetables give about 493 Mt of the 1.82 Gt from dependent crops, the other fruit (melons, watermelons, mangoes, pears, peaches) 249 Mt, tomatoes 189 Mt and soybeans 179 Mt. Ranked by the tonnes due to pollination, the other vegetables come first again (206 Mt), then the other fruit (181 Mt) and apples (56 Mt).

Among the countries growing more than 5 Mt of rated crops, Malaysia's share is the highest, 82%, from oil palm, which pollinators help a little. Tunisia, Portugal, Indonesia and Greece are near half. China's is 32%, India's 22%, the United States' 17% and France's 8%. The share is lowest in northern Europe and in countries that grow mostly cereals, roots and rice: 3% in Sweden and Denmark, 2% in Cambodia.

## What a full diet shift does

A full diet shift barely moves the world's shares. Crop production falls from 7.88 to 7.81 Gt a year, as less feed is grown. The tonnes from dependent crops rise slightly (1.821 to 1.824 Gt): more fruit, vegetables and pulses, less soybean for feed. The tonnes due to pollination fall slightly (585 to 580 Mt). The share from dependent crops rises from 23.1% to 23.4% by weight, and the share due to pollination stays at 7.4%. By calories, the share due to pollination falls from 5.7% to 5.6%: a tonne of the soybeans no longer grown for feed carries more calories than a tonne of the fruit and vegetables that replace them.

Country shares change more. The United States goes from 17% to 23% and Argentina from 18% to 23%, as they grow less maize for feed, which pollinators do not help. Indonesia goes from 49% to 45% and India from 22% to 19%.

## Limits

- Klein et al.'s classes are for the crop's yield in general, not for a variety or a place. Many crops yield differently with pollinators by variety and region.
- The ratios do not change with how many pollinators there are, or with farming practices.
- An unclassified crop takes the mean of its item's classified crops, which may not suit it. The items without any classified crop (tea, other citrus, cloves) are left out.
- Siopa et al. (2024) give a newer list of 141 crops under CC BY-NC 4.0. The data files are under CC BY 4.0, which cannot include it, so it is not used, not even to compare.
- Seed production is not counted. Many vegetables need pollinators for their seed, not for the part eaten. Klein et al. class them by the part eaten.

## Sources

- Aizen M.A. et al. (2019), *Global agricultural productivity is threatened by increasing pollinator dependence without a parallel increase in crop diversification*, Global Change Biology 25, 3516–3527, [doi:10.1111/gcb.14736](https://doi.org/10.1111/gcb.14736), Appendix S1. Licence: CC BY 4.0.
- Aizen M.A. et al. (2009), *How much does agriculture depend on pollinators? Lessons from long-term trends in crop production*, Annals of Botany 103, 1579–1588, [doi:10.1093/aob/mcp076](https://doi.org/10.1093/aob/mcp076): the ratio of each class.
- Klein A.-M. et al. (2007), *Importance of pollinators in changing landscapes for world crops*, Proceedings of the Royal Society B 274, 303–313, [doi:10.1098/rspb.2006.3721](https://doi.org/10.1098/rspb.2006.3721): the classes.
- IPBES (2016), *The assessment report of the Intergovernmental Science-Policy Platform on Biodiversity and Ecosystem Services on pollinators, pollination and food production*, [doi:10.5281/zenodo.3402856](https://doi.org/10.5281/zenodo.3402856).
- Smith M.R. et al. (2022), *Pollinator deficits, food consumption, and consequences for human health: a modeling study*, Environmental Health Perspectives 130, 127003, [doi:10.1289/EHP10947](https://doi.org/10.1289/EHP10947).
- FAOSTAT, Crops and livestock products (QCL): production by crop, [fao.org/faostat](https://www.fao.org/faostat/en/#data/QCL). Licence: CC BY 4.0.
