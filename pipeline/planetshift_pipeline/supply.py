"""The base year's Food Balance Sheets as supply rows, with missing countries filled in."""

import pandas as pd

from .countries import countries_only

#: FBS element code -> SupplyRow field. Quantities in FAOSTAT are in 1000 t.
ELEMENTS = {
    5511: "production",
    5611: "imports",
    5911: "exports",
    5142: "food",
    5521: "feed",
    5123: "losses",
    5131: "processing",
    5527: "seed",
}
FIELDS = [*ELEMENTS.values(), "other"]
FOOD = 5142
KCAL = 661  # million kcal
PROTEIN = 671  # t
WORLD = 5000

#: A year is complete when at least this share of the most countries any year has are in it.
COMPLETE_SHARE = 0.95


def base_year(fbs: pd.DataFrame) -> int:
    """Latest year whose Food Balance Sheets cover (nearly) as many countries as the best year."""
    per_year = (
        countries_only(fbs[fbs["element_code"] == FOOD]).groupby("year")["area_code"].nunique()
    )
    return int(per_year[per_year >= COMPLETE_SHARE * per_year.max()].index.max())


def balance(rows: pd.DataFrame) -> pd.DataFrame:
    """Tonnes by (area_code, item_code) for each field; `other` closes the balance:
    production + imports - exports = food + feed + losses + processing + seed + other.
    `other` gathers non-food uses, tourist consumption, residuals and stock changes."""
    wide = (
        rows[rows["element_code"].isin(ELEMENTS)]
        .pivot_table(
            index=["area_code", "item_code"], columns="element_code", values="value", aggfunc="sum"
        )
        .rename(columns=ELEMENTS)
        .reindex(columns=list(ELEMENTS.values()))
        .fillna(0.0)
        * 1000
    )
    uses = wide[["food", "feed", "losses", "processing", "seed"]].sum(axis=1)
    return wide.assign(other=wide["production"] + wide["imports"] - wide["exports"] - uses)


def latest_years(fbs: pd.DataFrame, missing: set[int]) -> dict[int, int]:
    """The latest year each missing area has a balance in `fbs`."""
    rows = fbs[(fbs["element_code"] == FOOD) & fbs["area_code"].isin(missing)]
    return rows.groupby("area_code")["year"].max().astype(int).to_dict()


def scaled(rows: pd.DataFrame, factor: float) -> pd.DataFrame:
    return rows.assign(value=rows["value"] * factor)


def gap_filled(
    fbs: pd.DataFrame,
    fbsh: pd.DataFrame,
    population: pd.DataFrame,
    year: int,
    item_codes: dict[int, int],
) -> tuple[pd.DataFrame, dict[int, str]]:
    """Base-year FBS rows of every country, plus, for countries without a base-year balance, their
    latest balance (current FBS first, then the historic one) scaled by population growth since.

    Returns the rows and, for each filled country, where its balance came from."""
    present = set(
        countries_only(fbs[(fbs["year"] == year) & (fbs["element_code"] == FOOD)])["area_code"]
    )
    wanted = {a for a in population.index if a not in present}
    from_current = latest_years(fbs, wanted)
    from_historic = latest_years(fbsh, wanted - set(from_current))
    historic = fbsh.assign(item_code=fbsh["item_code"].replace(item_codes))

    def filled(source: pd.DataFrame, area: int, y: int) -> pd.DataFrame:
        rows = source[(source["area_code"] == area) & (source["year"] == y)]
        return scaled(rows, population.at[area, year] / population.at[area, y])

    fills = [filled(fbs, a, y) for a, y in from_current.items()] + [
        filled(historic, a, y) for a, y in from_historic.items()
    ]
    notes = {a: f"FBS {y}" for a, y in from_current.items()} | {
        a: f"historic FBS {y}" for a, y in from_historic.items()
    }
    base = fbs[(fbs["year"] == year) & fbs["area_code"].isin(present | {WORLD})]
    return pd.concat([base, *fills], ignore_index=True).assign(year=year), notes


def supply_json(table: pd.DataFrame, iso3: dict[int, str], kept: set[int]) -> dict:
    """byCountry[iso3][itemCode] = SupplyRow, whole tonnes; all-zero rows omitted."""
    rows = table[table.index.get_level_values("item_code").isin(kept)].round(0)
    rows = rows[(rows != 0).any(axis=1)]
    return {
        iso3[area]: {
            str(item): {f: int(values[f]) for f in FIELDS}
            for item, values in country.droplevel("area_code").iterrows()
        }
        for area, country in rows.groupby(level="area_code")
        if area in iso3
    }


def world_nutrients(fbs_year: pd.DataFrame) -> pd.DataFrame:
    """World food (t), kcal and protein (t) by item, for the per-tonne contents."""
    world = fbs_year[fbs_year["area_code"] == WORLD]
    wide = world.pivot_table(
        index="item_code", columns="element_code", values="value", aggfunc="sum"
    )
    return pd.DataFrame(
        {
            "food": wide.get(FOOD, 0) * 1000,
            "kcal": wide.get(KCAL, 0) * 1e6,
            "protein": wide.get(PROTEIN, 0),
        }
    ).fillna(0.0)
