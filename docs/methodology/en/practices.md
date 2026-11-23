# Farm practices

Besides changing what people eat, emissions can be cut where food is grown. Planetshift lets you apply seven farm practices, each acting on one or more sources of emissions on the farm. For each, `practices.json` holds which sources and gases it acts on, which food groups (when it is limited to some), how much it cuts the emissions it reaches on a farm that adopts it (a median with a low and a high value), and in each country the share of those emissions that could adopt it. The parameters, each with one line of reasoning and its citation, are in `pipeline/practices.csv`; the code is `pipeline/planetshift_pipeline/practices.py`.

## Emissions by source

A practice needs to know which part of an item's emissions it can touch: feed additives reach the methane from a cow's rumen, not from its manure. `breakdown.json` splits every intensity of `intensities.json`, for every country, item, scope and gas, into nine sources: enteric fermentation, manure management, rice paddies, synthetic fertiliser, organic fertiliser, crop residues, energy, the making of inputs, and other. The split follows the tier that set the intensity (see [Emissions per tonne of food](#method-emissions)):

- **HESTIA** (tiers 1 and 2): each emission term the intensity sums is given a source by its id: `EntericFermentation` enteric, `Excreta` manure, `FloodedRice` rice, `InorganicFertiliser` and `UreaHydrolysis` synthetic fertiliser, `OrganicFertiliser` organic fertiliser, `CropResidue…` residues, `FuelCombustion` energy; the background emissions of producing fuel and electricity are energy, of every other input (fertilisers, pesticides, machinery, plastics) the making of inputs; lime, aquaculture, waste treatment and the rest are other (see [Emission intensities from HESTIA](#method-hestia)).
- **FAOSTAT** (tier 3): the same allocation that makes the intensity keeps its processes apart: enteric fermentation; manure management (housing and storage) as manure; manure left on pasture and manure applied to soils as organic fertiliser, since both are nitrogen deposited on soils; rice cultivation; synthetic fertilisers; crop residues and their burning as residues; on-farm energy use as energy; fertiliser and pesticide manufacturing as the making of inputs.
- **Published LCA** (tier 4): the FAOSTAT split of the same item in the country, or else in the world (see [Emission intensities from published LCA data](#method-literature)).
- **Proxies** (tier 5): the split of the proxy item in the same country; a processed item takes the split of its primary items, weighted by the emissions each brings per tonne of the product.

A gas that this leaves without a split takes, in order, the FAOSTAT split of the item in the country, in the world, HESTIA's world split, the same for its primary items and proxies, the item's world split, and finally "other". `world[item]` is each item's split over all countries, weighted by their emissions of it (intensity × production less processing). To keep the file small, a country's item is left out when the country does not produce it or when its split equals the world's; the app then reads the world's. Shares are rounded to three decimals and add up to 1.

At the farm gate, the world's methane in the model (137 Mt) is 75% enteric fermentation (102 Mt), 16% rice (22 Mt), 7% manure management (10 Mt) and 2% crop residues; FAOSTAT's totals for 2023 are 106, 25 and 10 Mt for the first three. Nitrous oxide (7.7 Mt) is 49% organic fertiliser, that is manure on pasture and on fields (3.7 Mt), 37% synthetic fertiliser (2.9 Mt), 8% residues and 6% manure management. Farm-gate CO₂ (370 Mt) is the fuel burnt on farms (232 Mt), urea (100 Mt) and, in other, liming (38 Mt). From cradle to farm gate, CO₂ rises to 1,505 Mt with energy at 746 Mt and the making of inputs at 648 Mt.

## Feed additives

**What farmers do.** They add a methane inhibitor to the daily ration, the best studied being 3-nitrooxypropanol (3-NOP), which blocks the last enzyme methane-making microbes in the rumen use. Red seaweed (*Asparagopsis*), nitrates and oils work in a similar way, less consistently.

**What it cuts.** Enteric methane of dairy cattle and beef. A meta-analysis of 14 dairy trials finds 3-NOP cuts methane by 33% at the usual dose (Kebreab et al. 2023). Another, over dairy and beef trials, finds 39.0% (± 5.4) in dairy cattle and 22.2% (± 3.3) in beef cattle, which eat more fibre and respond less (Dijkstra et al. 2018). Planetshift uses 28% (20–38%).

**Where it applies.** The additive must be eaten every day, so only animals fed a ration in a barn or a feedlot can take it. Planetshift assumes 45% of the targeted methane could adopt it in high-income countries, where most dairy cows are housed or fed a mixed ration and beef is finished in feedlots, though the cow-calf herds graze; 15% in upper-middle-income countries (25% in China, whose dairy has moved to large housed farms); 7% in lower-middle-income and 3% in low-income countries, where herds are pastoral or kept by smallholders without a daily ration; and less in high-income grazing countries: 5% in New Zealand, 10% in Uruguay, 15% in Australia, 20% in Ireland.

**Caveats.** Grazing animals cannot be dosed today; slow-release boluses are being tested. The effect may fade with time in some trials, and the safety and acceptance of the additive differ between countries. It is a cost with no gain in yield, so it needs a policy or a price to be adopted.

## Breeding and better feed

**What farmers do.** They feed better forage (younger grass, more digestible silage), balance the ration, and breed animals that grow or give milk faster or that make less methane for the same feed.

**What it cuts.** Enteric methane per kilogram of milk or meat of cattle, sheep and goats. A meta-analysis of 430 studies finds that a higher feeding level, younger grass and less forage in the diet cut methane intensity by 12% on average. Planetshift uses 12% (5–20%), the high end adding breeding where the productivity gap is large.

**Where it applies.** Almost everywhere: 50% of the targeted methane in high-income countries, where diets and genetics are already near the best; 70% in middle-income countries, which have the largest gap and some means to close it; 60% in low-income countries, where feed, breeding services and advice are scarce.

**Caveats.** The cut is per tonne of product: if herds keep their size while producing more, the total does not fall. More concentrate feed means more crops grown, whose emissions Planetshift counts on the crops. Feed additives and breeding act on the same methane, so their combined effect is less than their sum.

## Manure management

**What farmers do.** They collect and treat stored manure: anaerobic digesters that burn the methane or turn it into energy, gas-tight or crusted covers on slurry stores, slurry acidification, separation of solids, and emptying the pits under the animals often.

**What it cuts.** Methane and nitrous oxide from manure management (housing and storage) of all livestock, not manure dropped on pasture or spread on fields. A meta-analysis of 89 studies of liquid manure chains finds that frequent removal, digesters and acidification cut methane by 29–74% and N₂O by 21–55%. Planetshift uses 45% (25–70%).

**Where it applies.** Manure must be collected and stored on farms large enough for a digester or a covered store: 60% of the targeted emissions in high-income countries, 40% in upper-middle-income countries (45% in China, whose pigs are now mostly in large farms with slurry), 20% in lower-middle-income and 10% in low-income countries, where manure is mostly dried, kept in small heaps or burnt as fuel.

**Caveats.** A digester leaks some methane, and the digestate can lose more ammonia when spread; covers cut ammonia more than methane. Most of the manure methane comes from liquid systems of dairy cattle and pigs; dry manure emits little.

## Rice paddies drained

**What farmers do.** They drain their paddies during the season instead of keeping them flooded: once, in mid-season, or several times, letting the water drop below the soil surface before flooding again (alternate wetting and drying, AWD).

**What it cuts.** Methane from rice paddies. The IPCC scales methane by 0.71 for a single drainage and by 0.55 for multiple drainages, relative to continuous flooding. Drying the soil raises N₂O: a meta-analysis finds that non-continuous flooding cuts methane by 53% and raises N₂O by 105%, cutting both together by 44% in CO₂-equivalents. The contract has one reduction per practice, so Planetshift nets the N₂O increase into the methane cut: 45% of the paddy methane (25% for a single drainage, 55% at the low end of the IPCC's range for multiple drainages).

**Where it applies.** Only irrigated paddies where farmers control the water, and that are still kept flooded: 70% in the United States and Egypt, 60% in Pakistan, Vietnam, Italy and Spain, 50% in Indonesia, the Philippines and Brazil, 45% in India and Bangladesh, 35% in China (irrigated, but mid-season drainage is already common), 30% in Korea and 20% in Japan (where it is the norm), 25% in Thailand, 20% in Myanmar, 15% in Cambodia, 10% in Laos and 5–15% in sub-Saharan Africa, where rice is mostly rainfed. Elsewhere 50% in high-income, 40% in upper-middle-income, 35% in lower-middle-income and 10% in low-income countries.

**Caveats.** Netting N₂O into methane uses CO₂-equivalents over 100 years, so it slightly understates the near-term effect of the methane cut. Drying too far lowers yields. Where FAOSTAT already counts drained paddies, the methane left to cut is smaller than assumed.

## Less nitrogen, better used

**What farmers do.** They give crops the nitrogen they need and no more: soil and plant testing, the right rate, split applications at the right time, placement near the roots, enhanced-efficiency fertilisers, legumes in the rotation.

**What it cuts.** N₂O from synthetic fertiliser on the field, CO₂ from urea, and the emissions of making the fertiliser that is no longer bought. A synthesis of 1,521 field observations finds that eleven such measures together cut fertiliser use by 21% and nitrogen losses by 32% at equal or higher yields; N₂O falls faster than the rate where nitrogen is in excess, as its response to nitrogen is not linear. Planetshift uses 25% (12–35%).

**Where it applies.** Where more nitrogen is spread than crops take up: 80% of the targeted emissions in China and 70% in India, which have the largest surpluses; 60% in upper-middle-income, 50% in high-income and lower-middle-income countries; 20% in low-income countries and in western, eastern and middle Africa, where soils get too little nitrogen and better yields need more.

**Caveats.** The making of inputs in `breakdown.json` also holds pesticides, machinery and plastics, which the practice does not reduce; applying the same cut to all of it overstates the effect a little. Nitrogen efficiency and nitrification inhibitors act on the same N₂O, so their combined effect is less than their sum.

## Nitrification inhibitors

**What farmers do.** They buy fertiliser coated with a nitrification inhibitor (DCD, DMPP, nitrapyrin), which slows the turning of ammonium into nitrate, from which N₂O is made.

**What it cuts.** N₂O from synthetic fertiliser. A meta-analysis finds inhibitors cut direct N₂O by 38% on average; another review finds 8–57% across studies, but more ammonia volatilises, and the ammonia later adds indirect N₂O. Indirect N₂O, about a fifth of fertiliser N₂O, is barely reduced. Planetshift uses 30% (10–45%).

**Where it applies.** Wherever the treated fertiliser can be bought and afforded: 60% of the targeted emissions in high-income countries, 50% in upper-middle-income, 30% in lower-middle-income and 10% in low-income countries.

**Caveats.** Residues of DCD were found in milk in New Zealand in 2013, which stopped its use there. The inhibitors cost more than the fertiliser saved in most places, and work less in warm, dry soils.

## Clean farm energy

**What farmers do.** They use less fuel and electricity (efficient pumps, engines and buildings), move pumps, heating and barns to renewable electricity, and run some machines on electricity or biofuels.

**What it cuts.** The CO₂ of fuel and electricity used on farms (in the cradle-to-farm-gate scope also the making of that fuel and electricity). FAO's review of energy-smart food systems and the IPCC's assessment describe efficiency and renewable energy as the main levers; Planetshift uses 50% (25% for efficiency and a cleaner grid alone, 80% with electric or biofuel machinery and fully renewable power).

**Where it applies.** 80% of the targeted emissions in high-income countries, where grids and capital are available, 70% in upper-middle-income countries, much of whose irrigation pumping is on grids that can be cleaned, 50% in lower-middle-income and 40% in low-income countries, with diesel pumps and tractors and less grid access.

**Caveats.** Much of the cut depends on the power sector decarbonising, which is outside the farm; heavy machinery is the hardest to switch.

## All practices together

With every practice adopted in full, wherever it applies, the model avoids about 0.9 billion tonnes of CO₂-equivalent a year (GWP100). The IPCC's sixth assessment (Working Group III, chapter 7, Table 7.3) puts the potential of reducing agriculture's methane and nitrous oxide at 0.6 (0.3–1.3) billion tonnes a year at up to $100 per tonne of CO₂-equivalent, and 1.7 billion tonnes technically: Planetshift's full adoption lies between the two.

## Assumptions

- One reduction per practice applies to every source and gas it targets; the N₂O increase of drained paddies is netted into the methane cut in CO₂-equivalents over 100 years.
- Applicable shares are judgements from the farming systems of each income group and region, with a value of its own for the countries named above; a country takes its own value, else its region's, else its income group's (World Bank), else the world's.
- Practices acting on the same source (feed additives with breeding and feed; nitrogen efficiency with nitrification inhibitors) should be combined multiplicatively, not added.
- Manure left on pasture and manure applied to soils count as organic fertiliser, not manure, so manure management does not reach them.
- The making of inputs is one source, so nitrogen efficiency also cuts the making of pesticides and machinery.
- Literature and proxy intensities take the FAOSTAT split of their item; a processed item takes its primary items' split; items without any split are counted as "other".
- A country's split of an item it does not produce is the world's.

## Sources

- Kebreab, E. et al. (2023). A meta-analysis of effects of 3-nitrooxypropanol on methane production, yield, and intensity in dairy cattle. Journal of Dairy Science 106, 927–936: <https://doi.org/10.3168/jds.2022-22211>.
- Dijkstra, J. et al. (2018). Short communication: Antimethanogenic effects of 3-nitrooxypropanol depend on supplementation dose, dietary fiber content, and cattle type. Journal of Dairy Science 101: <https://doi.org/10.3168/jds.2018-14456>.
- Arndt, C. et al. (2022). Full adoption of the most effective strategies to mitigate methane emissions by ruminants can help meet the 1.5 °C target by 2030 but not 2050. PNAS 119, e2111294119: <https://doi.org/10.1073/pnas.2111294119>.
- Gerber, P. J. et al. (2013). Tackling climate change through livestock: a global assessment of emissions and mitigation opportunities. FAO: <https://www.fao.org/3/i3437e/i3437e.pdf>.
- Sajeev, E. P. M., Winiwarter, W., Amon, B. (2018). Greenhouse gas and ammonia emissions from different stages of liquid manure management chains: abatement options and emission interactions. Journal of Environmental Quality 47, 30–41: <https://doi.org/10.2134/jeq2017.05.0199>.
- IPCC (2019). 2019 Refinement to the 2006 IPCC Guidelines for National Greenhouse Gas Inventories, volume 4, chapter 5, table 5.12: <https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol4.html>.
- Jiang, Y. et al. (2019). Water management to mitigate the global warming potential of rice systems: a global meta-analysis. Field Crops Research 234, 47–54: <https://doi.org/10.1016/j.fcr.2019.02.010>.
- Gu, B. et al. (2023). Cost-effective mitigation of nitrogen pollution from global croplands. Nature 613, 77–84: <https://doi.org/10.1038/s41586-022-05481-8>.
- Shcherbak, I., Millar, N., Robertson, G. P. (2014). Global metaanalysis of the nonlinear response of soil nitrous oxide (N₂O) emissions to fertilizer nitrogen. PNAS 111, 9199–9204: <https://doi.org/10.1073/pnas.1322434111>.
- Nabuurs, G.-J. et al. (2022). Agriculture, Forestry and Other Land Uses (AFOLU). In IPCC AR6, Working Group III, chapter 7 (Table 7.3, mitigation potentials by measure): <https://doi.org/10.1017/9781009157926.009>.
- Akiyama, H., Yan, X., Yagi, K. (2010). Evaluation of effectiveness of enhanced-efficiency fertilizers as mitigation options for N₂O and NO emissions from agricultural soils: meta-analysis. Global Change Biology 16, 1837–1846: <https://doi.org/10.1111/j.1365-2486.2009.02031.x>.
- Lam, S. K. et al. (2017). Using nitrification inhibitors to mitigate agricultural N₂O emission: a double-edged sword? Global Change Biology 23, 485–489: <https://doi.org/10.1111/gcb.13338>.
- FAO (2011). Energy-smart food for people and climate. Issue paper: <https://www.fao.org/3/i2454e/i2454e.pdf>.
- FAOSTAT, Emissions from Crops, Emissions from Livestock and Emissions totals: <https://www.fao.org/faostat/en/#data/GT>, CC BY 4.0.
- HESTIA aggregated impact assessments, release 2026-04-30: <https://hestia.earth/data>, CC BY 4.0.
- World Bank country and lending groups: <https://datahelpdesk.worldbank.org/knowledgebase/articles/906519>, CC BY 4.0.
