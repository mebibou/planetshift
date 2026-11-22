import json
from pathlib import Path

import pandas as pd
import pytest

from planetshift_pipeline import population as P

OUT = Path(__file__).resolve().parent.parent.parent / "app" / "public" / "data"


def raw_rows() -> pd.DataFrame:
    """WPP's shape: the world and two countries, estimates to 2023 then three variants."""
    rows = []
    for iso3, kind, base in (
        ("", "World", 8e6),
        ("FRA", "Country/Area", 6e4),
        ("NGA", "Country/Area", 2e5),
    ):
        for year in range(1950, 2101):
            if year <= P.LAST_ESTIMATE:
                rows.append((iso3 or None, kind, "Medium", year, base * (0.5 + year / 4046)))
                continue
            growth = (year - P.LAST_ESTIMATE) / 1000
            for variant, k in (("Medium", 1), ("Low", 0.5), ("High", 1.5), ("Zero migration", 9)):
                rows.append((iso3 or None, kind, variant, year, base * (1 + k * growth)))
    rows.append((None, "Region", "Medium", 2030, 1.0))
    return pd.DataFrame(rows, columns=["ISO3_code", "LocTypeName", "Variant", "Time", "PopTotal"])


@pytest.fixture(scope="module")
def wpp():
    return P.tidy_wpp(raw_rows())


@pytest.fixture(scope="module")
def owid():
    return pd.Series({y: 1.2e9 + (y - 1800) * 1e7 for y in range(1800, 2024)})


def test_tidy_keeps_the_world_and_countries_of_three_variants(wpp):
    assert set(wpp["variant"]) == {"medium", "low", "high"}
    assert set(wpp["iso3"]) == {"WLD", "FRA", "NGA"}
    world_2030 = wpp[(wpp["iso3"] == "WLD") & (wpp["year"] == 2030) & (wpp["variant"] == "medium")]
    assert world_2030["people"].iloc[0] == pytest.approx(8e9 * 1.007)


def test_world_history_joins_owid_and_wpp_and_variants_follow(wpp, owid):
    w = P.world(wpp, owid)
    history = w["history"]
    assert history["years"] == list(range(1850, 2024))
    assert history["values"][0] == round(owid[1850])
    assert history["values"][1949 - 1850] == round(owid[1949])
    assert history["values"][1950 - 1850] == round(8e9 * (0.5 + 1950 / 4046))
    for v in ("medium", "low", "high"):
        assert w[v]["years"] == list(range(2024, 2101))
    assert w["low"]["values"][-1] < w["medium"]["values"][-1] < w["high"]["values"][-1]


def test_country_ratios_are_each_variant_over_the_medium(wpp):
    ratios = P.country_ratios(wpp, ["FRA", "NGA", "XXX"])
    assert set(ratios) == {"FRA", "NGA"}
    fra = ratios["FRA"]
    assert len(fra["low"]) == len(fra["high"]) == len(P.RATIO_YEARS)
    growth = (2100 - P.LAST_ESTIMATE) / 1000
    assert fra["low"][-1] == pytest.approx((1 + 0.5 * growth) / (1 + growth), abs=1e-4)
    assert fra["high"][-1] == pytest.approx((1 + 1.5 * growth) / (1 + growth), abs=1e-4)


def test_the_file_matches_its_contract(wpp, owid):
    data = P.population_json(wpp, owid, ["FRA"])
    assert set(data) == {"world", "lastEstimate", "ratioYears", "byCountry", "source"}
    assert data["ratioYears"][0] > data["lastEstimate"]
    json.dumps(data, allow_nan=False)


@pytest.mark.skipif(not (OUT / "population.json").exists(), reason="not built")
def test_the_built_file_carries_wpp_2024():
    data = json.loads((OUT / "population.json").read_text())
    w = data["world"]

    def at(variant: str, year: int) -> float:
        s = w[variant]
        return s["values"][s["years"].index(year)] / 1e9

    assert w["history"]["values"][0] / 1e9 == pytest.approx(1.28, abs=0.01)
    assert w["history"]["values"][-1] / 1e9 == pytest.approx(8.09, abs=0.01)
    assert (at("medium", 2050), at("medium", 2100)) == pytest.approx((9.66, 10.18), abs=0.01)
    assert (at("low", 2050), at("low", 2100)) == pytest.approx((8.94, 6.99), abs=0.01)
    assert (at("high", 2050), at("high", 2100)) == pytest.approx((10.40, 14.40), abs=0.01)
    countries = {c["iso3"] for c in json.loads((OUT / "countries.json").read_text())}
    assert set(data["byCountry"]) == countries
    assert all(r < 1 for c in data["byCountry"].values() for r in c["low"])
    assert all(r > 1 for c in data["byCountry"].values() for r in c["high"])
