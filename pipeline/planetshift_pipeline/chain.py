"""Food's emissions after the farm, by country and food (chain.json).

FAOSTAT's emissions from pre- and post-production give each country's CO₂, CH₄ and N₂O by stage.
Processing, transport, packaging and retail are shared between foods by Poore & Nemecek (2018)'s
emissions per kg of each food at that stage, times its production; cooking at home, food waste
and wastewater by mass. The manufacture of fertilisers and pesticides is left out, as it is
counted on the farm, and the cold chain's fluorinated gases, which the model does not carry.
"""

from pathlib import Path

import pandas as pd

from .intensities import significant

HERE = Path(__file__).resolve().parent.parent
ITEMS_CSV = HERE / "chain_items.csv"

#: FAOSTAT GPP items shared between foods by Poore & Nemecek's stage of the same name.
SHARED = {6507: "processing", 6815: "transport", 6506: "packaging", 6508: "retail"}
#: FAOSTAT GPP items shared between foods by mass: cooking at home, food waste (solid waste,
#: incineration and the food industry's wastewater) and domestic wastewater.
BY_MASS = {6505: "household", 6987: "waste", 6990: "waste", 6989: "waste", 6988: "wastewater"}
STAGES = (*dict.fromkeys(SHARED.values()), *dict.fromkeys(BY_MASS.values()))
GASES = {7273: "co2", 7225: "ch4", 7230: "n2o"}
KG_PER_KT = 1e6


def load_items(path: Path = ITEMS_CSV) -> pd.DataFrame:
    return pd.read_csv(path, dtype={"fbs_code": int}).fillna({"note": ""})


def weights(items: pd.DataFrame, stages: pd.DataFrame) -> pd.DataFrame:
    """Poore & Nemecek's kg CO₂e per kg of each item at each shared stage (index fbs_code)."""
    missing = sorted(set(items["product"]) - set(stages.index))
    if missing:
        raise ValueError(f"chain_items.csv names foods Our World in Data does not have: {missing}")
    shared = list(dict.fromkeys(SHARED.values()))
    return items.set_index("fbs_code")[["product"]].join(stages[shared], on="product")[shared]


def stage_kg(gpp: pd.DataFrame, year: int) -> pd.DataFrame:
    """kg of each gas by area and stage, in each area's latest year up to `year`."""
    stage_of = {**SHARED, **BY_MASS}
    rows = gpp[
        gpp["item_code"].isin(stage_of) & gpp["element_code"].isin(GASES) & (gpp["year"] <= year)
    ].dropna(subset=["value"])
    latest = rows[rows["year"] == rows.groupby("area_code")["year"].transform("max")]
    return (
        latest.assign(
            stage=latest["item_code"].map(stage_of),
            gas=latest["element_code"].map(GASES),
            kg=latest["value"] * KG_PER_KT,
        )
        .groupby(["area_code", "stage", "gas"], as_index=False)["kg"]
        .sum()
    )


def denominators(production: pd.DataFrame, w: pd.DataFrame) -> pd.DataFrame:
    """By area and stage: tonnes of production weighted by each item's stage weight, or plain
    tonnes for the stages shared by mass. `production` has area_code, fbs_code and t."""
    p = production[production["fbs_code"].isin(w.index)]
    weighted = p.join(w, on="fbs_code")
    shared = [
        weighted.assign(stage=s, t=weighted["t"] * weighted[s])[["area_code", "stage", "t"]]
        for s in dict.fromkeys(SHARED.values())
    ]
    mass = [p.assign(stage=s)[["area_code", "stage", "t"]] for s in dict.fromkeys(BY_MASS.values())]
    return pd.concat([*shared, *mass]).groupby(["area_code", "stage"], as_index=False)["t"].sum()


def factors(kg: pd.DataFrame, denominator: pd.DataFrame) -> pd.DataFrame:
    """kg of each gas per weighted tonne, by area and stage, where both are known."""
    both = kg.merge(denominator, on=["area_code", "stage"])
    both = both[both["t"] > 0]
    return both.assign(per_t=both["kg"] / both["t"])[["area_code", "stage", "gas", "per_t"]]


def nested(f: pd.DataFrame) -> dict:
    """{stage: {gas: kg per weighted tonne}}, three significant figures, gases left out at 0."""
    return {
        stage: {r.gas: significant(float(r.per_t), 3) for r in g.itertuples() if r.per_t > 0}
        for stage, g in f.groupby("stage")
    }


def chain_json(
    f: pd.DataFrame, world: pd.DataFrame, w: pd.DataFrame, iso3: dict[int, str], year: int
) -> dict:
    """weights[code][stage]: P&N's kg CO₂e per kg; byCountry[iso3][stage][gas] and world: kg per
    weighted tonne. A food's kg of a gas per tonne at a stage is the country's factor times its
    weight (1 for the stages shared by mass)."""
    rows = f[f["area_code"].isin(iso3)]
    return {
        "year": year,
        "weights": {
            str(code): {s: significant(float(v), 3) for s, v in row.items()}
            for code, row in w.iterrows()
        },
        "byCountry": {
            iso3[area]: nested(g)
            for area, g in sorted(rows.groupby("area_code"), key=lambda kv: iso3[kv[0]])
        },
        "world": nested(world),
    }


def world_factors(
    kg: pd.DataFrame, denominator: pd.DataFrame, iso3: dict[int, str]
) -> pd.DataFrame:
    """The model's countries together, for a country FAOSTAT gives no figures for."""
    own = kg[kg["area_code"].isin(iso3)].groupby(["stage", "gas"], as_index=False)["kg"].sum()
    d = denominator[denominator["area_code"].isin(iso3)].groupby("stage", as_index=False)["t"].sum()
    return factors(own.assign(area_code=0), d.assign(area_code=0))
