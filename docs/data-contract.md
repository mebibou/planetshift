# Data contract

The pipeline writes a few JSON files into `app/public/data/`; the app loads them at start, but for the deferred lever files, which it loads once a lever needs them. Their shapes are TypeScript types, which are the reference: the core files' in `app/src/data/types.ts`, each lever file's in the `data.ts` of the lever module that reads it (`app/src/levers/<id>/data.ts`). A change to a file's shape changes its type and this page in the same commit.

Each file is written by one section of the pipeline, `pipeline/planetshift_pipeline/sections/<section>.py`, registered in `SECTIONS` in `build.py`.

| File | Type | Written by |
| --- | --- | --- |
| `meta.json` | `Meta` | `pipeline/planetshift_pipeline/sections/meta.py`: the base year, the build date and every source |
| `countries.json` | `Country[]` | FAOSTAT population, area codes, World Bank income groups |
| `items.json` | `Item[]` | FAOSTAT Food Balance Sheets, `pipeline/groups.csv` |
| `supply.json` | `Supply` | FAOSTAT Food Balance Sheets |
| `intensities.json` | `IntensitiesFile`, read as `Intensities` | HESTIA aggregations, FAOSTAT emissions, published LCAs; seafood from FAO FishStat with Parker et al. (2018) and MacLeod et al. (2020) |
| `feed.json` | `Feed` | feed allocation tables, FAO FishStat fed aquaculture for `seafood` |
| `land.json` | `Land` | FAOSTAT harvested area and land use, natural regrowth rates |
| `breakdown.json` | `Breakdown` (`levers/practices/data.ts`) | emissions by source (enteric, manure, rice, fertiliser…) from HESTIA terms and FAOSTAT |
| `practices.json` | `Practices` (`levers/practices/data.ts`) | published reductions of farming practices |
| `waste.json` | `Waste` (`levers/waste/data.ts`) | food waste after shops |
| `deforestation.json` | `Deforestation` (`levers/deforestation/data.ts`) | deforestation CO₂ attributed to commodities |
| `removals.json` | `Removals` (`levers/removals/data.ts`) | carbon stored in farmland by practice |
| `sectors.json` | `Sectors` (`levers/energy/data.ts`) | fossil CO₂ by sector under each SSP, grid intensity, EV electricity, data centres, aviation non-CO₂, forcing response |
| `population.json` | `PopulationData` (`levers/population/data.ts`) | world population from 1850 (Our World in Data's long-run series, then UN WPP 2024), WPP 2024's medium, low and high projections, and each country's low and high over its medium |
| `industry.json` | `Industry` (`levers/industry/data.ts`) | direct fossil CO₂ of buildings and industry under each SSP, heat-pump electricity, steel and cement shares, cuts and electricity |
| `coemissions.json` | `CoEmissions` (`levers/energy/data.ts`) | methane and air pollution (SO₂, black and organic carbon, NOx) per kg of each sector's fossil CO₂ under each SSP (CEDS, RCMIP), their forcing per kg and the methane a kg of NOx leaves in the air (FaIR) |
| `climate.json` | `Climate` | FaIR, PRIMAP-hist, HadCRUT5, Berkeley Earth |
| `enso.json` | `Enso` | NOAA's Oceanic Niño Index: one value a year (the mean of the seasons centred from the previous October to September) and the year's phase, El Niño, La Niña or neutral, at ±0.5 °C |
| `world.topo.json` | TopoJSON | Natural Earth admin-0, 1:50m, with `iso3` on each feature |

The nine lever files (`breakdown`, `practices`, `waste`, `deforestation`, `removals`, `sectors`, `coemissions`, `industry`, `population`, each declared by its module's `files`) are loaded with the rest, but one that is missing (HTTP 404) is replaced by the empty value its module gives, so its levers have no effect and the interface shows them as not available (without `population.json`, the population option has no effect and the population chart is hidden); `enso.json` is an optional core file (`OPTIONAL_FILES` in `app/src/data/load.ts`): without it the temperature chart has no El Niño or La Niña marks. Any other file missing stops the app. A file its module marks `deferred` (`breakdown.json`, 2.2 MB, read by the farm practices only) is not loaded at start: its empty value stands for it until one of its module's levers is above 0, or until the panel works out what each lever is worth, in idle time after the page has settled, and the interface does not wait for it to show those levers. As the app cannot know at start whether a deferred file is in the build, a practice lever stays available without `breakdown.json` and has no effect. `removals.json` rates are in tonnes of CO₂ per hectare a year, `deforestation.json` in tonnes of CO₂ a year, `population.json` in people (its ratios have no unit), `coemissions.json` in kg per kg of CO₂, W/m² per kg a year and kg of methane per kg of NOx. Without `coemissions.json` the energy and industry levers cut CO₂ alone.

`intensities.json` stores each distinct source once, sorted, in `sources`, and each cell's `source` is its index there (`IntensitiesFile`): written in every cell, the 454 source URLs took half of the file's 5.3 MB. The loader (`decodeIntensities` in `app/src/data/load.ts`) puts the URL back in each cell, so the model reads `Intensities`, whose `source` is the URL. Its `oilcake[iso3][oilseedCode][scope]` gives the kg of each gas a year that the cake of each crushed oilseed carries in the base year, the part of the crush's emissions an oil taken from its seed leaves out (see `docs/methodology/en/emissions.md`).

Units: masses in tonnes for products and kilograms for gases; temperatures in °C relative to 1850–1900; years as integers. Country keys are ISO 3166-1 alpha-3, item keys are FAOSTAT Food Balance Sheet item codes as strings.

The fixtures in `app/public/fixtures/` (made by `npm run fixtures` in `app/`) follow the same types with a handful of countries and items, so the model and the interface are tested without the real data; `?data=fixtures` loads them in the app, which the end-to-end tests do.
