"""Planetshift's world intensities against Poore & Nemecek's (2018) farm stage, the table in
docs/methodology/en/emissions.md (*Per kilogram, against Poore and Nemecek*). Run with
`uv run python -m planetshift_pipeline.against_literature` after a build.

Both are in kg CO₂e per kg of the FAOSTAT item (carcass weight, grain, paddy), the unit of their
data S2 that `literature_terms.csv` keeps, not the retail product Our World in Data shows. They
weigh methane and N₂O with AR5's factors with climate-carbon feedbacks; their totals give no
split by gas, so each is moved to AR6's with the item's gas mix in Planetshift.
"""

import json

import pandas as pd

from .build import OUT_DIR
from .intensities import GASES
from .intensities import GWP100 as AR6
from .sources.literature import GWP100 as AR5
from .sources.literature import load_terms

SCOPE = "cradleToFarmGate"


def world_intensities(by_country: dict, supply: dict) -> pd.DataFrame:
    """kg of each gas per kg of each item (index fbs_code), cradle to farm gate, the countries'
    average weighted by their production."""
    rows = pd.DataFrame(
        [
            {
                "fbs_code": int(code),
                "t": supply[iso][code]["production"],
                **cells[SCOPE]["kgPerTonne"],
            }
            for iso, items in by_country.items()
            for code, cells in items.items()
            if supply.get(iso, {}).get(code, {}).get("production", 0) > 0
        ]
    ).fillna(dict.fromkeys(GASES, 0.0))
    sums = rows[list(GASES)].mul(rows["t"], axis=0).assign(fbs_code=rows["fbs_code"], t=rows["t"])
    totals = sums.groupby("fbs_code").sum()
    return totals[list(GASES)].div(totals["t"], axis=0) / 1000


def literature_farm(terms: pd.DataFrame) -> pd.Series:
    """Their farm stage per kg of each item (index fbs_code), kg CO₂e with AR5's factors, the
    item's products averaged by their weight."""
    value = terms["farm_kg_co2e_per_kg"] * terms["kg_product_per_kg_item"] * terms["weight_kt"]
    sums = terms.assign(value=value).groupby("fbs_item_code")[["value", "weight_kt"]].sum()
    return (sums["value"] / sums["weight_kt"]).rename_axis("fbs_code")


def co2e(gases: pd.DataFrame, gwp: dict) -> pd.Series:
    return gases[list(GASES)].mul(pd.Series(gwp)).sum(axis=1)


def comparison(world: pd.DataFrame, literature: pd.Series) -> pd.DataFrame:
    """For each item in both: Planetshift's CO₂e, theirs with AR5's and with AR6's factors, and
    the ratio of Planetshift's to theirs with AR6's."""
    both = world.loc[world.index.intersection(literature.index)]
    ours = co2e(both, AR6)
    theirs = literature.loc[both.index] * ours / co2e(both, AR5)
    return pd.DataFrame(
        {
            "planetshift": ours,
            "pn_ar5": literature.loc[both.index],
            "pn_ar6": theirs,
            "ratio": ours / theirs,
        }
    )


def built_comparison() -> pd.DataFrame:
    intensities = json.loads((OUT_DIR / "intensities.json").read_text())
    supply = json.loads((OUT_DIR / "supply.json").read_text())
    return comparison(
        world_intensities(intensities["byCountry"], supply["byCountry"]),
        literature_farm(load_terms()),
    )


if __name__ == "__main__":
    print(built_comparison().round(3).to_string())
