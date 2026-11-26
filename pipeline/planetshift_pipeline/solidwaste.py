"""Municipal solid waste by country (What a Waste 3.0) and plastic reaching the ocean (Meijer et
al. 2021): the data of the map's waste layers and the Waste chart. No lever changes them."""

import pandas as pd

from .sources import ocean_plastic as P
from .sources import what_a_waste as A

TYPES = list(A.TYPES)
TREATMENTS = [*A.TREATMENTS, "uncollected"]


def shares_of(table: pd.DataFrame, prefix: str, names: list[str]) -> pd.DataFrame:
    return table[[f"{prefix}{n}" for n in names]].set_axis(names, axis=1)


def income_filled(
    shares: pd.DataFrame, tonnes: pd.Series, income: pd.Series
) -> tuple[pd.DataFrame, list[str]]:
    """Each country's shares, or where it has none, its income group's, weighted by tonnes (the
    world's for a country without a group). Returns the shares and the countries filled."""
    known = shares.dropna()
    weights = tonnes.reindex(known.index)

    def mean(rows: pd.DataFrame) -> pd.Series:
        w = weights.reindex(rows.index)
        return rows.mul(w, axis=0).sum() / w.sum()

    world = mean(known)
    by_group = known.groupby(income.reindex(known.index)).apply(mean)
    missing = shares.index[shares.isna().any(axis=1)]
    fill = pd.DataFrame(
        [by_group.loc[g] if g in by_group.index else world for g in income.reindex(missing)],
        index=missing,
    )
    return shares.fillna(fill), sorted(missing)


def solidwaste_json(table: pd.DataFrame) -> dict:
    """byCountry[iso3]: tonnes in YEAR, kg per person, income group, the shares of each type and
    treatment and which of them were filled from the income group."""
    rows = table.dropna(subset=["tonnes"])
    types, types_filled = income_filled(
        shares_of(rows, "type_", TYPES), rows["tonnes"], rows["income"]
    )
    treatment, treatment_filled = income_filled(
        shares_of(rows, "treatment_", TREATMENTS), rows["tonnes"], rows["income"]
    )

    def country(iso3: str, r: pd.Series) -> dict:
        filled = [
            n for n, f in (("types", types_filled), ("treatment", treatment_filled)) if iso3 in f
        ]
        return {
            "tonnes": round(float(r["tonnes"])),
            "kgPerPerson": round(float(r["tonnes"]) * 1000 / float(r["people"]), 1),
            **({"income": r["income"]} if isinstance(r["income"], str) else {}),
            "types": {n: round(float(types.loc[iso3, n]), 4) for n in TYPES},
            "treatment": {n: round(float(treatment.loc[iso3, n]), 4) for n in TREATMENTS},
            **({"filled": filled} if filled else {}),
        }

    return {
        "year": A.YEAR,
        "byCountry": {iso3: country(iso3, r) for iso3, r in rows.sort_index().iterrows()},
        "source": f"World Bank, What a Waste {A.VERSION}, {A.PAGE}",
    }


def oceanplastic_json(year: int, tonnes: pd.Series) -> dict:
    """byCountry[iso3]: plastic reaching the ocean through rivers, tonnes a year."""
    return {
        "year": year,
        "byCountry": {iso3: round(float(t), 1) for iso3, t in tonnes.sort_index().items()},
        "source": f"Meijer et al. (2021), Science Advances 7, eaaz5803, {P.ARTICLE}",
    }
