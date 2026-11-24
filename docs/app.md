# The app

The app is a static site built with Vite, TypeScript, React and D3. It has no backend. It loads the JSON files described in `data-contract.md` and runs the model in a Web Worker in the browser on every change. React renders the page, and D3 draws the charts and the map inside it.

## Running it

```sh
cd app
npm ci
npm run dev        # development server
npm run build      # type-check and build into app/dist
npm run preview    # serve the build
npm run prerender  # after a build: write the drawn HTML of /, /methodology/, /fr/ and /fr/methodology/ into app/dist (needs Playwright's Chromium)
npm run precompress  # write .gz and .br beside each text file of app/dist, for a host that serves pre-compressed files (GitHub Pages compresses on the fly, so the CI workflow skips this)
npm run lint       # eslint, prettier, tsc
npm test           # Vitest: the model, the lever modules, the goldens and the interface's pure helpers, then the timing tests alone
npm run golden     # record the golden results anew, after a change meant to move them
npx playwright test  # end-to-end, desktop and phone, on the built and pre-rendered site
```

The build splits the code so that a first visit loads only what Explore draws:

- The app, React and D3 each have a file of their own. React and D3 rarely change, so they stay cached after a new deploy.
- The map card, the Causes of warming tab and the guided start load once they are shown.
- The model and the lever modules' hooks are only in the Worker's file, and in a chunk loaded where Workers are missing.
- The Methodology page loads with KaTeX once it is opened. It loads only its pages in the reader's language and in English (`docs-en.ts`, `docs-fr.ts`).

The model runs in its own Worker file.

Add `?data=fixtures` to the URL to run on the small fixtures in `app/public/fixtures/` instead of the real data in `app/public/data/`. The end-to-end tests always do this, so their results do not move when the data is rebuilt.

## Structure

| Folder | What it holds |
| --- | --- |
| `src/main.tsx` | Entry point. It picks the language, loads the data, and renders the app and the guided start. If loading fails, it shows the file and the reason. If the data loaded but the app could not start, it shows why (`StartError`, an error boundary). |
| `src/config.ts`, `src/configSchema.ts` | The departures from FaIR in `planetshift.config.json`, read when the site is built (see "Forking"). |
| `src/data/load.ts` | Loads the data files in parallel from `data/` or `fixtures/`. A failure names the file. It fills in each intensity's source URL from the table in `intensities.json`. It loads a deferred lever file (`breakdown.json`) only when `Loaded.complete` finds a lever of its module above 0. The app asks `Loaded.complete` before each run, and runs again once the file arrives. A deferred file that fails is not asked for again (`Loaded.failed`). Explore then says which file failed, and that the levers that need it have no effect until the page is reloaded. |
| `src/model/` | The core model (diet shift, feed, emissions, land, climate), as pure functions. `run.ts` runs a scenario, calls the lever modules' hooks, and splits the warming avoided by family and cause. `attribution.ts` holds the Shapley values it uses. `api.ts` is the model's interface. `options.ts` holds the core options and `DEFAULT_OPTIONS`. `scenarios.ts` holds only `BASE_SCENARIO`, the controls before any move. `engine.ts` answers the requests a page sends (data, a run, the warming a scenario avoids), and `worker.ts` runs it in a Web Worker. `client.ts` is the page's side. It sends the data once, and after that only the deferred files that arrive. While a run is in progress, it keeps only the latest run waiting. It sends the runs for the panel's worth figures one at a time, so a slider never waits behind more than one of them. Not part of the interface code. |
| `src/levers/` | The lever modules, one folder each (`population`, `waste`, `practices`, `deforestation`, `regrowth`, `removals`, `energy`, `industry`, `shippingSulphur`, `permafrost`), listed in `registry.ts`. `types.ts` defines a module and its hooks, `define.ts` holds small helpers, and `contract.test.ts` holds the tests every module passes. See "Lever modules" below. |
| `src/app/` | `App.tsx` holds the state, the URL, the model in its Worker and the deferred files, and the page's frame (`Header.tsx`, `Logo.tsx`, the footer, the Explore or Methodology view). Small pure helpers: `shell.ts` (reads and writes the URL's state), `url.ts`, `summaryModel.ts`, `summary.ts` (the summary's figures and lines), `milestones.ts` (the Paris Agreement levels), `worth.ts` (what each lever is worth), `panelOrder.ts` (the order of the panel's causes and groups), `theme.ts` and `tour.ts`. The downloads are in `download.ts`: pure CSV and JSON builders, and `saveFile`. |
| `src/ui/` | The React components. `Explore.tsx` holds the chart card and its tabs, the panel, the summary and the map. `Panel.tsx` holds the timing, the horizon, the levers under their causes in order, and the options. The controls are `Slider.tsx`, `Segmented.tsx`, `Info.tsx`, `QuickPair.tsx` and `Group.tsx`. The groups are `DietGroup.tsx`, `LeverGroup.tsx` and `OptionsGroup.tsx`. `Worth.tsx` holds the worth figures: the background runs and the figure beside each group and lever. Then come `Summary.tsx`, `CauseView.tsx`, `MapCard.tsx` with `TableView.tsx`, `Download.tsx`, `Tour.tsx` and `Icon.tsx`. `useDrawn` puts something D3 draws (a chart, the map) in place once and keeps it. |
| `src/controls/` | The panel's pure parts: adoption changes and levels (`adoption.ts`) and the groups' summary lines (`panelModel.ts`). |
| `src/map/` | The choropleth (`choropleth.ts`, D3), and the map card's pure parts: layer values, colour thresholds, legend bins, tooltip rows, intensity sources, and the table's rows, sorting, search and pages (`table.ts`). |
| `src/chart/` | The temperature chart, with the population chart under it on the same years (`population.ts`). The warming-avoided chart. The stacked warming-by-cause chart of the Causes of warming tab (`attribution.ts`, with its texts in `cause.ts`). Shared axes and hover. D3 draws each chart, and React updates it. |
| `src/i18n/` | `en.json` and `fr.json`, the translator (which merges each module's texts under `levers.<id>`) and number formatting. |
| `src/methodology/` | The Methodology page. `sections.ts` fixes the order of the markdown files in `docs/methodology/<lang>/`: the core's pages, with the modules' pages after the Levers page. `Methodology.tsx` draws them, with their formulas typeset by KaTeX (`markdown.ts`). Their contents sit in a sticky column beside them that marks the section and heading being read. At 760 px and below, the contents are behind a sticky "On this page" bar instead. Its button opens the list, which closes when a link is picked or on Escape. |
| `test/model/` | Vitest tests of the core model, on the fixtures and, when built, the real data. |
| `test/golden/` | The golden results: `runScenario` on a grid of settings, on the fixtures and the real data, and the URL state. Every change must leave them equal unless it means to change a result. `npm run golden` records them anew. |
| `test/ui/` | Vitest tests of the interface's pure helpers. |
| `test/e2e/` | Playwright tests of the built site. |

## State and the URL

The state is the model's `Scenario` and `Options`, the interface's choices (view, map layer, food group, gas), the language and the theme. It is one React state in `App.tsx`. A change to the scenario or the options sends a run to the model's Worker. React draws the controls again at once, and the charts, the summary and the map when the result is back. An interface choice alone draws again with the last result. Every change rewrites the URL. A language switch builds the Explore view anew, which stops the old view's pending worth runs.

`encodeState` writes the model's part of the URL, and `decodeState` reads it (`src/model/state.ts`). The diet shift uses these keys:

| Key | What it holds |
| --- | --- |
| `shift` | The diet shift. |
| `rum`, `pig`, `pou`, `dai`, `egg`, `sea` | The per-group shifts. |
| `basis`, `with`, `where` | The diet's basis, replacement and where. |
| `ramp` | The year every lever is in full. The slider's first year is the year after the current one, and a year before it is read as that year. |

Each lever's adoption is a percentage under the key its module declares. A lever at 0 is left out, and an invalid value is read as 0.

| Module | Keys |
| --- | --- |
| `practices` | `fa` feed additives, `bf` breeding and feed, `mm` manure, `rw` rice water, `ne` nitrogen efficiency, `fe` farm energy |
| `waste` | `fw` food waste, `sl` supply losses |
| `deforestation` | `df` deforestation |
| `removals` | `cc` cover crops, `af` agroforestry, `bc` biochar, `ew` rock dust (experimental) |
| `energy` | `ev` electric cars, `et` electric trucks, `fl` less flying, `saf` clean aviation fuel, `cs` clean shipping, `re` renewable electricity |
| `industry` | `ch` clean heating, `ci` clean industry |

Each option follows under its key, and is left out at its default: `scope`, `feed`, `base`, `loc`, `temp`, `clim`, `ssp`, and the modules' `pop`, `regrow`, `dc` and `pf`.

The interface adds its own keys when they differ from their defaults (`src/app/url.ts`):

| Key | Values | Default |
| --- | --- | --- |
| `view` | `explore`, `methodology` | `explore` |
| `layer` | `production`, `emissions`, `land`, `deforestation`, `landCo2`, `change`, `quality` | `change` |
| `change` | `production`, `emissions`, `land` | `emissions` |
| `group` | `all` or a food group | `all` |
| `gas` | `co2e`, `co2`, `ch4`, `n2o` | `co2e` |
| `chart` | `temperature`, `avoided`, `cause` | `temperature` |
| `to` | `2050`, `2100` | `2050` |
| `mapview` | `map`, `table` | `map` |
| `range` | `full`, `recent`: the charts' start year | `full` |
| `causegas` | `all`, `co2`, `ch4`, `n2o`: the gas of the Causes of warming chart | `all` |

The URL also keeps `data=`. A shared link therefore reopens the same controls, options and view. `?view=link` opens Explore on the Causes of warming tab, and the URL is rewritten to `?chart=cause`.

**Pre-rendered pages.** For search engines and link previews, `scripts/prerender.mjs` writes the drawn HTML of four entry pages. The end-to-end tests run it after the build, and the deploy publishes what they tested. It opens the built site in a headless browser and writes `/` (Explore), `/methodology/`, `/fr/` and `/fr/methodology/`. Each page has its own canonical URL and its English and French alternates. The pages leave out the map's countries, which make up most of the page's weight and hold no text. The app draws them.

A `planetshift:entry` meta tells the app which view and language the page shows (`src/app/entry.ts`). The root page names no language, so a reader's own choice comes first there. The app keeps the drawn page on screen until it has drawn its own. It first moves its URL back to the site's root: `/fr/methodology/` becomes `/?view=methodology` in French. The state then stays in the query, as everywhere else, and the data is fetched from the root.

`public/sitemap.xml` lists the four pages. `public/robots.txt`, at the root of planetshift.org, points search engines to it.

The same script draws the share images that link previews show, `share-en.png` and `share-fr.png` (1200×630). Each shows the name, the tagline and what the site shows, beside the temperature chart with every lever in full to 2100. The chart is taken from the built site, so it follows the data. Each page names the image in its own language in `og:image`.

A link to a Methodology section, such as `?view=methodology#method-climate`, opens on that section's heading, below the sticky header. Going back or forward between sections changes only the hash. The app ignores a `popstate` whose query is unchanged, so the model does not run again. The language and the theme are kept in `localStorage` instead, because they belong to the reader rather than to the controls.

## Colours and themes

Every colour is a custom property in `src/styles.css`. It is defined for the light theme on `:root`, and again for the dark theme, under `prefers-color-scheme: dark` and under `[data-theme='dark']`, which the toggle sets. Charts and the map use them through CSS classes or `var(--…)` fills, so a theme change needs no redraw.

The map's scales are single-hue sequential ramps, based on ColorBrewer: green for production, orange for emissions, brown for farmland, red-purple for deforestation and purple for data quality. Change uses a blue–grey–red diverging scale, and so does net land-use CO₂ (sinks blue, sources red, fixed bins at ±1, 10 and 100 Mt). In both themes darker means more, and a larger change is a deeper colour. The dark theme's ramps run from light to deep like the light theme's. They are made in OKLCH with even steps of lightness. The deepest step stops short of the page's background, so the largest values still stand out.

The chart series and the causes pass the colour-blindness checks of the dataviz palette validator for neighbouring bands, in both themes. In stacking order, the causes are fossil fuels and industry in blue, farming in aqua, land use in orange, other human emissions in violet, natural factors in pink and air pollution in yellow. The summary's breakdown uses the same cause colours.

## Adding things

**A text.** Add the key to both `src/i18n/en.json` and `fr.json` with the same placeholders (`{name}`), then call `t('the.key', { name })`. `test/ui/i18n.test.ts` fails when the two files differ.

**A lever.** See "Lever modules" below. A lever is a module, or a line in an existing module's `levers`.

**An option.** A core option goes in `Options` in `src/model/api.ts` and `CORE_OPTIONS` in `src/model/options.ts`. Add `options.<field>.label`, `.hint` and one text per value to both dictionaries. An option that belongs to a lever module goes in that module's `options` (see below). The end-to-end test reads its list of options from the top of `test/e2e/app.spec.ts`, so add it there too.

**A map layer.** Add it to `LAYERS` in `src/map/layers.ts`, with its value in `layerValue`. Add it to `CHANGE_OF` as well if the Change layer should offer it. Put its colours in `src/map/colours.ts`, and add `map.layers.<id>` and `map.notes.<id>` to the dictionaries.

**A view.** Add it to `VIEWS` in `src/app/url.ts`, render it in `App` in `src/app/App.tsx`, and add `nav.<id>` to the dictionaries.

**A chart tab.** Add it to `CHARTS` in `src/app/url.ts`, and its tab panel to `ChartCard` in `src/ui/Explore.tsx`. For a chart a run draws, also add its entry in `DRAW`. Add `charts.tabs.<id>` to the dictionaries.

**A methodology section.** Write `docs/methodology/en/<id>.md`, and `fr/<id>.md` when translated. Until then the English one is shown. Add the id to `HEAD` or `TAIL` in `src/methodology/sections.ts` where it belongs. For a lever module's page, name it in the module's `methodology` instead. A section listed without a file is skipped, and a file not listed is not shown.

## Lever modules

Each lever, or each family of levers that share all their code, is a folder in `src/levers/<id>/`. Work on one lever then touches only its folder, and one line each of `src/levers/registry.ts` and `src/levers/modules.ts`. The diet shift (main slider, per-group sliders, basis, replacement, where, ramp) stays in the core. Every other part of the model builds on it, and making it a module would only move code.

A module's folder holds:

- `spec.ts`: the module without its hooks (`LeverSpec` in `src/levers/types.ts`). This is all the interface reads of the module, so it imports no model code, only `define.ts` and its `data.ts`. It holds:
  - `id`.
  - `departure`: the departure from FaIR it is, if any (see "Forking").
  - `family`: the family its effect is counted in. A feedback such as permafrost has none.
  - `farm`: whether that family is farming.
  - `cause`: the cause of warming it mainly acts on, `fossilIndustry`, `agriculture` or `landUse`. This is its group's heading in the panel, and the cause its own country CO₂, world emissions and warming count in. Farm emissions always count in farming.
  - `levers`: each made with `lever(module, id, urlKey)`. A lever is a 0–100% slider, default 0, with its texts at `levers.<module>.<lever>.title` and `.description`.
  - `options`: each made with `option(module, field, urlKey, values)`, the default first. They are drawn in the Options group.
  - `files`: the data files it reads, each with what stands for it when the build has none. `deferred: true` marks a large file that is loaded only once one of its levers is above 0. Its levers show at once and act when the file arrives.
  - `available`: whether the data has what a lever needs.
  - `ui`: `section: 'levers'` for a fold in the Levers section, and `stat` for a figure in the summary strip.
  - `methodology`: `{ page }` for its own page, or `{ coveredBy }` naming the core page that explains it.
- `index.ts`: the whole module (`LeverModule`), its spec with its `hooks`. Only the model's run reads it, through `src/levers/modules.ts`. The model runs in the Worker, so the page's bundle holds none of the hooks' code.
- `data.ts`, when the module reads a file of its own, and for the constants and data checks its spec needs (its levers' ids, whether a file has data). It holds the file's type, its empty value, and a `declare module` that adds the file to `ModelData`. The same `declare module` adds the module's options to `Options`, and its own fields to `CountryResult` and `Summary`.
- `model.ts`: its pure functions.
- `en.json` and `fr.json`: its texts, merged into the dictionaries under `levers.<id>`. They hold the `title` and `description` of its fold, `family` (its name in the breakdown), `page` (its Methodology page's fallback title), one entry per lever, `options.<field>`, and `summary.*` for its figure.
- Its tests (`<id>.test.ts`), using the helpers in `test/levers.ts`.

The core run (`src/model/run.ts`) calls the hooks at fixed points. Each hook is optional. Each is given the run's context (`RunContext`: the prepared data, scenario, options, current year and `adoption(id)`), and returns null when the module has nothing to do.

| Hook | Called | Returns |
| --- | --- | --- |
| `population` | before the baseline, once per options | The world population by year to use in place of the countries' own (another projection, the population module). The population baseline scales farm emissions by it, in the baseline temperature and in the run alike. The first module that returns one is used |
| `demand` | after the diet shift | What people use once the diet has shifted (less food wasted), per country |
| `supplyChain` | with `demand` | The supply each tonne of use needs, and the losses avoided. A module with either is a production step. It runs on top of the diet and the steps before it, and its family gets the difference in farm emissions |
| `intensity` | per country and band | The share of each item's intensity of each gas removed, applied to the production with every step (farm practices) |
| `country` | per country, after production and land | CO₂ a year by family (a constant stream, such as clearing following each step), and its own fields of the country's result |
| `world` | once, with every country's result | `extraEmissions`: its family's emissions each year by band, such as uptake or fossil CO₂. `extraWarming`: warming from forcing that is not an emission, such as contrails. `warmingByCause`: warming it counts in a cause other than its own, such as the energy and industry levers' air pollution, under `airPollution`. Also its fields of the summary, and its own fields of the result (`result`, such as the population chart's series), declared on `ScenarioResult` with `declare module` |
| `baseline` | in registry order, on the baseline temperature so far | Warming it adds to the baseline (data centres, the 2020 shipping rule, the permafrost release), and what it keeps for `feedback` |
| `feedback` | after every family's change in temperature | The warming that change causes in turn (permafrost). It is shared out between the families, and between the causes, in proportion to the size of their warming |

`src/levers/registry.ts` lists the modules' specs in `MODULES`. `src/levers/modules.ts` lists the same modules with their hooks, in the same order, for `run.ts`. The order of `MODULES` fixes the order of the modules' options after the core's: population first, after the scenario world. It does not change the breakdown, which is the same in any order. `PANEL_ORDER` gives the order of the levers in the URL and of the modules' Methodology pages. The panel itself orders its groups by cause and worth. `SUMMARY_ORDER` gives the order of the modules' figures in the summary strip. A module left out of either list comes after those listed, in registry order.

Everything the core needs is derived from the registry: `LEVERS`, `FAMILIES`, `FARM_FAMILIES`, `LEVER_CAUSES` (the panel's headings), `COUNTED_CAUSES` (the causes a result is split into: those and air pollution), `DIET_CAUSE`, `causeOfFamily`, `MODULE_OPTIONS`, `LEVER_FILES`, `MODULE_PAGES`, `adoptionOf`, `leverAvailable` and `familyLabel`. The core files (`run.ts`, `state.ts`, the panels, the summary, the map, `load.ts`) loop over these and name no lever.

To add a lever:

1. Make `src/levers/<id>/` with `spec.ts` and `index.ts`, and `data.ts` and `model.ts` as needed. Start from the module closest to it.
2. Write its texts in `en.json` and `fr.json` with the same keys and placeholders.
3. Write its Methodology page in `docs/methodology/en/<page>.md` and `fr/<page>.md`, or name the core page that covers it.
4. If it reads a new data file, add its section to the pipeline (`pipeline/README.md`) and its fixture to `scripts/gen-fixtures.mjs` (`npm run fixtures`).
5. Add one line to `MODULES` in `src/levers/registry.ts` where its family counts, and its module to `ALL` in `src/levers/modules.ts`. Add its id to `PANEL_ORDER` if its fold should not come last.
6. Write its tests beside it. `src/levers/contract.test.ts` checks every module without being told:
   - unique ids and URL keys
   - no effect at 0 or at an option's default
   - the URL round-trip with invalid values
   - both languages with the same placeholders
   - more adoption avoiding at least as much warming, on the fixtures and the real data
   - a Methodology page in both languages
   - a fixture for each file

   `test/model/timing.test.ts` times a run with everything on. `test/model/attribution.test.ts` checks the breakdown against the Shapley values of full runs. If a module's family interacts with another farm family other than through production (the diet and less waste), the breakdown's shortcut no longer holds, and that test fails.

7. Run `npm test`. The goldens in `test/golden/` must not move, because a new lever at 0 changes nothing. Then add its id to the grid in `test/golden/grid.ts` and run `npm run golden` to record its own results.

## Forking

`planetshift.config.json` at the repository's root holds a fork's departures from FaIR's own physics. Each departure is a named switch. `planetshift.config.schema.json` lists them, each with its values, its `default` (the website's) and its `plainFair` value (the one that keeps to FaIR). A switch left out takes its default. An unknown key or value stops the build.

The pipeline checks the config (`planetshift_pipeline/config.py`), logs it and writes it into `meta.json` (`departures`). It also writes the data every value needs, so the same data serves any config. The app reads the config when it is built. `vite.config.ts` checks it with `resolveDepartures` (`src/configSchema.ts`) and defines `__PLANETSHIFT_DEPARTURES__`, which `src/config.ts` exports as `DEPARTURES`. Visitors never see the switches. They are not `Options`, not in the Options group and not in the URL.

A run reads the switches with `departuresOf(data)`. It returns `data.departures` when set, and the build's otherwise. The tests set `data.departures` to run with every switch at its plain-FaIR value. A switch that is a module of its own (`permafrost`, `shippingSulphur2020`) is named in the module's `departure`. When the switch is `off`, the registry leaves the module and its option out of the build. Its hooks also check `departs(data, …)`. The other switches pick between variants the data holds. `test/golden/real-plain.json` and `fixtures-plain.json` record a grid of runs with every switch at its plain-FaIR value.

| Switch | Values (default first) | Plain FaIR | Where |
| --- | --- | --- | --- |
| `noxMethane` | `chemistry`, `fair`, `hoor` | `fair` | The methane that each kg less of NOx leaves. `chemistry`: the chemistry models' own value on land and at sea (Hoor et al. 2009), carried by FaIR's change with the scenario. `fair`: FaIR's one coefficient. `hoor`: FaIR's coefficient shared between land and sea by Hoor et al.'s ratio, keeping its world total. `coemissions.json`'s `noxCh4PerKgCo2` and `noxPlaceFactor` hold each variant (`coemissions.py`, `nox_factors`). `noxMethane` in `src/levers/energy/coemissions.ts` reads the one picked |
| `aviationNonCo2` | `lee2021`, `fair` | `fair` | What less flying cuts besides CO₂. `lee2021`: Lee et al. (2021)'s non-CO₂ forcing (`sectors.json`'s `aviationNonCo2`). `fair`: aviation's own NOx, SO₂ and soot, as the co-emissions of `aviationOwn` in `coemissions.json`, because FaIR has no contrails (`aviationCo` in `src/levers/energy/model.ts`) |
| `permafrost` | `on`, `off` | `off` | The permafrost module and its visitor option (`pf`, on for visitors by default). Its constants are in `climate.json` |
| `shippingSulphur2020` | `on`, `off` | `off` | The `shippingSulphur` module: the IMO's 2020 fuel sulphur limit as a forcing outside FaIR's ensemble (`climate.json`'s `shippingSulphur2020`, by SSP). It goes through `sectors.json`'s forcing response and is added to the baseline |

Some choices are not departures, because they are inputs rather than FaIR's physics: the visitor options (the AR6 curves, the SSP, the data centres' growth, the population projection), the scenario data and inventories, the co-emission ratios' trends, the grid intensity stopped at zero and the linear response around the scenario.

To add a departure:

1. Add the switch to the schema with its values, `default`, `plainFair` and `description`, and to `planetshift.config.json`.
2. Add its field to `Departures` in `src/configSchema.ts`.
3. Write the data each value needs in the pipeline.
4. Read it with `departuresOf(data)` where the model uses it. For a module of its own, set the module's `departure` instead.
5. Record the goldens anew (`npm run golden`), the plain-FaIR ones included.

## The Explore page

**The layout.** The page holds four blocks in this order: the chart card, the panel, the summary and the food and farming map. On a phone they stack in that order, so the chart opens the page and the controls follow it. From 861 px the panel moves to a sticky left column beside the others (`grid-template-areas` in `.explore`), and from 1,400 px the summary takes a sticky right column. The order is set in the markup rather than with CSS `order`, so the keyboard and screen readers meet the blocks in the order they are read.

**The panel** starts with the two time settings:

- *All levers fully in place by*: the year every lever, the diet included, is reached in full (`rampEnd`, under `ramp` in the URL).
- *Results up to*: the horizon, 2050 or 2100 (`to` in the URL). It sets the charts' last year, the warming each cause and lever group shows, the order of the groups and the summary strip. So it is a setting of the whole page rather than of the chart card.

Then come the lever groups, under a small "Levers" heading and a heading per cause of warming. Each cause heading gives the warming that cause adds by the horizon. Each group is a native `details` element, so the keyboard and screen readers can open and close it. The groups are closed at first. A group's summary gives its title and one line of what is set and what it is worth.

- **Fossil fuels and industry**: Energy and transport, Buildings and industry. **Farming**: Diet, Farm practices, Food waste. **Land use**: Deforestation, Carbon in farmland. The Diet group holds the main shift, kept equal, replaced by, where, and "Shift each animal food" folded inside it. Its line says "No shift yet" or "40% moved", and "some foods set apart" when a food has its own share. Each lever group holds its description, its levers' sliders and "adopt all in full" / "reset". Its line says "2 of 7 adopted" or "None of 7 adopted".
- The causes are ordered by the warming each adds by the horizon under the scenario world (`climate.attribution`). Within a cause, the groups are ordered by what each is worth (below), larger first (`panelOrder` in `src/app/panelOrder.ts`). The order is worked out once every group's figure is known for the current options, horizon and data. It is kept until one of them changes (`orderKey`), so a slider, the timing one included, never reorders the panel. The groups are moved only when the order differs, so a focused control keeps its focus.
- **Quick 0% / 100% pairs** set a whole group, a cause or the whole panel at once, and leave the group open or closed as it was. There is one beside each group's summary, one on each cause heading for every group under it, and one beside the Levers heading, "All", for every group. They are buttons beside the summary, not in it, because interactive content in a `summary` would toggle the group and confuse screen readers. Each has its accessible name ("Set Energy and transport to 0%", "Set every lever under Farming to 100%", "Set all levers to 0%"). A pair's button is pressed (`aria-pressed`) when its groups match what it sets: 0% when every lever is at 0, 100% when every lever is in full, and neither in between. For the Diet, 0% and 100% set the main shift and clear the foods set apart under "Shift each animal food". So 100% moves every animal food in full and 0% none, as "all levers at 0%" promises. Keeping a food's own share would leave the pair showing neither state right after a click. A click is one change of the scenario (`withGroupsAt` in `src/controls/adoption.ts`), so the model runs once and the URL is written once. A click never reorders the panel. Other options have no pair, because they are not levers.
- **Other options** comes last and is closed. It holds the core options and every module's options (AI data centres, permafrost, freed farmland), which change the baseline or apply across groups rather than belonging to one. Its line says "All at their defaults" or how many are changed.

**What each lever is worth.** A figure such as −0.02 °C sits beside the diet, each family, each animal food and each lever. It gives the change in warming at the chart's horizon (2050 or 2100) if that alone were adopted in full, from no shift and no lever. It uses the current options, ramp year, and the diet's basis, replacement and where. "Alone" was chosen over "on top of the current settings": the figure does not move while other sliders do, it reads as a ranking of where the big levers are, and it needs one run per figure rather than one per figure after every move. A bar behind each figure shows it against the largest of its kind: headers against headers, foods and levers against each other. A figure that adds warming is signed + and coloured as a warning.

`src/app/worth.ts` lists the 36 runs (`worthJobs`). It keys each by its scenario and options (`jobKey`), so a run is never repeated while its inputs are the same. It runs them one per idle callback after 400 ms without a change, so slider moves never wait for them. They run on the data as loaded so far. The first of them asks for every deferred lever file (`ViewContext.loadAll`), because without the practices' `breakdown.json` the practices would be worth nothing and misplaced in the panel. The file stays out of the first load. Once it arrives, the figures are computed again and the panel is reordered. The run-time budgets are in `test/model/timing.test.ts`.

**The guided start** (`src/ui/Tour.tsx`, its flags in `src/app/tour.ts` and its styles in `tour.css` beside it) opens over Explore on a first visit. It is a modal `dialog` of three steps: what the chart shows, how the levers work and where the causes are. It has Back, Next (Start exploring on the last step) and Skip. The native modal keeps the focus inside, and Escape closes it. The focus starts on Next and stays on the buttons. Each step's progress, title and text are in a polite live region, which the dialog's description also points to.

Closing the guided start in any way stores `planetshift.tour` in `localStorage`, so it does not open again in that browser. The read and the write are in a `try`. When storage throws, it opens again on the next visit. `main.tsx` decides before the app starts, because the app rewrites the URL. `?tour=1` opens it whatever is stored, `?tour=0` keeps it closed, and neither is kept in the URL. It opens in the page's language and only on Explore. The end-to-end tests store it as seen before every test except the two tagged `@tour`.

**The chart card** has three tabs: Global temperature, Warming avoided and Causes of warming. They follow the tab pattern, like the map's: the arrow keys, Home and End move between them (`tabKeys` in `src/app/tabs.ts`). The temperature and by-cause tabs also have the start year (1850 or 2000).

The temperature chart's lines are "Without the levers" and "With the levers". It shows totals only, with no cause singled out, as no cause is preferred over another. A "See what causes the warming" link under it opens the Causes of warming tab (`chart=cause`), as the tab does. The temperature chart has an empty `.chart-slot` under it (`TemperatureChart.slot`) for a small chart such as population.

The Causes of warming tab shows the headline (the warming so far), what each cause adds or takes away, the sentence on what the levers avoid of each cause, warming by cause stacked, and, folded, why the gases are kept apart. Its Methodology page is `link.md`.

A switch over the stacked chart picks what it stacks: *All gases*, *CO₂*, *Methane* or *N₂O* (`causegas` in the URL).

- Under *All gases* the chart has six causes: fossil fuels and industry, farming, land use, other human emissions, natural factors, and air pollution below zero. A build without `airPollution` and `natural` shows the four it has. The chart also shows the temperature measured over them.
- A gas shows that gas's warming by the causes that emit it, from `climate.attributionByGas`. Land use appears only for CO₂. *Other sources and interactions* holds the rest of the gas. There is no measured temperature, because no single gas adds up to it. Air pollution and the natural factors appear under *All gases* only.
- A build without `attributionByGas` hides the switch and shows *All gases*.

The legend is ordered by the size of each cause at the horizon. After today, each lever cause's band is the attribution's median less what the levers avoid of it (`temperature.avoidedByCause`, or `temperature.avoidedByGas` for a gas). The bands without the levers are drawn as faint dashed outlines. The hover gives each cause with and without the levers.

**Temperature milestones** (`src/app/milestones.ts`; research in the plan, §13.2). The temperature chart draws the Paris Agreement's 1.5 °C ("pursue efforts to limit") and 2 °C ("stay well below") as dashed lines with a short label. The full wording is in their tooltip and in the caption. There is no 1.8 °C line. Dots mark the year the baseline's and the scenario's medians cross each line. On a phone the years are left to the summary. With the horizon at 2100, a small band in the right margin shows where current policies lead, 2.7–2.8 °C (Climate Action Tracker, November 2026; UNEP Emissions Gap Report 2026). The caption says that warming levels are 20-year averages, and that a single year above a line does not cross it.

A crossing year is the first year the 20-year centred mean reaches the level. The mean is shorter at the ends of the series. The likely range is the years the 5–95% band's warm and cool edges reach the level ("likely from 2042" when the cool edge never does). The summary's "Paris Agreement levels" lists:

- for each level, the year it is reached without and with the shift (or "not before 2100")
- the share of the gap to each level that the shift closes in 2100, (baseline − scenario) ÷ (baseline − level)
- the scenario's peak warming before 2100, or that it is still rising then.

**Natural factors only.** When `climate.json` has `naturalOnly`, the temperature chart draws its median as a thin line, "Natural factors only (sun and volcanoes)", with a legend entry and a row in the hover. Without it, the line and the entry are hidden. The fixtures have one (a flat line with dips after large eruptions) so the interface can be tested.

**El Niño and La Niña years.** When `enso.json` is there, the observed line has a small dot on each El Niño year (red) and La Niña year (blue). There is a legend entry, "El Niño and La Niña years", and a row in the hover giving the year's phase and its annual ONI. Neutral years have no dot. `ensoMarks` (`src/chart/series.ts`) picks the dots, and their colours are `--enso-elNino` and `--enso-laNina` in both themes. Without the file, the dots and the entry are hidden. The milestone caption says why the Paris levels are 20-year averages: single years swing about ±0.2 °C around the trend with El Niño and La Niña. The fixtures have an index swinging every 4.3 years.

**Tooltips.** A chart's hover shows a crosshair and the values of the nearest year. The map's hover shows the country under the pointer. A click or tap pins it, so its source link can be followed, until a tap on the sea or outside the map, or Escape.

On a touch screen, a tap pins the map's tooltip only when the finger did not move, so a scroll that starts over the map shows nothing. A chart keeps its tooltip once the finger lifts, until a tap outside it. A horizontal drag across a chart moves the crosshair, because the plot lets the page scroll only vertically (`touch-action: pan-y`).

Each chart's plot also takes the keyboard focus, and its label says how to use it. The arrow keys move the crosshair by a year, Page Up and Page Down by ten, and Home and End to the first and last year. Escape hides the tooltip. The tooltip is a polite live region, so a screen reader reads the values.

Both tooltips are placed beside the point in screen pixels, on the side with room, and kept inside their frame (`placeTooltip` in `src/app/place.ts`, tested in `test/ui/place.test.ts`). This keeps them from being clipped on a narrow phone, where the charts' svg is scaled down below 280 px.

**The summary** is not a live region, since it is rewritten on every slider move. Instead, a visually hidden status sentence in it, such as "Less warming in 2050: 0.041 °C.", is rewritten 800 ms after the last change, so a screen reader reads it once, when the slider stops.

**Map and Table.** The map card shows its layer in two views of the same data, Map and Table. A pair of tabs with icons switches between them, after Our World in Data's charts. The layer, change, gas and food controls above them act on both. The URL keeps the view under `mapview=table`, and leaves it out for the map, the default.

The tabs sit at the top right of the card, with the card's Download button beside them, rather than in a row under the view. The table is taller than the map, so a switch under it would move each time the view changes. At the top, it stays where the pointer is. Up to 760 px wide, the tabs take their own row above the controls, still right-aligned. They follow the tab pattern (`role="tablist"`, arrow keys move between them). The note under the view applies to both views, and the legend only to the map. The Download button opens the download list between the controls and the view, so the button does not move as the list opens and closes.

**The table** lists every country of the model, not only the largest. Its columns are country, today, after the shift, and the change. For production and emissions, and the Change layer of either, it adds the least precise source, with its tier and a short link to it. The Data quality layer shows only the country and its source. Farmland and forest clearing have no tier.

The table opens sorted by the column the map colours by (after the shift, the change, or the tier), largest first. Clicking a column header sorts by it: names A to Z, numbers largest first. Clicking again reverses the order. The header holds a button, and has `aria-sort`. A country without a value (no change when there was nothing before) comes last either way. A search box filters by name in English or French or by ISO code, ignoring case and accents.

The table pages by 20 rows, with Previous and Next and "Page 2 of 10". It says which rows it shows ("Countries 21–40 of 188") in a polite live region. Pages were chosen over infinite scroll: the page under the table stays where it is (the note, the download list and the footer remain reachable), the keyboard and screen readers have a fixed set of rows and controls, and a row's position can be named. The search, a new sort or a new layer go back to page 1. A new layer also goes back to its default sort. On a phone the table scrolls sideways inside its own frame, never the page. The helpers (`tableRows`, `filterRows`, `sortRows`, `nextSort`, `pageOf`) are pure and tested in `test/ui/table.test.ts`.

**Downloads.** The map card's Download button opens a list:

- The map's layer as CSV, PNG or SVG. The CSV holds every country with its ISO3 code, English name, layer, measure, gas or food, unit, values before and after, relative change, tier and source. The file is named after the layer and the scenario, such as `planetshift-map-change-emissions-co2e-shift40-2035.csv`.
- Each chart tab's data as CSV, one file per tab:
  - the temperature, 1850–2100: observed, without and with the levers with their 5–95% ranges, and warming from natural factors
  - the warming avoided, from the current year to 2100
  - the causes of warming with their ranges and the observed temperature under the chosen SSP, then each gas's warming by cause with its range, as `warming_<gas>_<cause>_…`, when the build has it
- The scenario as JSON: the full URL state (its address and query, the scenario, the options and the interface's choices), with the summary, the licence, how to cite and the sources from `meta.json`.
- The source data files with their sizes (read when the site is built, `__DATA_FILES__` in `vite.config.ts`) and each file's licence.

One file per tab was chosen over one wide file because the tabs have different years and quantities. The chart card has its own Download button, to the right of the horizon and years filters just above the chart. It opens a menu (`DownloadMenu.tsx`, the menu-button pattern: the down arrow opens it on its first item, the arrows move, Escape, Tab or a click elsewhere close it) with the current tab's data as CSV, and the tab's chart as PNG or SVG. Screen readers hear the button as "Download this chart's data". A button with nothing to save, as when the model could not compute the scenario, says so beside it.

**Chart and map images.** `src/app/imageCapture.ts` reads a chart panel's charts (with the population chart under the temperature, when shown) or the map off the page, in the light theme whatever the reader's: each drawing is copied with its computed styles written into it, so the file needs no stylesheet, and its HTML legend is read as legend items. `src/app/imageExport.ts`, pure and tested in `test/ui/imageExport.test.ts`, sets them in one SVG: the tab's or the layer's title, the chart's description or the map's note, each drawing under its subtitle and legend, and a credit line, *Planetshift · planetshift.org* and the date. The PNG is that SVG drawn on a canvas at twice its size. The fonts are named, not embedded: an SVG opened elsewhere uses Lato where installed, and the PNG the browser's sans-serif. Files are named as the CSV, with their own extension.

Every entry names its licence with a link. The map's CSV is CC BY 4.0. The chart CSVs and the scenario derive from `climate.json`, so they are CC BY-NC-SA 4.0. The files follow `DATA-LICENCES.md`. A "How to cite" fold gives Planetshift, the page's address and the sources in `meta.json`.

The CSV files are a stable machine format, whatever the page's language:

- UTF-8 with a byte order mark, so Excel reads the accents
- comma-separated, with CRLF line ends
- fields quoted when they hold a comma, quote or line break (RFC 4180)
- English column names with their unit (`_degC`, `_kg`, or a `unit` column)
- plain numbers to seven significant digits, with a point for decimals and no thousands separator
- an empty field for a missing value

Files are saved through a `Blob` and a temporary link with `download`. The builders are pure and tested in `test/ui/download.test.ts`.

**The deforestation layer** colours each country by the forest area cleared for farming with the shift and the levers, in hectares a year (`deforestationHa`). It is not relative to anything. Its tooltip gives today's clearing, the clearing after, the change, and the CO₂ the clearing releases today and after. A country without clearing is shown with the countries without data ("No clearing or no data"). The layer reads the deforestation module's `deforestationCo2` and `deforestationChange`. This is the one place outside a module where the map names a lever's fields.

**The land-use CO₂ layer** (`landCo2`) colours each country by its net CO₂ from all land-use change with the levers, in tonnes a year. Today's is `landuse.json`'s: forest cleared for any reason, peat drained and other changes, less regrowth, so a net sink is negative. The levers change two parts of it (`landCo2Change` in `src/map/layers.ts`): the deforestation module's clearing for farming, and, with regrowth set to `natural`, what the country's freed farmland takes up (`regrowthCo2`, from the regrowth module's country hook). The rest stays as it is, and the note says so. The tooltip and the table give today's and the levers' figures, and the tooltip the two parts. The table lists the countries the file has. Without `landuse.json` the layer has no data. It is not the Land use layer (`land`), which shows the share of each country's land that is farmed.

## Assumptions in the interface

- The current year is the browser's. The temperature chart and the ramp start there.
- The summary's protein and calories are population-weighted world means of the countries in the data, using the base year's population.
- The map's change layer is the relative change once the shift is complete, not in a given year. For land it is the change in cropland and pasture together. The deforestation layer is absolute, also once the shift is complete.
- The land layer, *Land use* (`layer=land`), shows farmland (cropland and pasture) as a share of the country's land area (`landArea`) with the shift, on fixed bins. Its tooltip gives the share, then farmland, cropland and pasture in hectares before and after, and no emission source. *Change in → Farmland* stays in hectares.
- The summary's farmland freed is the world total at the full shift. Each part is shown as its change in use (negative when freed), and the total as a share of the world's farmland in the base year. When the shift needs more land than it frees, it says "added". With regrowth on, it adds the CO₂ taken up a year, in the year the shift is complete (`summary.regrowthCo2`). This is already within the CO₂ avoided.
- The data-quality layer and tooltip show, per country, the worst tier among its items under the selected emission scope, with that intensity's source.
- The left panel holds only controls, in groups (see "The Explore page"). There are no ready-made scenarios. The quick 0% / 100% pairs and each lever family's "adopt all in full" and "reset" are the shortcuts. A food set under "Shift each animal food" keeps its own share when the main slider moves.
- Each lever's slider is its adoption, with a one-line description, and each family has "adopt all in full" and "reset". A lever whose data file is missing from the build is disabled and says so. The app still opens, because the loader replaces a missing lever file (HTTP 404) by an empty one.
- The summary's breakdown, "Warming avoided in {year}, by lever group", lists the causes the levers act on, biggest first. Each cause shows what the levers avoid of it and, under it, each group's part of it (`causeGroups` in `summaryModel.ts`, from `summary.byFamilyCause`). The bars are on one scale, coloured by the chart's `--cause-*` tokens. A group acting on two causes, such as the diet, appears under both. A part under 0.0005 °C is left out. The breakdown is hidden when a single group acts. A part that adds warming is shown as "added" with a hatched bar. The parts add up to the total, and the parts of each cause add up to the reduction of its band in the Causes of warming chart (see the Levers methodology page for the Shapley values).
- With carbon-in-farmland levers on, the summary adds the CO₂ they store in the year the shift is complete. When forest clearing changes, it adds the deforestation CO₂ avoided (or added) a year, and its share of today's clearing. Forest clearing changes with the deforestation lever, or with a shift that changes the production of items tied to clearing.
- The map's Change layer shows each country's farm emissions with the shift and the levers that act on them (practices, less waste). The change in forest clearing has no matching base in the farm emissions it divides by, so it has its own absolute layer, Deforestation, instead.
- The energy levers change neither the map, nor the farm emissions, nor the farming band of the Causes of warming chart. They show in the summary (CO₂ avoided, warming avoided and the fossil fuels rows of the breakdown), in the temperature charts, and in the fossil fuels band of the Causes of warming chart. Besides the fossil CO₂, they cut the methane leaked producing the fuel, in the fossil fuels band, and the air pollution that burning it made. So the air-pollution band of the Causes of warming chart shrinks after today, and the breakdown shows them under air pollution too.
- The *Emissions counted* hint and the summary's note say that wild fish emit only when their inputs are counted.
- The *AI data centres* option (default: growth added) and the *Permafrost* option (default: left out; a fork can remove it, see "Forking") change the baseline temperature as well as the warming avoided.
- The *World population* option (module `population`, default: the UN's medium projection) is a method option, not a lever. It has no family and no slider. It changes the baseline and the scenario alike through the `population` hook, so the breakdown never credits it. The population chart sits under the temperature chart, with its own axis in billions. It has the same x range (the range and horizon switches) and the same hover year: hovering either chart shows the crosshair and the values of that year in both (`hoverLink` in `src/chart/frame.ts`). It shows WPP's world total, not the sum of the model's countries. It shows a note when the projection and the scenario world contradict each other (low with SSP3-7.0, high with SSP1-2.6), or when the SSP2 farm baseline makes the choice irrelevant. With the low or high projection, it adds how far that projection moves the baseline at the horizon against the medium one ("With this projection, the warming without the levers in 2100 moves by −0.08 °C from the medium projection's."). The medium projection's baseline comes from `baselineMedian` (`src/model/run.ts`), which reads the run's baseline cache. So it is worked out once per set of options, in about half a millisecond on the real data (`test/model/timing.test.ts`), and never on a slider move. The population chart is hidden when the build has no `population.json`.
- The font is Lato from Google Fonts (`index.html`), with the system font as a fallback. The end-to-end tests ignore a failed font request, so they pass offline.
- Moving a lever slider re-runs the model without redoing the diet shift's production changes, which are cached for the latest diet settings. The practices' cuts are cached while only the diet moves, keyed once per run by the scope and the practices' adoptions. What depends only on the items or a base vector is computed once and kept beside it: each item's protein and kcal per tonne, its group index and whether it is an animal, the group totals of a country's production, and, for each emission source, the items with a share of it. A run tabulates the baseline's scale over its years once. Less waste reuses the diet's change in food rather than recomputing it. The breakdown's passes without the diet, or without less waste, are kept per set of production groups in play and keyed by what they read. So moving the diet slider does not redo the pass of less waste alone, and moving a lever outside farming redoes none. The other way round, the world parts of the modules outside farming (energy, industry) are kept per set of them acting, keyed by the options, the ramp and their levers. So moving a farming lever redoes none of them. The hot vector code (`util.ts`, `location.ts`, `productionChanges`, the practices' cuts) uses plain loops, which add in item and country order.
