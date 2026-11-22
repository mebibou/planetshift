# Options

Where two methods are both reasonable, Planetshift builds both and lets the reader switch under *Options*. The first is the default. Each option, diet control and lever is kept in the page's address, so a link reopens the same view; defaults are left out of it. The URL key of each is given in brackets.

## Method options

| Option (URL key) | Default | Alternative | What changes |
| --- | --- | --- | --- |
| Emissions counted (`scope`) | on the farm (`farmGate`) | with inputs (`cradleToFarmGate`) | Adds the emissions of making inputs (fertiliser, energy) to each intensity, mostly CO₂. Base and avoided emissions both rise. Wild fish have no farm-gate emissions at all: almost all of theirs is the fuel their boats burn, which counts only here (see [Fish and seafood](#method-seafood)). |
| Feed shared out (`feed`) | by species (`species`) | regional rations, GLEAM-style (`gleam`) | Which animal groups each feed crop goes to, so how much maize, wheat or soy is freed when one group shrinks. |
| Farming's future without the levers (`base`) | population growth: today's diet × population (`population`) | SSP2 path for farm emissions (`ssp2`) | The baseline emissions to 2100, and the size of the avoided emissions, which are scaled the same way. |
| Where production changes (`loc`) | trade shares held (`fixedTrade`) | each country itself (`domestic`) | Which countries' farms change on the map. World totals of animal products are the same; feed crops differ because feed falls where animals are. A cut a country cannot make in its own production goes to its suppliers. |
| Observed temperature (`temp`) | HadCRUT5 (`hadcrut5`) | Berkeley Earth (`berkeley`) | The observed line on the chart only; years a series does not cover are left blank. |
| Climate response (`clim`) | FaIR (`fair`) | AR6 tables (`ar6`) | The warming per tonne of each gas. FaIR has a 5–95% range; the AR6 fallback has a single curve, so its range collapses onto the median. |
| Freed farmland (`regrow`) | left as it is (`none`) | grows back (`natural`) | Whether farmland freed by the shift takes up CO₂ as natural vegetation grows back, for 30 years after each hectare is freed. The scenario's CO₂ falls by that uptake, so the warming and the CO₂ avoided grow; methane and nitrous oxide do not change. See [The shift](#method-shift), step 8. |
| AI data centres (`dc`) | growth added, IEA (`iea`) | as in the scenario (`ssp`) | With `iea`, the electricity data centres use beyond 2024's 415 TWh, following the IEA's *Energy and AI* to 2035 and held flat after, is added to the future without any lever, at each year's grid intensity: the baseline temperature rises by a few thousandths of a degree, and the data-centre and renewable-electricity levers can cut it. With `ssp`, the scenario's electricity is used as published, and the data-centre lever has nothing to act on. See [Energy and transport](#method-sectors). |
| Permafrost (`pf`) | left out (`off`) | thaws (`on`) | With `on`, each year's rise in temperature releases carbon from thawing permafrost over the next 20 years, as CO₂ and methane, computed on the baseline temperature (which rises) and on the temperature with the levers (whose cooling releases less, so the warming avoided grows a little). See [Climate](#method-climate). |
| Rest of the world's emissions (`ssp`) | middle, SSP2-4.5 (`ssp245`) | low, SSP1-2.6 (`ssp126`); high, SSP3-7.0 (`ssp370`) | The total temperature curve, agriculture's share of it, and, with the population baseline, the adjustment between the two agricultural paths. |
| World population (`pop`) | UN medium projection (`medium`) | UN low (`low`), UN high (`high`) projection | With the population baseline, the world population that scales farm emissions to 2100, in the baseline and with the levers alike: 10.2 billion people in 2100 with the medium projection, 7.0 with the low and 14.4 with the high. See *World population* below. |

When an intensity is missing in the chosen scope, the other scope's is used. When it is missing in both, the item adds no emissions and the country's data quality shows the lowest tier.

## World population

The baseline's farm emissions grow with the number of people to feed: with the default *today's diet × population* baseline, each year's farm emissions are the base year's × world population that year ÷ world population in the base year (see [The shift](#method-shift)). *World population* picks which of the UN's projections that population follows.

**Where the numbers come from.** Each country's population is FAOSTAT's, which carries the medium projection of the UN's World Population Prospects 2024 (WPP 2024). WPP 2024 also publishes a low and a high projection, with women having on average half a child fewer or more than in the medium one; they part from the medium in 2024. For each country, the pipeline takes each projection's population over the medium one in 2025, 2030 and every ten years to 2100 (`population.json`), and the app multiplies the country's own population by that ratio, linearly between those years and 1 in 2023, the last year of estimates; a country WPP has no projection for would take the world's ratio. Summed over the 188 countries, this gives the world populations below; the chart shows WPP's own world total, which includes the few countries the model leaves out.

| UN projection (WPP 2024, world) | 2050 | 2100 | Peak |
| --- | --- | --- | --- |
| Medium (default) | 9.66 billion | 10.18 billion | 10.29 billion in 2084 |
| Low | 8.94 billion | 6.99 billion | 8.95 billion in 2052 |
| High | 10.40 billion | 14.40 billion | still rising in 2100 |

**What it changes.** The baseline's farm emissions from the base year on, and so its temperature: with SSP2-4.5 and the FaIR response, the baseline is 2.75 °C in 2100 with the medium projection, 2.67 °C with the low and 2.84 °C with the high, and the same within 0.01 °C in 2050. The diet shift and the farm levers change emissions that are scaled the same way, so what they avoid grows or shrinks with population: a 50% shift avoids 0.134 °C in 2100 with the medium projection, 0.110 °C with the low and 0.163 °C with the high (0.060, 0.057 and 0.062 °C in 2050). The less-waste lever acts on the same scaled supply. Clearing (deforestation), carbon stored in farmland, natural regrowth and the energy levers are not scaled with population, so they do not change. With the *SSP2 path* baseline, farm emissions follow SSP2-4.5's own path and the population chosen changes nothing; the chart then says so.

**Why it is not a lever.** Population is not something a government sets: how many children people have depends on choices families make, shaped by education, child survival, health care and access to voluntary family planning, and the gap between the UN's projections is half a child per woman. The option sets the future against which the levers are measured; the baseline and the scenario use the same population, so the warming avoided never counts population itself, and the breakdown by family stays the levers'. Diets per person stay as they are in every projection.

**The rest of the world stays the scenario's.** The fossil fuels, aerosols and land use of the scenario world (`ssp`) come with the population their authors assumed (the 2017 SSP projections: about 6.9 billion in 2100 for SSP1, 9.0 for SSP2 and 12.6 for SSP3), and the option does not change them. The pairings that tell roughly one story are low with SSP1-2.6, medium with SSP2-4.5, and high with SSP3-7.0; the two that contradict each other, the low projection with SSP3-7.0 and the high one with SSP1-2.6, are allowed, and a note under the population chart says so.

**The population chart.** Under the temperature chart, on the same years: world population counted and estimated to 2023 (Our World in Data's long-run series, from HYDE 3.3 and Gapminder, to 1949, then WPP 2024's estimates), then the three projections, the chosen one in a dashed line and the other two faint. It has its own axis in billions, not a second axis on the temperature chart, as two scales on one plot suggest a link from where the lines cross.

## Diet controls

| Control (URL key) | Default | Values |
| --- | --- | --- |
| Shift (`shift`) | 0 | 0–100, in percent |
| Per-group shift (`rum`, `pig`, `pou`, `dai`, `egg`, `sea`) | not set: follows the shift | 0–100, in percent, for ruminant meat, pig meat, poultry meat, dairy, eggs, fish and seafood |
| Kept equal (`basis`) | `protein` | `kcal` |
| Replaced by (`with`) | today's protein-rich plant foods (`current`) | mostly legumes (`legumes`), soy and oat drinks (`plantMilk`) |
| All levers fully in place by (`ramp`) | 2035 | 2025–2050 |
| Where (`where`) | `world` | `highIncome` |

## Levers

Each lever's adoption is 0–100, in percent, left out of the address at 0.

| Family | Levers (URL key) |
| --- | --- |
| Farm practices | feed additives (`fa`), breeding and feed (`bf`), manure management (`mm`), rice paddies drained (`rw`), less nitrogen, better used (`ne`), nitrification inhibitors (`ni`), clean farm energy (`fe`) |
| Food waste | waste after shops (`fw`), losses before shops (`sl`) |
| Deforestation | deforestation stopped (`df`) |
| Carbon in farmland | cover crops (`cc`), trees on farms (`af`), biochar (`bc`), rock dust (`ew`) |
| Energy and transport | electric cars (`ev`), electric trucks (`et`), less flying (`fl`), clean aviation fuel (`saf`), clean shipping (`cs`), renewable electricity (`re`), data centres on clean power (`cdc`) |
| Buildings and industry | clean heating (`ch`), clean steel and cement (`ci`) |

A value the page does not recognise falls back to its default. Example: `?shift=10&dai=100&basis=kcal&ev=50&ssp=ssp126` is a 10% shift with all dairy replaced, calories kept, and half of road passenger transport electric, under SSP1-2.6. The keys `target` and `swap` of earlier versions (the EAT-Lancet and swap modes of the removed ready-made scenarios) are ignored.

## Assumptions

- Both values of every option are built and tested; the defaults follow the plan's choices and are to be reviewed before release.
- The SSP2 baseline always follows SSP2-4.5's agricultural emissions, whatever the rest of the world's emissions chosen for the temperature.
- The AR6 fallback has no range; the range shown with it is zero, not unknown.
- Data centres' growth is added by default: it is already happening and the scenarios, made around 2016, did not foresee it, so the baseline is more realistic with it; switching it off reproduces the published scenario temperatures.
- Permafrost is off by default, so the baseline matches the published scenario temperatures, most of whose models leave it out; one pass of the feedback is computed, not its feedback on itself.
- World population follows the UN's medium projection by default, which is what each country's population already carries; the low and high projections are the UN's own, not the SSPs', so that the population can be chosen apart from the scenario world.
- Regrowth is off by default: whether freed land is left to grow back is a choice about land, beyond the diet, and its uptake is less certain than the farm emissions. With the AR6 fallback, the range shown with regrowth on comes from the regrowth rates alone.

## Sources

- HadCRUT5, Met Office Hadley Centre: https://www.metoffice.gov.uk/hadobs/hadcrut5/
- Berkeley Earth: https://berkeleyearth.org/data/
- Leach N. J. et al. (2021), FaIR v2.0.0: https://doi.org/10.5194/gmd-14-3007-2021
- IPCC AR6 WG1, Chapter 7: https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-7/
- RCMIP v5.1.0 emissions (SSP scenarios): https://doi.org/10.5281/zenodo.4589756
- IEA (2025), Energy and AI: https://www.iea.org/reports/energy-and-ai
- IPCC AR6 WG1, Chapter 5 (permafrost carbon feedback): https://doi.org/10.1017/9781009157896.007
- FAO GLEAM: https://www.fao.org/gleam/en/
- UN DESA (2024), World Population Prospects 2024, CC BY 3.0 IGO: https://population.un.org/wpp/
- Our World in Data, Population (HYDE 3.3, Gapminder v7, UN WPP 2024), CC BY 4.0: https://ourworldindata.org/grapher/population
- Klein Goldewijk K. et al. (2017), HYDE 3.2: https://doi.org/10.5194/essd-9-927-2017
- KC S., Lutz W. (2017), The human core of the shared socioeconomic pathways: https://doi.org/10.1016/j.gloenvcha.2014.06.004
