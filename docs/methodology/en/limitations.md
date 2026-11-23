# Limitations

Planetshift answers a narrow question with simple, stated rules. Here is what it leaves out, and how precise its numbers are.

## What is left out

**Fish and seafood.** Fish and seafood are in the model, but their intensities are published world values by species group (fishing fuel, fish-farm energy and N₂O), blended by each country's mix of capture and aquaculture, not national inventories; wild fish have no farm-gate emissions, since fuel counts only in cradle to farm gate. Methane from fish ponds, vessels and refrigerants, aquatic plants and the ocean's carbon pathways (fish carcasses that sink, sediments stirred by trawls) are left out. See [Fish and seafood](#method-seafood).

**Land use.** Planetshift counts the farmland a shift frees and, if chosen under Options, the CO₂ it takes up as natural vegetation grows back. With regrowth on, land a scenario newly uses is charged the uptake it forgoes, but clearing standing forest for new pasture and crops is counted only as far as the deforestation data tie it to production, and the carbon freed land could store in other ways (planted forest, restored peat) is not counted. Both can be larger than all the farm emissions together, so with regrowth off the benefit of a shift is smaller than it could be, not larger. The Causes of warming chart still shows land-use change as a cause of past warming, from published data. For scale: Eisen and Brown (2022) find that phasing out animal farming over 15 years, with the freed land's vegetation fully recovering (about 790 Gt of CO₂ taken up over 30 years), would give 3.8 instead of 4.9 W/m² of radiative forcing in 2100, "the same effect … as a 68% reduction of CO₂ emissions". Their regrowth takes up about 26 Gt of CO₂ a year, against about 8.7 Gt, net of the land newly used, in Planetshift's full shift with regrowth on, which counts only young natural forest where it can grow and none on dry rangeland; Planetshift's full shift avoids 0.27 °C (0.18–0.40) in 2100 without regrowth and 0.36 °C (0.19–0.74) with it.

**Air pollution and fuel methane.** The energy, heating and industry levers cut the methane leaked producing the fuel and the air pollution burning it made, with one ratio per sector and world-wide forcing per kg (see [Energy and transport](#method-sectors)). Where the pollution is emitted matters and is modelled only for NOx's methane, split between land and sea from one multi-model study of transport (Hoor et al. 2009) and kept to FaIR's global average: a tonne of SO₂ over clean ocean air cools more than one over a polluted region, NOx's ozone is the same everywhere, and power plants, buildings and industry share road's place on land for want of comparable figures. NOx's methane remains the largest and least certain of these terms, and grows with the scenario's methane: in SSP3-7.0 electric cars and trucks still end up adding warming by 2100 (0.018 and 0.025 °C). Chemistry models find road traffic's ozone outweighing its methane (net +16 ± 13 mW/m², against −18 ± 10 for shipping; Myhre et al. 2011), whereas FaIR's methane response to NOx, which appears stronger than theirs (about 2 kg of methane per kg of NO₂, against a few tenths for road NOx in those models), makes NOx cuts warm even on land, so the model may still make electric vehicles' co-emissions too costly. Carbon monoxide, volatile organic compounds and ammonia from fuel, refineries' own pollution and inventories' undercounting of methane leaks (satellites find more) are left out, and no lever targets air pollution on its own (filters, cleaner cookstoves). The data centres' extra demand in the baseline carries its CO₂ only. See [Causes of global warming](#method-link).

**Food transport, processing, packaging and retail.** Only what happens on the farm is counted by default; under Options, you can add the making of fertiliser and the energy used on the farm. What happens to food after the farm gate is out. The energy and transport levers act on the world's vehicles, flights, ships and power stations as a whole, not on food's share of them.

**Energy beyond a few sectors.** The energy levers cover road transport, aviation, shipping, electricity and data centres' extra demand. District heat, rail, industries other than steel and cement, and the making of vehicles, batteries, solar panels and chips are not levers; the levers change the scenario's methane and aerosols only through the fuel they cut. Electric vehicles do not get more efficient over time, aviation's non-CO₂ forcing keeps its 2018 ratio to CO₂, and the levers are adoption shares, not policies or costs.

**Making the equipment.** The levers count the fuel and electricity used, not the emissions of making vehicles and their batteries, wind turbines and solar panels, data centres and their chips, or farm machinery. For electric cars this makes the saving too large: life-cycle studies that count the battery find electric cars' lifetime emissions about half a petrol car's worldwide (IEA 2024), and 66–69% lower in Europe but 19–34% lower in India (Bieker 2021). Wind and solar power's life-cycle emissions are a few per cent of coal's (Schlömer et al. 2014). See [Energy and transport](#method-sectors).

**Farming levers.** Practices, waste, deforestation and carbon in farmland are shares adopted with published effects; whether a practice can be adopted in a country is a judgement, soil carbon can be lost again, and wasting less frees money spent on something else, a rebound left out. See [Levers](#method-levers).

**Permafrost and other feedbacks.** The permafrost switch adds one Earth-system feedback, simply: each degree's release spread over 20 years, one pass, abrupt thaw left out, with a range wide by a factor of ten. Other feedbacks beyond FaIR's carbon cycle (forest dieback, methane hydrates) are not included.

**How trade responds.** Each country's farms change in proportion to their share of world output. In reality, a fall in beef demand would hit some exporters harder than others, and prices would shift who grows what.

**Prices and incomes.** Cheaper or dearer food changes what people buy; Planetshift does not model it. A shift is a choice you set, not a forecast of what people will do.

**Health.** Planetshift keeps protein or calories equal but does not check the diet against health guidelines or estimate health outcomes.

**Non-food crops.** Cotton, tobacco, rubber and biofuel crops are out.

**Below country level.** Production and emissions are by country; there are no maps of where within a country food is grown.

## How precise the numbers are

The temperature range comes from the spread of the climate model's response to each gas (the 5th to 95th percentile of a calibrated set of runs). It does not include the uncertainty in the emissions per tonne of each food, which can be large, nor in the diets and feed shares. The real range is wider than the one shown.

The emissions per tonne come from the best source available for each food and country, from HESTIA's data for that country down to a world median for the food group. The data-quality map shows which; where it is poor, treat that country's numbers as rough.

The avoided warming in 2050 is small, a few hundredths of a degree for a modest shift; the energy levers in full avoid several tenths by 2100. Read it with its range and as an order of magnitude, not to the last digit. Changes in emissions are more robust than changes in temperature, and the direction of the change is more robust than its size.

## Assumptions

- Leaving out land use, as the default does, is conservative: counting regrowth makes the warming avoided larger.
- The climate response is linearised around the baseline scenario, which holds well for levers that change a small part of the world's emissions (most farming and land levers, single energy levers), and less well for the energy levers in full, which remove a large part of the scenario's CO₂: their warming avoided is a first-order estimate.

## Sources

- Poore, J. and Nemecek, T. (2018). Reducing food's environmental impacts through producers and consumers. Science 360, 987–992.
- Hayek, M. N. et al. (2021). The carbon opportunity cost of animal-sourced food production on land. Nature Sustainability 4, 21–24.
- Hoor, P. et al. (2009). The impact of traffic emissions on atmospheric ozone and OH: results from QUANTIFY. Atmospheric Chemistry and Physics 9, 3113–3136.
- Myhre, G. et al. (2011). Radiative forcing due to changes in ozone and methane caused by the transport sector. Atmospheric Environment 45, 387–394.
- Eisen, M. B. and Brown, P. O. (2022). Rapid global phaseout of animal agriculture has the potential to stabilize greenhouse gas levels for 30 years and offset 68 percent of CO₂ emissions this century. PLOS Climate 1, e0000010.
- Bieker, G. (2021). A global comparison of the life-cycle greenhouse gas emissions of combustion engine and electric passenger cars. ICCT white paper, [theicct.org](https://theicct.org/publication/a-global-comparison-of-the-life-cycle-greenhouse-gas-emissions-of-combustion-engine-and-electric-passenger-cars/).
- IEA (2024). Global EV Outlook 2024, [iea.org/reports/global-ev-outlook-2024](https://www.iea.org/reports/global-ev-outlook-2024). Licence: CC BY 4.0.
- Schlömer, S. et al. (2014). Annex III: Technology-specific cost and performance parameters. In Climate Change 2014: Mitigation of Climate Change, contribution of Working Group III to the IPCC's Fifth Assessment Report, Cambridge University Press, table A.III.2.
