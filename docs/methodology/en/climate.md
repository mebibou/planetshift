# From emissions to temperature

Planetshift turns a change in what is farmed into a change in global temperature. This page explains how, and why it does not take the usual shortcut.

## Why the gases are kept apart

Farming emits three greenhouse gases: carbon dioxide (CO₂), methane (CH₄) and nitrous oxide (N₂O). They do not warm the planet in the same way.

- **CO₂** builds up. A large part of each tonne stays in the air for centuries, so the warming it causes barely fades.
- **Methane** is short-lived. Each tonne is about 80 times as warming as a tonne of CO₂ over its first twenty years, but it is mostly gone within a few decades. Steady methane emissions hold the temperature up at a roughly constant level; falling emissions let it come down again within decades.
- **N₂O** sits in between: it lasts about a century.

The common shortcut adds the gases up as "CO₂-equivalent" with the 100-year global warming potential (GWP100), then multiplies by the warming per tonne of CO₂ (the TCRE). That treats a tonne of methane as if it stayed in the air like CO₂. It overstates the lasting warming from steady methane, understates the quick cooling when methane falls, and gets the timing wrong for a diet change that takes effect within a decade or two. So Planetshift carries each gas separately from the emission factors to the temperature, and shows CO₂-equivalent only as a familiar number for display.

## The temperature response to one kilogram

For each gas, the pipeline computes the absolute global temperature change potential (AGTP): how much warmer the world is, year by year, after one kilogram of the gas is emitted in year 0. The curve covers 0 to 200 years after the emission.

It comes from FaIR, a simple climate model used in the IPCC's Sixth Assessment Report (AR6), run with its published calibrated and constrained ensemble (fair-calibrate v1.4.1): 841 sets of parameters, each consistent with the observed warming, ocean heat uptake and CO₂ concentrations and with AR6's assessed ranges of climate sensitivity and aerosol forcing. Each member is run twice on the SSP2-4.5 scenario (the middle-of-the-road future, with emissions for every gas and aerosol), once as published and once with an extra pulse of one gas emitted in 2035. The difference in temperature, divided by the mass of the pulse, is that member's AGTP. The app keeps, for each year after the pulse, the median of the 841 members and the 5th and 95th percentiles.

The pulses are 1 billion tonnes of CO₂, 1 million tonnes of methane and 0.1 million tonnes of N₂O: under 3% of a year's emissions of each gas, so the response stays proportional, and far above rounding error. Checks the build runs:

- **Proportional**: a pulse ten times larger gives an AGTP within 0.2% of the small one, for every gas.
- **Stable in time**: pulses in 2025, 2035 and 2045 give curves within 4% (CO₂), 7% (CH₄) and 2% (N₂O) of each other. The 2035 curve is kept, the middle of the years the app's diet shift covers.
- **Methane is biogenic.** Fossil methane adds CO₂ when it breaks down; methane from cattle, manure and rice does not, because its carbon was taken from the air by plants a few months before. FaIR does not turn methane into CO₂, which a test confirms: with the effect of warming on carbon uptake switched off, a methane pulse leaves the CO₂ concentration exactly unchanged. With that effect on (as in the curves), the warming from a methane pulse slows the uptake of CO₂ already in the air, a real climate-carbon feedback that AR6 includes in its metrics too.
- **Methane's indirect effects are on**: the extra ozone and stratospheric water vapour methane makes, and the way methane's lifetime changes with its own concentration, temperature and other gases.
- CO₂ pulses are fossil CO₂ (FaIR's "CO₂ FFI"), not land-use CO₂, which in FaIR also changes surface albedo.

What the curves show (FaIR median, 5–95% range, °C per kg), with AR6's values for the same horizons (Table 7.SM.7 for 50 and 100 years; AR6's expressions, computed here, for 20 years, which the table does not give):

| Gas | FaIR, 20 years | FaIR, 100 years | AR6, 20 / 50 / 100 years | Shape (FaIR) |
| --- | --- | --- | --- | --- |
| CO₂ | 3.7 × 10⁻¹⁶ (2.7–5.1) | 3.5 × 10⁻¹⁶ (2.1–5.3) | 4.95 × 10⁻¹⁶ / 4.28 × 10⁻¹⁶ / 3.95 × 10⁻¹⁶ | rises over about 11 years, then stays nearly flat |
| CH₄ | 3.3 × 10⁻¹⁴ (2.2–4.9) | 4.1 × 10⁻¹⁵ (1.5–10.4) | 2.59 × 10⁻¹⁴ / 4.73 × 10⁻¹⁵ / 2.12 × 10⁻¹⁵ | peaks after 6 years, a tenth of the peak by 100 years |
| N₂O | 1.7 × 10⁻¹³ (1.1–2.4) | 1.0 × 10⁻¹³ (0.7–1.8) | 1.47 × 10⁻¹³ / 1.24 × 10⁻¹³ / 9.19 × 10⁻¹⁴ | peaks after 12 years, decays over a century |

FaIR's CO₂ curve at 100 years is 11% below AR6's, its N₂O curve 9% above, and its methane curve about twice AR6's, close to AR6's value at 50 years; the next section explains why.

### How the app uses the curves

The levers change each gas's emissions by ΔE_gas(τ) in each year τ. The app adds up the warming from every year's change:

ΔT(t) = Σ_gas Σ_{τ ≤ t} ΔE_gas(τ) · AGTP_gas(t − τ)

This is exact for a model whose response is proportional to its input, and close for FaIR as long as the levers' change is small next to the world's emissions (see [Limitations](#method-limitations) for the energy levers in full). Each AGTP value is the change in a calendar year's mean temperature from a year's worth of emission spread evenly over that year, so AGTP(0) is the same-year effect. The build checks the convolution against FaIR itself: convolving agriculture's historical emissions with the curves gives agriculture's warming in 2010–2019 within about 6% of what FaIR gives when it is run with and without those emissions.

### The AR6 alternative

Under *Options*, the curves can be switched to the analytic expressions of IPCC AR6 Chapter 7 (its supplementary material, section 7.SM.5): a fixed CO₂ impulse response, a two-timescale climate response, each gas's radiative efficiency at 2019 concentrations with its rapid adjustments, methane's ozone and water vapour, N₂O's effect on methane, and a climate-carbon feedback. Every constant is the one AR6's own code used for its Table 7.SM.7, and the pipeline reproduces that table's AGTP at 50 and 100 years within 0.2% for all three gases. AR6 gives a single curve, so its median and its 5th and 95th percentiles are the same. Its instantaneous-pulse curves are averaged the same way as FaIR's (an emission spread over year 0, the mean over each calendar year).

The two agree in size. At 20 years FaIR's median is 0.75 times AR6's for CO₂, 1.3 times for methane and 1.1 times for N₂O. They part more at long horizons: FaIR's methane curve at 50 and 100 years is about twice AR6's. That tail is not FaIR's carbon cycle (it stays with the climate-carbon feedback switched off) but the slower part of its climate response, which is larger in the calibrated ensemble than in AR6's two-timescale fit. For a diet shift up to 2050 the first few decades matter most, where the two are close.

## The uncertainty band

The band around the shift's effect is the 5–95% range of the AGTP across the 841 members. It covers the uncertainty in the climate's response: climate sensitivity, ocean heat uptake, the carbon cycle, methane chemistry and forcing. It does not cover the uncertainty in the emissions per tonne of food, in diets or in feed, which is likely larger; the real range is wider than the one shown. The AR6 option has no band.

## Natural factors only

`climate.json` also carries `naturalOnly`: the temperature FaIR gives when every human emission is held at its 1750 level, so that only the sun and volcanoes change the climate. It is the same ensemble and the same natural forcing as every other run, from 1850 to 2100, relative to 1850–1900, as a median and a 5–95% range. Each emitted gas is set to the calibration's pre-industrial emissions, which leave its concentration at its 1750 value, and CO₂ emissions to zero.

Over 2010–2019 it gives +0.06 °C (−0.04 to +0.17). IPCC AR6 (WG1 SPM A.1.3, Figure SPM.2) assesses the change from natural drivers between 1850–1900 and 2010–2019 at −0.1 to +0.1 °C, and a test checks that the median lies inside that range. The line dips after large eruptions (Krakatoa in 1883) and stays near zero after 2050. Its range includes the ensemble's internal variability, which is why a single year can stray by more than a tenth of a degree.

The natural forcing is fair-calibrate v1.4.1's (the file FaIR's example publishes beside the calibration, with each year's mean stored at the end of the year). The volcanic forcing is the Indicators of Global Climate Change 2022 series (stratospheric aerosol optical depth to the end of 2022, with the Hunga Tonga eruption's sulphate and water vapour in 2022), held at its 2022 value for 2023 and brought linearly to its long-term mean, zero, by 2032. The solar forcing is the CMIP6 solar dataset (SOLARIS-HEPPA 3.2): observed to 2014, then its projection, whose cycle 25 peaks in 2024 at +0.09 W/m², which is what Forster et al. (2025) found from observations for 2024 (+0.09 W/m², against −0.02 W/m² at the 2019 minimum); the observed cycle peaked in October 2024 (smoothed sunspot number 161, against 116 for cycle 24). The forcing was therefore left as it is (see "Why 2023 and 2024 were so warm" below).

It is labelled "natural factors only", not "a world without humans": land cover and everything before 1750 are left as they are, and the 1850–1900 baseline was already slightly warmed by people. The future solar and volcanic forcing is a placeholder: a large eruption would cool the world by a few tenths of a degree for a year or three, which no one can forecast.

## The scenario baselines

The total temperature curve under each future comes from FaIR's 841 members run with the RCMIP v5.1.0 emissions for three Shared Socioeconomic Pathways, history included: SSP1-2.6 (strong mitigation), SSP2-4.5 (middle of the road, the default) and SSP3-7.0 (regional rivalry, high emissions). The app shows the median and 5–95% range relative to 1850–1900, each calendar year being the mean of FaIR's values at its start and end. The table gives FaIR's own; the app's baseline adds the 2020 shipping rule's forcing to them, 0.04 °C today (see "Why 2023 and 2024 were so warm").

| Scenario | 2015–2024 | 2050 | 2100 |
| --- | --- | --- | --- |
| SSP1-2.6 | 1.20 °C (0.98–1.37) | 1.77 °C (1.35–2.30) | 1.76 °C (1.23–2.54) |
| SSP2-4.5 | 1.19 °C (0.97–1.37) | 1.90 °C (1.51–2.34) | 2.63 °C (1.94–3.63) |
| SSP3-7.0 | 1.17 °C (0.92–1.36) | 1.90 °C (1.51–2.32) | 3.54 °C (2.74–4.52) |

Observed warming over 2015–2024 is 1.27 °C in HadCRUT5 and 1.33 °C in Berkeley Earth, both re-baselined here to their own 1850–1900 means; the FaIR median is 0.08 °C below HadCRUT5, inside its range, which a test checks. The 2100 values are close to AR6's assessed best estimates for 2081–2100 (1.8, 2.7 and 3.6 °C, Table SPM.1).

For context: Forster et al. (2026) put human-induced warming at 1.37 °C in 2025, rising by about 0.27 °C a decade. WMO put 2024 at 1.55 ± 0.13 °C above 1850–1900, the first calendar year above 1.5 °C, and 2025 at 1.44 ± 0.13 °C. A warming level, in the IPCC's sense, is a 20-year average: "the occurrence of individual years with global surface temperature change above a certain level does not imply that this global warming level has been reached" (AR6 Synthesis Report, SPM, footnote 28). The Paris Agreement's goal (Article 2.1(a)) is to hold warming "well below 2°C above pre-industrial levels" and to pursue efforts to limit it to 1.5 °C. Current policies lead to about 2.6 to 2.8 °C by 2100 (Climate Action Tracker, November 2026: 2.7 °C; UNEP Emissions Gap Report 2026: 2.8 °C), close to SSP2-4.5's 2.63 °C here; all pledges kept, net zero included, to about 2.1 °C. The remaining CO₂ budgets for 1.5, 1.7 and 2 °C at 50% are 130, 500 and 1,050 Gt from the start of 2026 (Forster et al. 2026), and 170, 525 and 1,055 Gt as of January 2026 in the Global Carbon Budget 2025; they assume a pathway for the other gases, so they cannot be compared one for one with levers that mostly cut methane.

The observed lines are the Met Office HadCRUT5 analysis (global annual series, complete years only) and Berkeley Earth Land + Ocean (annual, air temperature over sea ice), each shifted so its 1850–1900 mean is zero.

## Why 2023 and 2024 were so warm

HadCRUT5 puts 2023 at 1.48 °C and 2024 at 1.55 °C above 1850–1900 (Berkeley Earth 1.54 and 1.62 °C). FaIR's SSP2-4.5 median gives 1.29 and 1.30 °C, with 5–95% ranges of 1.03–1.51 and 1.05–1.55 °C: the two years sit 0.19 and 0.25 °C above the median, at the top of its range. What the model holds and what it does not:

- **The trend.** The greenhouse gases, above all fossil CO₂, and the slow decline of air pollution are in FaIR's emissions and make the median rise by about 0.25 °C a decade. This is the part a choice of levers can change.
- **El Niño and La Niña.** These swings of the tropical Pacific move a single year's global temperature by about a tenth or two of a degree, a few months after the Pacific peaks. FaIR's median averages them out. 2023 began in La Niña, after three La Niña winters, and ended in a strong El Niño; 2024 is an El Niño year. Raghuraman et al. (2024) measured a rise of 0.29 ± 0.04 °C from 2022 to 2023 and found, in 64 climate models run without any change in forcing, that a jump of more than 0.25 °C happens in 1.6% of years, and in 10.3% when a long La Niña turns into El Niño; they conclude that the spike itself needs no human cause, while the warming it rides on is human. Forster et al. (2025) give up to 0.25 °C for such a switch in the year of transition. The temperature chart marks El Niño and La Niña years on the observed line (below).
- **The sun.** Solar cycle 25 is in the forcing (see "Natural factors only" above). Against the sun held at its 2019 minimum, it adds 0.02 °C to 2023, 0.025 °C to 2024 and 0.03 °C to 2025 in FaIR's median, close to Forster et al.'s (2025) 0.03 °C (0.01–0.05) and 0.04 °C (0.02–0.07).
- **Hunga Tonga.** The January 2022 eruption put about 0.5 Tg of sulphur dioxide and some 146 Tg of water vapour into the stratosphere. The water vapour warms and the sulphate cools; the APARC assessment (2025) finds the sulphate's forcing about ten times the water vapour's in the first two years, a net −0.4 ± 0.1 W/m² over those years, and a cooling of about 0.05 °C, too small to tell from natural variability; a multi-model study gives −0.19 ± 0.06 W/m² for 2022–2023 (Quaglia et al. 2026), and Forster et al. (2025) estimate −0.02 °C with FaIR. The volcanic forcing here falls by 0.10 W/m² in 2022 and stays there in 2023, which in FaIR cools 2023–2025 by 0.01–0.015 °C against the forcing of 2021 held to 2024. The eruption did not cause the warmth, and the natural-only line stays at 0.05–0.06 °C through 2020–2025 because the solar rise is partly offset by it and by the volcanic forcing returning to its mean.
- **The 2020 limit on sulphur in ships' fuel.** From 1 January 2020 the International Maritime Organization cut the sulphur allowed in ships' fuel from 3.5% to 0.5%. Shipping's sulphur dioxide fell from 10.4 Mt in 2019 to 2.0 Mt in 2020, by 81% (CEDS, in Forster et al. 2025). The scenarios do not have this step. RCMIP gives SSP2-4.5's international shipping 9.2 Mt in 2015, 4.2 Mt in 2020 and 2.5 Mt in 2030, one value every five years, so the cut is spread from 2015 on (5.2 Mt in 2019, 3.7 Mt in 2023); SSP1-2.6 has 4.5 Mt in 2020 and SSP3-7.0 9.2 Mt, no cut at all. Run with shipping held at 9.2 Mt to 2019 and cut by 80% from 2020, FaIR warms 2023–2025 by only 0.002–0.003 °C (0.001–0.005) more: it already has half the cut, and its aerosol response depends on the world's total sulphur dioxide, about 80 Mt, with no account of where it is emitted, whereas ships' sulphur brightens clouds over clean ocean air far more per tonne. The published estimates of the forcing are larger: 0.12 W/m², with about 0.04 °C realised by 2023 in FaIR (Gettelman et al. 2024); 0.139 ± 0.019 W/m² and 0.046 ± 0.010 °C on average over 2020–2029 in UKESM1 (Jordan and Henry 2024); 0.14 ± 0.07 W/m² and 0.08 ± 0.03 °C after about three years in CESM2 (Quaglia and Visioni 2024); 0.2 ± 0.11 W/m² over the oceans and about 0.16 °C after some seven years (Yuan et al. 2024). Forster et al. (2025) review them at 0.08–0.14 W/m², about 0.03 °C in 2023 and 0.04 °C in 2024 with FaIR. Hansen et al. (2025) argue for about 0.5 W/m² and a climate sensitivity near 4.5 °C, an outlier in that review.
- **The darker planet.** Goessling, Rackow and Jung (2025) find that human warming and the onset of El Niño fall about 0.2 °C short of 2023's temperature, and that a record-low planetary albedo, mostly fewer low clouds in the northern mid-latitudes and the tropics, bridges the gap; whether this is internal variability, cleaner air (ships' among it) or a low-cloud feedback emerging with warming, they leave open. Schmidt (2024), in a Nature comment, made the same point: about 0.2 °C of 2023 was unexplained by the known factors, which even together did not account for it. FaIR has no clouds of its own: their feedback is inside each member's climate sensitivity, and a cloud change from internal variability is not in its median.

**The shipping rule, added outside FaIR.** Matching the published forcing means adding a forcing term outside FaIR's calibrated ensemble, whose aerosol strength was constrained on the observed warming without it. Planetshift does so, as a departure from FaIR that a fork can turn off (`shippingSulphur2020`, see "Where Planetshift departs from FaIR" below). From 2020 it adds an effective radiative forcing of 0.12 W/m², Gettelman et al.'s (2024) estimate and the one made with FaIR, with a likely range of 0.08–0.14 W/m², the range Forster et al. (2025) give in their review of the estimates above; Yuan et al.'s 0.2 W/m², over the oceans only, and Hansen et al.'s 0.5 are left outside it. Each year the forcing follows the scenario's international shipping CO₂ relative to 2020, as the sulphur no longer emitted follows the fuel burnt. It is turned into temperature with FaIR's response to a year of forcing (see [Energy and transport](#method-sectors)), the low end paired with the 5% response and the high end with the 95%, and added to the baseline temperature, and so to the scenario's. On SSP2-4.5 it warms 2023 by 0.033 °C (0.014–0.055), 2024 by 0.037 °C (0.015–0.062) and 2030 by 0.046 °C (0.018–0.081), close to Forster et al.'s 0.03 and 0.04 °C for 2023 and 2024 and to Jordan and Henry's 0.046 °C over 2020–2029. By 2050 and 2100 it adds 0.054 and 0.068 °C on SSP2-4.5, 0.043 and 0.030 on SSP1-2.6, whose ships burn less fuel, and 0.058 and 0.052 on SSP3-7.0. It leaves the warming the levers avoid unchanged. FaIR's own runs are left as they are: the scenario temperatures in the table above, the AGTP curves and the causes of warming do not include it. With it off, the scenarios keep their own ships' SO₂, cut from 2015 on, and FaIR's response to it. With the shipping effect, El Niño and the cloud changes, the observed years are where the literature expects them; no single factor accounts for all of 2023.

### El Niño and La Niña years

The dots on the observed line come from NOAA's Oceanic Niño Index (ONI): three-month running means of sea surface temperature anomalies in the Niño 3.4 region of the tropical Pacific (5°N–5°S, 120°–170°W), from the ERSSTv6 analysis, relative to centred 30-year base periods. NOAA calls an El Niño or La Niña episode when the index stays at or beyond +0.5 or −0.5 °C for five overlapping seasons in a row. Planetshift needs one label per calendar year: a year's value is the mean of the twelve seasons centred from the October before to September (SON of the year before to ASO), since the global temperature follows the Pacific by about three months, and the year is an El Niño year at +0.5 °C or more, a La Niña year at −0.5 °C or less, neutral otherwise. The rule was chosen over the winter season alone (DJF), which would call 2023 a La Niña year (−0.55 °C) although El Niño warmed its second half, and over the calendar year's mean, which misses the lag. It gives 13 El Niño and 16 La Niña years from 1951, the first year with the autumn before it; 1998, 2015, 2016, 2019 and 2024 are El Niño years, 2021 and 2022 La Niña years, and 2023 (+0.14 °C) neutral. Since February 2026 NOAA's official index is the Relative ONI, which subtracts the whole tropics' warming; the ONI is kept for its long record and because it is the index the studies above use.

## Permafrost

The ground of the Arctic and of high mountains holds about twice as much carbon as the air, frozen in soil that has not thawed for thousands of years. As the world warms, more of it thaws, microbes break down the organic matter, and the carbon comes out as CO₂ and, where the soil is waterlogged, as methane. More warming means more release, which means more warming: a feedback.

IPCC AR6 (Working Group I, Chapter 5, Box 5.1, Section 5.4.3 and Figure 5.29) assesses the release by 2100 at 18 PgC (billion tonnes of carbon) as CO₂ per °C of global warming, 3.1 to 41 (5–95% range), and the methane feedback at 2.8 PgCeq per °C, 0.7 to 7.3. PgCeq is not methane's carbon: it is the CO₂ carbon that would have the same effect, the unit AR6 uses to compare non-CO₂ feedbacks with the carbon cycle. At the 100-year global warming potential (27 for methane), a kilogram of carbon emitted as methane (1.34 kg of CH₄) counts as about 9.8 kg of carbon as CO₂, so the methane released is about 0.28 PgC per °C (0.07 to 0.74). `climate.json` gives the two together under `permafrost`: 18.3 × 10¹² kg of carbon per °C (3.2 to 41.7 × 10¹², the two ranges' ends added), with 1.6% of it released as methane (`ch4Share`, 0.28 ÷ 18.3). `releaseYears`, 20, is the time over which a degree's release is spread.

An earlier version took the 2.8 as methane's carbon, which made the methane ten times too large (13.5% of the carbon) and the baseline's permafrost warming in 2050 about 0.10 °C instead of about 0.02 °C on SSP2-4.5. Methane is now under 2% of the carbon but still about two fifths of the feedback's warming in 2050 (0.009 of 0.023 °C), because each kilogram warms so much more in its first decades.

### How the model uses it

The feedback is the *Permafrost* switch under Options, off by default (`pf=on` in the address). When it is on, the model (`app/src/levers/permafrost/`, a lever module called by `run.ts`) runs it twice, once on the scenario's baseline temperature and once on the temperature with the levers applied:

1. Each year, the rise in temperature since the year before commits `kgCPerDegree` × that rise of carbon, released evenly over the next `releaseYears` years. Summing over the past gives each year's release; a fall in temperature commits nothing back (thawed carbon does not refreeze). Only the release from the current year on is counted, but it includes what the warming of the 20 years before commits; the release before today is in the observed record FaIR is constrained on.
2. Of each year's release, `ch4Share` is methane (kg C × 16/12 kg CH₄) and the rest CO₂ (kg C × 44/12 kg CO₂).
3. The baseline's own release is convolved with the AGTP curves and added to the baseline temperature, so switching it on warms the future without any lever. The scenario's release minus the baseline's is a change in CO₂ and methane emissions like any other, convolved with the CO₂ and CH₄ AGTP curves and added to the warming change. Warming avoided by the levers means less thaw, so the feedback makes the avoided warming slightly larger.
4. The range pairs the low `kgCPerDegree` with the 5% temperature and AGTP curves and the high one with the 95%, so the baseline's band widens upwards.
5. In the summary's breakdown by lever, the change in release is shared out in proportion to the size of each lever group's avoided warming, whatever its sign (see the Levers page).

Spreading a degree's release over 20 years means the carbon released by a given year is about what the warming of a decade earlier commits, so for a world warming steadily the release by 2100 is close to AR6's per-degree figure applied to the warming of about 2090. That lag of about a decade is a simplification: in reality thaw goes on for centuries after the warming, and AR6 notes that much of the release committed this century comes after 2100. With the 20-year spread, the release from 2026 to 2100 on SSP2-4.5 is about 27 PgC, close to AR6's 18 PgC per °C times the warming still to come (about 1.3 °C); spreading over 50 or 100 years changes the 2050 effect by less than 0.01 °C, because a longer spread also brings in older warming. The rule may front-load the release a little: observation-based budgets put today's permafrost region close to neutral.

The baseline temperature is FaIR's scenario temperature (`scenarioTemperature`, each band with its own), with the population baseline's adjustment and the data centres' extra electricity added, and the change from the levers is the model's own result, so the feedback is computed from the temperature it then changes. One pass is enough: the feedback on the feedback is a few percent of an already small term.

### Why it is a switch

- FaIR's carbon cycle already weakens the land and ocean sinks as the world warms, calibrated on Earth system models most of which leave permafrost out. Adding permafrost on top is therefore mostly new, but the calibration's constraint on observed CO₂ may have absorbed a little of it, so a small part may be counted twice.
- Most of the Earth system models behind AR6's projections leave permafrost out, and so do the emulator runs calibrated on them, the scenario temperatures and the AGTP curves here; switching it on makes Planetshift's results differ from those published numbers.
- The range is wide (a factor of ten between its ends), and the release's timing, methane share and response to a temperature that falls again are poorly known; abrupt thaw (collapsing ground, thermokarst lakes), which could add substantially to the release, is missing from most of the models behind the figure.

## Where Planetshift departs from FaIR

Everything on this page and on the levers' pages is FaIR's arithmetic with its calibrated ensemble, but for a few places where Planetshift adds what FaIR leaves out or replaces one of its coefficients with the literature's. Each is a named switch in `planetshift.config.json`, the file a fork of Planetshift sets (see `docs/app.md`); the website uses the values below, and a fork can set each back to plain FaIR. Visitors do not see these switches.

| Departure | On this website | Plain FaIR | Explained in |
| --- | --- | --- | --- |
| Where NOx is emitted (`noxMethane`) | the chemistry models' own methane per kg of NOx on land and at sea (Hoor et al. 2009), carried by FaIR's change with the scenario; a fork can also share FaIR's coefficient between land and sea by their ratio, its world total kept (`hoor`) | one coefficient for every source | [Energy and transport](#method-sectors), [Limitations](#method-limitations) |
| Aviation's non-CO₂ effects (`aviationNonCo2`) | Lee et al. (2021)'s forcing, contrails included, cut by less flying | aviation's own NOx, SO₂ and soot through FaIR's coefficients; FaIR has no contrails | [Energy and transport](#method-sectors) |
| Permafrost (`permafrost`) | offered as an option, off by default | the option and its module left out | Permafrost, above |
| The 2020 shipping sulphur rule (`shippingSulphur2020`) | its published forcing, 0.12 (0.08–0.14) W/m² from 2020, added to the baseline | the scenarios' own ships' SO₂ through FaIR's world-wide aerosol response | Why 2023 and 2024 were so warm, above |

With every switch at its plain-FaIR value, less flying in full avoids 0.007 °C in 2050 and 0.045 °C in 2100 instead of 0.054 and 0.122 (SSP2-4.5), as most of its effect is the contrails' and FaIR has none; electric cars avoid 0.027 and 0.091 °C instead of 0.045 and 0.106, and in SSP3-7.0 add 0.018 °C by 2100 instead of avoiding 0.054; the seven energy levers together avoid 0.164 and 0.532 °C instead of 0.263 and 0.646. The baseline is 0.037 °C cooler in 2024 and 0.068 °C in 2100 without the shipping rule. The farm levers do not move.

## Assumptions

- AGTP curves come from pulses on SSP2-4.5 in 2035 and are used under every scenario and for every year; the curves from 2025 and 2045 are within 7%.
- The calibrated ensemble is used as published, all 841 members, including its stochastic internal variability (seeded, so identical in paired runs and cancelling in differences).
- Agricultural methane is treated as biogenic: no CO₂ from its oxidation.
- CO₂ from farming (urea and liming) is treated as fossil CO₂ in FaIR.
- The response is treated as proportional to the emission change, which the ten-times pulse test supports.
- A year's emissions are spread evenly over the year; a calendar year's temperature is the mean of FaIR's values at its two ends.
- Observed series are re-baselined to their own 1850–1900 mean; HadCRUT5's current year is left out until it is complete.
- The natural forcing and the scenarios' aerosol emissions are used as published; the 2020 shipping rule adds 0.12 (0.08–0.14) W/m² from 2020 outside FaIR's ensemble, following each scenario's shipping fuel, to the baseline and the scenario alike (see "Why 2023 and 2024 were so warm").
- Permafrost releases 18.3 (3.2–41.7) PgC per °C of warming, 1.6% of it as methane, each degree's release spread over 20 years, and nothing back when the temperature falls; the feedback is off unless the switch is on.

## Sources

- FaIR, the Finite-amplitude Impulse Response climate model, v2.2.5: [github.com/OMS-NetZero/FAIR](https://github.com/OMS-NetZero/FAIR), [documentation](https://docs.fairmodel.net). Licence: Apache 2.0. The calibration files are read from its example data at tag v2.2.5.
- fair-calibrate v1.4.1, the calibrated, constrained parameter set: [doi:10.5281/zenodo.10566813](https://doi.org/10.5281/zenodo.10566813). Licence: CC BY 4.0.
- RCMIP protocol v5.1.0, SSP emissions with their history: [rcmip.org](https://www.rcmip.org), [doi:10.5281/zenodo.4589756](https://doi.org/10.5281/zenodo.4589756), described in [doi:10.5194/gmd-13-5175-2020](https://doi.org/10.5194/gmd-13-5175-2020). Licence: CC BY-SA 4.0.
- IPCC AR6 WG1 Chapter 7, *The Earth's Energy Budget, Climate Feedbacks and Climate Sensitivity*, and its supplementary material (7.SM.5, Table 7.SM.7): [doi:10.1017/9781009157896.009](https://doi.org/10.1017/9781009157896.009). The chapter's code: [github.com/IPCC-WG1/Chapter-7](https://github.com/IPCC-WG1/Chapter-7), MIT licence.
- The sources AR6 cites for its constants: the CO₂ impulse response, [doi:10.5194/acp-13-2793-2013](https://doi.org/10.5194/acp-13-2793-2013); the greenhouse gas forcing fits, [doi:10.5194/gmd-13-3571-2020](https://doi.org/10.5194/gmd-13-3571-2020); the climate-carbon feedback in emission metrics, [doi:10.5194/esd-8-235-2017](https://doi.org/10.5194/esd-8-235-2017).
- IPCC AR6 WG1 Chapter 5, *Global Carbon and other Biogeochemical Cycles and Feedbacks*, Box 5.1, Section 5.4.3 and Figure 5.29 (permafrost carbon feedback): [doi:10.1017/9781009157896.007](https://doi.org/10.1017/9781009157896.007).
- HadCRUT5 v5.2.0.0, Met Office Hadley Centre and Climatic Research Unit: [metoffice.gov.uk/hadobs/hadcrut5](https://www.metoffice.gov.uk/hadobs/hadcrut5/). Licence: Open Government Licence v3.
- Berkeley Earth Land + Ocean, global annual summary: [berkeleyearth.org/data](https://berkeleyearth.org/data/), described in [doi:10.5194/essd-12-3469-2020](https://doi.org/10.5194/essd-12-3469-2020). Licence: CC BY-NC 4.0, non-commercial use only.
- IPCC AR6 WG1 Summary for Policymakers, A.1.3 and Figure SPM.2 (natural drivers −0.1 to +0.1 °C over 2010–2019): [doi:10.1017/9781009157896.001](https://doi.org/10.1017/9781009157896.001).
- IPCC (2023). *Climate Change 2023: Synthesis Report*, Summary for Policymakers, footnote 28 (warming levels as 20-year averages): [doi:10.59327/IPCC/AR6-9789291691647.001](https://doi.org/10.59327/IPCC/AR6-9789291691647.001).
- Forster, P. M. et al. (2026). Indicators of Global Climate Change 2025. *Earth System Science Data* 18, 3889 (human-induced warming in 2025, remaining carbon budgets): [doi:10.5194/essd-18-3889-2026](https://doi.org/10.5194/essd-18-3889-2026).
- Forster, P. M. et al. (2025). Indicators of Global Climate Change 2024. *Earth System Science Data* 17, 2641–2680: [doi:10.5194/essd-17-2641-2025](https://doi.org/10.5194/essd-17-2641-2025).
- World Meteorological Organization, global temperature releases for 2024 (January 2025) and 2025 (14 January 2026): [wmo.int](https://wmo.int).
- United Nations (2015). Paris Agreement, Article 2.1(a): [unfccc.int](https://unfccc.int/process-and-meetings/the-paris-agreement).
- UNEP (2026). *Emissions Gap Report 2026*: [unep.org/emissions-gap-report-2026](https://www.unep.org/emissions-gap-report-2026).
- Climate Action Tracker (2026). Global update, 12 November 2026: [climateactiontracker.org](https://climateactiontracker.org).
- Friedlingstein, P. et al. Global Carbon Budget 2025. *Earth System Science Data* 18, 3211 (2026); Global Carbon Budget 2026, preprint, [doi:10.5194/essd-2026-895](https://doi.org/10.5194/essd-2026-895).
- NOAA Climate Prediction Center, Oceanic Niño Index (ERSSTv6): [cpc.ncep.noaa.gov](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/oni/v6/), the table read from [oni.ascii.txt](https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt). Public domain (US Government work); NOAA does not endorse this use.
- Smith, C. et al. (2024). fair-calibrate v1.4.1: calibration, constraining, and validation of the FaIR simple climate model for reliable future climate projections. *Geoscientific Model Development* 17, 8569–8592 (the solar and volcanic forcing): [doi:10.5194/gmd-17-8569-2024](https://doi.org/10.5194/gmd-17-8569-2024).
- Forster, P. M. et al. (2023). Indicators of Global Climate Change 2022: annual update of large-scale indicators of the state of the climate system and human influence. *Earth System Science Data* 15, 2295–2327 (the volcanic forcing): [doi:10.5194/essd-15-2295-2023](https://doi.org/10.5194/essd-15-2295-2023).
- Matthes, K. et al. (2017). Solar forcing for CMIP6 (v3.2). *Geoscientific Model Development* 10, 2247–2302: [doi:10.5194/gmd-10-2247-2017](https://doi.org/10.5194/gmd-10-2247-2017).
- SILSO, Royal Observatory of Belgium: solar cycle 25 reached its maximum in October 2024: [sidc.be](https://sidc.be/article/solar-cycle-25-reached-its-maximum-october-2024).
- Raghuraman, S. P. et al. (2024). The 2023 global warming spike was driven by the El Niño–Southern Oscillation. *Atmospheric Chemistry and Physics* 24, 11275–11283: [doi:10.5194/acp-24-11275-2024](https://doi.org/10.5194/acp-24-11275-2024).
- Goessling, H. F., Rackow, T. and Jung, T. (2025). Recent global temperature surge intensified by record-low planetary albedo. *Science* 387, 68–73: [doi:10.1126/science.adq7280](https://doi.org/10.1126/science.adq7280).
- Schmidt, G. (2024). Climate models can't explain 2023's huge heat anomaly — we could be in uncharted territory. *Nature* 627, 467: [doi:10.1038/d41586-024-00816-z](https://doi.org/10.1038/d41586-024-00816-z).
- Hansen, J. E. et al. (2025). Global warming has accelerated: are the United Nations and the public well-informed? *Environment: Science and Policy for Sustainable Development* 67(1): [doi:10.1080/00139157.2025.2434494](https://doi.org/10.1080/00139157.2025.2434494).
- Gettelman, A. et al. (2024). Has reducing ship emissions brought forward global warming? *Geophysical Research Letters* 51, e2024GL109077: [doi:10.1029/2024GL109077](https://doi.org/10.1029/2024GL109077).
- Jordan, G. and Henry, M. (2024). IMO2020 regulations accelerate global warming by up to 3 years in UKESM1. *Earth's Future* 12, e2024EF005011: [doi:10.1029/2024EF005011](https://doi.org/10.1029/2024EF005011).
- Quaglia, I. and Visioni, D. (2024). Modeling 2020 regulatory changes in international shipping emissions helps explain anomalous 2023 warming. *Earth System Dynamics* 15, 1527–1541: [doi:10.5194/esd-15-1527-2024](https://doi.org/10.5194/esd-15-1527-2024).
- Yuan, T. et al. (2024). Abrupt reduction in shipping emission as an inadvertent geoengineering termination shock produces substantial radiative warming. *Communications Earth & Environment* 5, 281: [doi:10.1038/s43247-024-01442-3](https://doi.org/10.1038/s43247-024-01442-3).
- APARC (2025). *The Hunga Volcanic Eruption Atmospheric Impacts Report*, APARC Report No. 11, WCRP-10/2025, Chapter 7 (climate impacts): [doi:10.34734/FZJ-2025-05244](https://doi.org/10.34734/FZJ-2025-05244).
- Quaglia, I. et al. (2026). Multi-model analysis of the impact of water vapor on the radiative forcing of volcanic aerosols after the 2022 Hunga Eruption. *Atmospheric Chemistry and Physics* 26, 7677–7704: [doi:10.5194/acp-26-7677-2026](https://doi.org/10.5194/acp-26-7677-2026).
- Jenkins, S., Smith, C., Allen, M. and Grainger, R. (2023). Tonga eruption increases chance of temporary surface temperature anomaly above 1.5 °C. *Nature Climate Change* 13, 127–129: [doi:10.1038/s41558-022-01568-2](https://doi.org/10.1038/s41558-022-01568-2).
