# Limitations

Planetshift answers a narrow question with simple, stated rules. The temperature ranges it shows are narrower than the real uncertainty, so read the warming avoided as an order of magnitude.

## What is left out

**Fish and seafood.** Fish and seafood are in the model, but their intensities (emissions per tonne) do not come from national inventories. They are published world values by species group: fishing fuel, fish-farm energy and N₂O (nitrous oxide). They are blended by each country's mix of capture and aquaculture. Wild fish have no farm-gate emissions, since fuel counts only in cradle to farm gate. Left out are: methane from fish ponds, vessels and refrigerants, aquatic plants, and sediments stirred by trawls. The carbon that uncaught large fish sink to the deep ocean is an option, off by default (*Uncaught large fish*). It is under 1% of seafood's emissions, and rests on two assumptions: the share of the catch taken over deep water (0.44) and a stock recovery with a 10-year time constant. Their faeces and daily migrations are not counted. See [Fish and seafood](#method-seafood).

**Land use.** Planetshift counts the farmland a shift frees. If chosen under *Other options*, it also counts the CO₂ that land takes up as natural vegetation grows back. With regrowth on, land that a scenario newly uses is charged with the uptake it gives up. Two things are only partly counted or not counted:

- clearing standing forest for new pasture and crops is counted only as far as the deforestation data tie it to production;
- the carbon freed land could store in other ways (planted forest, restored peat) is not counted.

Both can be larger than all the farm emissions together. So with regrowth off, the benefit of a shift is smaller than it could be, not larger. The Causes of warming chart still shows land-use change as a cause of past warming, from published data.

For scale, Eisen and Brown (2022) phase out animal farming over 15 years, with the freed land's vegetation fully recovering (about 790 Gt of CO₂ taken up over 30 years). They find 3.8 instead of 4.9 W/m² of radiative forcing in 2100, "the same effect … as a 68% reduction of CO₂ emissions". Their regrowth takes up about 26 Gt of CO₂ a year. Planetshift's full shift with regrowth on takes up about 8.9 Gt, net of the land newly used. It counts only young natural forest where it can grow, and none on dry rangeland. Planetshift's full shift avoids 0.28 °C (0.18–0.44) in 2100 without regrowth and 0.38 °C (0.20–0.82) with it.

**Air pollution and fuel methane.** The energy, heating and industry levers cut the CO₂, methane and N₂O emitted while producing the fuel. They also cut the air pollution from burning it. Both are counted with one ratio per sector and world-wide forcing per kg (see [Energy and transport](#method-sectors)). Forcing is the change in the energy the Earth keeps, which warms it. Three simplifications matter most:

- The fuel that refineries, coke ovens and oil and gas fields burn themselves is counted with the fuel they supply. It is split between oil and coal by an assumption, because the open inventories do not split it.
- Where the pollution is emitted matters, but it is modelled only for NOx's methane. In the model, a tonne of SO₂ (sulphur dioxide) has the same effect wherever it is emitted. In reality, it cools more over clean ocean air than over a polluted region.
- NOx's methane remains the largest and least certain of these terms. The website takes it from chemistry models rather than from FaIR, the climate model.

The details and figures are in *Air pollution and NOx's methane in detail*, below. Carbon monoxide's own effect on methane, which FaIR leaves out, is not counted. This is an open question (see [Energy and transport](#method-sectors)). No lever targets air pollution on its own (filters, cleaner cookstoves). See [Causes of global warming](#method-link).

**Methane leaks that inventories miss.** Satellites and aircraft find more methane than countries report. The IEA puts energy's methane about 80% above the national inventories submitted to the UN (Global Methane Tracker 2025). Surveys of US oil and gas find losses about three times the national inventory (Sherwin et al. 2024). Planetshift's supply methane does not come from those inventories, but from CEDS. CEDS gives 131 million tonnes from fossil fuels in 2022. The IEA's figure is above 120, so CEDS is at or above it. Atmospheric inversions put fossil fuels at 115 Tg a year (100–124), against 120 from inventories, over 2010–2019 (Saunois et al. 2025). So the levers' supply methane is likely right to within about a tenth. Abandoned wells and mines emit about 8 million tonnes a year (IEA 2025). These emissions do not fall when today's fuel use does, and CEDS may hold part of them in its ratios.

**What clean fuels leave behind.** Each of the following would be a departure from FaIR:

- Clean aviation fuel's effect on contrails is not counted. Fuels with fewer aromatics made 50–70% fewer soot and ice particles in flight measurements (Voigt et al. 2021), and pure clean fuel 35% fewer soot particles (Märkl et al. 2024). No estimate of the forcing for a world share of such fuel was found.
- Hydrogen that leaks from clean steel's direct-reduction route warms the climate. It has a 100-year warming potential of 11.6 ± 2.8 (Sand et al. 2023). FaIR has no hydrogen. A tonne of steel needs about 50 kg of hydrogen. At 1–10% leakage, it would cancel 0.3–3% of the CO₂ saved, by Planetshift's rough estimate.
- Ships on ammonia may release N₂O and ammonia that offset part of their gain. No reliable world figure was found.

**Food transport, processing, packaging and retail.** By default, what happens on the farm is counted with the making of fertiliser and the energy used on the farm. Under *Other options*, you can keep the farm's biological processes only. Emissions from food after the farm gate are counted from FAOSTAT's country totals. Each food gets its share by Poore and Nemecek's stages or by mass, and the emissions are placed where the food is produced (see [Emissions](#method-emissions), *After the farm*). The cold chain's refrigerants count as HFC-134a, and the model does not follow the Kigali amendment's phase-down of them. The energy and transport levers act on the world's vehicles, flights, ships and power stations as a whole, not on food's share of them. So the energy after the farm does not get cleaner with them.

**Energy beyond a few sectors.** The energy levers cover road transport, aviation, shipping, electricity and data centres' extra demand. There are no levers for district heat, rail, industries other than steel, cement and chemicals, or the making of vehicles, batteries, solar panels and chips. The levers change the scenario's methane and aerosols only through the fuel they cut. Electric vehicles do not get more efficient over time. Aviation's non-CO₂ forcing keeps its 2018 ratio to CO₂. The levers are adoption shares, not policies or costs.

**Making the equipment.** The levers count the fuel and electricity used. They do not count the emissions of making vehicles and their batteries, wind turbines and solar panels, data centres and their chips, or farm machinery. For electric cars, this makes the saving too large. Life-cycle studies that count the battery find electric cars' lifetime emissions about half a petrol car's worldwide (IEA 2024). They are 66–69% lower in Europe but 19–34% lower in India (Bieker 2021). Wind and solar power's life-cycle emissions are a few per cent of coal's (Schlömer et al. 2014). See [Energy and transport](#method-sectors).

**Farming levers.** Practices, waste, deforestation and carbon in farmland are shares adopted, and each effect comes from published studies. Whether a practice can be adopted in a country is a judgement. Soil carbon can be lost again. Wasting less frees money that is spent on something else. The model leaves out this rebound. See [Levers](#method-levers).

**Permafrost and other feedbacks.** The permafrost switch adds one Earth-system feedback, in a simple way. Each degree's release is spread over 20 years and computed in one pass. Abrupt thaw is left out. Its range spans a factor of ten. Other feedbacks beyond FaIR's carbon cycle (forest dieback, methane hydrates) are not included.

**How trade responds.** Each country's farms change in proportion to their share of world output. In reality, a fall in beef demand would hit some exporters harder than others, and prices would shift who grows what.

**Prices and incomes.** Cheaper or dearer food changes what people buy. Planetshift does not model it. A shift is a choice you set, not a forecast of what people will do.

**Health.** Planetshift keeps protein or calories equal. It does not check the diet against health guidelines or estimate health outcomes.

**Freshwater.** Withdrawals are counted, not the water consumed, except on the crops-only scarcity layer. HESTIA's litres cover 35 crops in 56 countries, and HESTIA's World averages cover 15 more. The rest are Poore & Nemecek's world values, so a country's irrigation counts only where HESTIA has its own aggregation. Animal products take the study's value less the water of their concentrate feed, an estimate of the farm's own water that depends on the GLEAM-style rations. Fish farms' water is not counted. Countries differ from AQUASTAT more than the world does (the median country is 1.7 times its figure, Bangladesh almost six). See [Freshwater](#method-water).

**Non-food crops.** Cotton, tobacco, rubber and biofuel crops are not in the model.

**Below country level.** Production and emissions are by country. There are no maps of where within a country food is grown.

## How precise the numbers are

The temperature range comes from the spread of the climate model's response to each gas: the 5th to 95th percentile of a calibrated set of runs. It does not include the uncertainty in the emissions per tonne of each food, which can be large. Nor does it include the uncertainty in the diets and feed shares. The real range is wider than the one shown.

The emissions per tonne come from the best source available for each food and country. This ranges from HESTIA's data for that country down to a world median for the food group. The data-quality map shows which. Where the data quality is poor, treat that country's numbers as rough.

The avoided warming in 2050 is small: a few hundredths of a degree for a modest shift. The energy levers in full avoid several tenths by 2100. Read the avoided warming with its range and as an order of magnitude, not as an exact figure. Changes in emissions are more robust than changes in temperature. The direction of the change is more robust than its size.

## Air pollution and NOx's methane in detail

### Where the pollution is emitted

Where the pollution is emitted is modelled only for NOx's methane. It is taken for land and for sea from one multi-model study of transport (Hoor et al. 2009). NOx's ozone is the same everywhere. Power plants, buildings and industry take road's value on land, because there are no comparable figures for them.

A tonne of SO₂ over clean ocean air cools more than one over a polluted region:

- Four models give −3.1 to −10.7 mW/m² per Tg a year of SO₂, depending on region and season. They find it "more efficient to perturb European or shipping aerosol emissions than East Asian emissions" (Bellouin et al. 2016).
- In one model, China's emissions cooled the world about fourteen times more when released over Western Europe than over India (Persad and Caldeira 2018). Their forcing also warmed or cooled the world by 0.24 to 1.3 K per W/m², depending on where it was emitted. The model takes 1 everywhere.

Power plants' SO₂ is now mostly in India, Indonesia, Türkiye and Saudi Arabia, and steel's and cement's in China and India (CEDS). These are regions with polluted air. So the world-wide forcing likely overstates the cooling that the levers remove in those regions, and understates it for ships. The regional estimates cover too few regions, and disagree too much, to correct it.

### Why NOx's methane comes from the chemistry models

The website takes NOx's methane from the chemistry models rather than from FaIR. This is the `chemistry` value of the `noxMethane` departure (see the [temperature page](#method-climate)). A multi-model chemistry study of each transport sector is more realistic than one global coefficient.

FaIR's methane response to NOx is about 2 kg of methane per kg of NO₂. This is several times the chemistry models' response for road traffic. Those models find road traffic's ozone outweighing its methane: net +16 ± 13 mW/m², against −18 ± 10 for shipping (Myhre et al. 2011). With FaIR's response, electric cars and trucks appeared to add warming by 2100 in SSP3-7.0.

### How the value is derived

Hoor et al. give the forcing of methane and methane-ozone per kg of NO₂, with the VOCs' and CO's methane given back. That forcing is turned into the methane emission that would cause it, at ACCMIP's 2.9 mW/m² per million tonnes a year (Stevenson et al. 2013). The result is:

- 0.70 kg of methane for road traffic (0.63–0.76 across the five models);
- 1.27 kg for ships;
- against FaIR's 1.49 for every source in 2000, the models' year.

Each then follows FaIR's change with the scenario.

### What the choice changes

| Electric cars and trucks, by 2100 | SSP3-7.0 | SSP2-4.5 |
| --- | --- | --- |
| Chemistry models (website default) | 0.034 and 0.016 °C avoided | 0.103 and 0.066 °C avoided |
| FaIR's one coefficient | 0.020 and 0.019 °C added | 0.092 and 0.059 °C avoided |
| FaIR's coefficient shared between land and sea by Hoor et al.'s ratio | 0.010 and 0.013 °C added | 0.098 and 0.063 °C avoided |

A fork can keep FaIR's one coefficient (`fair`) or the land and sea split of FaIR's total (`hoor`).

### What remains uncertain

- The values come from one study, five models and one year.
- They are carried to other years and scenarios by FaIR's own change, which grows with the scenario's methane. Road's 0.70 kg becomes 2.0 kg by 2100 in SSP3-7.0.
- Power plants, buildings and industry take road's value.
- The choice does not keep FaIR's world total. FaIR's calibration constrains that total with the rest of its methane budget. It cuts the methane of all the world's NOx to about half of FaIR's.

## Assumptions

- Leaving out land use, as the default does, is conservative, because counting regrowth makes the warming avoided larger.
- The climate response is linearised around the baseline scenario. This holds well for levers that change a small part of the world's emissions: most farming and land levers, and single energy levers. It holds less well for the energy levers in full, which remove a large part of the scenario's CO₂. Their warming avoided is a first-order estimate.

## Sources

- Poore, J. and Nemecek, T. (2018). Reducing food's environmental impacts through producers and consumers. Science 360, 987–992.
- Hayek, M. N. et al. (2021). The carbon opportunity cost of animal-sourced food production on land. Nature Sustainability 4, 21–24.
- Hoor, P. et al. (2009). The impact of traffic emissions on atmospheric ozone and OH: results from QUANTIFY. Atmospheric Chemistry and Physics 9, 3113–3136.
- Myhre, G. et al. (2011). Radiative forcing due to changes in ozone and methane caused by the transport sector. Atmospheric Environment 45, 387–394.
- Stevenson, D. S. et al. (2013). Tropospheric ozone changes, radiative forcing and attribution to emissions in the Atmospheric Chemistry and Climate Model Intercomparison Project (ACCMIP). Atmospheric Chemistry and Physics 13, 3063–3085, [doi:10.5194/acp-13-3063-2013](https://doi.org/10.5194/acp-13-3063-2013), as tabulated in Bellouin, N. et al. (2016), Atmospheric Chemistry and Physics 16, 13885–13910, Table 1.
- Persad, G. G. and Caldeira, K. (2018). Divergent global-scale temperature effects from identical aerosols emitted in different regions. Nature Communications 9, 3289, [doi:10.1038/s41467-018-05838-6](https://doi.org/10.1038/s41467-018-05838-6).
- IEA (2025). Global Methane Tracker 2025, [iea.org/reports/global-methane-tracker-2025](https://www.iea.org/reports/global-methane-tracker-2025). Licence: CC BY 4.0.
- Sherwin, E. D. et al. (2024). US oil and gas system emissions from nearly one million aerial site measurements. Nature 627, 328–334, [doi:10.1038/s41586-024-07117-5](https://doi.org/10.1038/s41586-024-07117-5).
- Saunois, M. et al. (2025). Global Methane Budget 2000–2020. Earth System Science Data 17, 1873–1958, [doi:10.5194/essd-17-1873-2025](https://doi.org/10.5194/essd-17-1873-2025).
- Voigt, C. et al. (2021). Cleaner burning aviation fuels can reduce contrail cloudiness. Communications Earth & Environment 2, 114, [doi:10.1038/s43247-021-00174-y](https://doi.org/10.1038/s43247-021-00174-y).
- Märkl, R. S. et al. (2024). Powering aircraft with 100 % sustainable aviation fuel reduces ice crystals in contrails. Atmospheric Chemistry and Physics 24, 3813–3837, [doi:10.5194/acp-24-3813-2024](https://doi.org/10.5194/acp-24-3813-2024).
- Sand, M. et al. (2023). A multi-model assessment of the Global Warming Potential of hydrogen. Communications Earth & Environment 4, 203, [doi:10.1038/s43247-023-00857-8](https://doi.org/10.1038/s43247-023-00857-8).
- Eisen, M. B. and Brown, P. O. (2022). Rapid global phaseout of animal agriculture has the potential to stabilize greenhouse gas levels for 30 years and offset 68 percent of CO₂ emissions this century. PLOS Climate 1, e0000010.
- Bieker, G. (2021). A global comparison of the life-cycle greenhouse gas emissions of combustion engine and electric passenger cars. ICCT white paper, [theicct.org](https://theicct.org/publication/a-global-comparison-of-the-life-cycle-greenhouse-gas-emissions-of-combustion-engine-and-electric-passenger-cars/).
- IEA (2024). Global EV Outlook 2024, [iea.org/reports/global-ev-outlook-2024](https://www.iea.org/reports/global-ev-outlook-2024). Licence: CC BY 4.0.
- Schlömer, S. et al. (2014). Annex III: Technology-specific cost and performance parameters. In Climate Change 2014: Mitigation of Climate Change, contribution of Working Group III to the IPCC's Fifth Assessment Report, Cambridge University Press, table A.III.2.
