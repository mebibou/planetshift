# Buildings and industry

Besides transport and electricity, two parts of the economy burn fossil fuel directly. In buildings, gas and oil boilers heat rooms and water, and stoves cook food. In industry, steel and cement are the largest emitters, followed by chemicals. Planetshift has two levers here, clean heating and clean industry, which covers steel, cement and chemicals. Adopted in full, each avoids less than 0.02 °C of warming in 2050, and about 0.07 and 0.10 °C in 2100. They avoid much more when the electricity they use is clean (see *Results* below).

## How these emissions are counted

Like the [energy and transport](#method-sectors) sectors, these emissions are part of each scenario's fossil CO₂. They are not added to it, because the scenario temperatures already include them.

A lever takes a share of them away. It then draws electricity, whose CO₂ is subtracted from the saving. The change is turned into warming avoided with the same CO₂ response curve as every other lever.

Burning less fuel also avoids the methane leaked while producing it, and its air pollution. The electricity drawn adds the grid's methane and air pollution. This works as for transport (see *Methane and air pollution that come with the fuel* on the [energy and transport](#method-sectors) page).

`industry.json` holds the data. The code is `pipeline/planetshift_pipeline/industry.py`, and the lever module is `app/src/levers/industry/`.

## The sectors and their futures

Each sector's emissions start in 2023 at a recent inventory. From there, they follow the shape of the scenario's trajectory, as for transport. The trajectories are the emissions FaIR itself is run with: RCMIP v5.1.0, the harmonised CMIP6 emissions, by CEDS sector.

- **Buildings**: RCMIP's *Residential Commercial Other* CO₂, scaled to the IEA's 3.0 billion tonnes of direct CO₂ from buildings in 2022, taken for 2023. It is the fuel burnt on site for space and water heating and for cooking. The electricity and district heat that buildings use are in the electricity sector. RCMIP's sector also holds the fuel of farm machinery and fishing boats. Scaling it to the buildings inventory leaves those out (farm energy has its own lever).
- **Industry**: RCMIP's *Industrial Sector* CO₂, scaled to the IEA's 9.0 billion tonnes of direct CO₂ from industry in 2022, taken for 2023. It is the fuel burnt in factories, and the CO₂ of industrial processes such as calcining limestone.

Emissions in billion tonnes of CO₂ a year (2023 / 2050 / 2100):

| Sector | SSP1-2.6 | SSP2-4.5 | SSP3-7.0 |
| --- | --- | --- | --- |
| Buildings | 3.00 / 2.87 / 1.45 | 3.00 / 2.75 / 1.88 | 3.00 / 3.05 / 1.98 |
| Industry | 9.00 / 3.92 / 1.06 | 9.00 / 10.41 / 5.47 | 9.00 / 10.81 / 12.18 |

### Steel, cement and chemicals within industry

The scenarios do not split industry by product. Steel, cement and chemicals are therefore fixed shares of it, the same in every year and scenario:

- **Steel**: 28.9%. This is the IEA's 2.6 billion tonnes of direct CO₂ from iron and steel in 2022, out of industry's 9.0. With the electricity that steelworks buy, the sector's footprint is larger, about 3.6 billion tonnes (worldsteel). That electricity is in the electricity sector.
- **Cement**: 28.7%. The Global Carbon Budget's open series of cement process CO₂ (Andrew) gives 1.55 billion tonnes in 2023 (1.49 in 2024). Process CO₂ is the CO₂ released when limestone is calcined into clinker. Calcination is about 60% of a cement plant's direct CO₂, and the fuel burnt in the kiln is the rest. Cement therefore emits about 2.6 billion tonnes directly, close to the IEA's 2.4.
- **Chemicals**: 5.7%. Primary chemicals (ethylene, propylene, the aromatics, methanol and ammonia) emitted about 935 million tonnes of direct CO₂ in 2022, and ammonia 45% of it (IEA, *Tracking Clean Energy Progress*, chemicals). Ammonia is left out, which leaves 0.51 billion tonnes from methanol and high-value chemicals. Ammonia is what nitrogen fertiliser is made from. Its CO₂ is cut only on the farm side, by *Less nitrogen, better used*, in the cradle-to-farm-gate scope (see [Farm practices](#method-practices)), so no tonne is cut twice.

The rest of industry, about 37%, has no lever: ammonia, aluminium, paper, food and others.

## Clean heating

This lever replaces boilers with heat pumps, and gas stoves with induction stoves. It removes the fuel's CO₂ but draws electricity. The CO₂ of that electricity depends on the grid, as for an electric vehicle.

On today's world grid, which emits 0.48 kg of CO₂ per kWh, a heat pump saves about 29% of a gas boiler's CO₂ (1 − 1.49 × 0.48). This is close to the IEA's finding that a heat pump saves "at least 20% even on gas-fired power". On a clean grid, it saves all of it.

### The electricity a heat pump draws

`heatPumpKwhPerKgCo2` is the electricity needed per kilogram of the boiler's CO₂ avoided. It is the boiler's efficiency, divided by the heat pump's seasonal coefficient of performance (COP, the heat delivered per unit of electricity), and by the fuel's CO₂ per kWh. The fuel factors are 0.202 kg/kWh for natural gas and 0.267 kg/kWh for heating oil, from the IPCC's default factors of 56.1 and 74.1 t CO₂ per TJ.

- Median: 1.49 kWh/kg, for a gas boiler at 90% replaced by a heat pump with a seasonal COP of 3. The IEA's *Future of Heat Pumps* (2022) puts heat pumps at three to five times as efficient as a gas boiler.
- Low end: 0.80 kWh/kg, for an oil boiler at 85% replaced by a heat pump with a COP of 4.
- High end: 1.88 kWh/kg, for a condensing gas boiler at 95% replaced by a heat pump with a COP of 2.5, as in cold climates.

The CO₂ that clean heating saves is the buildings' CO₂ × (1 − `heatPumpKwhPerKgCo2` × the grid's intensity).

## Clean industry

One lever covers steel, cement and chemicals: the share of their production made in clean ways. At full adoption on a clean grid, it removes 54% of industry's CO₂: 26% from steel, 23% from cement and 5% from chemicals. On today's grid, it removes about 28%.

The clean routes draw electricity. Hydrogen made with power from a grid that still burns coal saves little. At the high end of the electricity range, on SSP3-7.0's grid, the steel part can add CO₂. The likely range shows this.

### Steel

At full adoption, steel's direct CO₂ falls by 90% (75–95%):

- Steel made from iron reduced with hydrogen and melted in an electric arc furnace emits 90–95% less on site than a blast furnace.
- Scrap melted in an electric furnace saves about as much.
- Blast furnaces with carbon capture emit 75–90% less.

These figures are from the IEA's *Iron and Steel Technology Roadmap* (2020) and the Mission Possible Partnership's *Making Net-Zero Steel Possible* (2022).

Hydrogen direct reduction needs 3.48 MWh of electricity per tonne of liquid steel, mostly to make the hydrogen, and avoids 1.82 t of CO₂ against a blast furnace (Vogl et al. 2018), so the hydrogen route draws 1.9 kWh per kg avoided. Scrap in an electric furnace needs 0.67 MWh per tonne (same study), or 0.4 kWh/kg. The median, 1.5 kWh/kg, takes three quarters of the cut from hydrogen and a quarter from using more scrap. The range is 0.4 (all scrap) to 2.2 (less efficient electrolysis).

### Cement

At full adoption, cement's direct CO₂ falls by 80% (60–95%). The cut comes from clinker substitutes such as calcined clay and limestone (LC3), from other fuels, and from carbon capture for the process CO₂ that no change of fuel removes (GCCA, *Concrete Future*, 2021; IPCC AR6 WGIII chapter 11).

Capture and compression draw about 0.1–0.3 MWh per tonne of CO₂ avoided (CEMCAP 2019). The lever uses 0.25 kWh/kg at the median, and 0.1 to 1.0 kWh/kg where kilns are also heated by electricity.

### Chemicals

The IEA names two routes for primary chemicals: electrolytic hydrogen and carbon capture (CCUS). In its Net Zero roadmap, 93% of primary chemicals are made with near-zero emissions in 2050: 56% of production with CCUS and 28% with electrolytic hydrogen (IEA 2023, *Primary chemicals*, CC BY 4.0). At full adoption, chemicals' direct CO₂ falls by 80% (60–93%). The high end is the IEA's 93%. The median and the low end are Planetshift's judgement, not checked against a source.

- **Electrolytic hydrogen**, with captured carbon as feedstock, draws more than 18.1 PWh of low-carbon electricity to cut 3.5 billion tonnes of CO₂e a year (Kätelhön et al. 2019), so 5.2 kWh per kg avoided. That is the high end.
- **CCUS** draws about 0.1–0.3 MWh per tonne of CO₂ captured, as for cement (CEMCAP 2019). This figure was measured on cement kilns and is not checked for chemical plants. 0.1 kWh/kg is the low end.

The median, 1.9 kWh/kg, weighs the two routes two to one, as the IEA's 56% and 28% do.

### The formula

For steel, cement and chemicals, `cut` is the share of each one's direct CO₂ that goes at full adoption, and `kwhPerKgCo2` is the electricity drawn per kilogram avoided. The CO₂ that clean industry saves is industry's CO₂ × the sum over steel, cement and chemicals of share × cut × (1 − kWh per kg × the grid's intensity).

Neither lever counts the CO₂ of making the heat pumps, electrolysers or capture plants.

## Methane and air pollution

Burning fossil fuel also emits methane and air pollutants. CEDS gives how much came with each kilogram of CO₂ in 2022:

- **Buildings' fossil fuels**: 5.6 g of methane, most of it leaked while producing the gas they burn, 1.1 g of SO₂, 0.10 g of black carbon, 0.12 g of organic carbon and 1.0 g of NOx. The wood and dung burnt for cooking make a large share of buildings' soot. They are left out, as no lever replaces them.
- **Steel and cement plants**: 2.1 g of methane, 1.4 g of SO₂ and 1.4 g of NOx. The methane is lower than in other sectors because their process CO₂ comes from limestone, not from burning fuel.
- **Electricity**: 4.1 g of methane, 2.3 g of SO₂ and 1.5 g of NOx per kg of the grid's CO₂. These fall as renewable electricity cleans the grid.

Each lever cuts its sector's co-emissions in step with the CO₂ it removes. The electricity it draws adds the electricity sector's co-emissions. The method, the forcing per kg and how they change over time are on the [energy and transport](#method-sectors) page.

## In the app

The **Buildings and industry** fold of the Levers section has two sliders. Each sets the share adopted. Like every lever, it ramps in from the current year to the year set by *All levers fully in place by* (`app/src/levers/industry/model.ts`).

In the breakdown by lever in the summary, all of these levers' effect counts as *Buildings and industry*. This includes the extra saving that renewable electricity brings to them when both are on. Renewable electricity alone is counted under *Energy and transport*. The farm emissions, the map and the farming band of the Causes of warming chart do not change.

### How each year is computed

In each year $y$, each adoption $a$ is already ramped, and $g$ is the grid's intensity in the chosen scenario. The grid these levers draw on is $g' = g\,(1 - a_{\text{re}})$, where $a_{\text{re}}$ is the renewable-electricity lever of the [energy and transport](#method-sectors) fold:

- Clean heating (`ch`) saves $a \times \text{buildings' CO}_2 \times (1 - k\,g')$, with $k$ = `heatPumpKwhPerKgCo2`.
- Clean industry (`ci`) saves $a \times \text{industry's CO}_2 \times \sum_{i} \text{share}_i \times \text{cut}_i \times (1 - k_i\,g')$ over $i$ in steel, cement and chemicals, with $k_i$ = `kwhPerKgCo2`.

The CO₂ changes are convolved with the CO₂ AGTP curve (the warming from one kilogram of CO₂ over time). What comes with them is treated as for transport:

- the CO₂ of producing the fuel (for steel, that of its coke ovens and coal mines), methane and N₂O, under *fossil fuels and industry*;
- the air pollution, CO and VOCs included, under its own cause.

The likely range pairs the 95% AGTP with the high end of each cut and the low end of each electricity use. It pairs the 5% AGTP with the opposite ends.

## Results

The table gives the warming avoided in °C, as a median with the likely range in brackets. Each lever is at 100% from 2026 to 2035, on the real data and SSP2-4.5 with the default options. The figures include the supply CO₂, methane, N₂O and air pollution that come with the fuel. Each cell then gives the figure for CO₂ alone.

| Levers | 2050 | 2100 |
| --- | --- | --- |
| Clean heating | 0.015 (0.001–0.042); CO₂ alone 0.009 | 0.070 (0.041–0.127); CO₂ alone 0.053 |
| Clean industry | 0.016 (−0.009–0.072); CO₂ alone 0.027 | 0.101 (0.036–0.226); CO₂ alone 0.101 |
| Renewable electricity alone | 0.099 (0.052–0.192); CO₂ alone 0.097 | 0.282 (0.180–0.448); CO₂ alone 0.240 |
| Clean heating with renewable electricity | 0.122 (0.062–0.237); CO₂ alone 0.114 | 0.372 (0.238–0.590); CO₂ alone 0.310 |
| Clean industry with renewable electricity | 0.127 (0.060–0.267); CO₂ alone 0.135 | 0.409 (0.243–0.683); CO₂ alone 0.364 |

Clean heating gains from the co-emissions from the start. The gas it no longer burns would have leaked methane, and burning gas emits little SO₂.

Clean industry loses over a third of its 2050 effect to the co-emissions. Their plants' SO₂ cools the climate, so removing it warms. The hydrogen routes also draw a lot of grid power, which adds that power's CO₂ and methane. By 2100 its effect with the co-emissions about equals its CO₂ alone. The coke ovens' CO₂ and the CO that the furnaces emit are counted with the coal no longer burnt, and they make up for the loss.

With renewable electricity in full, clean heating adds 0.023 °C in 2050 and 0.090 °C in 2100 to it. Clean industry adds 0.028 and 0.127 °C. On a clean grid, each lever saves more than it does alone.

The effects are small in 2050 for two reasons. The CO₂ avoided adds up slowly. On today's grid, the electricity that the clean routes draw also cancels much of what they save.

## Other industries

Some industries have no lever. Either the scenarios give no trajectory for them and there is no open base year to start from, or their emissions are mostly electricity, which the renewable-electricity lever already covers:

- **Aluminium**: 1.11–1.12 billion tonnes of CO₂e in 2022–2023, electricity included (JRC, *Aluminium* factsheet, citing the International Aluminium Institute). Most of it is the electricity of smelters, which Renewable electricity already reaches, so a lever of its own would count it twice.
- **Plastics**: 1.8 billion tonnes of CO₂e over their life cycle in 2019 (OECD, *Global Plastics Outlook*, 2022), spread over chemicals, electricity and waste. The scenarios give plastics no trajectory, and there is no open base year for them; their making is in the chemicals share.
- **Textiles and clothing**: 0.944 billion tonnes of CO₂e in 2023, 55% of it from making the materials (Apparel Impact Institute, *Taking Stock* 2025). Most of it is the electricity and heat of mills in Asia. The scenarios give textiles no trajectory and there is no open base year for them.
- **Construction**: its embodied emissions are mostly those of steel and cement, which Clean industry already covers.

## Assumptions

- Buildings' and industry's direct CO₂ follow their scenario's shape, scaled to 3.0 and 9.0 billion tonnes in 2023.
- Steel, cement and chemicals (without ammonia) are 28.9%, 28.7% and 5.7% of industry's direct CO₂ in every year and scenario.
- A heat pump needs 1.49 kWh per kg of a boiler's CO₂ avoided, in every year. Heat pumps and boilers do not get more efficient over time.
- Clean steel, cement and chemicals cut 90%, 80% and 80% of their direct CO₂ at full adoption. They draw 1.5, 0.25 and 1.9 kWh of electricity per kg avoided, on the grid left after renewable electricity.
- Making the equipment is not counted.
- What comes with the fuel of buildings and of industry (the CO₂ of producing it, methane, N₂O and air pollution) uses CEDS's 2022 ratios per kg of their fossil CO₂, process CO₂ included for industry; chemical plants take industry's ratios, which CEDS draws from iron, steel, cement and lime plants. These ratios change with the scenario's emission factors. The electricity drawn adds the grid's co-emissions (see [Energy and transport](#method-sectors)).

## Sources

- RCMIP protocol v5.1.0, SSP emissions by sector: [doi:10.5281/zenodo.4589756](https://doi.org/10.5281/zenodo.4589756). Licence: CC BY-SA 4.0.
- Community Emissions Data System (CEDS), v_2024_07_08: [doi:10.5281/zenodo.12803197](https://doi.org/10.5281/zenodo.12803197). Licence: CC BY 4.0.
- Andrew, R. M. Global CO₂ emissions from cement production, the Global Carbon Budget's series, version 260830: [doi:10.5281/zenodo.22178444](https://doi.org/10.5281/zenodo.22178444); method in Andrew (2019), Earth System Science Data 11, 1675–1710. Licence: CC BY 4.0.
- IEA (2023). Tracking Clean Energy Progress 2023: buildings, industry, iron and steel, cement, chemicals, [iea.org/reports/tracking-clean-energy-progress-2023](https://www.iea.org/reports/tracking-clean-energy-progress-2023). Licence: CC BY 4.0.
- IEA (2023). Net Zero Roadmap: Primary chemicals, [iea.org/reports/primary-chemicals](https://www.iea.org/reports/primary-chemicals). Licence: CC BY 4.0.
- Kätelhön, A., Meys, R., Deutz, S., Suh, S. and Bardow, A. (2019). Climate change mitigation potential of carbon capture and utilization in the chemical industry. PNAS 116, 11187–11194, [doi:10.1073/pnas.1821029116](https://doi.org/10.1073/pnas.1821029116).
- Apparel Impact Institute (2025). Taking Stock of Progress Against the Roadmap to Net Zero.
- JRC (2026). Aluminium factsheet (JRC144120), [publications.jrc.ec.europa.eu](https://publications.jrc.ec.europa.eu/repository/handle/JRC144120).
- IEA (2022). The Future of Heat Pumps, [iea.org/reports/the-future-of-heat-pumps](https://www.iea.org/reports/the-future-of-heat-pumps). Licence: CC BY 4.0.
- IEA (2020). Iron and Steel Technology Roadmap, [iea.org/reports/iron-and-steel-technology-roadmap](https://www.iea.org/reports/iron-and-steel-technology-roadmap).
- IPCC (2006). Guidelines for National Greenhouse Gas Inventories, volume 2, chapter 1, table 1.4: default CO₂ emission factors for combustion.
- IPCC (2022). Climate Change 2022: Mitigation of Climate Change, Working Group III, chapter 11 (Industry).
- Mission Possible Partnership (2022). Making Net-Zero Steel Possible.
- Vogl, V., Åhman, M. and Nilsson, L. J. (2018). Assessment of hydrogen direct reduction for fossil-free steelmaking. Journal of Cleaner Production 203, 736–745, [doi:10.1016/j.jclepro.2018.08.279](https://doi.org/10.1016/j.jclepro.2018.08.279).
- GCCA (2021). Concrete Future: the GCCA 2050 Cement and Concrete Industry Roadmap for Net Zero Concrete.
- CEMCAP (2019). CO₂ capture from cement production, final results (EU Horizon 2020 project).
- worldsteel. Sustainability indicators (CO₂ per tonne of steel, including electricity).
