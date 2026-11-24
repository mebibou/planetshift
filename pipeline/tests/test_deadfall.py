import pandas as pd
import pytest

from planetshift_pipeline import deadfall as D
from planetshift_pipeline import seafood as SF

TABLE = D.load()
LARGE = ["Tunas, bonitos, billfishes", "Miscellaneous pelagic fishes", "Sharks, rays, chimaeras"]


def rows(*data):
    return pd.DataFrame(
        data, columns=["iso3", "year", "isscaap_group", "inland", "system", "tonnes"]
    )


def test_counts_the_three_large_pelagic_groups_with_mariani_range():
    isscaap = SF.load_isscaap().set_index("isscaap_group")
    assert sorted(TABLE["isscaap_group"].unique()) == sorted(LARGE)
    assert set(isscaap.loc[LARGE, "capture_group"]) == {"largePelagic"}
    assert TABLE["sinking_fraction"].min() == 0.288
    assert TABLE["sinking_fraction"].max() == 0.946


def test_the_taxa_add_up_to_mariani_carbon_not_sequestered():
    share = (TABLE["sinking_fraction"] * TABLE["carbon_share"]).sum() / TABLE["carbon_share"].sum()
    assert share == pytest.approx(21.8 / 39.9, abs=0.002)


def test_factor_per_tonne_of_catch():
    per_t = D.stored_per_tonne(D.group_fractions(TABLE))
    full = 0.125 * 44 / 12
    assert per_t["Sharks, rays, chimaeras"] == pytest.approx(0.44 * 0.946 * full)
    assert per_t["Miscellaneous pelagic fishes"] == pytest.approx(0.44 * 0.288 * full)
    tuna = (0.605 * 0.562 + 0.89 * 0.019) / (0.562 + 0.019)
    assert per_t["Tunas, bonitos, billfishes"] == pytest.approx(0.44 * tuna * full)
    assert D.stored_per_tonne(D.group_fractions(TABLE), 1.0).max() < full


def test_per_item_weighs_large_pelagic_catch_at_sea_against_the_item():
    fishstat = rows(
        ("JPN", 2023, "Tunas, bonitos, billfishes", False, "capture", 30.0),
        ("JPN", 2023, "Herrings, sardines, anchovies", False, "capture", 60.0),
        ("JPN", 2023, "Miscellaneous pelagic fishes", False, "aquaculture", 10.0),
        ("JPN", 2023, "Cods, hakes, haddocks", False, "capture", 50.0),
        ("FRA", 2023, "Miscellaneous pelagic fishes", True, "capture", 5.0),
    )
    out = D.per_item(fishstat, 2023, {"JPN", "FRA"})
    per_t = D.stored_per_tonne(D.group_fractions(TABLE))
    assert out["JPN"]["2763"] == pytest.approx(
        30 / 100 * per_t["Tunas, bonitos, billfishes"] * 1000, abs=1e-3
    )
    assert "2762" not in out["JPN"]
    assert "FRA" not in out


def test_json_states_its_assumptions():
    data = D.deadfall_json({"JPN": {"2763": 1.0}})
    assert data["deepWaterShare"] == D.DEEP_WATER_SHARE
    assert data["buildUpYears"] == 10
    assert data["source"] == D.MARIANI
