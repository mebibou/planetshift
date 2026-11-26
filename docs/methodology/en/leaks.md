# Methane leaks

Producing oil, gas and coal leaks methane. Oil and gas wells vent and flare their gas, pipes and compressors leak, and coal mines release the methane held in the seams. In 2022 these leaks came to 131 million tonnes, about a third of the methane people emit. Methane warms far more than CO₂ per kg, but it lasts only about a decade, so cutting it slows warming within years. Planetshift has two levers that cut it: oil and gas leaks, and coal-mine methane. With both in full from 2026 to 2035, they avoid 0.072 °C of warming in 2050 and 0.136 °C in 2100 (median, SSP2-4.5).

Much of this is cheap. The IPCC puts the potential at 1.15 billion tonnes of CO₂e a year for oil and gas and 0.50 for coal mines in 2030, much of it at no net cost, as the gas saved can be sold (AR6 WGIII, Table 12.SM.1.1).

## The methane leaked

The Community Emissions Data System (CEDS, version v_2024_07_08, CC BY 4.0) gives each country's methane by sector up to 2022. The levers act on its fugitive sectors:

- **Oil**: oil production, with the gas it flares and vents (`1B2_Fugitive-petr`), 50.3 million tonnes.
- **Gas**: gas production (`1B2b_Fugitive-NG-prod`), 23.5 million tonnes, and its transmission and distribution (`1B2b_Fugitive-NG-distr`), 11.1 million tonnes.
- **Coal**: coal mines (`1B1_Fugitive-solid-fuels`), 46.1 million tonnes.

The fuel that refineries and coke ovens burn (`1A1bc`) is not a leak. No lever here cuts its methane, which is under 0.1 million tonnes.

After 2022, each group follows its scenario's energy methane (RCMIP v5.1.0, *Energy Sector*), relative to 2023. This is the same trend that the ratio of the fuel supply's methane follows on the [Energy and transport](#method-sectors) page. Leaks in million tonnes a year (2023 / 2050 / 2100):

| Group | SSP1-2.6 | SSP2-4.5 | SSP3-7.0 |
| --- | --- | --- | --- |
| Oil and gas | 84.8 / 38.9 / 5.4 | 84.8 / 76.0 / 80.9 | 84.8 / 93.1 / 109.5 |
| Coal mines | 46.1 / 21.1 / 3.0 | 46.1 / 41.3 / 44.0 | 46.1 / 50.6 / 59.5 |

These leaks are part of each scenario's methane, so the scenario's warming already includes them. The levers remove a share of them.

## The levers

- **Oil and gas leaks** (`ogm`): finding and fixing leaks, replacing devices that vent by design, and ending routine venting and flaring. At 100%, 75% of oil and gas methane is removed. This is the IEA's estimate of the share that today's technologies can avoid, and the IPCC uses it in its table.
- **Coal-mine methane** (`cmm`): draining the methane from the seams before and during mining and using or flaring it, and oxidising the dilute methane in the mines' ventilation air. At 100%, 50% of coal mines' methane is removed. The rest comes from abandoned mines and from surface mines without drainage.

Like every lever, each ramps in from the current year to the year set by *All levers fully in place by*.

## With the fuel levers

The energy, heating and industry levers burn less fuel, so less fuel is produced and less methane leaks. They count that methane in the methane per kg of their CO₂ (see *Methane and air pollution that come with the fuel* on the [Energy and transport](#method-sectors) page). Part of that ratio is the leaks: for each sector, the share of each fuel in its CO₂ times the leaks per kg of CO₂ from burning that fuel. In 2022, for road transport, 4.8 g of its 5.0 g of methane per kg of CO₂ are oil and gas leaks. For electricity, of 4.1 g, 1.4 g are oil and gas leaks and 2.6 g are coal mines'.

The leak levers cut that part of the ratio by the same share as the scenario's leaks. With both kinds of lever in full, a car no longer driven on petrol avoids less methane, because the oil it would have burnt leaks less. So the two kinds of lever overlap. Together they avoid less than the sum of each alone, and the overlap is counted once.

In the breakdown by lever group, the overlap is split between the groups by their Shapley value, as the grid's overlap is between renewable electricity and the other energy levers (see [Levers](#method-levers)). With every energy, heating and industry lever in full, the methane leaks group's share in 2100 falls from 0.136 °C alone to 0.084 °C, and the energy and the buildings and industry groups each lose a little too.

## The CO₂ it becomes

The methane is fossil. With the `fossilMethaneCo2` departure on (the default), each kg of methane cut also cuts the 2.74 kg of CO₂ it would have become, in the same year (see [Energy and transport](#method-sectors)). This adds 0.002 °C in 2050 and 0.005 °C in 2100 to what both levers avoid.

## In the app

The **Methane leaks** fold of the Levers section has the two sliders, under *Fossil fuels and industry*. In the breakdown by lever, their effect counts as *Methane leaks*. Their methane, and the CO₂ it becomes, are in the emissions avoided. The farm emissions and the farming band of the Causes of warming chart do not change.

The map's **Methane leaks** layer colours each country by its leaks with the levers in full, in tonnes a year. Today's figure is CEDS's for 2022, by where the fuel is produced, not where it is burnt. With the levers, each part falls by the share its lever removes. The levers that burn less fuel cut the world's leaks too, but the map does not split that cut by country. The tooltip gives the oil and gas part and the coal part.

`fossilmethane.json` holds the data. The code is `pipeline/planetshift_pipeline/fossil_methane.py`, and the lever module is `app/src/levers/fossilMethane/`.

### How each year is computed

In each year $y$, each lever's adoption $a$ is already ramped. The share of each group's leaks gone is $c_{\text{og}} = 0.75\,a_{\text{ogm}}$ and $c_{\text{coal}} = 0.5\,a_{\text{cmm}}$. Then:

- the scenario's leaks change by $-(c_{\text{og}}\,L_{\text{og}}(y) + c_{\text{coal}}\,L_{\text{coal}}(y))$, with $L$ each group's leaks above;
- each sector's methane per kg of CO₂ that the energy and industry levers use loses $c_{\text{og}}\,r_{\text{og}}(y) + c_{\text{coal}}\,r_{\text{coal}}(y)$, with $r$ its leaks per kg of CO₂ (`perKgCo2` in `fossilmethane.json`), which follow the same trend as the ratio they are part of.

The methane changes are passed to FaIR, which the app runs (see the [temperature page](#method-climate)). The cuts have no range of their own, so the likely range is the 5–95% range of FaIR's members.

## Results

The warming avoided in °C, as a median with the likely range in brackets. Each lever is at 100% from 2026 to 2035, on the real data with the default options.

| Levers | 2050 | 2100 |
| --- | --- | --- |
| Oil and gas leaks | 0.052 (0.042–0.077) | 0.100 (0.071–0.140) |
| Coal-mine methane | 0.019 (0.015–0.028) | 0.036 (0.026–0.051) |
| Both | 0.072 (0.057–0.105) | 0.136 (0.097–0.191) |
| Both, SSP1-2.6 | 0.048 | 0.037 |
| Both, SSP3-7.0 | 0.069 | 0.137 |

In SSP1-2.6, the use of oil, gas and coal falls fast, so less methane is left to cut by 2100. In 2035 both levers in full avoid 86 million tonnes of methane a year in SSP2-4.5, 63 of them from oil and gas.

## Assumptions

- The leaks are CEDS's fugitive methane in 2022, following each scenario's energy methane after 2023.
- At full adoption, 75% of oil and gas leaks and 50% of coal mines' leaks are removed, in every country, year and scenario.
- The leak levers cut the leak part of the energy, heating and industry levers' methane by the same shares.
- The map's leaks are by country of production in 2022, and change with the leak levers only.

The levers leave out abandoned wells and mines, and the leaks that inventories miss. The [Limitations](#method-limitations) page covers them.

## Sources

- Community Emissions Data System (CEDS), v_2024_07_08: [doi:10.5281/zenodo.12803197](https://doi.org/10.5281/zenodo.12803197). Licence: CC BY 4.0.
- RCMIP protocol v5.1.0, SSP emissions by sector: [doi:10.5281/zenodo.4589756](https://doi.org/10.5281/zenodo.4589756). Licence: CC BY-SA 4.0.
- IPCC (2022). Climate Change 2022: Mitigation of Climate Change, Working Group III, chapter 12 supplementary material, Table 12.SM.1.1.
- IEA (2025). Global Methane Tracker 2025, [iea.org/reports/global-methane-tracker-2025](https://www.iea.org/reports/global-methane-tracker-2025).
