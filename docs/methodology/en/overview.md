# Overview

Planetshift asks what change looks like: what has warmed the planet since 1850, and how much less it would warm by 2050 or 2100 if the levers that act on those causes were pulled. The levers are of equal standing, and none is presented as the way to limit warming: energy and transport moving off fossil fuels, cleaner buildings and industry, what people eat, farm practices, less food wasted, an end to clearing forest, and carbon stored in farmland. What caused warming is what keeps causing it, so each lever is shown under the cause it reduces.

## What you see

**Explore** has three parts. On the left is the panel: at the top, the year every lever is fully in place by; then the lever groups under the cause of warming each acts on, the biggest cause first (fossil fuels and industry: energy and transport, buildings and industry; farming: diet, farm practices, food waste; land use: deforestation, carbon in farmland), each a fold of sliders with what it would avoid alone in full; and last the other options. In the middle are the charts: the global temperature from 1850 with and without the levers, the warming they avoid each year to 2050 or 2100 on its own scale, and the causes of warming, where each cause's band shrinks after today by what the levers take off it. Beside them, a strip of numbers sums up what the levers change, with the warming avoided shared out under each cause between the lever groups. Below, the food and farming map shows, country by country, how farms' emissions or output would change with the levers chosen, how much food is grown, how much greenhouse gas farms emit, how much farmland they use and how good the emission data is: food and farming is the only part of the model with country data.

**Methodology** is this page: what the numbers are, where they come from, and what they leave out.

## How the levers work

Each lever is a share adopted, from 0 to 100%, ramping in from this year to the year chosen at the top of the panel (2035 by default) and held until 2100. The energy and transport levers cut parts of the scenario's fossil CO₂: electric cars and trucks, less flying, clean aviation fuel, clean shipping, renewable electricity and data centres on clean power (see [Energy and transport](#method-sectors)); the buildings and industry levers cut the direct fossil CO₂ of heating, steel and cement (see [Buildings and industry](#method-industry)). Farm practices, less food waste, an end to deforestation and carbon stored in farmland act on farming and land (see [Levers](#method-levers)). The diet is described below, as it is the lever with the most steps; that says nothing of its size.

### The diet

The diet shift moves part of what people eat from animal foods to plant foods. The amount of protein each person gets stays the same (or the calories, if you choose so), so nobody eats less. The plant foods that replace the animal ones are, by default, the mix of plant foods the country already eats; you can choose mostly legumes instead, or soy and oat drinks for dairy.

Fewer animals need less feed, so the crops grown to feed them fall too. This often more than offsets the plant food added for people, which is why cropland can shrink even as people eat more plants.

The world's demand for each food then changes, and each country's farms produce more or less of it in proportion to their share of the world's output today. The emissions of each farm product (methane, nitrous oxide and carbon dioxide, per tonne) turn that change in production into a change in emissions.

Less livestock also needs less land. Cropland follows the crops grown, and pasture follows the beef, lamb and milk produced in each country, so a shift frees mostly pasture. Under Options, you can let the freed land grow back to natural vegetation, which takes up CO₂ for some decades and adds to the warming avoided; by default the freed land is left as it is and counts for nothing in the temperature.

Fish and seafood are an animal food like the others (see [Fish and seafood](#method-seafood)): wild fish emit only the fuel their boats burn, which counts only when Options include the emissions of inputs, and farmed fish eat feed crops and fish meal, which fall with them.

Like every lever, the shift grows in a straight line from this year to the year chosen and stays there until 2100.

## The breakdown

The summary shares the warming avoided out between the lever groups, under the causes they act on. Levers overlap (less waste saves less on a diet that has already shifted), so each group's part is its Shapley value: the mean of what it adds over every order the groups could be counted in, so that no group is counted first (see [Levers](#method-levers)).

Two options change the future without any lever: the electricity growth of AI data centres, added by default, and the thaw of permafrost, off by default (see [Options](#method-options)).

## How to read the numbers

The headline is the warming avoided in 2050, or in 2100 when the charts are set to reach 2100, in degrees Celsius, with a likely range. The avoided warming keeps growing after 2050, because the methane no longer emitted stops adding to the warming and the nitrous oxide avoided keeps accumulating. Each lever acts on one cause or a few, so what it avoids is small next to the total warming but can be large next to its own cause's share; the Causes of warming chart shows both.

For the farm levers, the methane avoided matters most for the temperature before 2050. Methane is short-lived, so cutting it starts to cool within decades; nitrous oxide and carbon dioxide last far longer. Planetshift computes the temperature from each gas separately. The CO₂-equivalent figure (CO₂e) adds them up with the usual 100-year weights only to give one number for comparison; it is never used to compute the temperature.

The farmland line shows the land the shift frees once complete, in millions of hectares (Mha), split into cropland and pasture, and as a share of the world's farmland today. With regrowth on, another line shows the CO₂ that land takes up in the year the shift is complete.

The protein and calories lines show the world average supply per person, before and after. On the basis you keep equal, they stay the same; the other one can move a little.

On the map, the change layer shows the change once the shift is complete, in fixed steps (±2%, ±15%, ±40%) so that a larger shift shows as stronger colours. The data-quality layer shows, for each country, the least precise source of emission data among its foods, from HESTIA's own data for that country (best) to a world median for the food group (least precise). Two neighbouring countries can look different only because of that.

## Assumptions

- The diet changes, and production follows: Planetshift does not model prices, trade negotiations or farmers' choices.
- Protein (or calories) per person is kept equal in every country.
- Each country's share of the world's production of each food stays as it is today, unless you choose under Options that each country produces its own change.
- Every lever, the diet included, ramps up linearly from the current year to the year chosen, then holds.
- Freed farmland is left as it is, unless regrowth is chosen under Options; then land newly used is charged the uptake it forgoes, but not the CO₂ of clearing standing forest beyond what the deforestation data tie to production.
- The rest of the world's emissions follow a published scenario (SSP2-4.5 by default), with the data centres' electricity growth since 2024 added unless Options say otherwise; the energy levers cut parts of that scenario's fossil CO₂.
- Permafrost is left out unless switched on, as in the published scenarios.

## Sources

- FAOSTAT Food Balance Sheets, Crops and livestock products, Land use, Emissions from agriculture.
- HESTIA aggregated impact assessments, for emissions per tonne of product; FAO FishStat and published studies for fish.
- The SSP scenarios (RCMIP, AR6 Scenario Database), Ember and the IEA, for transport, electricity and data centres.
- FaIR v2 with its IPCC AR6 calibration, for the climate response; PRIMAP-hist for historical emissions; HadCRUT5 and Berkeley Earth for observed temperature.
- Natural Earth, for the map.
