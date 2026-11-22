# Planetshift

*What does change look like?* Planetshift shows where the world's food is produced and what it emits, lets you move part of the diet from animal to plant foods, keeping protein or calories equal, adopt levers in farming, energy and transport, and shows what that does to global warming up to 2050 or 2100. A second view shows how much of the warming since 1850 comes from farming, and the Methodology page explains every step and assumption.

## Layout

- `pipeline/`: Python. Downloads FAOSTAT, HESTIA aggregations, PRIMAP-hist, temperature series and scenario data, runs FaIR, and writes the JSON the app reads into `app/public/data/`. See `pipeline/README.md`.
- `app/`: TypeScript, Vite and D3, a static site with no backend. The model in `app/src/model/` is pure and runs in the browser. See `docs/app.md`.
- `docs/`: `data-contract.md` (the JSON files between the two), `app.md`, and `methodology/<lang>/`, which the app renders as its Methodology page.

## Running it

```sh
cd pipeline && uv sync && uv run python -m planetshift_pipeline.build   # writes app/public/data/
cd app && npm ci && npm run dev
```

`/?data=fixtures` runs the app on the small test fixtures instead of the real data.

## Checks

`scripts/check.sh` runs every lint and test (pipeline, app, end-to-end); `scripts/check.sh <section>` runs one. The GitHub Actions workflow (`.github/workflows/ci.yml`) runs the same lint and tests on every push and pull request (the speed budgets are reported but don't block there, as shared runners vary), and publishes the site to GitHub Pages from `main` once they pass. Rebuilding the data from its sources stays local.

## Licence

The code is under the Apache License 2.0 (`LICENSE`). The data files in `app/public/data/` keep their sources' licences; `DATA-LICENCES.md` says which terms apply to which file.
