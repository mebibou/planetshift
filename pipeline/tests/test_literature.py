from pathlib import Path

import pandas as pd
import pytest

from planetshift_pipeline.sources import hestia, literature

CACHE = Path(__file__).resolve().parents[1] / "cache"


def test_split_keeps_the_co2e_and_the_profile():
    gases = literature.split(100.0, {"co2": 10.0, "ch4": 1.0, "n2o": 0.1})
    assert literature.co2e(gases) == pytest.approx(100.0)
    assert gases["ch4"] / gases["co2"] == pytest.approx(0.1)
    assert gases["n2o"] / gases["co2"] == pytest.approx(0.01)


def test_split_of_an_empty_profile_is_zero():
    assert literature.split(5.0, {"co2": 0.0, "ch4": 0.0, "n2o": 0.0}) == {
        "co2": 0.0,
        "ch4": 0.0,
        "n2o": 0.0,
    }


def test_hestia_profiles_prefer_world_then_average_countries():
    rows = pd.DataFrame(
        [
            {
                "fbs_item_code": 1,
                "area": "World",
                "scope": "farmGate",
                "co2": 1,
                "ch4": 1,
                "n2o": 1,
            },
            {"fbs_item_code": 1, "area": "FRA", "scope": "farmGate", "co2": 9, "ch4": 9, "n2o": 9},
            {"fbs_item_code": 2, "area": "FRA", "scope": "farmGate", "co2": 2, "ch4": 0, "n2o": 0},
            {"fbs_item_code": 2, "area": "IND", "scope": "farmGate", "co2": 4, "ch4": 2, "n2o": 0},
        ]
    )
    profiles = literature.hestia_profiles(rows)
    assert profiles[(1, "farmGate")] == {"co2": 1, "ch4": 1, "n2o": 1}
    assert profiles[(2, "farmGate")] == {"co2": 3, "ch4": 1, "n2o": 0}


def test_faostat_profiles_sum_on_farm_elements_of_the_latest_world_year():
    emissions = pd.DataFrame(
        [
            {"Area Code": 5000, "Element Code": 72254, "Item": "Swine", "Year": 2022, "Value": 3.0},
            {"Area Code": 5000, "Element Code": 72256, "Item": "Swine", "Year": 2022, "Value": 2.0},
            {"Area Code": 5000, "Element Code": 72300, "Item": "Swine", "Year": 2022, "Value": 1.0},
            {"Area Code": 5000, "Element Code": 72301, "Item": "Swine", "Year": 2022, "Value": 7.0},
            {"Area Code": 5000, "Element Code": 72254, "Item": "Swine", "Year": 2021, "Value": 9.0},
            {"Area Code": 4, "Element Code": 72254, "Item": "Swine", "Year": 2022, "Value": 9.0},
        ]
    )
    assert literature.faostat_profiles(emissions) == {"Swine": {"co2": 0.0, "ch4": 5.0, "n2o": 1.0}}


def test_scoped_crop_splits_the_farm_stage_by_the_hestia_profile():
    cradle = {"co2": 100.0, "ch4": 1.0, "n2o": 1.0}
    gate = {"co2": 50.0, "ch4": 1.0, "n2o": 1.0}
    profiles = {(2511, "cradleToFarmGate"): cradle, (2511, "farmGate"): gate}
    result = literature.scoped(0.8, "hestia:2511", profiles, {})
    assert literature.co2e(result["cradleToFarmGate"]) == pytest.approx(0.8)
    ratio = literature.co2e(gate) / literature.co2e(cradle)
    assert literature.co2e(result["farmGate"]) == pytest.approx(0.8 * ratio)
    assert result["farmGate"]["co2"] / result["farmGate"]["ch4"] == pytest.approx(50.0)


def test_scoped_animal_uses_the_faostat_profile_for_both_scopes():
    result = literature.scoped(
        34.0, "faostat:Swine", {}, {"Swine": {"co2": 0.0, "ch4": 1.0, "n2o": 0.0}}
    )
    assert (
        result["farmGate"]
        == result["cradleToFarmGate"]
        == pytest.approx({"co2": 0.0, "ch4": 1.0, "n2o": 0.0})
    )


def test_scoped_without_a_profile_is_empty():
    assert literature.scoped(1.0, "hestia:2511", {}, {}) == {}
    assert literature.scoped(1.0, "faostat:Swine", {}, {}) == {}


def test_rows_convert_to_the_fbs_quantity_and_combine_by_weight():
    terms = pd.DataFrame(
        [
            {
                "fbs_item_code": 2731,
                "farm_kg_co2e_per_kg": 34.0,
                "weight_kt": 3.0,
                "kg_product_per_kg_item": 1.0,
                "gas_profile": "faostat:A",
            },
            {
                "fbs_item_code": 2731,
                "farm_kg_co2e_per_kg": 68.0,
                "weight_kt": 1.0,
                "kg_product_per_kg_item": 1.0,
                "gas_profile": "faostat:A",
            },
            {
                "fbs_item_code": 2807,
                "farm_kg_co2e_per_kg": 34.0,
                "weight_kt": 1.0,
                "kg_product_per_kg_item": 0.5,
                "gas_profile": "faostat:A",
            },
        ]
    )
    rows = literature.literature_rows(terms, {}, {"A": {"co2": 0.0, "ch4": 1.0, "n2o": 0.0}})
    combined = literature.combine(rows)
    assert list(combined.columns) == hestia.COLUMNS
    assert set(combined.area) == {"World"}
    by = combined.set_index(["fbs_item_code", "scope"])
    assert by.loc[(2731, "farmGate"), "ch4"] == pytest.approx((3 * 1000 + 1 * 2000) / 4)
    assert by.loc[(2807, "farmGate"), "ch4"] == pytest.approx(500)


def test_terms_table_is_well_formed():
    terms = literature.load_terms()
    assert (terms.farm_kg_co2e_per_kg > 0).all()
    assert (terms.weight_kt > 0).all()
    assert (terms.kg_product_per_kg_item > 0).all()
    assert terms.gas_profile.str.match(r"^(hestia:\d+|faostat:.+)$").all()
    assert terms.note.notna().all()


@pytest.mark.network
def test_fetch_literature_intensities_is_plausible():
    if not (CACHE / "hestia" / hestia.RELEASE / "aggregations.json").exists():
        pytest.skip("HESTIA cache not filled")
    if not (CACHE / "Emissions_livestock_E_All_Data_(Normalized).zip").exists():
        pytest.skip("FAOSTAT livestock emissions not downloaded")
    rows = literature.fetch_literature_intensities(CACHE)
    assert (rows[list(literature.GASES)] >= 0).all().all()
    gate = rows[rows.scope == "farmGate"].set_index("fbs_item_code")
    assert gate.loc[2731, "ch4"] > 50 * gate.loc[2511, "ch4"]
    assert gate.loc[2807, "ch4"] > gate.loc[2511, "ch4"]
    assert gate.loc[2848, "ch4"] > gate.loc[2744, "ch4"]
    beef_co2e = literature.co2e(gate.loc[2731, list(literature.GASES)])
    assert 15_000 < beef_co2e < 40_000
