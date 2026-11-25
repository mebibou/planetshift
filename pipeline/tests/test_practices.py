import json
import re
from pathlib import Path

import pytest

from planetshift_pipeline import breakdown as B
from planetshift_pipeline import practices as P
from planetshift_pipeline.build import OUT_DIR

TYPES = Path(__file__).resolve().parents[2] / "app" / "src" / "levers" / "practices" / "data.ts"
GROUPS = {
    "ruminantMeat",
    "pigMeat",
    "poultryMeat",
    "dairy",
    "eggs",
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
}
COUNTRIES = ["FRA", "NZL", "NGA", "CHN", "VEN"]
REGIONS = {"FRA": "Western Europe", "NZL": "Australia and New Zealand", "NGA": "Western Africa"}
INCOMES = {
    "FRA": "High income",
    "NZL": "High income",
    "NGA": "Lower middle income",
    "CHN": "Upper middle income",
}


def contract_list(name: str) -> list[str]:
    text = TYPES.read_text()
    body = re.search(rf"export const {name} = \[(.*?)\] as const", text, re.S).group(1)
    return re.findall(r"'(\w+)'", body)


GRID = {
    "kwhPerFuelCo2": {"World": 1.5, "FRA": 1.6},
    "gridRatio": {"World": 1.0, "FRA": 0.1},
    "kgCo2PerKwh": 0.5,
}


@pytest.fixture(scope="module")
def built():
    return P.practices_json(P.load(), COUNTRIES, REGIONS, INCOMES, GRID)


def test_ids_and_sources_match_the_contract():
    assert list(P.PRACTICES) == contract_list("PRACTICES")
    assert list(B.SOURCES) == contract_list("EMISSION_SOURCES")


def check(practices: dict, countries: list[str]) -> None:
    assert set(practices) == set(P.PRACTICES)
    for pid, p in practices.items():
        assert p["sources"] and set(p["sources"]) <= set(B.SOURCES), pid
        assert p["gases"] and set(p["gases"]) <= {"co2", "ch4", "n2o"}, pid
        assert set(p.get("groups", [])) <= GROUPS, pid
        r = p["reduction"]
        assert 0 <= r["low"] <= r["median"] <= r["high"] <= 1, pid
        assert "World" in p["applicable"], pid
        assert set(countries) <= set(p["applicable"]), pid
        assert all(0 <= v <= 1 for v in p["applicable"].values()), pid
        assert p["source"].startswith("https://"), pid
    electrified = practices["farmEnergy"]["electrified"]
    assert 0 < electrified["efficiency"] <= practices["farmEnergy"]["reduction"]["median"]
    for table in ("kwhPerFuelCo2", "gridRatio"):
        assert "World" in electrified[table]
        assert all(v >= 0 for v in electrified[table].values())
    assert electrified["gridRatio"]["World"] == 1.0
    assert electrified["kgCo2PerKwh"] > 0


def test_practices_follow_the_contract(built):
    check(built, COUNTRIES)


def test_the_most_specific_applicable_share_wins(built):
    additives = built["feedAdditives"]["applicable"]
    assert additives["NZL"] == 0.05
    assert additives["FRA"] == 0.45
    assert additives["VEN"] == additives["World"]
    assert built["nitrogenEfficiency"]["applicable"]["NGA"] == 0.2


def test_every_row_has_a_reason_and_every_citation_a_source():
    table = P.load()
    assert (table["reason"].str.len() > 0).all()
    assert set(P.cited(table)) <= {s["url"] for s in P.SOURCES}
    assert set(table["practice"]) == set(P.PRACTICES)


def test_the_built_file_follows_the_contract():
    path = OUT_DIR / "practices.json"
    if not path.exists():
        pytest.skip("practices.json not built")
    countries = [c["iso3"] for c in json.loads((OUT_DIR / "countries.json").read_text())]
    check(json.loads(path.read_text()), countries)


def test_only_a_practice_with_an_efficiency_is_electrified(built):
    assert built["farmEnergy"]["electrified"] == {"efficiency": 0.25, **GRID}
    assert "electrified" not in built["feedAdditives"]


def test_the_grid_ratio_is_embers_and_faostats_where_ember_has_no_figure():
    ratio = P.grid_ratio({"FRA": 0.04, "IND": 0.66}, 0.46, {"World": 0.5, "FRA": 0.1, "TUV": 0.75})
    assert ratio["World"] == 1.0
    assert ratio["FRA"] == pytest.approx(0.04 / 0.46)
    assert ratio["TUV"] == pytest.approx(0.75 / 0.5)
    assert "IND" not in ratio
