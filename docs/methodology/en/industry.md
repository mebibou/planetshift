# Buildings and industry

Besides transport and electricity, two parts of the economy burn fossil fuel directly. In buildings, gas and oil boilers heat rooms and water, and stoves cook food. In industry, steel and cement are the largest emitters, followed by chemicals. Planetshift has five levers here. Efficient buildings cuts the fuel and electricity that buildings use. Clean heating replaces their boilers. Clean industry covers steel, cement and chemicals. Other industry covers the rest of industry except ammonia. The fifth lever destroys the N₂O of nitric and adipic acid plants. Adopted in full, clean heating and clean industry each avoid less than 0.02 °C of warming in 2050, and other industry alone adds 0.001 °C of warming. Efficient buildings avoids about 0.03 °C. In 2100, efficient buildings avoids about 0.09 °C, clean heating about 0.06 °C, clean industry about 0.105 °C and other industry about 0.035 °C. The levers that draw electricity avoid much more warming when that electricity is clean (see *Results* below). Adopted in full, the nitric and adipic acid lever avoids 0.002 °C in 2050 and 0.006 °C in 2100.

## How these emissions are counted

Like the [energy and transport](#method-sectors) sectors, these emissions are part of each scenario's fossil CO₂. They are not added to it, because the scenario temperatures already include them.

A lever takes a share of them away. It then draws electricity, whose CO₂ is subtracted from the saving. The change is turned into warming avoided with the same CO₂ response curve as every other lever.

Burning less fuel also avoids the methane leaked while producing it, and its air pollution. The electricity drawn adds the grid's methane and air pollution. This works as for transport (see *Methane and air pollution that come with the fuel* on the [energy and transport](#method-sectors) page).

`industry.json` holds the data. The code is `pipeline/planetshift_pipeline/industry.py`, and the lever module is `app/src/levers/industry/`.

## The sectors and their futures

Each sector's emissions start at a recent inventory. From there, they follow the shape of the scenario's trajectory, as for transport. The trajectories are the emissions FaIR itself runs on: RCMIP v5.1.0, the harmonised CMIP6 emissions, by CEDS sector.

- **Buildings**: RCMIP's *Residential Commercial Other* CO₂, scaled to CEDS's 2.68 billion tonnes of fossil CO₂ from residential, commercial and institutional fuel in 2022, its last year, and carried to 2023 by the scenario's shape, as road transport is. It is the fossil fuel burnt on site for space and water heating and for cooking. The electricity and district heat that buildings use are in the electricity sector. RCMIP's sector also holds the fuel of farm machinery and fishing boats. Scaling it to the buildings inventory leaves those out (farm energy has its own lever).
- **Industry**: RCMIP's *Industrial Sector* CO₂, scaled to the IEA's 9.0 billion tonnes of direct CO₂ from industry in 2022, taken for 2023. It is the fuel burnt in factories, and the CO₂ of industrial processes such as calcining limestone.

Emissions in billion tonnes of CO₂ a year (2023 / 2050 / 2100):

| Sector | SSP1-2.6 | SSP2-4.5 | SSP3-7.0 |
| --- | --- | --- | --- |
| Buildings | 2.69 / 2.57 / 1.30 | 2.61 / 2.40 / 1.64 | 2.70 / 2.75 / 1.78 |
| Industry | 9.00 / 3.92 / 1.06 | 9.00 / 10.41 / 5.47 | 9.00 / 10.81 / 12.18 |

### Steel, cement and chemicals within industry

The scenarios do not split industry by product. Steel, cement and chemicals are therefore fixed shares of it, the same in every year and scenario:

- **Steel**: 28.9%. This is the IEA's 2.6 billion tonnes of direct CO₂ from iron and steel in 2022, out of industry's 9.0. With the electricity that steelworks buy, the sector's footprint is larger, about 3.6 billion tonnes (worldsteel). That electricity is in the electricity sector.
- **Cement**: 28.7%. The Global Carbon Budget's open series of cement process CO₂ (Andrew) gives 1.55 billion tonnes in 2023 (1.49 in 2024). Process CO₂ is the CO₂ released when limestone is calcined into clinker. Calcination is about 60% of a cement plant's direct CO₂, and the fuel burnt in the kiln is the rest. Cement therefore emits about 2.6 billion tonnes directly, close to the IEA's 2.4.
- **Chemicals**: 5.7%. Primary chemicals (ethylene, propylene, the aromatics, methanol and ammonia) emitted about 935 million tonnes of direct CO₂ in 2022, and ammonia 45% of it (IEA, *Tracking Clean Energy Progress*, chemicals). Ammonia is left out, which leaves 0.51 billion tonnes from methanol and high-value chemicals. Ammonia is what nitrogen fertiliser is made from. Its CO₂ is cut only on the farm side, by *Less nitrogen, better used*, in the cradle-to-farm-gate scope (see [Farm practices](#method-practices)), so no tonne is cut twice.

The rest of industry, about 37%, is ammonia (4.7%, cut on the farm side as above) and 32.0% of everything else. That 32.0%, 2.9 billion tonnes of CO₂ in 2023, comes from light manufacturing (machinery, vehicles, textiles, wood), food and drink, paper, aluminium and other non-ferrous metals, glass, ceramics, bricks and lime, chemicals other than the primary ones, mining and construction. The *Other industry* lever cuts it.

## Efficient buildings

This lever cuts the energy that buildings need for the same services. Insulation and better windows reduce the heat they lose, and efficient appliances, lighting and cooling use less electricity. The lever cuts both the fuel burnt in buildings and the electricity they draw from the grid.

At full adoption, buildings use 42% less energy than in the scenario. The figure is from the IPCC's Sixth Assessment Report (Working Group III, chapter 9, section 9.6.2 and figure 9.16). The chapter pools bottom-up studies of every region. It finds that energy-efficiency technologies and practices could avoid 5.6 billion tonnes of CO₂ in 2050, which is 42% of buildings' baseline emissions. The chapter describes these estimates as low. Its baseline is the IEA's Current Policies Scenario of 2019. Its emissions count both the fuel burnt in buildings and the electricity and heat they use. In the chapter's sequence, efficiency comes after sufficiency, which avoids 10% more, and before renewable energy produced on site, which avoids 9%. Sufficiency includes less floor area per person. Neither is part of this lever.

Planetshift applies the 42% to both parts of buildings' emissions:

- **Fuel**: buildings' direct CO₂ (see *The sectors and their futures* above) falls by 42% × adoption.
- **Electricity**: buildings use half of the world's electricity (IEA, *Special Report on Buildings Efficiency*, 2026). The electricity sector's CO₂ (see [Energy and transport](#method-sectors)) falls by 42% × 0.5 × adoption, on the grid that renewable electricity leaves. With renewable electricity in full, the power saved would have been clean, so saving it avoids no CO₂.

Most of the saving is electricity. In 2035 on SSP2-4.5, full adoption saves 0.9 billion tonnes of buildings' fuel CO₂ and 2.9 billion tonnes of the grid's.

Clean heating then acts on the fuel left after efficiency. Its heat pumps replace boilers that burn 42% less, so they also draw 42% less electricity. No tonne is cut twice.

The figures are in `app/src/levers/industry/efficiency.json`.

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

One lever covers steel, cement and chemicals: the share of their production made in clean ways. At full adoption on a clean grid, it removes 56% of industry's CO₂: 26% from steel, 26% from cement and 5% from chemicals. On today's grid, it removes about 31%.

The clean routes draw electricity. Hydrogen made with power from a grid that still burns coal saves little. At the high end of the electricity range, on SSP3-7.0's grid, the steel part can add CO₂. The likely range shows this.

### Steel

At full adoption, steel's direct CO₂ falls by 90% (90–97%). The figures are from the IEA's *Iron and Steel Technology Roadmap* (2020):

- In the IEA's Sustainable Development Scenario, the direct CO₂ per tonne of crude steel falls by 90% by 2070 (p. 54). This is the median.
- Smelting reduction with carbon capture would emit about 90% less than a blast furnace (p. 92), and in the IEA's routes with capture, 90% of the CO₂ is captured (note to figure 2.11, p. 107). This is the low end.
- Scrap melted in an electric furnace emits 0.04 t of CO₂ per tonne of crude steel on site, against 1.2 t for a blast furnace (table on p. 42), 97% less. This is the high end.
- Iron reduced with hydrogen made from clean electricity would make primary steel with no emissions (p. 93).

Hydrogen direct reduction needs 3.48 MWh of electricity per tonne of liquid steel, mostly to make the hydrogen, and avoids 1.82 t of CO₂ against a blast furnace (Vogl et al. 2018), so the hydrogen route draws 1.9 kWh per kg avoided. Scrap in an electric furnace needs 0.67 MWh per tonne (same study), or 0.4 kWh/kg. The median, 1.5 kWh/kg, takes three quarters of the cut from hydrogen and a quarter from using more scrap. The range is 0.4 (all scrap) to 2.2 (less efficient electrolysis).

### Cement

At full adoption, every kiln captures its CO₂, process and fuel alike. Voldsund et al. (2019) compare six capture technologies on the same reference kiln, for the EU's CEMCAP project. All of them avoid 90–93% of the CO₂ at the stack (their table 14). Cement's direct CO₂ therefore falls by 90% (90–93%).

The electricity comes from the same study's tables 14 and 15, per kg of clinker:

- Oxyfuel capture, the one with the lowest primary energy per kg avoided, raises the plant's power use from 474 to 1,094 kJ, minus the 83 kJ it generates. It cuts the stack's CO₂ from 846 to 88 g. That is 0.20 kWh per kg avoided, the median and the low end.
- Membrane-assisted liquefaction, the other capture technology that runs on electricity alone, uses 1,491 kJ and leaves 84 g. That is 0.37 kWh/kg, the high end.

The other technologies need steam from gas, or burn more coal, which this lever does not count. Clinker substitutes, such as calcined clay and limestone, also cut cement's CO₂. They are left out, because capture on every kiln already removes the CO₂ they would cut.

### Chemicals

The IEA names two routes for primary chemicals: electrolytic hydrogen and carbon capture (CCUS). In its Net Zero roadmap, 93% of primary chemicals are made with near-zero emissions in 2050: 56% of production with CCUS and 28% with electrolytic hydrogen (IEA 2023, *Primary chemicals*, CC BY 4.0). At full adoption, chemicals' direct CO₂ falls by 80% (60–93%). The high end is the IEA's 93%. The median and the low end are Planetshift's judgement, not checked against a source.

- **Electrolytic hydrogen**, with captured carbon as feedstock, draws more than 18.1 PWh of low-carbon electricity to cut 3.5 billion tonnes of CO₂e a year (Kätelhön et al. 2019), so 5.2 kWh per kg avoided. That is the high end.
- **CCUS** is taken to use the same electricity as oxyfuel capture on a cement kiln, 0.20 kWh per kg avoided (Voldsund et al. 2019). No open source gives it for chemical plants. It is the low end.

The median, 1.9 kWh/kg, weighs the two routes two to one, as the IEA's 56% and 28% do.

### The formula

For steel, cement and chemicals, `cut` is the share of each one's direct CO₂ that goes at full adoption, and `kwhPerKgCo2` is the electricity drawn per kilogram avoided. The CO₂ that clean industry saves is industry's CO₂ × the sum over steel, cement and chemicals of share × cut × (1 − kWh per kg × the grid's intensity).

No lever on this page counts the CO₂ of making the heat pumps, electrolysers, electric boilers or capture plants.

## Other industry

This lever cleans the rest of industry without ammonia, 32.0% of industry's direct CO₂. It splits that rest in two, as the IEA's *Net Zero Roadmap* (2023) does. Electricity provides the low-temperature heat. Hydrogen and bioenergy provide the high-temperature heat. At full adoption on a clean grid, it removes 30% of industry's CO₂. On today's grid, it adds about 2% instead, because the electricity it draws emits more CO₂ than the fuel it replaces.

### Low-temperature heat

Light manufacturing, food and tobacco, and pulp and paper emitted 9.7%, 1.9% and 1.1% of industry's direct CO₂ in 2016 (IPCC AR6 WGIII, chapter 11, section 11.4.1.4). Most of their fuel is burnt for heat and drying (same section). About 75% of the heat these industries use is below 200 °C (IEA 2025, *Can low-temperature heat in factories be electrified competitively?*). Heat pumps on the market deliver 100–150 °C, and up to 280 °C is feasible (IPCC, same section). Together, these three industries emit 12.7% of industry's CO₂. Heat below 200 °C is therefore 12.7% × 75% = 9.5% of industry's CO₂, or 29.7% of the rest.

At full adoption, heat pumps supply all of that heat. They draw the same electricity per kg avoided as in buildings: 1.49 kWh/kg (0.80–1.88, see *Clean heating*). The IEA's commentary takes a coefficient of performance of 3.5 for industry. That is within the 2.5 to 4 that the range above spans. On today's grid, heat pumps save 29% of this heat's CO₂.

### The remainder

The other 70.3% of the rest is heat above 200 °C, the CO₂ of processes such as aluminium's carbon anodes, lime and glass, and the fuel of machines. At full adoption, 90% of it is cut (78–99%). All three figures come from Madeddu et al. (2020):

- Median, 90%: the less CO₂-intensive industries, such as paper, wood and textiles, emit 40% of the EU's industrial CO₂. Established technologies can electrify them almost entirely. That cuts industrial CO₂ by 36%, which is 90% of their own CO₂.
- Low end, 78%: the share of the EU's industrial energy that established technologies can electrify.
- High end, 99%: the share of industrial heat that can be electrified with technologies still being developed.

Electricity cannot remove process CO₂ (Madeddu et al. 2020). The 90% cut still applies to process CO₂, which overstates it a little.

Figure 2.21 of the IEA's *Net Zero Roadmap* (2023 update, chapter 2, *Industry*, p. 87) shows the energy that *Other industry* (light industries and non-specified industry) uses in 2050 in the Net Zero Scenario. In that scenario, hydrogen and bioenergy provide high-temperature heat (same section, p. 88). The chart gives no numbers, so they are read off its bars to within about 0.2 EJ: 35.7 EJ of electricity, 1.3 EJ of hydrogen, 10.2 EJ of modern solid bioenergy and 6.7 EJ of other renewables, 53.9 EJ of low-carbon energy in all. Its 0.2 EJ of heat and 0.4 EJ of oil are left out.

That electricity also runs the heat pumps for the heat below 200 °C, which this lever already counts. The heat pumps are taken out in four steps:

1. Heat below 200 °C is 29.7% of the fuel that the rest of industry burns (see *Low-temperature heat*).
2. A heat pump with a seasonal COP of 3 that replaces a boiler at 90% needs 0.90 / 3 = 0.30 kWh of electricity per kWh of fuel, as in *Clean heating*.
3. Electricity, hydrogen and bioenergy replace the other 70.3% of the fuel kWh for kWh. The heat pumps therefore use 0.297 × 0.30 / (0.297 × 0.30 + 0.703) = 11.3% of the 53.9 EJ, or 6.1 EJ.
4. Without the heat pumps, the remainder's energy is 47.8 EJ: 62.0% electricity, 2.7% hydrogen, 21.3% bioenergy and 14.0% other renewables.

The electricity draws 3.92 kWh per kg avoided. Madeddu et al. find that electrifying with established technologies cuts CO₂ only on a grid below 255 g per kWh. So each kg avoided needs 1 / 0.255 = 3.92 kWh. The hydrogen is made by electrolysis on the grid. In the Net Zero Scenario, 15,000 TWh of electricity make 80% of the 420 Mt of hydrogen produced in 2050 (same report, chapter 2, p. 78). That is 44.6 kWh per kg of hydrogen, or 1.34 kWh of electricity per kWh of hydrogen (33.3 kWh per kg). Burnt in place of gas, hydrogen draws 1.34 / 0.202 = 6.64 kWh per kg of CO₂ avoided. Bioenergy and the other renewables draw no grid electricity. Per kg avoided, the remainder draws:

- Median: 2.61 kWh/kg, 62.0% × 3.92 + 2.7% × 6.64.
- Low end: 1.65 kWh/kg, if the fuel replaced is coal burnt at 85% efficiency: 2.50 kWh/kg for the electricity and 3.93 for the hydrogen. The coal factor is the IPCC's 94.6 t of CO₂ per TJ for bituminous coal. That is 0.341 kg of CO₂ per kWh of coal.
- High end: 2.94 kWh/kg, if it is gas burnt at 90% efficiency: 4.46 kWh/kg for the electricity and 6.64 for the hydrogen.

The mix is the one for all of *Other industry* in 2050, and it applies to the remainder in every year. The CO₂ of burning bioenergy is biogenic and counted as zero, and the land the bioenergy needs is not counted.

On today's grid, the remainder adds CO₂: its net saving is 90% × (1 − 2.61 × 0.48) = −23% of its direct CO₂. It saves CO₂ only on a grid below 0.38 kg per kWh. SSP2-4.5's grid emits 0.42 kg per kWh in 2030, 0.32 in 2040 and 0.27 in 2050. SSP3-7.0's grid stays at about 0.5 kg per kWh and rises to 0.55 by 2100.

### The formula

`industryRest` in `industry.json` holds the rest: `share` (32.0%), `lowHeat` (29.7%), `cut` and `kwhPerKgCo2` of the remainder. The CO₂ that other industry saves is industry's CO₂ × share × (lowHeat × (1 − `heatPumpKwhPerKgCo2` × the grid's intensity) + (1 − lowHeat) × cut × (1 − kWh per kg × the grid's intensity)).

## Nitric and adipic acid N₂O

The third lever cuts a gas that no fuel emits. Making nitric acid and adipic acid releases nitrous oxide (N₂O) as a by-product. Most nitric acid becomes nitrogen fertiliser, and most adipic acid becomes nylon. CEDS gives 0.667 million tonnes of it in 2022: 0.397 from adipic acid (`2B3_Chemicals-Adipic-acid`) and 0.270 from nitric acid (`2B2_Chemicals-Nitric-acid`). China emits 69% of it, mostly from adipic acid. The United States emits 8%, Singapore 5%, Egypt 3% and India 2%. Many plants elsewhere already abate their N₂O, so CEDS's figures are the emissions left after that abatement.

After 2022, both follow the scenario's N₂O from fossil fuels and industry (RCMIP v5.1.0, *MAGICC Fossil and Industrial*), relative to 2023. The methane leaks follow the scenario's energy methane in the same way. The scenarios do not give these two acids a path of their own. Emissions in million tonnes of N₂O a year (2023 / 2050 / 2100):

| | SSP1-2.6 | SSP2-4.5 | SSP3-7.0 |
| --- | --- | --- | --- |
| Adipic and nitric acid | 0.667 / 0.536 / 0.564 | 0.667 / 0.724 / 0.502 | 0.667 / 0.852 / 1.126 |

This N₂O is part of each scenario's N₂O, so the scenario's warming already includes it. The lever removes a share of it. At 100%, every plant destroys its N₂O:

- **Adipic acid**: 95.5% of its N₂O is removed. Thermal destruction burns the off-gas, which turns 98.5% of its N₂O into nitrogen. The IPCC assumes it runs 97% of the time (2006 Guidelines, volume 3, table 3.4: 98.5% × 97%). Catalytic destruction removes less: 92.5% of the N₂O, running 89% of the time.
- **Nitric acid**: 72.2% of its N₂O is removed. A high-pressure plant emits 9 kg of N₂O per tonne of acid, and one with N₂O abatement 2.5 kg (2019 Refinement to the 2006 Guidelines, volume 3, table 3.3). Abatement covers catalysts in the burner and catalysts or reduction units on the tail gas. The US EPA's estimates are higher, 80–95% for these measures (*Global Mitigation of Non-CO₂ Greenhouse Gases: 2010–2030*, 2013, chapter IV.1). Planetshift keeps the IPCC's inventory factors, because they are what plants with abatement emit on average.

At 100%, the lever removes 86% of the N₂O the two acids emit today. It draws no electricity. The gas that thermal destruction burns is not counted. The data is in `acidn2o.json`. The pipeline code is `pipeline/planetshift_pipeline/acid_n2o.py`, and the lever's code is `app/src/levers/industry/acidN2o.ts`.

## Methane and air pollution

Burning fossil fuel also emits methane and air pollutants. CEDS gives how much came with each kilogram of CO₂ in 2022:

- **Buildings' fossil fuels**: 5.6 g of methane, most of it leaked while producing the gas they burn, 1.1 g of SO₂, 0.10 g of black carbon, 0.12 g of organic carbon and 1.0 g of NOx. The wood and dung burnt for cooking make a large share of buildings' soot. They are left out, as no lever replaces them.
- **Steel and cement plants**: 2.1 g of methane, 1.4 g of SO₂ and 1.4 g of NOx. The methane is lower than in other sectors because their process CO₂ comes from limestone, not from burning fuel.
- **Electricity**: 4.1 g of methane, 2.3 g of SO₂ and 1.5 g of NOx per kg of the grid's CO₂. These fall as renewable electricity cleans the grid.

Each lever cuts its sector's co-emissions in step with the CO₂ it removes. The electricity it draws adds the electricity sector's co-emissions. The method, the forcing per kg and how they change over time are on the [energy and transport](#method-sectors) page.

## In the app

The **Buildings and industry** fold of the Levers section has five sliders. Each sets the share adopted. Like every lever, it ramps in from the current year to the year set by *All levers fully in place by* (`app/src/levers/industry/model.ts`).

In the breakdown by lever in the summary, all of these levers' effect counts as *Buildings and industry*. This includes the extra saving that renewable electricity brings to them when both are on. Renewable electricity alone is counted under *Energy and transport*. The farm emissions, the map and the farming band of the Causes of warming chart do not change.

### How each year is computed

In each year $y$, each adoption $a$ is already ramped, and $g$ is the grid's intensity in the chosen scenario. The grid these levers draw on is $g' = g\,(1 - a_{\text{re}})$, where $a_{\text{re}}$ is the renewable-electricity lever of the [energy and transport](#method-sectors) fold:

- Efficient buildings (`eb`) saves $s \times \text{buildings' CO}_2 + s \times e \times \text{electricity's CO}_2 \times (1 - a_{\text{re}})$, with $s = a \times p$, $p$ = `potential` (0.42) and $e$ = `electricityShare` (0.5).
- Clean heating (`ch`) saves $a \times (1 - s) \times \text{buildings' CO}_2 \times (1 - k\,g')$, with $k$ = `heatPumpKwhPerKgCo2`.
- Clean industry (`ci`) saves $a \times \text{industry's CO}_2 \times \sum_{i} \text{share}_i \times \text{cut}_i \times (1 - k_i\,g')$ over $i$ in steel, cement and chemicals, with $k_i$ = `kwhPerKgCo2`.
- Other industry (`oi`) saves $a \times \text{industry's CO}_2 \times s \times \left(h\,(1 - k\,g') + (1 - h) \times \text{cut} \times (1 - k_r\,g')\right)$, with $s$ the rest's share, $h$ its low-temperature heat, $k$ = `heatPumpKwhPerKgCo2` and $k_r$ the remainder's `kwhPerKgCo2`.
- Nitric and adipic acid N₂O (`an`) saves $a \times (0.955\,N_{\text{adipic}}(y) + 0.722\,N_{\text{nitric}}(y))$ of N₂O, with $N$ each acid's N₂O in the scenario (`abated` and `emissions` in `acidn2o.json`). It has no range of its own.

The CO₂ changes go to FaIR, which the app runs (see the [temperature page](#method-climate)). What comes with them is treated as for transport:

- the CO₂ of producing the fuel (for steel, that of its coke ovens and coal mines), methane and N₂O, under *fossil fuels and industry*;
- the air pollution, CO and VOCs included, under its own cause.

The likely range is the 5–95% range of FaIR's members. The ends of each cut and each electricity use add to it through the pulse responses: the 95% AGTP with the high end of each cut and the low end of each electricity use, the 5% AGTP with the opposite ends.

## Results

The table gives the warming avoided in °C, as a median with the likely range in brackets. Each lever is at 100% from 2026 to 2035, on the real data and SSP2-4.5 with the default options. The figures include the supply CO₂, methane, N₂O and air pollution that come with the fuel. Each cell then gives the figure for CO₂ alone.

| Levers | 2050 | 2100 |
| --- | --- | --- |
| Clean heating | 0.013 (0.001–0.035); CO₂ alone 0.008 | 0.060 (0.037–0.109); CO₂ alone 0.044 |
| Clean industry | 0.016 (−0.005–0.070); CO₂ alone 0.028 | 0.105 (0.052–0.225); CO₂ alone 0.104 |
| Renewable electricity alone | 0.096 (0.060–0.187); CO₂ alone 0.093 | 0.286 (0.180–0.464); CO₂ alone 0.236 |
| Clean heating with renewable electricity | 0.115 (0.070–0.225); CO₂ alone 0.108 | 0.367 (0.235–0.590); CO₂ alone 0.297 |
| Clean industry with renewable electricity | 0.124 (0.074–0.260); CO₂ alone 0.133 | 0.421 (0.265–0.707); CO₂ alone 0.366 |
| Efficient buildings | 0.028 (0.017–0.054); CO₂ alone 0.025 | 0.092 (0.060–0.147); CO₂ alone 0.074 |
| Efficient buildings with clean heating | 0.036 (0.020–0.072); CO₂ alone 0.030 | 0.128 (0.082–0.211); CO₂ alone 0.100 |
| Efficient buildings with renewable electricity | 0.107 (0.066–0.207); CO₂ alone 0.102 | 0.322 (0.205–0.520); CO₂ alone 0.264 |
| Efficient buildings with clean heating and renewable electricity | 0.118 (0.073–0.230); CO₂ alone 0.111 | 0.370 (0.236–0.594); CO₂ alone 0.299 |
| Other industry | −0.001 (−0.010–0.032); CO₂ alone 0.005 | 0.035 (0.015–0.092); CO₂ alone 0.037 |
| Other industry with renewable electricity | 0.110 (0.066–0.224); CO₂ alone 0.113 | 0.356 (0.221–0.591); CO₂ alone 0.304 |

Clean heating gains from the co-emissions from the start. The gas it no longer burns would have leaked methane, and burning gas emits little SO₂.

Clean industry loses over a third of its 2050 effect to the co-emissions. Their plants' SO₂ cools the climate, so removing it warms. The hydrogen routes also draw a lot of grid power, which adds that power's CO₂ and methane. By 2100 its effect with the co-emissions about equals its CO₂ alone. The coke ovens' CO₂ and the CO that the furnaces emit are counted with the coal no longer burnt, and they make up for the loss.

Other industry alone warms a little at first. Electrifying factory heat on a grid that still burns fossil fuel adds the grid's CO₂ and methane. It also removes the factories' SO₂, which has a cooling effect. On SSP2-4.5 it adds 0.001 °C in 2050, although it avoids 0.005 °C counting CO₂ alone. By 2100, when the scenario's grid no longer emits CO₂, it avoids 0.035 °C. On SSP1-2.6 it avoids 0.001 °C in 2050 and 0.016 °C in 2100. On SSP3-7.0, whose grid stays above 0.5 kg per kWh, it adds 0.006 °C in 2050 and 0.034 °C in 2100. Renewable electricity reverses this: with it, the lever avoids warming from the start.

With renewable electricity in full, clean heating adds 0.019 °C in 2050 and 0.081 °C in 2100 to it. Clean industry adds 0.028 and 0.135 °C, and other industry 0.014 and 0.070 °C (0.008 and 0.024 on SSP1-2.6, 0.010 and 0.063 on SSP3-7.0). On a clean grid, each lever saves more than it does alone.

The effects are small in 2050 for two reasons. The CO₂ avoided adds up slowly. On today's grid, the electricity that the clean routes draw also cancels much of what they save.

On SSP2-4.5, efficient buildings avoids more than clean heating, because most of what it saves is electricity. On SSP1-2.6 it avoids 0.028 °C in 2050 and 0.050 °C in 2100. On SSP3-7.0 it avoids 0.029 °C in 2050 and 0.166 °C in 2100, because the grid emits more CO₂ per kWh there and each kWh saved avoids more CO₂. With clean heating and renewable electricity in full, efficient buildings adds only 0.003 °C, in 2050 as in 2100. After heat pumps and a clean grid, little fossil energy is left for it to save.

Adopted in full, the nitric and adipic acid N₂O lever avoids 0.0019 °C (0.0012–0.0026) in 2050 and 0.0056 °C (0.0033–0.0086) in 2100 on SSP2-4.5, 0.0015 and 0.0051 °C on SSP1-2.6, and 0.0020 and 0.0071 °C on SSP3-7.0. Once in place, it avoids about 0.6 million tonnes of N₂O a year. N₂O stays in the air for about a century, so the warming it avoids keeps growing to 2100. Adopted with clean industry, it adds about as much as it avoids alone, because the two do not overlap.

## Other industries

Some industries have no lever of their own. Either the scenarios give no trajectory for them and there is no open base year to start from, or their emissions are mostly electricity, which the renewable-electricity lever already covers. Their direct CO₂ is still cut, as part of the rest of industry that *Other industry* cleans:

- **Aluminium**: 1.11–1.12 billion tonnes of CO₂e in 2022–2023, electricity included (JRC, *Aluminium* factsheet, citing the International Aluminium Institute). Most of it is the electricity of smelters, which Renewable electricity already reaches, so a lever of its own would count it twice. Its direct CO₂, from the heat of alumina refineries and the smelters' carbon anodes, is in the rest of industry.
- **Plastics**: 1.8 billion tonnes of CO₂e over their life cycle in 2019 (OECD, *Global Plastics Outlook*, 2022), spread over chemicals, electricity and waste. The scenarios give plastics no trajectory, and there is no open base year for them; their making is in the chemicals share.
- **Textiles and clothing**: 0.944 billion tonnes of CO₂e in 2023, 55% of it from making the materials (Apparel Impact Institute, *Taking Stock* 2025). Most of it is the electricity and heat of mills in Asia. The scenarios give textiles no trajectory and there is no open base year for them. The mills' heat is in the rest of industry.
- **Construction**: its embodied emissions are mostly those of steel and cement, which Clean industry already covers.

## Assumptions

- Buildings' direct CO₂ follows its scenario's shape, scaled to CEDS's 2.68 billion tonnes in 2022. Industry's follows its scenario's shape, scaled to the IEA's 9.0 billion tonnes in 2023.
- Steel, cement and chemicals (without ammonia) are 28.9%, 28.7% and 5.7% of industry's direct CO₂ in every year and scenario.
- A heat pump needs 1.49 kWh per kg of a boiler's CO₂ avoided, in every year. Heat pumps and boilers do not get more efficient over time.
- Clean steel, cement and chemicals cut 90%, 90% and 80% of their direct CO₂ at full adoption. They draw 1.5, 0.20 and 1.9 kWh of electricity per kg avoided, on the grid left after renewable electricity.
- Efficiency cuts 42% of buildings' fuel and of their electricity at full adoption, in every year and scenario. Buildings use half of the electricity, so the grid's CO₂ falls by 21%. The IPCC's efficiency step may already include some heat pumps. Clean heating acts only on the fuel left after efficiency, so no tonne is counted twice.
- The rest of industry without ammonia is 32.0% of industry's direct CO₂, and 29.7% of the rest is heat below 200 °C, in every year and scenario. Other industry puts all of that heat on heat pumps, which draw 1.49 kWh per kg avoided. It cuts 90% of the remainder with the IEA's 2050 mix for *Other industry*, less its heat pumps: 62.0% electricity at 3.92 kWh per kg avoided, 2.7% electrolytic hydrogen at 6.64 kWh per kg and 35.3% bioenergy and other renewables. On average that is 2.61 kWh per kg.
- Making the equipment is not counted.
- The N₂O of nitric and adipic acid is CEDS's for 2022. After 2023, it follows the scenario's N₂O from fossil fuels and industry. At full adoption, 95.5% of adipic acid's and 72.2% of nitric acid's is removed, in every country, year and scenario. Using less fertiliser on farms does not reduce the nitric acid made.
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
- IPCC (2022). Climate Change 2022: Mitigation of Climate Change, Working Group III, chapter 9, Buildings, section 9.6.2 and figure 9.16, [ipcc.ch/report/ar6/wg3/chapter/chapter-9](https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-9/).
- IEA (2026). Special Report on Buildings Efficiency, executive summary, [iea.org/reports/special-report-on-buildings-efficiency](https://www.iea.org/reports/special-report-on-buildings-efficiency). Licence: CC BY 4.0.
- IEA (2023). Net Zero Roadmap: A Global Pathway to Keep the 1.5 °C Goal in Reach, 2023 update, chapter 2, *Industry*, [iea.org/reports/net-zero-roadmap-a-global-pathway-to-keep-the-15-0c-goal-in-reach](https://www.iea.org/reports/net-zero-roadmap-a-global-pathway-to-keep-the-15-0c-goal-in-reach). Licence: CC BY 4.0.
- IEA (2025). Can low-temperature heat in factories be electrified competitively?, commentary, [iea.org/commentaries/can-low-temperature-heat-in-factories-be-electrified-competitively](https://www.iea.org/commentaries/can-low-temperature-heat-in-factories-be-electrified-competitively). Licence: CC BY 4.0.
- IPCC (2022). Climate Change 2022: Mitigation of Climate Change, Working Group III, chapter 11: Industry, section 11.4.1.4, [ipcc.ch/report/ar6/wg3/chapter/chapter-11](https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-11/).
- Madeddu, S., Ueckerdt, F., Pehl, M., Peterseim, J., Lord, M., Kumar, K. A., Krüger, C. and Luderer, G. (2020). The CO₂ reduction potential for the European industry via direct electrification of heat supply (power-to-heat). Environmental Research Letters 15, 124004, [doi:10.1088/1748-9326/abbd02](https://doi.org/10.1088/1748-9326/abbd02). Licence: CC BY 4.0.
- IEA (2022). The Future of Heat Pumps, [iea.org/reports/the-future-of-heat-pumps](https://www.iea.org/reports/the-future-of-heat-pumps). Licence: CC BY 4.0.
- IEA (2020). Iron and Steel Technology Roadmap, [iea.org/reports/iron-and-steel-technology-roadmap](https://www.iea.org/reports/iron-and-steel-technology-roadmap): direct CO₂ intensity of the main routes (table, p. 42), the Sustainable Development Scenario (p. 54), smelting reduction with capture and hydrogen reduction (pp. 92–93).
- IPCC (2006). Guidelines for National Greenhouse Gas Inventories, volume 2, chapter 1, table 1.4: default CO₂ emission factors for combustion, natural gas, gas/diesel oil and other bituminous coal.
- IPCC (2006). Guidelines for National Greenhouse Gas Inventories, volume 3, chapter 3, table 3.4: default factors for adipic acid production, [ipcc-nggip.iges.or.jp](https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol3.html).
- IPCC (2019). 2019 Refinement to the 2006 IPCC Guidelines for National Greenhouse Gas Inventories, volume 3, chapter 3, table 3.3: default factors for nitric acid production, [ipcc-nggip.iges.or.jp](https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol3.html).
- US EPA (2013). Global Mitigation of Non-CO₂ Greenhouse Gases: 2010–2030, chapter IV.1, nitric and adipic acid production, [epa.gov](https://www.epa.gov/sites/default/files/2016-06/documents/mac_report_2013-iv_industrial.pdf). A work of the US government, in the public domain.
- Vogl, V., Åhman, M. and Nilsson, L. J. (2018). Assessment of hydrogen direct reduction for fossil-free steelmaking. Journal of Cleaner Production 203, 736–745, [doi:10.1016/j.jclepro.2018.08.279](https://doi.org/10.1016/j.jclepro.2018.08.279).
- Voldsund, M., Gardarsdottir, S. O., De Lena, E. et al. (2019). Comparison of technologies for CO₂ capture from cement production, part 1: technical evaluation. Energies 12, 559, tables 14 and 15, [doi:10.3390/en12030559](https://doi.org/10.3390/en12030559). Licence: CC BY 4.0.
- worldsteel. Sustainability indicators (CO₂ per tonne of steel, including electricity).
