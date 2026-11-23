# Overview

Planetshift asks what change looks like. It shows what has warmed the planet since 1850, and how much less the planet would warm by 2050 or 2100 if the levers that act on those causes were pulled. This page describes what you see, how the levers work and how to read the numbers; the pages after it give each step in detail.

The levers are of equal standing. None is presented as the way to limit warming. They are:

- energy and transport moving off fossil fuels;
- cleaner buildings and industry;
- what people eat;
- farm practices;
- less food wasted;
- an end to clearing forest;
- carbon stored in farmland.

What caused warming is what keeps causing it. Each lever is therefore shown under the cause it reduces.

## What you see

**Explore** has three parts.

On the left is the panel. At the top is the year by which every lever is fully in place. Then come the lever groups, under the cause of warming each acts on, the biggest cause first:

- fossil fuels and industry: energy and transport, buildings and industry;
- farming: diet, farm practices, food waste;
- land use: deforestation, carbon in farmland.

Each group is a fold of sliders, with what it would avoid alone in full. The other options come last.

In the middle are the charts:

- the global temperature from 1850, with and without the levers;
- the warming the levers avoid each year to 2050 or 2100, on its own scale;
- the causes of warming, where each cause's band shrinks after today by what the levers take off it.

Beside the charts, a strip of numbers sums up what the levers change. It shares out the warming avoided under each cause between the lever groups.

Below is the food and farming map. Country by country, it shows how farms' emissions or output would change with the levers chosen, how much food is grown, how much greenhouse gas farms emit, how much farmland they use and how good the emission data is. Food and farming is the only part of the model with country data.

**Methodology** is this page: what the numbers are, where they come from, and what they leave out.

## How the levers work

Each lever is a share adopted, from 0 to 100%. It ramps in from this year to the year chosen at the top of the panel (2035 by default), and is held until 2100.

- The energy and transport levers cut parts of the scenario's fossil CO₂: electric cars and trucks, less flying, clean aviation fuel, clean shipping, renewable electricity and data centres on clean power (see [Energy and transport](#method-sectors)).
- The buildings and industry levers cut the direct fossil CO₂ of heating, steel and cement (see [Buildings and industry](#method-industry)).
- Farm practices, less food waste, an end to deforestation and carbon stored in farmland act on farming and land (see [Levers](#method-levers)).

The diet is described below because it is the lever with the most steps. That says nothing of its size.

### The diet

The diet shift moves part of what people eat from animal foods to plant foods. The amount of protein each person gets stays the same (or the calories, if you choose so), so nobody eats less. By default, the plant foods that replace the animal ones are the mix of plant foods the country already eats. You can choose mostly legumes instead, or soy and oat drinks for dairy.

Fewer animals need less feed, so the crops grown to feed them fall too. This often more than offsets the plant food added for people. That is why cropland can shrink even as people eat more plants.

The world's demand for each food then changes. Each country's farms produce more or less of it, in proportion to their share of the world's output today. The emissions of each farm product (methane, nitrous oxide and carbon dioxide, per tonne) turn that change in production into a change in emissions.

Less livestock also needs less land. Cropland follows the crops grown. Pasture follows the beef, lamb and milk produced in each country, so a shift frees mostly pasture. Under Options, you can let the freed land grow back to natural vegetation. That vegetation takes up CO₂ for some decades and adds to the warming avoided. By default, the freed land is left as it is and counts for nothing in the temperature.

Fish and seafood are an animal food like the others (see [Fish and seafood](#method-seafood)). Wild fish emit only the fuel their boats burn, which counts only when Options include the emissions of inputs. Farmed fish eat feed crops and fish meal, which fall with them.

Like every lever, the shift grows in a straight line from this year to the year chosen, and stays there until 2100.

## The breakdown

The summary shares the warming avoided out between the lever groups, under the causes they act on.

Levers overlap: less waste saves less on a diet that has already shifted. So each group's part is its Shapley value. This is the mean of what the group adds over every order the groups could be counted in, so that no group is counted first (see [Levers](#method-levers)).

Two options change the future without any lever (see [Options](#method-options)):

- the electricity growth of AI data centres, added by default;
- the thaw of permafrost, off by default.

## How to read the numbers

**The headline** is the warming avoided in 2050, or in 2100 when the charts are set to reach 2100. It is in degrees Celsius, with a likely range.

The avoided warming keeps growing after 2050. The methane no longer emitted stops adding to the warming, and the nitrous oxide avoided keeps accumulating.

Each lever acts on one cause or a few. What it avoids is small next to the total warming, but can be large next to its own cause's share. The Causes of warming chart shows both.

**Methane, nitrous oxide and CO₂.** For the farm levers, the methane avoided matters most for the temperature before 2050. Methane is short-lived, so cutting it starts to cool within decades. Nitrous oxide and carbon dioxide last far longer. Planetshift computes the temperature from each gas separately. The CO₂-equivalent figure (CO₂e) adds the gases up with the usual 100-year weights, only to give one number for comparison. It is never used to compute the temperature.

**Farmland.** The farmland line shows the land the shift frees once complete. It is in millions of hectares (Mha), split into cropland and pasture, and also given as a share of the world's farmland today. With regrowth on, another line shows the CO₂ that land takes up in the year the shift is complete.

**Protein and calories.** These lines show the world average supply per person, before and after. The one you keep equal stays the same; the other can move a little.

**The map.** The change layer shows the change once the shift is complete, in fixed steps (±2%, ±15%, ±40%), so that a larger shift shows as stronger colours. The data-quality layer shows, for each country, the least precise source of emission data among its foods. The sources range from HESTIA's own data for that country (best; see [Emission intensities from HESTIA](#method-hestia)) to a world median for the food group (least precise). Two neighbouring countries can look different only because of that.

## Assumptions

- The diet changes, and production follows. Planetshift does not model prices, trade negotiations or farmers' choices.
- Protein (or calories) per person is kept equal in every country.
- Each country's share of the world's production of each food stays as it is today, unless you choose under Options that each country produces its own change.
- Every lever, the diet included, ramps up linearly from the current year to the year chosen, then holds.
- Freed farmland is left as it is, unless regrowth is chosen under Options. Then land newly used is charged the uptake it forgoes, but not the CO₂ of clearing standing forest beyond what the deforestation data tie to production.
- The rest of the world's emissions follow a published scenario: SSP2-4.5 by default, one of the Shared Socioeconomic Pathways (SSPs) the IPCC uses (see [Climate](#method-climate)). The data centres' electricity growth since 2024 is added, unless Options say otherwise. The energy levers cut parts of that scenario's fossil CO₂.
- Permafrost is left out unless switched on, as in the published scenarios.

## Sources

- FAOSTAT Food Balance Sheets, Crops and livestock products, Land use, Emissions from agriculture.
- HESTIA aggregated impact assessments, for emissions per tonne of product; FAO FishStat and published studies for fish.
- The SSP scenarios (RCMIP, AR6 Scenario Database), Ember and the IEA, for transport, electricity and data centres.
- FaIR v2, a simple climate model, with its IPCC AR6 calibration, for the climate response; PRIMAP-hist for historical emissions; HadCRUT5 and Berkeley Earth for observed temperature.
- Natural Earth, for the map.
