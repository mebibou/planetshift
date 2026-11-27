# Direct air capture

Direct air capture plants take CO₂ out of the air with filters or chemicals. When the CO₂ is then stored deep underground, the combination is called direct air capture and storage (DACCS). Planetshift has one lever for it. At 100%, the plants store about 0.65 billion tonnes of CO₂ a year in 2050 and 3.3 billion in 2100. Generating their electricity emits CO₂ too, so on SSP2-4.5 they take out 0.44 billion tonnes in 2050, net of that CO₂. They avoid 0.0015 °C of warming in 2050 and 0.030 °C in 2100 (median, SSP2-4.5).

Today's plants capture about 0.01 million tonnes a year (IEA, *Direct Air Capture 2022*). At 100%, the lever is far above what most mitigation pathways use: the IPCC gives a median of 0.02 billion tonnes of DACCS a year in 2050, with a range of 0 to 1.74 (AR6 WGIII, chapter 12).

## Only the CO₂ that is stored

Some captured CO₂ is made into synthetic fuel, mostly for aviation. Burning that fuel releases the CO₂ again, so it removes nothing. It replaces fossil fuel instead, and the *Clean aviation fuel* lever already counts that (see [Energy and transport](#method-sectors)). So the lever counts only the CO₂ that is stored.

## The path at 100%

Every other lever ramps up to the year set by *All levers fully in place by*. This one follows its own path instead, because plants take decades to build up. The slider scales the whole path: at 50%, half of the CO₂ is stored in every year.

The path follows the IEA's Net Zero Roadmap (2023 update) to 2050. Its Net Zero scenario captures 80 million tonnes of CO₂ from the air in 2030, 203 million in 2035 and 1,041 million in 2050. Part of that is made into fuel. In the IEA's *Direct Air Capture 2022* report, the earlier version of the same scenario captures 980 million tonnes in 2050: 630 million are stored and 350 million are used, mainly for aviation fuel. Planetshift applies that stored share, 64.3%, to every year of the 2023 path.

After 2050 the path rises in a straight line to 3.3 billion tonnes in 2100. That is the IEA's Delayed Action Case. In that case net zero comes late. Removing more than 5 billion tonnes of CO₂ a year in the second half of the century brings warming back below 1.5 °C: 2 billion tonnes through bioenergy with carbon capture and 3.3 billion through DACCS. The IEA notes that DACCS at that scale would use about 30 EJ of energy a year.

In billion tonnes of CO₂ stored a year:

| 2030 | 2035 | 2040 | 2050 | 2060 | 2075 | 2100 |
| --- | --- | --- | --- | --- | --- | --- |
| 0.051 | 0.131 | 0.310 | 0.669 | 1.195 | 1.985 | 3.300 |

The values are linear between the milestones. From 2026 to 2100, that adds up to 107 billion tonnes stored. This is close to the median of the AR6 pathways that return warming to 1.5 °C after a high overshoot (category C2): 109 billion tonnes of DACCS from 2020 to 2100, among the 24 of them that use it (AR6 WGIII, Table 3.5). So at 100%, the lever describes a world that acted late and then relies on removing CO₂ on a large scale.

## The energy it uses

The lever's plants use solid sorbents, the kind Climeworks runs. They need electricity for fans and vacuum pumps, and heat at about 100 °C to release the CO₂ from the filter. Deutz and Bardow (2021) give 500 kWh of electricity and 1,500 kWh of heat for each tonne captured. Here a high-temperature heat pump makes the heat, at a coefficient of performance (COP) of 2.9, as in Terlouw et al. (2021). So a tonne needs 500 + 1,500 / 2.9 = 1,017 kWh of electricity.

The range comes from the IEA's 7.2–9.5 GJ a tonne for solid sorbents, with 20–25% of it as electricity:

- **Low** (800 kWh): 7.2 GJ, of which 20% electricity, so 400 kWh of electricity and 1,600 kWh of heat. The heat pump runs at a COP of 4, which it can reach when it heats from a warm source such as waste heat.
- **High** (1,452 kWh): 9.5 GJ, of which 25% electricity, so 660 kWh of electricity and 1,980 kWh of heat. The heat pump runs at a COP of 2.5, heating from outside air to 100 °C.

The likely range takes the low end for the band that avoids the most warming, and the high end for the band that avoids the least.

The electricity comes from the scenario's grid, at its world-average CO₂ per kWh in each year, from `sectors.json` (see [Energy and transport](#method-sectors)). The *Renewable electricity* lever cleans that grid, so it cuts the plants' CO₂ too, as it does for electric cars and heat pumps. The electricity also brings the grid's methane and air pollution (see *Methane and air pollution that come with the fuel* on the same page).

Building the plants and making their sorbent emit CO₂ too. Deutz and Bardow find up to 45 g of CO₂e per kg captured from the sorbent and 15 g from building the plant, with low-carbon energy. The lever counts 5% of what is captured, with a range of 2.5–6%.

## Net removal

Each year, the lever's CO₂ is

$$\Delta\text{CO}_2 = -S + S\,k\,g\,(1 - r) + S\,e$$

with $S$ the CO₂ stored, $k$ the kWh a tonne, $g$ the grid's CO₂ per kWh, $r$ the share of the grid renewable electricity has cleaned that year, and $e$ the embodied share. It goes into FaIR as negative CO₂, like the CO₂ that carbon in farmland takes up.

The share of the CO₂ captured that is removed, net of the plants' energy (median, without renewable electricity):

| Scenario | 2030 | 2035 | 2040 | 2050 | 2060 | 2075 | 2100 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SSP2-4.5 | 52% | 58% | 63% | 68% | 72% | 83% | 95% |
| SSP1-2.6 | 55% | 64% | 72% | 85% | 95% | 95% | 95% |
| SSP3-7.0 | 45% | 44% | 44% | 43% | 42% | 41% | 39% |

On SSP3-7.0's grid, which still burns coal in 2100, more than half of what the plants take out is put back by their electricity. With the high energy figure and the methane of coal and gas, the lever can even cause warming there, in the band that avoids the least. Terlouw et al. find that a plant run on the grid stops removing CO₂ above about 0.86 kg of CO₂e per kWh. With renewable electricity at 100%, the plants remove 95% of what they capture from the year it is fully in place, 2035 by default.

## In the app

In the Levers section, the **Direct air capture** fold has the slider. It sits under *Other human emissions*, next to the HFC phase-down. It removes CO₂ from the air rather than cutting a sector's emissions. The plants' emissions come from the grid's electricity. In the breakdown by lever, its effect counts as *Direct air capture*. When the lever acts, the summary shows the CO₂ removed in 2050, net of the plants' energy. The lever acts on the world as a whole, not by country, so it has no map layer.

The lever interacts with renewable electricity through the grid. In the breakdown, that overlap is split between the two groups by their Shapley value (see [Levers](#method-levers)), as for the other groups outside farming.

The path and the energy figures are in `app/src/levers/dac/dac.json`, and the lever module is `app/src/levers/dac/`.

## Results

The warming avoided in °C, as a median with the likely range in brackets. The lever is at 100%, on the real data with the default options.

| Scenario | 2050 | 2100 |
| --- | --- | --- |
| SSP2-4.5 | 0.0015 (0.0005–0.0030) | 0.030 (0.018–0.046) |
| SSP1-2.6 | 0.0017 (0.0010–0.0029) | 0.036 (0.027–0.056) |
| SSP3-7.0 | 0.0015 (−0.0001–0.0038) | 0.011 (−0.004–0.031) |

The CO₂ taken out in 2050, net of the plants' energy, is 0.44 billion tonnes on SSP2-4.5 (0.35–0.50), 0.56 on SSP1-2.6 and 0.26 on SSP3-7.0. With renewable electricity at 100% as well, it is 0.64 on all three.

Little is stored before 2050, so little warming is avoided by then. By 2100, about 107 billion tonnes have been stored. As a check, the transient climate response to cumulative emissions (TCRE) is 0.45 °C per 1,000 billion tonnes of CO₂. On SSP2-4.5, the plants remove 4.5 billion tonnes by 2050 and 91.5 billion by 2100, net of their energy. The TCRE turns that into 0.0020 °C in 2050 and 0.041 °C in 2100. FaIR gives less, because the ocean and land release back into the air part of the CO₂ removed.

## Assumptions and limitations

- At 100% the lever follows the IEA's Net Zero scenario to 2050, then its Delayed Action Case. It is far above the median of the IPCC's pathways in 2050 (0.02 billion tonnes a year). It is also tens of thousands of times today's capture (about 0.01 million tonnes a year).
- The plants run on the world-average grid of the scenario. Real plants are being built where electricity is clean, such as in Iceland, and would remove more of what they capture.
- Only solid-sorbent plants with heat pumps are modelled. Plants with liquid solvents need heat at about 900 °C, often from burning natural gas. The gas burnt for that heat, and the methane leaked supplying it, are not counted.
- The stored CO₂ is assumed to stay underground permanently. Leaks from storage, and from the pipes and ships that carry the CO₂, are not counted.
- Storage capacity and the pace of building plants are assumed to have no limit.
- The extra electricity, about 3,400 TWh a year in 2100 at 100%, is supplied by the scenario's grid at its average CO₂ per kWh. How it would change the build-out of power plants is not modelled.
- Cost is not modelled. The IPCC gives USD 100–300 a tonne once plants have been built at scale, and 600–1,000 for the first plants (AR6 WGIII, chapter 12).

## Sources

- IEA (2023). *Net Zero Roadmap: A Global Pathway to Keep the 1.5 °C Goal in Reach, 2023 Update*. CCUS milestones table (direct air capture) and section 3.3.3, *What would it take to bring temperatures back below 1.5 °C?*. Licence: CC BY 4.0 (the report body; its Annex A is under CC BY-NC-SA 4.0 and is not used).
- IEA (2022). *Direct Air Capture 2022: A key technology for net zero*. Licence: CC BY 4.0.
- Deutz, S., Bardow, A. (2021). Life-cycle assessment of an industrial direct air capture process based on temperature–vacuum swing adsorption. Nature Energy 6, 203–213, [doi:10.1038/s41560-020-00771-9](https://doi.org/10.1038/s41560-020-00771-9).
- Terlouw, T., Treyer, K., Bauer, C., Mazzotti, M. (2021). Life Cycle Assessment of Direct Air Carbon Capture and Storage with Low-Carbon Energy Sources. Environmental Science & Technology 55, 11397–11411, [doi:10.1021/acs.est.1c03263](https://doi.org/10.1021/acs.est.1c03263).
- IPCC (2022). Climate Change 2022: Mitigation of Climate Change, Working Group III, chapter 3 (Table 3.5) and chapter 12 (section 12.3).
