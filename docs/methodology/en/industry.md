# Buildings and industry

Beside transport and electricity, two parts of the economy burn fossil fuel directly: buildings, where gas and oil boilers heat rooms and water and stoves cook, and industry, where steel and cement are the largest emitters. Planetshift carries their direct CO₂ under each future scenario, with two levers that act on it. `industry.json` holds the data; the code is `pipeline/planetshift_pipeline/industry.py` and the lever module `app/src/levers/industry/`.

Like the [energy and transport](#method-sectors) sectors, these emissions are part of each scenario's fossil CO₂, not added to it: the scenario temperatures already include them. A lever takes a share away, less the CO₂ of the electricity it then draws, and the change is turned into warming avoided with the same CO₂ response curve as every other lever. The fuel no longer burnt also takes away the methane leaked producing it and its air pollution, and the electricity drawn brings the grid's, as for transport (see *Methane and air pollution that come with the fuel* on the [energy and transport](#method-sectors) page).

## The sectors and their futures

Each sector's emissions start in 2023 at a recent inventory and follow the shape of the scenario's trajectory from there, from the emissions FaIR itself is run with (RCMIP v5.1.0, the harmonised CMIP6 emissions, by CEDS sector), as for transport.

- **Buildings**: RCMIP's *Residential Commercial Other* CO₂, scaled to the IEA's 3.0 billion tonnes of direct CO₂ from buildings in 2022, taken for 2023. It is the fuel burnt on site for space and water heating and cooking; the electricity and district heat buildings use are in the electricity sector. RCMIP's sector also holds the fuel of farm machinery and fishing boats, so scaling it to the buildings inventory leaves those out (farm energy has its own lever).
- **Industry**: RCMIP's *Industrial Sector* CO₂, the fuel burnt in factories and the CO₂ of industrial processes such as calcining limestone, scaled to the IEA's 9.0 billion tonnes of direct CO₂ from industry in 2022, taken for 2023.

Emissions in billion tonnes of CO₂ a year (2023 / 2050 / 2100):

| Sector | SSP1-2.6 | SSP2-4.5 | SSP3-7.0 |
| --- | --- | --- | --- |
| Buildings | 3.00 / 2.87 / 1.45 | 3.00 / 2.75 / 1.88 | 3.00 / 3.05 / 1.98 |
| Industry | 9.00 / 3.92 / 1.06 | 9.00 / 10.41 / 5.47 | 9.00 / 10.81 / 12.18 |

The scenarios report no split of industry by product, so steel and cement are fixed shares of it, the same in every year and scenario:

- **Steel**: 28.9%, the IEA's 2.6 billion tonnes of direct CO₂ from iron and steel in 2022 out of industry's 9.0. Including the electricity steelworks buy, the sector's footprint is larger, about 3.6 billion tonnes (worldsteel), but that electricity is in the electricity sector.
- **Cement**: 28.7%. The Global Carbon Budget's open series of cement process CO₂ (Andrew, CO₂ released when limestone is calcined into clinker) gives 1.55 billion tonnes in 2023 (1.49 in 2024). Calcination is about 60% of a cement plant's direct CO₂, the rest the fuel burnt in the kiln, so cement emits about 2.6 billion tonnes directly, close to the IEA's 2.4.

The rest of industry, chemicals, aluminium, paper, food and others, about 42%, has no lever.

## The levers

**Clean heating.** Replacing a boiler by a heat pump (and a gas stove by an induction one) removes the fuel's CO₂ but draws electricity, whose CO₂ depends on the grid, as for an electric vehicle. `heatPumpKwhPerKgCo2` is the electricity needed per kilogram of the boiler's CO₂ avoided: the boiler's efficiency divided by the heat pump's seasonal coefficient of performance (COP) and by the fuel's CO₂ per kWh (natural gas 0.202 kg/kWh, heating oil 0.267 kg/kWh, from the IPCC's default factors of 56.1 and 74.1 t CO₂ per TJ).

- Median: 1.49 kWh/kg, a gas boiler at 90% replaced by a heat pump with a seasonal COP of 3. The IEA's *Future of Heat Pumps* (2022) puts heat pumps at three to five times as efficient as a gas boiler.
- Low end: 0.80 kWh/kg, an oil boiler at 85% replaced by a heat pump with a COP of 4.
- High end: 1.88 kWh/kg, a condensing gas boiler at 95% replaced by a heat pump with a COP of 2.5, as in cold climates.

The CO₂ clean heating saves is then the buildings' CO₂ × (1 − `heatPumpKwhPerKgCo2` × the grid's intensity). On today's world grid, 0.48 kg/kWh, a heat pump saves about 29% of a gas boiler's CO₂ (1 − 1.49 × 0.48), close to the IEA's "at least 20% even on gas-fired power"; on a clean grid it saves all of it.

**Clean steel and cement.** One lever for both, the share of their production made in clean ways. For each, `cut` is the share of its direct CO₂ that goes at full adoption and `kwhPerKgCo2` the electricity drawn per kilogram avoided:

- Steel: a cut of 90% (75–95%). Steel made from iron reduced with hydrogen and melted in an electric arc furnace emits 90–95% less on site than a blast furnace, scrap melted in an electric furnace about as much, and blast furnaces with carbon capture 75–90% (IEA, *Iron and Steel Technology Roadmap*, 2020; Mission Possible Partnership, *Making Net-Zero Steel Possible*, 2022). Hydrogen direct reduction needs about 3.5 MWh of electricity per tonne of steel, mostly to make the hydrogen (Vogl et al. 2018), against about 2 t of direct CO₂ from a blast furnace: 1.9 kWh per kg avoided. Scrap in an electric furnace needs about 0.6 MWh per tonne, 0.3 kWh/kg. The median, 1.5 kWh/kg, is three quarters hydrogen and a quarter more scrap; the range is 0.3 (all scrap) to 2.2 (less efficient electrolysis).
- Cement: a cut of 80% (60–95%), from clinker substitutes such as calcined clay and limestone (LC3), other fuels and, for the process CO₂ that no fuel change removes, carbon capture (GCCA, *Concrete Future*, 2021; IPCC AR6 WGIII chapter 11). Capture and compression draw about 0.1–0.3 MWh per tonne of CO₂ avoided (CEMCAP 2019): 0.25 kWh/kg at the median, 0.1 to 1.0 where kilns are also heated by electricity.

The CO₂ clean industry saves is industry's CO₂ × the sum over steel and cement of share × cut × (1 − kWh per kg × the grid's intensity). At full adoption on a clean grid, that is 49% of industry's CO₂ (26% from steel, 23% from cement); on today's grid, about 27%. Hydrogen made with grid power on a grid that still burns coal saves little, and at the high end of the electricity range on SSP3-7.0's grid the steel part can add CO₂, which the likely range shows.

Neither lever counts the CO₂ of making the heat pumps, electrolysers or capture plants.

**Methane and air pollution.** Per kg of their CO₂ in 2022 (CEDS), buildings' fossil fuels came with 5.6 g of methane, most of it leaked producing the gas they burn, 1.1 g of SO₂, 0.10 g of black carbon, 0.12 g of organic carbon and 1.0 g of NOx; the wood and dung burnt for cooking, a large share of buildings' soot, are left out, as no lever replaces them. Steel and cement plants came with 2.1 g of methane, less than other sectors because their process CO₂ from limestone burns no fuel, 1.4 g of SO₂ and 1.4 g of NOx. Each lever cuts these with the CO₂ it removes, and the electricity it draws brings the electricity sector's own (4.1 g of methane, 2.3 g of SO₂ and 1.5 g of NOx per kg of the grid's CO₂, falling as renewable electricity cleans the grid). The method, the forcing per kg and how they change over time are on the [energy and transport](#method-sectors) page.

## In the app

The **Buildings and industry** fold of the Levers section has two sliders, each the share adopted, ramping in from the current year to the year set by *All levers fully in place by*, like every lever (`app/src/levers/industry/model.ts`). In each year *y*, with each adoption *a* already ramped and *g* the grid's intensity of the scenario chosen, the grid these levers draw on is *g′* = *g* × (1 − *a*re), where *a*re is the renewable-electricity lever of the [energy and transport](#method-sectors) fold:

- Clean heating (`ch`) saves *a* × buildings' CO₂ × (1 − `heatPumpKwhPerKgCo2` × *g′*).
- Clean steel and cement (`ci`) saves *a* × industry's CO₂ × Σ share × cut × (1 − `kwhPerKgCo2` × *g′*) over steel and cement.

The CO₂ changes are convolved with the CO₂ AGTP curve, and what comes with them as for transport: the CO₂ of producing the fuel (for steel, its coke ovens' and coal mines'), methane and N₂O under *fossil fuels and industry*, and the air pollution, CO and VOCs included, under its own cause. The likely range pairs the 95% AGTP with the high end of each cut and the low end of each electricity use (and the 5% with the opposite ends). In the summary's breakdown by lever, all of it counts as *Buildings and industry*, including the extra saving renewable electricity brings to these levers when both are on; renewable electricity alone is counted under *Energy and transport*. The farm emissions, the map and the farming band of the Causes of warming chart are not changed.

## Results

Warming avoided in °C, median (likely range), each lever at 100% from 2026 to 2035, on the real data and SSP2-4.5 with the default options, with the supply CO₂, methane, N₂O and air pollution that come with the fuel (CO₂ alone in brackets after):

| Levers | 2050 | 2100 |
| --- | --- | --- |
| Clean heating | 0.014 (0.000–0.039); CO₂ alone 0.009 | 0.068 (0.041–0.118); CO₂ alone 0.052 |
| Clean steel and cement | 0.013 (−0.007–0.059); CO₂ alone 0.025 | 0.091 (0.036–0.189); CO₂ alone 0.092 |
| Renewable electricity alone | 0.092 (0.047–0.176); CO₂ alone 0.096 | 0.273 (0.180–0.406); CO₂ alone 0.234 |
| Clean heating with renewable electricity | 0.114 (0.056–0.217); CO₂ alone 0.113 | 0.361 (0.239–0.538); CO₂ alone 0.303 |
| Clean steel and cement with renewable electricity | 0.115 (0.053–0.237); CO₂ alone 0.131 | 0.385 (0.237–0.601); CO₂ alone 0.345 |

Clean heating gains from the co-emissions from the start: the gas it no longer burns leaked methane, and burning gas emits little SO₂. Clean steel and cement lose most of their 2050 effect: their plants' SO₂ cools, and the hydrogen route draws a lot of grid power whose CO₂ and methane it adds; by 2100 the loss is small, the coke ovens' CO₂ and the CO their furnaces emit, which now go with the coal, making up for most of it. With renewable electricity in full, clean heating adds 0.022 °C in 2050 and 0.088 °C in 2100 to it, and clean steel and cement 0.023 and 0.112 °C: on a clean grid each saves more than alone. The effects are small in 2050 because the CO₂ avoided adds up slowly and today's grid takes back much of what the electricity-hungry routes save.

## Other industries

Left out as levers, for want of a scenario trajectory or of a clear figure, or because their emissions are mostly electricity already covered by the renewable-electricity lever:

- Chemicals, about 1.3 billion tonnes of direct CO₂ (IEA); much of their fossil carbon ends up in products rather than in the air, which a simple share would misstate.
- Aluminium, about 1.1 billion tonnes of CO₂e including electricity, about 0.27 billion directly (IEA, International Aluminium Institute): mostly the electricity of smelters.
- Plastics, 1.8 billion tonnes of CO₂e over their life cycle in 2019 (OECD, *Global Plastics Outlook*, 2022), spread over chemicals, electricity and waste.
- Textiles and clothing, between about 0.9 and 4 billion tonnes of CO₂e depending on the scope (Apparel Impact Institute 2025; McKinsey and Global Fashion Agenda 2020; Quantis 2018), mostly the electricity and heat of mills in Asia.

## Assumptions

- Buildings' and industry's direct CO₂ follow their scenario's shape, scaled to 3.0 and 9.0 billion tonnes in 2023.
- Steel and cement are 28.9% and 28.7% of industry's direct CO₂ in every year and scenario.
- A heat pump needs 1.49 kWh per kg of a boiler's CO₂ avoided, in every year; heat pumps and boilers do not get more efficient over time.
- Clean steel and clean cement cut 90% and 80% of their direct CO₂ at full adoption and draw 1.5 and 0.25 kWh of electricity per kg avoided, on the grid left after renewable electricity.
- Making the equipment is not counted.
- What comes with buildings' and steel and cement plants' fuel (the CO₂ of producing it, methane, N₂O and air pollution) is CEDS's 2022 ratios per kg of their fossil CO₂, process CO₂ included for industry, changed with the scenario's emission factors; the electricity drawn brings the grid's (see [Energy and transport](#method-sectors)).

## Sources

- RCMIP protocol v5.1.0, SSP emissions by sector: [doi:10.5281/zenodo.4589756](https://doi.org/10.5281/zenodo.4589756). Licence: CC BY-SA 4.0.
- Community Emissions Data System (CEDS), v_2024_07_08: [doi:10.5281/zenodo.12803197](https://doi.org/10.5281/zenodo.12803197). Licence: CC BY 4.0.
- Andrew, R. M. Global CO₂ emissions from cement production, the Global Carbon Budget's series, version 260830: [doi:10.5281/zenodo.22178444](https://doi.org/10.5281/zenodo.22178444); method in Andrew (2019), Earth System Science Data 11, 1675–1710. Licence: CC BY 4.0.
- IEA (2023). Tracking Clean Energy Progress 2023: buildings, industry, iron and steel, cement, [iea.org/reports/tracking-clean-energy-progress-2023](https://www.iea.org/reports/tracking-clean-energy-progress-2023). Licence: CC BY 4.0.
- IEA (2022). The Future of Heat Pumps, [iea.org/reports/the-future-of-heat-pumps](https://www.iea.org/reports/the-future-of-heat-pumps). Licence: CC BY 4.0.
- IEA (2020). Iron and Steel Technology Roadmap, [iea.org/reports/iron-and-steel-technology-roadmap](https://www.iea.org/reports/iron-and-steel-technology-roadmap).
- IPCC (2006). Guidelines for National Greenhouse Gas Inventories, volume 2, chapter 1, table 1.4: default CO₂ emission factors for combustion.
- IPCC (2022). Climate Change 2022: Mitigation of Climate Change, Working Group III, chapter 11 (Industry).
- Mission Possible Partnership (2022). Making Net-Zero Steel Possible.
- Vogl, V., Åhman, M. and Nilsson, L. J. (2018). Assessment of hydrogen direct reduction for fossil-free steelmaking. Journal of Cleaner Production 203, 736–745, [doi:10.1016/j.jclepro.2018.08.279](https://doi.org/10.1016/j.jclepro.2018.08.279).
- GCCA (2021). Concrete Future: the GCCA 2050 Cement and Concrete Industry Roadmap for Net Zero Concrete.
- CEMCAP (2019). CO₂ capture from cement production, final results (EU Horizon 2020 project).
- worldsteel. Sustainability indicators (CO₂ per tonne of steel, including electricity).
