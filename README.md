# Planetshift

*What does change look like?* Planetshift shows the causes of global warming and the levers that limit it: energy and transport, buildings and industry, farming and diets, forests and farmland. For each lever, it shows the warming it would avoid by 2050 or 2100, measured the same way for all of them. A chart splits the warming since 1850 by cause and shows how each cause changes with the levers. A map shows where food is produced and what it emits. The Methodology page explains every step and assumption.

It is online at [planetshift.org](https://planetshift.org/).

## Layout

- `pipeline/`: Python code that downloads FAOSTAT, HESTIA aggregations, PRIMAP-hist, temperature series and scenario data, runs FaIR, and writes the JSON the app reads into `app/public/data/`. See `pipeline/README.md`.
- `app/`: TypeScript, Vite and D3, a static site with no backend. The model in `app/src/model/` is pure and runs in the browser. See `docs/app.md`.
- `docs/`: `data-contract.md` (the JSON files between the two), `app.md`, and `methodology/<lang>/`, which the app renders as its Methodology page.

## Running it

```sh
cd pipeline && uv sync && uv run python -m planetshift_pipeline.build   # writes app/public/data/
cd app && npm ci && npm run dev
```

To run the app on the small test fixtures instead of the real data, open `/?data=fixtures`.

## Forking

Planetshift runs its climate calculations on FaIR and its calibrated ensemble, and departs from FaIR's own physics in a few named places. `planetshift.config.json`, at the root, sets each departure on or off. `planetshift.config.schema.json` lists them with their values, the website's default and the value that keeps to plain FaIR. The pipeline records the config in `meta.json`, and the app reads it when it is built, so a fork's site uses its own choices. Visitors never see these switches. They are not options, and they are not in the URL. The departures:

- `noxMethane`: how much methane stays in the air for each kg less NOx. The choices are the chemistry models' own values on land and at sea, from Hoor et al. (2009)'s multi-model study of transport (`chemistry`, the default, because FaIR's one coefficient is several times theirs for road traffic), FaIR's one coefficient (`fair`), or FaIR's coefficient shared between land and sea by Hoor et al.'s ratio (`hoor`).
- `aviationNonCo2`: what less flying cuts. It is either Lee et al. (2021)'s non-CO₂ forcing, contrails included (`lee2021`, the default), or only aviation's own NOx, sulphur and soot through FaIR, which has no contrails (`fair`).
- `permafrost`: the Permafrost option is offered to visitors (`on`, the default) or the module is left out (`off`).
- `shippingSulphur2020`: the 2020 limit on ships' fuel sulphur adds its published forcing, 0.12 W/m² (0.08–0.14), outside FaIR's ensemble (`on`, the default). With `off`, the scenarios keep their own ships' SO₂ alone.

`docs/app.md` ("Forking") says where each is in the code and how to add one.

## Checks

`scripts/check.sh` runs every lint and test (pipeline, app, end-to-end). `scripts/check.sh <section>` runs one section. The GitHub Actions workflow (`.github/workflows/ci.yml`) runs the same lint and tests on every pull request and every push to `main`. The speed budgets are reported there but don't block, as shared runners vary. Once the lint and tests pass on `main`, the workflow publishes the site to GitHub Pages. Rebuilding the data from its sources is done locally, not in the workflow.

## Licence

The code is under the Apache License 2.0 (`LICENSE`). The data files in `app/public/data/` keep their sources' licences. `DATA-LICENCES.md` says which terms apply to which file.
