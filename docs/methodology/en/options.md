# Options

This page lists every setting under *Other options*, what each one changes and which value is the default. Where two methods are both reasonable, Planetshift builds both and lets you switch between them. The first one listed is the default. The options change the method and the future that the levers are measured against. They do not change the levers themselves.

## How settings are kept in the address

Each option, diet control and lever is kept in the page's address, so a link reopens the same view. Defaults are left out of the address. The URL key of each setting is given in brackets in the tables below.

A few terms used on this page:

- **SSP**: one of the Shared Socioeconomic Pathways, published scenarios of how the world's emissions could develop. SSP2-4.5 is the middle one. SSP1-2.6 is low and SSP3-7.0 high.
- **FaIR**: the simple climate model Planetshift uses to turn emissions into temperature, run with the IPCC's sixth assessment (AR6) calibration. See [Climate](#method-climate).
- **5–95% range**: the spread of the climate model's runs, without their lowest and highest 5%.

## Method options

| Option (URL key) | Default | Alternative | What changes |
| --- | --- | --- | --- |
| Emissions counted (`scope`) | with inputs (`cradleToFarmGate`) | biological processes only (`farmGate`) | Leaves out the emissions of making inputs (fertiliser, energy), mostly CO₂, and the fuel burnt on the farm. Base and avoided emissions both fall. Wild fish then have no emissions at all: almost all of theirs come from the fuel their boats burn, which counts only with inputs (see [Fish and seafood](#method-seafood)). Links that carry `scope=farmGate` keep this choice. |
| Feed shared out (`feed`) | by species (`species`) | regional rations, GLEAM-style (`gleam`) | Which animal groups each feed crop goes to, so how much maize, wheat or soy is freed when one group shrinks. |
| Farming's future without the levers (`base`) | population growth: today's diet × population (`population`) | SSP2 path for farm emissions (`ssp2`) | The baseline emissions to 2100, and the size of the avoided emissions, which are scaled the same way. |
| Where production changes (`loc`) | trade shares held (`fixedTrade`) | each country itself (`domestic`) | Which countries' farms change on the map. World totals of animal products are the same; feed crops differ because feed falls where animals are. A cut a country cannot make in its own production goes to its suppliers. |
| Observed temperature (`temp`) | HadCRUT5 (`hadcrut5`) | Berkeley Earth (`berkeley`) | Only the observed line on the chart. The projections do not change. FaIR's ensemble is constrained on the mean of four observed records, which include both of these. Years a series does not cover are left blank. |
| Climate response (`clim`) | FaIR (`fair`) | AR6 tables (`ar6`) | How emissions become warming. FaIR runs in the app, with a 5–95% range across its members. The AR6 fallback adds up the warming per tonne of each gas from a single curve, so its range is the median line itself. |
| Freed farmland (`regrow`) | left as it is (`none`) | grows back (`natural`) | Whether farmland freed by the shift takes up CO₂ as natural vegetation grows back, for 30 years after each hectare is freed. The scenario's CO₂ falls by that uptake, so the warming and the CO₂ avoided grow; methane and nitrous oxide do not change. See [The shift](#method-shift), step 8, and [Land](#method-land). |
| Uncaught large fish (`deadfall`) | not counted (`off`) | counted (`on`) | Whether tunas, mackerels and sharks left uncaught, when the catch falls, sink part of their carbon to the deep ocean when they die. The storage builds up with a 10-year time constant as stocks recover, and counts as negative CO₂ in farming, credited to the diet and less waste. It is under 1% of seafood's emissions: a full seafood shift stores 1.6 Mt CO₂ a year once built up. See [Fish and seafood](#method-seafood). |
| AI data centres (`dc`) | growth added, IEA (`iea`) | as in the scenario (`ssp`) | With `iea`, the electricity that data centres use beyond 2024's 415 TWh is added to the future without any lever, at each year's grid intensity. That electricity follows the IEA's *Energy and AI* to 2035 and is held flat after. The baseline temperature rises by a few thousandths of a degree, and the renewable-electricity lever can cut it. With `ssp`, the scenario's electricity is used as published, with no extra demand to cut. See [Energy and transport](#method-sectors). |
| Permafrost (`pf`) | thaws (`on`) | left out (`off`) | With `on`, each year's rise in temperature releases carbon from thawing permafrost over the next 20 years, as CO₂ and methane. The release is computed on the baseline temperature, which rises, and on the temperature with the levers. The levers' cooling releases less, so the warming avoided grows a little. See [Climate](#method-climate). |
| Rest of the world's emissions (`ssp`) | middle, SSP2-4.5 (`ssp245`) | low, SSP1-2.6 (`ssp126`); high, SSP3-7.0 (`ssp370`) | The total temperature curve, agriculture's share of it, and, with the population baseline, the adjustment between the two agricultural paths. |
| World population (`pop`) | UN medium projection (`medium`) | UN low (`low`), UN high (`high`) projection | With the population baseline, the world population that scales farm emissions to 2100, in the baseline and with the levers alike: 10.2 billion people in 2100 with the medium projection, 7.0 with the low and 14.4 with the high. See *World population* below. |

When an intensity is missing in the chosen scope, the other scope's is used. When it is missing in both, the item adds no emissions, and the country's data quality shows the lowest tier.

## World population

The baseline's farm emissions grow with the number of people to feed. With *World population*, you choose which of the UN's projections that number follows. With the default baseline, a larger population raises both the baseline and what the diet shift and the farm levers avoid.

With the default *today's diet × population* baseline, each year's farm emissions are the base year's × world population that year ÷ world population in the base year (see [The shift](#method-shift)).

### What it changes

The option changes the baseline's farm emissions from the base year on, and so its temperature. With SSP2-4.5 and the FaIR response, the baseline is 2.83 °C in 2100 with the medium projection, 2.74 °C with the low and 2.92 °C with the high. In 2050 the low and the high projections are within 0.01 °C of the medium one.

The diet shift and the farm levers change emissions that are scaled the same way. So what they avoid grows or shrinks with population. A 50% shift avoids 0.178 °C in 2100 with the medium projection, 0.149 °C with the low and 0.213 °C with the high (0.070, 0.067 and 0.073 °C in 2050).

The less-waste lever acts on the same scaled supply. Clearing (deforestation), carbon stored in farmland, natural regrowth, the carbon of uncaught large fish and the energy levers are not scaled with population, so they do not change.

With the *SSP2 path* baseline, farm emissions follow SSP2-4.5's own path, and the population chosen changes nothing.

### Where the numbers come from

Each country's population is FAOSTAT's, which carries the medium projection of the UN's World Population Prospects 2024 (WPP 2024). WPP 2024 also publishes a low and a high projection. In those, women have on average half a child fewer or more than in the medium one. They differ from the medium from 2024 on.

For each country, the pipeline divides each projection's population by the medium one in 2025, 2030 and every ten years to 2100 (`population.json`). The app multiplies the country's own population by that ratio. Between those years the ratio is interpolated linearly, from 1 in 2023, the last year of estimates. A country that WPP has no projection for takes the world's ratio.

Summed over the 187 countries, this gives the world populations below. The chart shows WPP's own world total, which includes the few countries the model leaves out.

| UN projection (WPP 2024, world) | 2050 | 2100 | Peak |
| --- | --- | --- | --- |
| Medium (default) | 9.66 billion | 10.18 billion | 10.29 billion in 2084 |
| Low | 8.94 billion | 6.99 billion | 8.95 billion in 2052 |
| High | 10.40 billion | 14.40 billion | still rising in 2100 |

### Why it is not a lever

Population is not something a government sets. How many children people have depends on choices families make, shaped by education, child survival, health care and access to voluntary family planning. The gap between the UN's projections is half a child per woman.

The option sets the future against which the levers are measured. The baseline and the scenario use the same population, so the warming avoided never counts population itself, and the breakdown by family shows only the levers. Diets per person stay as they are in every projection.

### The rest of the world stays the scenario's

The fossil fuels, aerosols and land use of the scenario world (`ssp`) come with the population their authors assumed: the 2017 SSP projections, about 6.9 billion in 2100 for SSP1, 9.0 for SSP2 and 12.6 for SSP3. The option does not change them.

The pairings that roughly fit together are low with SSP1-2.6, medium with SSP2-4.5, and high with SSP3-7.0. The two that contradict each other, the low projection with SSP3-7.0 and the high one with SSP1-2.6, are allowed.

### People on Earth

The *People on Earth* control, in the panel, replaces the UN projection with a number of people you choose, as a thought experiment. By default, its box *Follow the UN population projections* is ticked. Untick it, and its slider sets the number of people, from 0 to 14 billion, reached by the year every lever is in place. The population goes in a straight line from today's count to that number, then holds it. Marks on the slider show what the UN's low, medium and high projections give in that year. While a number is set, the *World population* option is hidden, and the address keeps the number as `ppl`, in billions.

Every human emission changes with the number of people. Farm emissions follow it through the population baseline, whatever the baseline option. Every other emission is the scenario's emission per person times the number of people. This covers the greenhouse gases of fossil fuels, industry, waste and land use, through their temperature response. It also covers air pollution, through its forcing and the methane its NOx and VOCs leave in the air. The scenario's own population is first scaled to today's count, so emissions do not jump in the current year. The baseline and the scenario move together, so the warming the levers avoid does not count the people themselves. On the Causes of warming chart, each change is counted under the cause it comes from.

At 0, human emissions stop. The planet warms for a few years, because air pollution no longer cools it. After that, the carbon dioxide already in the air keeps the temperature up. The temperature falls only slowly, as methane fades.

### The population on the temperature chart

World population is drawn as a light area behind the temperature lines, on an axis in billions on the right. It shows world population counted and estimated to 2023: Our World in Data's long-run series, from HYDE 3.3 and Gapminder, to 1949, then WPP 2024's estimates. Then it shows the projection in use, or the people-on-Earth path when one is set. The other projections are not drawn. Their figures are in the table above. The chart's hover gives the population of each year.

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

Each lever's adoption is 0–100, in percent. It is left out of the address at 0.

| Family | Levers (URL key) |
| --- | --- |
| Farm practices | feed additives (`fa`), breeding and feed (`bf`), manure management (`mm`), rice paddies drained (`rw`), less nitrogen, better used (`ne`), clean farm energy (`fe`) |
| Food waste | waste after shops (`fw`), losses before shops (`sl`) |
| Deforestation | deforestation stopped (`df`), drained peat rewetted (`pr`) |
| Carbon in farmland | cover crops (`cc`), trees on farms (`af`), biochar (`bc`), rock dust, experimental (`ew`) |
| Energy and transport | electric cars (`ev`), electric trucks (`et`), less flying (`fl`), clean aviation fuel (`saf`), clean shipping (`cs`), renewable electricity (`re`) |
| Buildings and industry | clean heating (`ch`), clean industry (`ci`) |
| Methane leaks | oil and gas leaks (`ogm`), coal-mine methane (`cmm`) |
| HFC phase-down | HFC phase-down (`hfc`) |

A value the page does not recognise falls back to its default.

**Example.** `?shift=10&dai=100&basis=kcal&ev=50&ssp=ssp126` is a 10% shift with all dairy replaced, calories kept, and half of road passenger transport electric, under SSP1-2.6.

## Assumptions

- Both values of every option are built and tested. The defaults follow the plan's choices and are to be reviewed before release.
- The SSP2 baseline always follows SSP2-4.5's agricultural emissions, whatever the rest of the world's emissions chosen for the temperature.
- The AR6 fallback has no range. The range shown with it is zero, not unknown.
- Data centres' growth is added by default. It is already happening, and the scenarios, made around 2016, did not foresee it, so the baseline is more realistic with it. Switching it off reproduces the published scenario temperatures.
- Permafrost is on by default. Most of the models behind the published scenario temperatures leave it out, so those temperatures miss a warming that AR6 assesses. Switched off, the baseline matches them. One pass of the feedback is computed. The further release that this feedback's own warming would cause is not.
- World population follows the UN's medium projection by default, which is what each country's population already carries. The low and high projections are the UN's own, not the SSPs', so that the population can be chosen apart from the scenario world.
- Uncaught large fish are off by default. The pathway is small, and depends more on where fish are caught than on how much is eaten; its deep-water share and build-up are assumptions.
- Regrowth is off by default. Whether freed land is left to grow back is a choice about land, beyond the diet, and its uptake is less certain than the farm emissions. With the AR6 fallback, the range shown with regrowth on comes from the regrowth rates alone.

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
