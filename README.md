# Planetshift

*What does change look like?*

[![Planetshift: the causes of global warming and the levers that limit it, with the warming each would avoid by 2050 and 2100](https://planetshift.org/share-en.png)](https://planetshift.org/)

**[Open Planetshift at planetshift.org](https://planetshift.org/)**, or read it [in French](https://planetshift.org/fr/). It runs in your browser, with nothing to install and no account.

## What you can do there

Planetshift shows the causes of global warming and the levers that limit it: energy and transport, buildings and industry, farming and diets, forests and farmland. Move a lever and you see the warming it would avoid by 2050 or 2100. Every lever is measured the same way, so you can compare them.

- A chart splits the warming since 1850 by cause, and shows how each cause changes with the levers.
- A map shows where food is produced and what it emits. It also shows farmland, deforestation, farmed mammals and the species that farmland commits to extinction.
- The [Methodology page](https://planetshift.org/methodology/) explains every step and assumption, with its sources.

## How the code is organised

- `pipeline/` is Python. It downloads FAOSTAT, HESTIA aggregations, PRIMAP-hist, temperature series and scenario data, runs FaIR, and writes the JSON the app reads into `app/public/data/`. See `pipeline/README.md`.
- `app/` is a static site with no backend, written in TypeScript with React, Tailwind CSS, D3 and Vite. The model in `app/src/model/` is made of pure functions and runs in the browser. See `docs/app.md`.
- `docs/` holds `data-contract.md`, which describes the JSON files the pipeline hands to the app, and `app.md`. It also holds `methodology/<lang>/`, which the app renders as its Methodology page.

## Run it locally

```sh
cd pipeline && uv sync && uv run python -m planetshift_pipeline.build   # writes app/public/data/
cd app && npm ci && npm run dev
```

To run the app on the small test fixtures instead of the real data, open `/?data=fixtures`.

## Fork it

Planetshift runs its climate calculations on FaIR and its calibrated ensemble. In a few named places it departs from FaIR's own physics. `planetshift.config.json`, at the root, turns each departure on or off. `planetshift.config.schema.json` lists the departures with their values, the website's default and the value that gives plain FaIR's behaviour. The pipeline records the config in `meta.json`. The app reads the config when it is built, so a fork's site uses its own choices.

Visitors never see these switches. They aren't options on the site, and they aren't in the URL. The departures are:

- `noxMethane`: how much methane stays in the air for each kg less NOx. `chemistry`, the default, uses the chemistry models' own values on land and at sea, from Hoor et al. (2009)'s multi-model study of transport. It is the default because FaIR's one coefficient is several times theirs for road traffic. `fair` uses FaIR's one coefficient. `hoor` shares FaIR's coefficient between land and sea by Hoor et al.'s ratio.
- `coMethane`: how much methane stays in the air for each kg less carbon monoxide. `split`, the default, shares FaIR's VOC coefficient between VOCs and CO in the chemistry models' ratio (ACCMIP). That coefficient carries CO's effect too. `split` also gives CO's methane back to the chemistry models' NOx figures. `fair` leaves CO without an effect on methane, as FaIR does.
- `aviationNonCo2`: what less flying cuts besides CO₂. `lee2021`, the default, uses Lee et al. (2021)'s non-CO₂ forcing, contrails included. `fair` counts only aviation's own NOx, sulphur and soot through FaIR, which has no contrails.
- `permafrost`: `on`, the default, shows visitors the Permafrost option. `off` leaves the module out.
- `shippingSulphur2020`: with `on`, the default, the 2020 limit on ships' fuel sulphur adds its published forcing, 0.12 W/m² (0.08–0.14), outside FaIR's ensemble. With `off`, the scenarios use only their own ships' SO₂.

The "Forking" section of `docs/app.md` says where each departure is in the code and how to add one.

## Checks

`scripts/check.sh` runs every lint and test: pipeline, app and end-to-end. `scripts/check.sh <section>` runs one of them.

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs the same lint and tests on every pull request and every push to `main`. It reports the speed budgets but doesn't fail on them, because shared runners vary in speed. Once the lint and tests pass on `main`, the workflow publishes the site to GitHub Pages. The data is rebuilt from its sources locally, not in the workflow.

## Licence

The code is under the Apache License 2.0 (`LICENSE`). The data files in `app/public/data/` keep their sources' licences, and `DATA-LICENCES.md` says which terms apply to which file.
