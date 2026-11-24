import json
from pathlib import Path

import pandas as pd
import pytest

from planetshift_pipeline import landuse as U

OUT = Path(__file__).resolve().parent.parent.parent / "app" / "public" / "data"


def sheet(rows: dict[int, dict[str, float]]) -> pd.DataFrame:
    df = pd.DataFrame.from_dict(rows, orient="index")
    countries = df.drop(columns=["EU27"], errors="ignore")
    return df.assign(Global=countries.sum(axis=1))


def test_the_world_total_is_the_countries_and_the_unassigned_columns():
    s = sheet({2020: {"Brazil": 300.0, "China": -50.0, "OTHER": 1.0, "EU27": -10.0}})
    assert U.check_total(s) == pytest.approx(0.0)


def test_countries_that_do_not_add_up_are_refused():
    s = sheet({2020: {"Brazil": 300.0, "China": -50.0, "EU27": 0.0}}).assign(Global=400.0)
    with pytest.raises(ValueError, match="world total"):
        U.check_total(s)


def test_the_mean_is_over_the_years_and_models_in_tonnes_of_co2():
    a = sheet({2019: {"Brazil": 99.0}, 2020: {"Brazil": 1.0}, 2021: {"Brazil": 3.0}})
    b = sheet({2020: {"Brazil": 4.0}, 2021: {"Brazil": 4.0}})
    mean = U.mean_co2({"A": a, "B": b}, (2020, 2021))
    assert mean["Brazil"] == pytest.approx(3.0 * 44 / 12 * 1e6)
    assert mean["Global"] == pytest.approx(mean["Brazil"])


def test_countries_are_named_by_iso3_and_keep_their_sinks():
    mean = pd.Series({"Brazil": 1.4e9, "China": -2.2e8, "Andorra": 5.0, "Global": 1.2e9})
    data = U.by_country(mean, {"Brazil": "BRA", "China": "CHN", "Andorra": "AND"}, {"BRA", "CHN"})
    assert data == {"BRA": 1_400_000_000, "CHN": -220_000_000}


def test_columns_with_no_iso3_are_reported_but_not_aggregates():
    mean = pd.Series({"Brazil": 1.0, "Atlantis": 2.0, "EU27": 3.0, "OTHER": 4.0, "Global": 5.0})
    assert list(U.unnamed(mean, {"Brazil": "BRA"}).index) == ["Atlantis"]


def test_the_aliases_name_each_country_once():
    names = pd.read_csv(U.NAMES_CSV)
    assert names["name"].is_unique
    assert names["iso3"].str.fullmatch(r"[A-Z]{3}").all()


@pytest.mark.network
def test_the_built_file_is_close_to_the_budget_net_land_use_co2():
    path = OUT / "landuse.json"
    if not path.exists():
        pytest.skip("not built")
    data = json.loads(path.read_text())
    assert data["world"] == pytest.approx(5.0e9, rel=0.1)
    assert sum(data["byCountry"].values()) == pytest.approx(data["world"], rel=0.02)
    assert data["byCountry"]["BRA"] > 5e8
    assert data["byCountry"]["CHN"] < 0
