"""Food Balance Sheet items: the group each belongs to, and what is left out (groups.csv)."""

from pathlib import Path

import pandas as pd

GROUPS_CSV = Path(__file__).resolve().parent.parent / "groups.csv"
OUT = "out"

ANIMAL_GROUPS = ("ruminantMeat", "pigMeat", "poultryMeat", "dairy", "eggs", "seafood")
PLANT_GROUPS = (
    "cereals",
    "rice",
    "pulses",
    "oilCrops",
    "vegetables",
    "fruit",
    "rootsTubers",
    "sugarCrops",
    "nuts",
    "stimulants",
    "otherPlant",
)

#: FBS totals and sub-totals have codes from 2900 up; 2501 is the population row.
FIRST_TOTAL_CODE = 2900
POPULATION_CODE = 2501


def is_total(code: int) -> bool:
    return code >= FIRST_TOTAL_CODE or code == POPULATION_CODE


def load(path: Path = GROUPS_CSV) -> pd.DataFrame:
    df = pd.read_csv(path, dtype={"fbs_code": int})
    return df.assign(animal=df["animal"].astype(str).str.lower() == "true")


def kept(groups: pd.DataFrame) -> pd.DataFrame:
    return groups[groups["group"] != OUT]


def byproducts(groups: pd.DataFrame) -> dict[int, str]:
    """By-products whose farm emissions are counted on the item they come from, with the note."""
    rows = groups[groups["note"].fillna("").str.contains("counted on")]
    return dict(zip(rows["fbs_code"], rows["note"], strict=True))


def unmapped(items_with_production: pd.Series, groups: pd.DataFrame) -> list[int]:
    """FBS item codes with production that groups.csv does not list."""
    known = set(groups["fbs_code"])
    return sorted(c for c in items_with_production.index if c not in known and not is_total(c))


def item_records(
    groups: pd.DataFrame, world: pd.DataFrame, names_en: dict, names_fr: dict
) -> list[dict]:
    """Item rows; kcal and protein per tonne of food from the world balance.

    `world` is indexed by FBS item code with columns food (t), kcal (kcal), protein (t).
    """

    def ratio(code: int, column: str) -> float:
        food = world["food"].get(code, 0.0)
        return float(world[column].get(code, 0.0) / food) if food > 0 else 0.0

    return [
        {
            "code": int(row.fbs_code),
            "name": {
                "en": names_en.get(row.fbs_code, row.fbs_item),
                "fr": names_fr.get(row.fbs_code, names_en.get(row.fbs_code, row.fbs_item)),
            },
            "group": row.group,
            "animal": bool(row.animal),
            "kcalPerTonne": round(ratio(row.fbs_code, "kcal")),
            "proteinPerTonne": round(ratio(row.fbs_code, "protein"), 4),
        }
        for row in kept(groups).sort_values("fbs_code").itertuples()
    ]
