# Landfills and wastewater

Waste that rots without air gives off methane. Most of it comes from two places: food, garden waste and paper buried in landfills and dumps, and sewage left in latrines, septic tanks, lagoons and rivers. Two levers act on this methane. They are the first on the *Waste* cause of warming (see [Causes of global warming](#method-link)). **Landfills** captures the gas landfills make and keeps organic waste out of them. **Wastewater** treats sewage so that less of it rots without air, and burns the gas from the sewage that still does.

## Where the methane comes from

CEDS v_2024_07_08 gives each country's methane by sector. In 2022 the world's waste emitted 82.1 Mt of methane: 38.1 Mt from solid waste disposal (landfills and dumps), 41.9 Mt from wastewater, 1.6 Mt from burning waste and 0.5 Mt from other handling. The levers act on the first two. China, India, Brazil, the United States and Russia emit the most. CEDS also gives 0.46 Mt of wastewater N₂O. The levers leave it as it is, because aerobic treatment cuts the methane but can raise the N₂O.

The future follows the *Waste* cause of the [causes of warming](#method-link): PRIMAP-hist up to 2023, then each scenario's waste methane (RCMIP's *Fossil and Industrial|Waste*) scaled to meet it. On SSP2-4.5 that is 66.2 Mt in 2023, 44.6 Mt in 2050 and 26.9 Mt in 2100. SSP1-2.6 keeps 63.1 Mt in 2050 and 45.1 Mt in 2100, and SSP3-7.0 rises to 90.9 and 128.5 Mt. PRIMAP-hist counts less waste methane than CEDS (65.8 Mt in 2022). Each country's landfill and wastewater methane in a year is therefore the scenario's waste methane times its share of CEDS's 82.1 Mt.

## Landfills

The lever does two things at full adoption:

- **Gas capture.** Landfills get gas collection, and the gas is burnt or used. A site with a gas system collects 50–90% of what it makes while it runs, and less over its whole life. Planetshift uses 60% (50–75%). Gas cannot be collected from an open dump, or from waste that is never collected. So capture acts only on a country's *managed* share. That is the share of its waste that goes to landfills, out of all the waste that goes to landfills, goes to open dumps or is never collected, from the World Bank's What a Waste 3.0. Weighted by landfill methane, the world's managed share is 82%. A country that What a Waste leaves out uses the world's share.
- **Diversion.** Food and garden waste is composted or digested instead of buried. Planetshift uses 40% (30–50%) of the degradable waste kept out of landfills and dumps. Diversion acts everywhere, dumps included.

The two combine on what is left after the other:

$$
\text{cut} = 1 - (1 - a_c \times \text{capture} \times \text{managed}) \times (1 - a_d \times \text{diversion})
$$

With the lever in full and the waste already buried rotted away, a country whose waste all goes to landfills loses 1 − 0.4 × 0.6 = 76% of its landfill methane. A country with only open dumps loses 40%. On the real data the world loses 70%.

### Waste already buried keeps rotting

Capture acts at once: $a_c$ is the lever's adoption as it ramps in. Diversion only stops new waste from being buried. The waste already in landfills keeps giving off methane for decades as it decays, which the IPCC's inventories model as a first-order decay. With a decay rate $k$, the methane of a year's waste falls by $1 - e^{-k t}$ over the $t$ years after it is no longer buried. So $a_d$ is the adoption as it ramps in, and each year's rise in it takes effect at that rate. The IPCC's default for bulk waste is $k$ = 0.09 a year in wet temperate climates, 0.05 in dry ones and 0.17 in moist tropical ones (2006 Guidelines, vol. 5, Table 3.3). Planetshift uses 0.09, a time constant of 11 years, with 0.05 and 0.17 at the ends of the range. With the lever in full by 2035, diversion has reached 28% of its effect that year, 71% in 2045, 81% in 2050 and 99% by 2085.

## Wastewater

Sewers and treatment plants replace latrines, septic tanks and untreated discharge. The lagoons and sludge digesters that remain are covered, and their gas is burnt. At full adoption the lever cuts 45% (40–50%) of each country's wastewater methane. The IPCC's assessment puts the potential of wastewater at 0.22 Gt CO₂e a year (AR6 WGIII, Table 12.SM.1.1). The cut acts at once, as the lever ramps in.

## No tonne cut twice

The diet and the food waste levers already cut waste methane. Less food grown means less food thrown away and less sewage, and that change counts in the *Waste* cause (see [Emissions](#method-emissions), *After the farm*). Its *food waste* stage is FAOSTAT's solid waste, incineration and food industry wastewater. The levers here take it as landfill methane. Its *domestic wastewater* stage is taken as wastewater.

The two levers act on what those levers leave. In each country and year, the landfill methane they cut is

$$
\text{cut} \times \max(0,\ E + F)
$$

where $E$ is the country's landfill methane in the scenario and $F$ is the food levers' change in it, which is negative. The same holds for wastewater. The food levers' change follows the production where the food is grown, as the rest of the chain after the farm does. It ramps in and scales with the farm baseline in the same way. With a full diet shift and both food waste levers in full, the food levers cut 24 Mt of methane a year from the countries' 79 Mt of CEDS's landfill and wastewater methane. Once the diet and food waste have acted, the two levers here avoid a further 0.013 °C in 2050 and 0.014 °C in 2100, against 0.023 and 0.033 °C alone.

In the breakdown by lever, the two levers count as *Landfills and wastewater*. They act on what the diet and food waste levers leave, as the farm practices do, so the summary splits the overlap between them (see [Levers](#method-levers)). They count in the *Waste* cause.

## In the app

The **Landfills and wastewater** fold of the Levers section is under its own heading, *Waste (landfills and wastewater)*. It has two sliders, *Landfills* (`lf` in the URL) and *Wastewater* (`ww`). Like every lever, each ramps in from the current year to the year set by *All levers fully in place by* (`app/src/levers/wasteMethane/model.ts`).

The methane change is passed to FaIR, which the app runs (see the [temperature page](#method-climate)). The likely range is the 5–95% range of FaIR's members. The 95% end takes the high end of each factor and the fastest decay, and the 5% end the low ends and the slowest decay.

The map's Waste layer shows the landfill and wastewater methane of each country (*Landfill and wastewater methane*), CEDS's for 2022. With the levers, it shows the change once they are in full and the waste already buried has rotted away. That change includes the food levers'. The tooltip shows landfills and wastewater separately.

## Results

The table gives the warming avoided in °C, as a median with the likely range in brackets. Each lever is at 100% from 2026 to 2035, on the real data and SSP2-4.5 with the default options.

| Levers | Methane avoided in 2035 | 2050 | 2100 |
| --- | --- | --- | --- |
| Landfills | 15.0 Mt | 0.012 (0.008–0.023) | 0.019 (0.012–0.034) |
| Wastewater | 13.5 Mt | 0.010 (0.007–0.017) | 0.014 (0.009–0.023) |
| Both | 28.4 Mt | 0.023 (0.015–0.040) | 0.033 (0.021–0.056) |

On SSP1-2.6 both levers avoid 0.030 °C in 2050 and 0.056 °C in 2100, and on SSP3-7.0 0.031 and 0.079 °C, because these scenarios have more waste methane.

The 28.4 Mt a year avoided in 2035 is about 0.77 Gt CO₂e at methane's GWP100 of 27. The IPCC's assessment of the potential is 0.69 Gt CO₂e a year for solid waste and 0.22 Gt for wastewater (AR6 WGIII, Table 12.SM.1.1). The effect in warming is smaller than a first estimate that held the source at its 2022 level, which gave 0.03–0.04 °C in 2050 and 0.05–0.07 °C in 2100. There are three reasons. SSP2-4.5's waste methane falls by 2100 to 40% of today's. PRIMAP-hist's waste methane is a fifth below CEDS's. And diversion takes decades to have its full effect.

## Assumptions

- Each country's landfill and wastewater methane is its share of CEDS's 2022 waste methane, times the scenario's waste methane in each year.
- Gas capture collects 60% of a managed landfill's methane, and acts on the share of a country's buried waste that goes to landfills (What a Waste 3.0). Landfills that already collect gas are not treated separately, because CEDS's emissions are already net of what they collect.
- Diversion keeps 40% of degradable waste out of landfills and dumps, and acts through a first-order decay with a time constant of 11 years.
- Wastewater treatment cuts 45% of wastewater's methane, and leaves its N₂O as it is.
- The levers act on the waste methane the diet and the food waste levers leave, country by country, and never cut a country below zero.
- The people-on-Earth option does not scale what the levers cut.
- Building the landfill gas systems, composting plants, digesters and sewers is not counted, nor is the energy from the gas.

## Sources

- Community Emissions Data System (CEDS), v_2024_07_08, methane by country and sector: [doi:10.5281/zenodo.12803197](https://doi.org/10.5281/zenodo.12803197). Licence: CC BY 4.0.
- PRIMAP-hist v2.8, national historical emissions 1750–2025: [doi:10.5281/zenodo.22876287](https://doi.org/10.5281/zenodo.22876287). Licence: CC BY-NC-SA 4.0.
- RCMIP protocol v5.1.0, SSP emissions by sector: [doi:10.5281/zenodo.4589756](https://doi.org/10.5281/zenodo.4589756). Licence: CC BY-SA 4.0.
- World Bank (2026). What a Waste 3.0, country dataset, World Bank Data Catalog, dataset 0039597: <https://datacatalog.worldbank.org/search/dataset/0039597>. Licence: CC BY 4.0.
- IPCC (2006). 2006 IPCC Guidelines for National Greenhouse Gas Inventories, vol. 5, ch. 3, Solid Waste Disposal (first-order decay, Table 3.3): <https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol5.html>.
- IPCC (2022). Climate Change 2022: Mitigation of Climate Change, Working Group III, ch. 12 and Table 12.SM.1.1: <https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-12/>.
- US EPA. AP-42, Compilation of Air Emissions Factors, section 2.4, Municipal Solid Waste Landfills (gas collection efficiency): <https://www.epa.gov/air-emissions-factors-and-quantification/ap-42-compilation-air-emissions-factors>.
