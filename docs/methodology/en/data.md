# Data: food balances, countries and groups

Everything Planetshift knows about what each country produces, trades and eats comes from FAOSTAT's Food Balance Sheets. This page explains which year is used, which countries are in, how foods are grouped and what is left out. The code is in `pipeline/planetshift_pipeline/` (`supply.py`, `countries.py`, `groups.py`); the grouping table is `pipeline/groups.csv`.

## The Food Balance Sheets

A Food Balance Sheet (FBS) follows each food item through a country's year: what was produced, imported and exported, and what became of it, as food, animal feed, seed, losses, processing into another item, or other uses. Quantities are in tonnes of the item as FAOSTAT defines it, mostly the primary commodity or its equivalent (rice in milled equivalent, milk in whole-milk equivalent, meat in carcass weight). Planetshift reads the current series (2010 onwards) as published in FAOSTAT's bulk download.

Each item's row is closed so that it balances exactly: production + imports − exports = food + feed + losses + processing + seed + other. The `other` term gathers FAOSTAT's other (non-food) uses, tourist consumption, residuals and stock changes; it can be negative when stocks were drawn down.

Processing is what links a crop to what is made from it: soybeans crushed into oil, cane into sugar, milk into butter. The processed products (oils, sugar, sweeteners, butter, cream, wine, beer and other drinks) are items of their own, with their own production. To count each tonne once, the emissions of a primary item are counted on its production minus its processing, and the processed share is counted on the products made from it (see the emissions page).

## The base year

The base year is the latest year whose balances cover at least 95% as many countries as the best-covered year. With the current download it is **2023**, the latest year published.

Kcal and protein per tonne of each item are FAOSTAT's world food supply of kcal and of protein for that item divided by its world food supply in tonnes, in the base year.

## Countries

FAOSTAT lists single countries and territories with area codes below 5000, and groups of countries (World, continents, regions, economic groups) from 5000 up. Planetshift keeps only single countries, and removes explicitly the areas that would count something twice:

- "China" (code 351) is the sum of mainland China (41), Hong Kong (96), Macao (128) and Taiwan (214), which FAOSTAT also lists one by one. Planetshift keeps the four parts and drops the sum.
- Areas that no longer exist (the USSR, Yugoslavia, Czechoslovakia, Serbia and Montenegro, Sudan before 2011, Belgium-Luxembourg, Ethiopia PDR, the Netherlands Antilles, the Pacific Islands Trust Territory) are dropped; their successors are listed.

Each country gets an ISO 3166 alpha-3 code from its M49 code through Natural Earth's table, with a few territories Natural Earth does not draw at 1:50m added by hand (French Guiana, Guadeloupe, Martinique, Mayotte, Réunion, Gibraltar, Bonaire, Tokelau). Its region is the M49 sub-region (for example "Western Africa"), from Natural Earth, spelled as FAOSTAT spells it; these regions are used for the feed shares and for regional averages. English and French names are FAOSTAT's. The high-income flag is the World Bank's current classification (CLASS.xlsx, fiscal year 2027). Population, from the base year to 2100, is FAOSTAT's annual population, which carries the UN World Population Prospects estimates and medium-variant projection.

Some countries have no balance for the base year in this release. Rather than leave them blank, Planetshift takes their latest balance and scales every quantity by their population growth since then, which keeps their diet per person as it was:

- from the current series: Cuba (2019) and the Democratic People's Republic of Korea (2018);
- from the historic series, which ends in 2013: Japan, Sudan, Mali, Chad, Benin, Togo, the Central African Republic, Brunei Darussalam, Dominica and Bermuda. Two items changed codes between the series (rice 2805 to 2807, groundnuts 2556 to 2552) and are renamed.

Countries without any balance (among them Somalia, Burundi, South Sudan, Singapore, Palestine and Eritrea, and small territories) are not in the model. With these rules the model has **188 countries**.

## Item groups

`pipeline/groups.csv` puts each FBS item in one of the groups the app shows, and flags animal products:

- Plant: cereals, rice (kept apart for its paddy methane), pulses, oil crops (seeds, fruits and their oils), vegetables, fruit, roots and tubers, sugar crops (cane, beet, sugar and sweeteners), nuts, stimulants (coffee, cocoa, tea), and other plant foods (spices and alcoholic drinks).
- Animal: ruminant meat (cattle, buffalo, sheep, goat, and "other meat": camels, llamas, horses, rabbits, game), pig meat, poultry meat, dairy (milk, butter, cream), eggs, and seafood (freshwater, demersal, pelagic and other marine fish, crustaceans, cephalopods, other molluscs and other aquatic animals, in live weight; see [Fish and seafood](#method-seafood)). Edible offal goes with ruminant meat and raw animal fats with pig meat, as the largest source of each.

Left out of the model, and of every total it shows:

- aquatic plants (seaweeds, a third of them for non-food uses, almost no protein or energy), aquatic mammals (no supply) and fish oils (made from fish already counted in the fish items);
- honey, which has no farm emissions in FAOSTAT and almost no protein;
- non-food alcohol, infant food (made from items already counted) and the miscellaneous item.

A test checks that every FBS item with a world production above 100 kt has a row in `groups.csv`.

## Assumptions

- The base-year balance stands for today's food system; the shift model scales it with population.
- The model's 188 countries hold 8.02 billion people in 2023 and 10.00 billion in 2100 in FAOSTAT's population (World Population Prospects), 98–99% of WPP 2024's world totals (8.09 and 10.18 billion).
- Countries missing from the base year keep the diet per person of their latest balance, up to ten years older, scaled by population; for the historic series the methodology differs from the current one.
- `other` closes each item's balance, so stock changes and statistical residuals are kept rather than spread over the other uses.
- A country's M49 sub-region is its region for regional averages.
- Offal and animal fats belong to one animal group each, although they come from several species.

## Download the data

The Explore page's map card has a Download button, and the chart card one for the chart shown.

- **The map as CSV**: every country with the layer's values today and once the shift is complete, the relative change, the unit (tonnes of product, kg of a gas or of CO₂e, hectares, kg of CO₂ from forest clearing) and, for production and emissions, the tier and source of the least precise intensity used. Licence CC BY 4.0.
- **Each chart as CSV**, one file per tab: the global temperature from 1850 to 2100 (observed, without and with the levers with their 5–95% ranges, natural factors only), the warming avoided each year to 2100 with its range, and the warming by cause with observed temperature and farm emissions by gas. They derive from `climate.json`: licence CC BY-NC-SA 4.0.
- **The scenario as JSON**: every setting of the page, the same as its address, with the summary's figures, the licence (CC BY-NC-SA 4.0) and how to cite.
- **The source data files**: the JSON files the page reads, each under its sources' terms. `climate.json` and `sectors.json` are CC BY-NC-SA 4.0 (non-commercial, share alike), `industry.json` CC BY-SA 4.0, `population.json` CC BY 3.0 IGO and CC BY 4.0, and the others CC BY 4.0; anything derived from `climate.json` or `sectors.json` keeps their terms.

The CSV files are UTF-8 with a byte order mark, comma-separated, with English column names and plain numbers (a point for decimals, no thousands separator), whatever the page's language.

**How to cite.** Credit Planetshift, with the address of the page (which holds the scenario), and the original sources listed below and in `meta.json`, for example: "Planetshift (2026), *address of the page*. Data: FAOSTAT, HESTIA, PRIMAP-hist, FaIR, HadCRUT5, …". The download list gives the full line.

## Sources

- FAOSTAT, Food Balances (2010–): <https://www.fao.org/faostat/en/#data/FBS>, CC BY 4.0.
- FAOSTAT, Food Balances (–2013, old methodology): <https://www.fao.org/faostat/en/#data/FBSH>, CC BY 4.0.
- FAOSTAT, Annual population (UN World Population Prospects): <https://www.fao.org/faostat/en/#data/OA>, CC BY 4.0.
- UN DESA (2024). World Population Prospects 2024: Summary of Results. UN DESA/POP/2024/TR/NO. 9; the WPP 2024 data: <https://population.un.org/wpp/>, CC BY 3.0 IGO.
- KC, S., Lutz, W. (2017). The human core of the shared socioeconomic pathways: population scenarios by age, sex and level of education for all countries to 2100. Global Environmental Change 42, 181–192: <https://doi.org/10.1016/j.gloenvcha.2014.06.004>.
- KC, S. et al. (2024). Updating the Shared Socioeconomic Pathways (SSPs) global population and human capital projections. IIASA Working Paper WP-24-003.
- Our World in Data, Population (long-run series from HYDE 3.3, Gapminder v7 and WPP 2024): <https://ourworldindata.org/population-growth>, CC BY 4.0.
- Klein Goldewijk, K. et al. (2017). Anthropogenic land use estimates for the Holocene: HYDE 3.2. Earth System Science Data 9, 927–953: <https://doi.org/10.5194/essd-9-927-2017>.
- FAOSTAT bulk downloads: <https://bulks-faostat.fao.org/production/datasets_E.json>.
- Natural Earth, Admin 0 countries, 1:50m, version 5.1.2: <https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/>, public domain.
- World Bank country and lending groups: <https://datahelpdesk.worldbank.org/knowledgebase/articles/906519>, CC BY 4.0.
