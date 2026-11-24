"""FAOSTAT areas to countries: ISO3 codes, regions, names and population."""

import pandas as pd

#: FAOSTAT area codes from 5000 up are regions and other groups of countries.
FIRST_GROUP_CODE = 5000

#: Areas below 5000 that are themselves the sum of other listed areas. Kept out so that
#: nothing is counted twice: "China" is mainland China + Hong Kong + Macao + Taiwan,
#: each of which FAOSTAT also lists on its own.
AGGREGATE_AREAS = {351: "China (mainland, Hong Kong, Macao and Taiwan, each listed on its own)"}

#: Areas that no longer exist, listed under their successors in the years we use.
FORMER_AREAS = {
    15: "Belgium-Luxembourg",
    51: "Czechoslovakia",
    62: "Ethiopia PDR",
    151: "Netherlands Antilles (former)",
    164: "Pacific Islands Trust Territory",
    186: "Serbia and Montenegro",
    206: "Sudan (former)",
    228: "USSR",
    248: "Yugoslav SFR",
}

#: FAOSTAT M49 codes Natural Earth has no feature for (French overseas departments are
#: drawn within France, the others are too small for the 1:50m map).
M49_TO_ISO3 = {
    "254": "GUF",
    "292": "GIB",
    "312": "GLP",
    "474": "MTQ",
    "175": "MYT",
    "535": "BES",
    "638": "REU",
    "772": "TKL",
}

#: Natural Earth's sub-regions renamed to FAOSTAT's (M49) names; islands Natural Earth
#: files under "Seven seas (open ocean)" get their M49 sub-region.
SUBREGION_NAMES = {"South-Eastern Asia": "South-eastern Asia"}
REGION_OVERRIDES = {
    "BES": "Caribbean",
    "GIB": "Southern Europe",
    "GLP": "Caribbean",
    "GUF": "South America",
    "MDV": "Southern Asia",
    "MTQ": "Caribbean",
    "MUS": "Eastern Africa",
    "MYT": "Eastern Africa",
    "REU": "Eastern Africa",
    "SYC": "Eastern Africa",
    "TKL": "Polynesia",
}


def is_country(area_code: int) -> bool:
    return (
        area_code < FIRST_GROUP_CODE
        and area_code not in AGGREGATE_AREAS
        and area_code not in FORMER_AREAS
    )


def countries_only(df: pd.DataFrame) -> pd.DataFrame:
    """Rows of single countries: no regions, no aggregates such as "China", no former areas."""
    return df[df["area_code"].map(is_country).astype(bool)]


def iso3_by_m49(ne: pd.DataFrame) -> dict[str, str]:
    from_ne = {
        str(n).zfill(3): iso3
        for n, iso3 in zip(ne["iso_n3"], ne["iso3"], strict=True)
        if n and n != "-99"
    }
    return from_ne | M49_TO_ISO3


def region_by_iso3(ne: pd.DataFrame) -> dict[str, str]:
    from_ne = {
        iso3: SUBREGION_NAMES.get(sub, sub)
        for iso3, sub in zip(ne["iso3"], ne["subregion"], strict=True)
        if sub and not sub.startswith("Seven seas")
    }
    return from_ne | REGION_OVERRIDES


def area_table(areas: pd.DataFrame, iso3_of_m49: dict[str, str]) -> pd.DataFrame:
    """One row per country area: FAO code, M49, name and ISO3 (missing when unknown)."""
    rows = countries_only(areas)[["area_code", "m49", "area"]].drop_duplicates("area_code")
    return rows.assign(iso3=rows["m49"].map(iso3_of_m49))


def population(oa: pd.DataFrame, first_year: int, last_year: int) -> pd.DataFrame:
    """Total population (people) by FAO area code and year, UN WPP estimates then medium variant."""
    rows = oa[
        (oa["item_code"] == 3010)
        & (oa["element_code"] == 511)
        & oa["year"].between(first_year, last_year)
    ]
    return rows.pivot_table(index="area_code", columns="year", values="value", aggfunc="sum") * 1000


def country_records(
    table: pd.DataFrame,
    names_fr: dict[int, str],
    regions: dict[str, str],
    rich: set[str],
    pop: pd.DataFrame,
) -> list[dict]:
    return [
        {
            "iso3": row.iso3,
            "fao": int(row.area_code),
            "name": {"en": row.area, "fr": names_fr.get(row.area_code, row.area)},
            "region": regions.get(row.iso3, "World"),
            "highIncome": row.iso3 in rich,
            "population": {
                str(year): int(round(value))
                for year, value in pop.loc[row.area_code].items()
                if pd.notna(value)
            },
        }
        for row in table.sort_values("iso3").itertuples()
        if row.area_code in pop.index
    ]
