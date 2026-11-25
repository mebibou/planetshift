import re
from pathlib import Path

import pandas as pd
import pytest

from planetshift_pipeline import against_literature as A
from planetshift_pipeline.build import OUT_DIR

DOCS = Path(__file__).resolve().parents[2] / "docs" / "methodology"
#: The table's rows in emissions.md, by language, and the item each compares.
ROWS = {
    "en": {
        "Beef": 2731,
        "Sheep and goat meat": 2732,
        "Pig meat": 2733,
        "Poultry meat": 2734,
        "Eggs": 2744,
        "Milk": 2848,
        "Rice (paddy)": 2807,
        "Wheat": 2511,
        "Maize": 2514,
        "Potatoes": 2531,
        "Peas": 2547,
    },
    "fr": {
        "Bœuf": 2731,
        "Viande ovine et caprine": 2732,
        "Viande de porc": 2733,
        "Volaille": 2734,
        "Œufs": 2744,
        "Lait": 2848,
        "Riz (paddy)": 2807,
        "Blé": 2511,
        "Maïs": 2514,
        "Pommes de terre": 2531,
        "Pois": 2547,
    },
}


def test_world_intensities_weigh_the_countries_by_production_in_kg_per_kg():
    by_country = {
        "AAA": {"1": {"cradleToFarmGate": {"kgPerTonne": {"co2": 100.0, "ch4": 10.0}}}},
        "BBB": {"1": {"cradleToFarmGate": {"kgPerTonne": {"co2": 400.0, "ch4": 0.0, "n2o": 1.0}}}},
        "CCC": {"1": {"cradleToFarmGate": {"kgPerTonne": {"co2": 9e9, "ch4": 0.0, "n2o": 0.0}}}},
    }
    supply = {"AAA": {"1": {"production": 3}}, "BBB": {"1": {"production": 1}}, "CCC": {}}
    world = A.world_intensities(by_country, supply)
    assert world.loc[1].to_dict() == pytest.approx({"co2": 0.175, "ch4": 0.0075, "n2o": 0.00025})


def test_literature_farm_converts_to_the_item_and_averages_its_products_by_weight():
    terms = pd.DataFrame(
        {
            "fbs_item_code": [1, 1, 2],
            "farm_kg_co2e_per_kg": [40.0, 20.0, 3.0],
            "kg_product_per_kg_item": [1.0, 1.0, 0.5],
            "weight_kt": [1.0, 3.0, 7.0],
        }
    )
    assert A.literature_farm(terms).to_dict() == pytest.approx({1: 25.0, 2: 1.5})


def test_comparison_moves_their_total_to_ar6_with_the_items_gas_mix():
    world = pd.DataFrame({"co2": [0.0, 1.0], "ch4": [1.0, 0.0], "n2o": [0.0, 0.0]}, index=[1, 2])
    rows = A.comparison(world, pd.Series({1: 68.0, 2: 2.0, 3: 5.0})).to_dict("index")
    assert set(rows) == {1, 2}
    assert rows[1] == pytest.approx({"planetshift": 27, "pn_ar5": 68, "pn_ar6": 54, "ratio": 0.5})
    assert rows[2] == pytest.approx({"planetshift": 1, "pn_ar5": 2, "pn_ar6": 2, "ratio": 0.5})


def table(language: str) -> dict[int, list[float]]:
    """The numbers of each row of the table, by item."""
    text = (DOCS / language / "emissions.md").read_text()
    cells = {
        m[1].strip(): [float(v.replace(",", ".")) for v in re.findall(r"\d+(?:[.,]\d+)?", m[2])]
        for m in re.finditer(r"^\| ([^|]+) \|((?: [^|]+ \|){4})$", text, re.MULTILINE)
    }
    return {code: cells[label] for label, code in ROWS[language].items() if label in cells}


@pytest.mark.parametrize("language", ["en", "fr"])
def test_the_methodology_table_matches_the_built_data(language):
    if not (OUT_DIR / "intensities.json").exists():
        pytest.skip("not built: intensities.json")
    built = A.built_comparison()
    rows = table(language)
    assert set(rows) == set(ROWS[language].values())
    for code, numbers in rows.items():
        expected = built.loc[code, ["planetshift", "pn_ar5", "pn_ar6", "ratio"]]
        assert numbers == pytest.approx(list(expected), rel=0.006, abs=0.006), code
