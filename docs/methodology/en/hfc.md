# HFC phase-down

Hydrofluorocarbons (HFCs) are the gases in fridges, freezers, air conditioners and heat pumps, and in some foams, sprays and fire extinguishers. They replaced the gases that harmed the ozone layer, but most of them trap thousands of times more heat than CO₂ per kg. HFC-23 is different: it is a by-product of making another chemical, HCFC-22. In 2024 the scenarios' HFCs come to 1.26 billion tonnes of CO₂e a year. Planetshift has one lever that cuts them. At 100% from 2026 to 2035, it avoids 0.023 °C of warming in 2050 and 0.055 °C in 2100 (median, SSP2-4.5).

The Kigali Amendment to the Montreal Protocol (2016) already phases them down. By the late 2040s, it cuts each country's use by about 80–85%. The IPCC gives the potential of all fluorinated gases as 1.24 billion tonnes of CO₂e a year in 2030, 0.94 billion of it at under $20 a tonne (AR6 WGIII, Table 12.SM.1.2).

## The HFCs of each scenario

FaIR runs eleven HFCs: HFC-125, -134a, -143a, -152a, -227ea, -23, -236fa, -245fa, -32, -365mfc and -43-10mee. Their emissions are the ones the app's FaIR runs: FaIR's calibration history to 2022, then each scenario's (RCMIP v5.1.0). In billion tonnes of CO₂e a year, with AR6's GWP100 (2024 / 2035 / 2050 / 2100):

| Scenario | 2024 | 2035 | 2050 | 2100 |
| --- | --- | --- | --- | --- |
| SSP1-2.6 | 1.17 | 0.72 | 0.15 | 0.18 |
| SSP2-4.5 | 1.26 | 1.60 | 1.39 | 1.54 |
| SSP3-7.0 | 1.25 | 1.70 | 2.06 | 2.81 |

Most of this is HFC-125, HFC-134a and HFC-143a, the gases of refrigerant blends. In SSP2-4.5 in 2050, they are 190, 136 and 72 thousand tonnes.

The scenarios were made before the Kigali Amendment, but each already cuts HFCs. Velders et al. (2022) project HFC emissions in 2050, without HFC-23, at 4.0–5.3 billion tonnes of CO₂e a year with no control. With the Kigali Amendment, they project 0.9–1.0. Both use the WMO 2018 GWPs, about 10% below AR6's. Each scenario's share of that gap in 2050:

- SSP1-2.6 goes beyond the Kigali Amendment (122% of the way from no control to Kigali);
- SSP2-4.5 is close to it (92%), but its HFCs grow again after 2050;
- SSP3-7.0 reaches about three quarters of it (75%).

So the lever adds most in SSP3-7.0 and least in SSP1-2.6. The Causes of warming chart shows the HFCs' warming in each scenario. In SSP2-4.5 it is 0.043 °C in 2050 and 0.069 °C in 2100.

## The lever

- **HFC phase-down** (`hfc`): HFCs replaced by gases that warm far less (ammonia, CO₂, hydrocarbons, HFOs), fewer leaks, refrigerants recovered at the end of a device's life, and HFC-23 destroyed where it is made. At 100%, the emissions of every HFC fall by 90%, in every year once the ramp is complete. This is En-ROADS's deepest cut. The Kigali Amendment itself cuts use by about 80–85% by the late 2040s, and the emissions of the gases already in devices fall later than their use.

Like every lever, it ramps in from the current year to the year set by *All levers fully in place by*.

## Eleven gases as one

The rest of the model has one HFC: HFC-134a. It is the cold chain's refrigerant (see [Emissions](#method-emissions)), and FaIR in the app changes it alone. The HFCs' lifetimes run from 1.6 years (HFC-152a) to 228 years (HFC-23), with HFC-32 at 5.4 years. Counting them as HFC-134a by their GWP100 would give the right CO₂e, but the wrong warming over time. A cut of a short-lived gas would be counted as lasting 14 years, and a cut of HFC-23 would stop counting decades too early.

Instead, the lever turns its cut into the stream of HFC-134a with the same forcing, year by year. In FaIR, each HFC is a single box with a fixed lifetime, and its forcing is its concentration times its radiative efficiency, with one scale for all of them. So for each HFC $i$, the forcing of its cut at the end of year $y$, in kg of HFC-134a, is

$$B_i(y) = d_i\,B_i(y-1) + r_i\,\Delta E_i(y)$$

with $\Delta E_i$ its cut in kg, $d_i$ the share of its burden left after a year, and $r_i$ the forcing that a kg emitted adds by the end of the year, over HFC-134a's. Both come from FaIR's calibration (`cycles` in `hfc.json`). The HFC-134a stream with the same forcing is then

$$S(y) = \frac{\sum_i B_i(y) - d_{134a} \sum_i B_i(y-1)}{r_{134a}}$$

This is exact in FaIR: a test runs FaIR's gas cycles on both and finds the same forcing. It is exact too for the AR6 pulse responses, which are linear. It needs no extra FaIR run, because FaIR changes HFC-134a anyway. A cut of HFC-23 becomes a stream that keeps growing for decades, as its forcing would.

FaIR does not let a gas's emissions go below zero. The HFC-134a stream has no such limit: it stands for every HFC, so it can go below HFC-134a's own emissions.

The CO₂e is the one thing the stream does not give. The emissions avoided count each HFC at its own GWP100, not the stream's.

## The cold chain's refrigerants

The food levers already cut the cold chain's refrigerants, counted as HFC-134a (see [Emissions](#method-emissions)). They are part of the scenario's HFCs. So the lever cuts its share of what the food levers leave: the HFCs of the scenario, less the refrigerants the diet shift and less food waste have already removed. Together, the food levers and the HFC phase-down avoid less than the sum of each alone. The overlap is counted once.

In the breakdown by lever group, the HFC phase-down is a group of farming, like landfills and wastewater, as it acts on what the diet and less waste leave. The overlap is split between the groups by their Shapley value (see [Levers](#method-levers)). With the diet shift in full, the HFC phase-down's share in 2100 falls from 0.055 °C alone to 0.046 °C.

## In the app

In the Levers section, the **HFC phase-down** fold has the slider. It sits under *Other human emissions*, the cause where the HFCs' warming is counted. In the breakdown by lever, its effect counts as *HFC phase-down*. Its HFCs are in the emissions avoided, as CO₂e. The scenarios give HFCs for the world only, so the lever has no map layer.

`hfc.json` holds the data. The code is `pipeline/planetshift_pipeline/hfc.py`, and the lever module is `app/src/levers/hfc/`.

## Results

The warming avoided in °C, as a median with the likely range in brackets. The lever is at 100% from 2026 to 2035, on the real data with the default options.

| Scenario | 2050 | 2100 |
| --- | --- | --- |
| SSP2-4.5 | 0.023 (0.017–0.031) | 0.055 (0.038–0.086) |
| SSP1-2.6 | 0.007 | 0.008 |
| SSP3-7.0 | 0.027 | 0.085 |

In 2035 it avoids 1.44 billion tonnes of CO₂e a year in SSP2-4.5. In SSP1-2.6 the scenario's HFCs are already nearly gone by 2050, so little is left to cut.

## Assumptions

- The HFCs are each scenario's, as FaIR runs them, in every year.
- At full adoption, 90% of every HFC's emissions are removed, in every year and scenario.
- The lever cuts the cold chain's refrigerants by the same share as the other HFCs.

The scenarios' HFC-23 is small: 1.7 thousand tonnes in 2024, falling to nearly none by 2050. Atmospheric measurements show about 16 thousand tonnes in 2018 (Stanley et al. 2020). So the lever likely misses part of what destroying HFC-23 would avoid.

## Sources

- RCMIP protocol v5.1.0, SSP emissions: [doi:10.5281/zenodo.4589756](https://doi.org/10.5281/zenodo.4589756). Licence: CC BY-SA 4.0.
- FaIR v2.2.5 and its calibration v1.4.1: [doi:10.5281/zenodo.10566813](https://doi.org/10.5281/zenodo.10566813). Licence: Apache 2.0 (model), CC BY 4.0 (calibration).
- Velders, G. J. M., Daniel, J. S., Montzka, S. A., et al. (2022). Projections of hydrofluorocarbon (HFC) emissions and the resulting global warming based on recent trends in observed abundances and current policies. Atmospheric Chemistry and Physics 22, 6087–6101, [doi:10.5194/acp-22-6087-2022](https://doi.org/10.5194/acp-22-6087-2022).
- Stanley, K. M., Say, D., Mühle, J., et al. (2020). Increase in global emissions of HFC-23 despite near-total expected reductions. Nature Communications 11, 397, [doi:10.1038/s41467-019-13899-4](https://doi.org/10.1038/s41467-019-13899-4).
- IPCC (2021). Climate Change 2021: The Physical Science Basis, Working Group I, chapter 7 supplementary material, Table 7.SM.7 (GWP100).
- IPCC (2022). Climate Change 2022: Mitigation of Climate Change, Working Group III, chapter 12 supplementary material, Table 12.SM.1.2.
