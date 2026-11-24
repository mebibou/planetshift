# Levers

Each lever is the share of a change that is adopted, from 0 to 100%, reached in full by the year set at the top of the panel. Levers overlap, so together they avoid a little less warming than the sum of what each avoids alone. The summary shares that overlap out evenly between them.

## What a lever is

Every way Planetshift offers to limit warming is a lever, and none is preferred over another. The levers cover energy and transport, buildings and industry, what people eat, farm practices, less food wasted, an end to clearing forest, and carbon stored in farmland.

Each lever is a slider from 0 to 100%, which sets the share adopted. The diet's main slider is the share of animal foods moved to plant foods. Every lever ramps up from today and is fully in place in the year set at the top of the panel, *All levers fully in place by*.

## How the panel groups them

The **Levers** section of Explore groups the levers under the cause of warming each mainly acts on (see [Causes of global warming](#method-link)):

- fossil fuels and industry: energy and transport, buildings and industry;
- farming: diet, farm practices, food waste;
- land use: deforestation, carbon in farmland.

The causes are ordered by how much warming each one causes by the chart's horizon, under the chosen scenario, so fossil fuels come first. Within a cause, the groups are ordered by the warming each would avoid alone and in full, which is the figure shown beside it. That order is worked out again when you change an option or the horizon, or when the data change. It is never worked out while you move a slider, so the groups stay in place while you drag.

Each group is a fold, closed when the page opens. It has one button that sets all its levers to 100% and one that resets them.

### A group can act on more than one cause

The diet changes farm emissions, which count under farming. It also changes the clearing tied to what is produced and the land it frees, so it acts on deforestation and regrowth, which count under land use. Less waste does the same.

The avoided warming of such a group is split by cause according to the gas and its source:

- farm methane, nitrous oxide and CO₂ count in farming;
- the CO₂ of forest clearing, regrowth and carbon stored in farmland count in land use;
- fossil CO₂ and aviation's non-CO₂ forcing count in fossil fuels and industry. Forcing is the change in the energy the Earth keeps, which warms it (see [From emissions to temperature](#method-climate)).

After today, the Causes of warming chart takes each cause's part off that cause's band. The summary lists the parts under the same causes, with the same names and colours.

## The lever groups

**Farm practices** (see [Farm practices](#method-practices)). Six practices each cut part of one or more sources of an item's emissions:

- feed additives and breeding act on cattle's enteric methane, the methane cattle breathe out as they digest;
- manure management acts on the methane and nitrous oxide of stored manure;
- drained paddies act on rice methane;
- nitrogen efficiency, inhibitors included, acts on the nitrous oxide of fertilisers;
- clean energy acts on the CO₂ of fuel.

For a country, item and gas, the share of the emissions removed is a sum over sources: the source's share of the gas (`breakdown.json`) times the share removed from that source. A practice removes adoption × the applicable share in the country × the reduction. A practice limited to some food groups acts on those groups only. Feed additives, for example, act on cattle only. Practices cut the emissions of production after the shift. Their effect is therefore their cut on today's production, plus their cut on the production the shift changes.

**Food waste** (see [Food loss and waste](#method-waste)). There are two levers:

- waste after shops lowers the food supply a country needs by the lever × its waste share, after the diet shift;
- losses before shops lower each item's loss share of supply.

Less supply needs less production, which uses less land and emits less. The change goes through the same supply chain as the shift, feed included. What people eat does not change, so the protein and calories shown are those of the diet.

**Deforestation** (see [Deforestation](#method-deforestation)). Clearing forest for farming releases about 2 Gt of CO₂ a year (`deforestation.json`, by country and item). The model keeps this yearly amount constant and counts only its change. The clearing tied to an item moves with the item's production in the country where the forest is cleared. A shift away from beef therefore lowers pasture clearing in Brazil, through trade, even with the lever at 0. This change is capped between none and double today's clearing. The lever then prevents its share of the clearing that is left. Both are changes in CO₂, and they go into the climate response like any other.

**Carbon in farmland** (see [Carbon stored in farmland](#method-removals)). Cover crops, trees on farms, biochar and rock dust, which is experimental, store CO₂. The amount stored is adoption × the largest share of the land the practice can reach (`maxShare`) × the hectares of cropland, pasture or both once the shift is complete × the country's rate. Each hectare stores carbon for `years` years from the year the practice starts on it. Cover crops and trees saturate after 20 years. Biochar and rock dust keep storing carbon until 2100.

**Energy and transport** (see [Energy and transport](#method-sectors)). Six levers act on the fossil CO₂ of the scenario chosen under *Other options*:

- electric cars and electric trucks: their tailpipe CO₂, less the electricity they draw on the grid;
- less flying: aviation's CO₂ and its non-CO₂ forcing;
- clean aviation fuel: aviation's CO₂ only;
- clean shipping;
- renewable electricity: the electricity sector's CO₂, and with it the grid's intensity that electric vehicles and data centres draw on, including the extra demand of AI data centres when it is counted under *Other options*.

Their CO₂ change is turned into temperature with the CO₂ curve. The change in aviation's non-CO₂ forcing is turned into temperature with the temperature response to forcing. Cutting the fuel also cuts the methane leaked while producing it and the air pollution from burning it. So these levers act on air pollution too. Air pollution cools the planet and masks part of the warming, so less of it masks less warming. This adds warming in the first decades, and the methane saved about offsets it.

**Regrowth is an option, not a lever group.** Natural regrowth on freed farmland also takes up carbon, in addition to the four practices of carbon in farmland. It is set under *Other options* (*Freed farmland*), not as a lever group (see [Land](#method-land)). It acts on the land that the shift and less waste free. Avoided clearing is CO₂ not emitted by forest that stays standing. It frees no land. The two therefore never count the same hectare.

## How levers combine

- **Practices on the same source multiply rather than add.** Two practices that remove 30% and 20% of enteric methane remove 1 − 0.7 × 0.8 = 44% together, not 50%.
- **Levers act one after the other.** Less waste acts on the diet after the shift. Practices act on the production left after both. The deforestation lever acts on the clearing left after the shift and less waste. Each lever therefore does a little less when combined than alone. The breakdown below shares that overlap out evenly.
- **Effects on a changing production grow faster than the ramp.** The levers' full effect ramps in linearly with the shift. Some levers act on the change in production: practices on the herd and crops that the shift and less waste changed, and the deforestation lever on the clearing they changed. That part ramps in as both do. With a share r of the way reached, the lever's r × cut acts on r × the change, so it grows as r².
- **Removals act on the farmland left once the shift is complete.** A shift that frees cropland leaves less for cover crops. Removals ramp in linearly, so mid-ramp they count land the shift has not yet freed or used.
- **Energy levers combine with each other, not with the farming levers.** Renewable electricity makes electric vehicles and data centres save more. Less flying and clean fuel each act on the aviation CO₂ the other leaves, so both at 50% cut 75% of it.

## Reading the breakdown

The summary shows the warming avoided at the chosen year under each cause the levers act on, biggest first. For each cause it shows what the levers avoid of it, then the part of each lever group. A group acting on two causes appears under both, with its part of each. The parts add up exactly to the total. The causes add up to the reductions the Causes of warming chart shows.

### Why the parts are Shapley values

Levers overlap. Less waste on a diet that has already shifted saves less than on today's diet. Practices cut less on a smaller herd. Regrowth needs the land that a shift or less waste frees.

One way to share the total would be to count the groups in turn: one first, then the next on what is left. That gives the overlap to whichever group comes later. The order would then decide which lever looks bigger.

Planetshift uses the **Shapley value** instead, a rule from game theory for sharing a joint result fairly. A group's part is the mean of what it adds to the groups counted before it, over every order in which the acting groups could be counted. This rule has four properties:

- the parts add up to the total;
- a group that adds nothing gets nothing;
- two groups that act alike get the same part;
- listing the groups in another order changes nothing.

A lever that only acts together with another shares that joint effect half and half with it. Regrowth on freed land is such a lever.

**Worked example.** With half of animal foods shifted to plants (diet at 50%) and natural regrowth on, the recorded test run (`app/test/golden/real.json`) gives these medians of the warming avoided in 2100:

| Groups acting | Warming avoided in 2100 |
| --- | --- |
| Diet alone | 0.1355 °C |
| Regrowth alone | 0 (it frees no land) |
| Diet and regrowth | 0.1816 °C |

The joint effect of regrowth is 0.1816 − 0.1355 = 0.0461 °C. The Shapley value shares it half and half. Regrowth gets 0.0231 °C and the diet gets 0.1355 + 0.0231 = 0.1586 °C, which is what the summary shows (the last digit is rounded).

### How Planetshift computes them quickly

Computed directly, the Shapley value needs one run of the model for every set of acting groups. That is 2ⁿ runs for n groups: 256 with all eight groups acting. On the real data that takes seconds, and a slider move has only a few hundredths of a second.

Instead, Planetshift makes use of how the groups interact. Farming's groups interact only through the production they change. The diet and less waste change what is produced. Practices, deforestation, regrowth and carbon in farmland act on the production those two leave, but not on each other. So the worth of any set of farming groups is read from one pass of the farm emissions for the production groups in that set: none, the diet, less waste, or both. That is at most four passes, three more than the run itself. Each pass is kept and reused while you move sliders that do not change it.

The groups outside farming (energy and transport, buildings and industry) interact with each other through the grid that renewable electricity leaves. They do not interact with farming. Their worth is their own emissions, recomputed with the other group's levers off.

A test checks, on the fixtures and on the real data, that this gives the Shapley values of full runs to nine digits.

### A method considered and not used

A second method was considered: each group's effect alone, scaled so the parts add up to the total. It needs the same passes, so it is no faster. It is also less fair. A group whose effect depends on another would get nothing: regrowth alone frees no land, so it would vanish from the breakdown, and its uptake would be given to the diet and less waste. The overlap is also shared in proportion to size rather than evenly. On the real data with every group acting, the two methods differ by up to a quarter of a group's part.

### Permafrost and CO₂e in the breakdown

With permafrost on, the change in its release is shared out between the groups, and between the causes, in proportion to the size of each one's avoided warming, whatever its sign. The parts therefore still add up.

Sharing by the signed values would not work. A part that adds warming would take a negative share. The energy levers avoid warming under fossil fuels and add some under air pollution. Where the two nearly cancel (until about 2040), each part would take many times the whole change. Shared by size, no part moves by more than the change itself.

The avoided emissions in CO₂e in the year the levers are complete are shared out the same way. CO₂e, or CO₂-equivalent, adds the gases up with 100-year weights (see [From emissions to temperature](#method-climate)). These emissions leave out aviation's non-CO₂ forcing and permafrost, which are not emissions of a lever.

## Why some levers are uncertain

The ranges of the practices (a low and high reduction) and of the removals (a low and high rate) feed the likely range of the warming avoided, with the climate response. The low end takes the smaller reduction and the slower uptake. For the energy levers, the low end takes the most electricity per kilogram of tailpipe CO₂ avoided, the least non-CO₂ forcing per kilogram of aviation CO₂, and the lowest data-centre demand.

Some uncertainty is not in the range:

- Whether a practice can be adopted in a country (`applicable`) is a judgement.
- Soil carbon is hard to measure and can be lost again.
- Deforestation's tie to production is a reading of consumption-based footprints, not a law. Clearing follows roads, prices and enforcement as much as demand.
- Wasting less frees money that is spent on something else. The model leaves out this rebound.
- The levers are adoption shares, not policies. The model says what they would avoid, not what it would take to reach them.

## Assumptions

- Every lever, the diet included, ramps in linearly from the current year to the year *All levers fully in place by*, and holds after.
- Farm-practice reductions apply to the emissions of production after the shift and the other levers. The baseline keeps today's practices.
- A practice's reduction on the same source combines multiplicatively with the others'. The low end of the warming avoided takes the low end of its range.
- An item without a split by source takes the world's split, or else the other scope's. Without either, practices do not act on it.
- Deforestation CO₂ is a constant stream, not scaled with population. It moves with each item's relative production change in the country (between −100% and +100%), and the lever prevents its share of what is left.
- Removals act on the land once the shift is complete and store for `years` years from each hectare's adoption. The rate is the country's, or else the world's.
- The breakdown is each group's Shapley value over the acting groups, split by cause. The permafrost change is shared out in proportion to the size of each part.
- Energy levers cut a share of each sector's CO₂ in the scenario chosen under *Other options*, ramping in like the shift. They do not change farm emissions, and electricity used on farms keeps its own intensity.
- A missing lever file leaves its levers without effect, shown as not available.
