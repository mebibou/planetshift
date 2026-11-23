# Planetshift pipeline

Downloads the sources, joins them, and writes the JSON files the app reads into `app/public/data/` (shapes in `app/src/data/types.ts`, described in `docs/data-contract.md`). The methods are explained for readers in `docs/methodology/en/`.

## Running it

```sh
uv sync
uv run python -m planetshift_pipeline.build                       # every section
uv run python -m planetshift_pipeline.build --only supply,feed    # some sections
uv run python -m planetshift_pipeline.build --out ./out           # somewhere else
uv run python -m planetshift_pipeline.build --allow-missing       # without unreadable sources
```

A source that cannot be read (a module that does not import, a download or an API request that fails) stops the build. With `--allow-missing` the build goes on without it, logs what it left out, and `meta.json` lists only the sources it used; such a build is for trying things, not for committing.

The sections, in the order they run: `countries`, `items`, `supply`, `feed`, `intensities`, `breakdown`, `climate`, `enso`, `sectors`, `industry`, `coemissions`, `waste`, `land`, `practices`, `deforestation`, `removals`, `population`, `map`, `meta`. Each writes one file and reads only what it needs. A full first run downloads about 620 MB of FAOSTAT, Natural Earth and World Bank files (plus what the HESTIA and climate modules fetch) and takes several minutes; later runs read from the cache.

`map` needs Node.js: it runs `npx topojson-server@3.0.1` to turn Natural Earth's GeoJSON into TopoJSON. `climate` runs `planetshift_pipeline.climate.build_climate`, and `sectors` runs `planetshift_pipeline.sectors.build_sectors`. Both run FaIR's 841-member ensemble: `climate` takes about 3 minutes, `sectors` under a minute. The `intensities` section uses `planetshift_pipeline.sources.hestia` (tiers 1 and 2) and `planetshift_pipeline.sources.literature` (tier 4, which reads HESTIA too); with `--allow-missing` it builds without them when they fail.

## The cache

Every download goes to `pipeline/cache/` (not committed), next to a `<file>.json` sidecar with its URL, the date it was downloaded and its SHA-256; a file already there is not downloaded again. Delete a file to fetch it anew. A FAOSTAT bulk zip's sidecar also keeps the date FAOSTAT had last updated the domain when it was downloaded (from that day's `datasets_E_<date>.json` listing), which `meta.json` gives with the download date. FAOSTAT's bulk zips are large, so the years a section reads are kept as a pickled extract in `pipeline/cache/extracts/<domain>_<first>_<last>_<updated>_<downloaded>.pkl`: a replaced zip gets new extracts. DeDuCE's extract is named after its version, and HESTIA's trimmed nodes are kept under a hash of the code that trims them.

## Modules

- `build.py`: the command line and `SECTIONS`, the list of sections: each one's name, build function, the files it writes and the modules whose `SOURCES` `meta.json` lists, in the order they run (which is also the order of those sources in `meta.json`).
- `config.py`: reads `planetshift.config.json` at the repository's root, the fork's departures from FaIR, and checks it against `planetshift.config.schema.json`; the build logs it and `meta.json` records it. The data holds what every value of a switch needs, so the app picks one when it is built (see `docs/app.md`, "Forking").
- `inputs.py`: `Build`, the inputs the sections share (the balances, countries, groups, intensities' candidates…), each read once and only when a section asks for it; `write` and `optional`.
- `sections/<section>.py`: one module per output file, with its `build(b)` function.
- `cache.py`: downloads into the cache, with the sidecar.
- `sources/faostat.py`: FAOSTAT bulk files by domain (FBS, FBSH, OA, QCL, QV, GCE, GLE, GT, RL, EK, TCL and the French FBS and OA for names), read into one tidy frame shape; keeps FAOSTAT's own Tier 1 estimates in the emissions domains.
- `sources/naturalearth.py`: Natural Earth admin-0 at 1:50m: ISO3 codes, sub-regions and the TopoJSON map.
- `sources/worldbank.py`: World Bank income groups (CLASS.xlsx).
- `countries.py`: FAOSTAT areas to countries: drops regions, aggregates ("China") and former areas, adds ISO3 codes, regions, names and population.
- `supply.py`: the base year, the balance of each country and item (closed by `other`), and the gap filling of countries missing that year.
- `groups.py`: `groups.csv` (item → group, animal flag, what is left out) and the item records.
- `feed.py`: feed shares by species and GLEAM-style rations, from `feed_species.csv`, `feed_gleam_intake.csv` and `feed_gleam_rations.csv`.
- `deforestation.py`: DeDuCE's deforestation emissions by producer country and commodity (Zenodo, CC BY 4.0, downloaded into the cache and kept as an extract), averaged over 2019–2023 and mapped to FBS items (see `docs/methodology/en/deforestation.md`).
- `seafood.py` and `sources/fishstat.py`: the fish and seafood intensities (tier 4), wild capture (Parker et al. 2018) and aquaculture (MacLeod et al. 2020) blended by each country's FAO FishStat production (release 2025.1.0, CC BY 4.0, downloaded into the cache and kept as an extract), the fed aquaculture that eats aquafeed in `feed.json`, and seafood's breakdown (see `docs/methodology/en/seafood.md`).
- `removals.py`: builds `removals.json` from `removals.csv` and `removals_zones.csv` (see `docs/methodology/en/removals.md`).
- `intensities.py`: tier 3 from FAOSTAT (`qcl_items.csv` maps FAOSTAT crops and livestock products to FBS items and fertiliser classes), and the merge of the six tiers with the proxies and extraction rates of `proxies.csv`. The FAOSTAT allocation keeps each emission's process (`PROCESSES`) as a source, and leaves out the animals not raised for food (`nonfood_shares`, from GLE stocks, QCL milked and slaughtered animals and TCL live-animal trade, at the offtake `FOOD_OFFTAKE`).
- `breakdown.py`: the share of each gas of every intensity by emission source, following the tier that set it (see `docs/methodology/en/practices.md`).
- `practices.py`: the farming practices of `practices.csv`, each country given its applicable share.
- `land.py`: `land.json`: cropland per tonne from FAOSTAT harvested area (QCL, through `qcl_items.csv`, with processed items carrying their crops' land as for emissions), pasture from FAOSTAT Land Use (RL) shared by livestock units (EK), and natural regrowth rates from Cook-Patton et al. (2020), whose country table is downloaded into the cache; `land_regrowth_names.csv` maps its country names to ISO3 where they differ from FAOSTAT's. Explained in `docs/methodology/en/land.md`.
- `sectors.py`: `sectors.json`, the fossil CO₂ of road transport (passengers and freight), aviation, shipping, electricity and extra data-centre demand under each SSP, scaled to 2023 inventories; the grid's carbon intensity; the electricity electric vehicles need; aviation's non-CO₂ forcing; and FaIR's temperature response to a year of forcing (see `docs/methodology/en/sectors.md`). Its literature values are constants in the module, each with its source.
- `coemissions.py` and `sources/ceds.py`: `coemissions.json`, what each sector's fossil CO₂ comes with under each SSP, per kg: the CO₂ of producing its fuel (fugitive sectors and refineries and coke ovens, `1A1bc`, two thirds to oil and one third to coal), methane and N₂O from producing and burning it, and SO₂, black and organic carbon, ammonia, NOx, CO and VOCs, from CEDS v_2024_07_08 (2022 emissions by sector and fuel, CC BY 4.0, downloaded into the cache) changed with each SSP's emission factors from RCMIP; and the forcing per kg of each species and the methane a kg of NOx or VOCs leaves in the air, from FaIR's calibration, NOx's methane shared between land and sea by Hoor et al. (2009)'s ratio between ships' and road's NOx (road's VOCs' methane given back), or set to their own values, or left as FaIR's, one variant per value of the `noxMethane` departure (one FaIR run of each SSP, under a minute). See `docs/methodology/en/sectors.md`.
- `sources/ar6db.py`: the SSP marker runs' electricity CO₂ and generation from the IPCC AR6 Scenario Database (CC BY 4.0), read through IIASA's Scenario Explorer API as a guest and cached as `pipeline/cache/ar6db/ar6-markers-world.json`.
- `population.py`: `population.json`, the world's population from 1850 (Our World in Data's long-run series to 1949, from HYDE 3.3 and Gapminder, CC BY 4.0) and UN WPP 2024's estimates and medium, low and high projections to 2100 (CC BY 3.0 IGO), both downloaded into the cache; and each country's low and high projection over its medium one in 2025, 2030 and every ten years to 2100, which the app applies to the countries' own population (see `docs/methodology/en/options.md`).
- `enso.py`: `enso.json`, NOAA CPC's Oceanic Niño Index (ERSSTv6 Niño 3.4, public domain, downloaded into `pipeline/cache/noaa/`) as one value a year, the mean of the twelve seasons centred from the previous October to September, and the year's phase at NOAA's ±0.5 °C threshold, from 1951 (the first year with the autumn before it); see `docs/methodology/en/climate.md`. The table is updated every month: delete the cached copy to take the latest seasons.
- `waste.py`: food waste after shops by country and sector (UNEP Food Waste Index Report 2024 from the UN SDG Global Database, cached as `sdg_AG_FOOD_WST_PC.json`), gaps filled with the sub-region's median, edible parts only, capped at 40% of food supply (see `docs/methodology/en/waste.md`).

The HESTIA, literature and climate modules (`sources/hestia.py`, `sources/literature.py`, `climate*.py`, `sources/primap.py`, `sources/rcmip.py`, `sources/temperature.py`) are described in their own methodology pages; `climate.py` also writes the permafrost feedback's constants (AR6) and the 2020 shipping sulphur rule's forcing (Gettelman et al. 2024, Forster et al. 2025, scaled by each SSP's shipping CO₂) into `climate.json`.

## Adding a data file

1. Write its module of computations, `planetshift_pipeline/<name>.py`, with pure functions and a `SOURCES` list (`id`, `name`, `version`, `url`, `licence`) for each source it reads, and their tests in `tests/test_<name>.py`.
2. Write its section, `planetshift_pipeline/sections/<name>.py`, with `build(b: Build) -> None`: it reads what it needs from `b` (add an input to `inputs.py` only when another section needs it too) and calls `write(b.out, "<name>.json", data)`.
3. Add one line to `SECTIONS` in `build.py`: `Section("<name>", <name>.build, ("<name>.json",), ("<name>",))`, before `map` and `meta`.
4. Describe the file in `docs/data-contract.md`, its type in the app (a lever file's in its module's `data.ts`, see `docs/app.md`), and its fixture in `app/scripts/gen-fixtures.mjs`.
5. Run `uv run python -m planetshift_pipeline.build --only <name>`; `tests/test_sections.py` then checks that a rebuild from the cache gives the committed files.

## Tables

- `groups.csv`: one row per FBS item: group, animal or not, and a note (why it is left out, or what it is made from).
- `qcl_items.csv`: FAOSTAT production items to FBS items, with the share of the crop's emissions the FBS item takes (15% of seed cotton goes to cottonseed) and the crop's class for synthetic nitrogen. An empty FBS code is a non-food item.
- `proxies.csv`: for each item, the proxy items for tier 5 in order, or for a processed item its primary items and extraction rates.
- `deforestation_items.csv`: DeDuCE commodities that `qcl_items.csv` does not name, or that it maps differently for deforestation (pasture to bovine meat, leather and rubber left out).
- `removals.csv`: for each carbon-storing practice, its land, rate by climate zone (median, low, high, t CO₂/ha/yr), most share of the land and years, each with its source and one line of reasoning; `removals_zones.csv` gives each country's climate zone.
- `seafood_isscaap.csv`: each FishStat ISSCAAP species group's FBS item, capture group (Parker et al.) and aquaculture group (MacLeod et al.); `seafood_factors.csv`: fuel per tonne landed for each capture group, energy per tonne for each aquaculture group and whether it is fed, with their sources.
- `feed_*.csv`: the feed tables (see `docs/methodology/en/feed.md`).
- `practices.csv`: one row per parameter of each farming practice (sources, gases, groups, reduction, applicable share by country, region, income group or world), with its reason and citation.

## Tests

```sh
uv run ruff check . && uv run ruff format --check . && uv run pytest
```

Unit tests run on small frames built in the test. `tests/test_validation.py` (marked `network`) compares the built JSON with FAOSTAT's world totals and is skipped when the cache or the built files are missing. `tests/test_sections.py` checks the list of sections, and (marked `network` and `rebuild`, run with `PLANETSHIFT_REBUILD=1`) rebuilds every section from the cache into a temporary folder and compares each file with the one in `app/public/data/`, byte for byte but for `meta.json`'s build date; it takes several minutes, as `climate` and `sectors` run FaIR.
