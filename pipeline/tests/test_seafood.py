import pandas as pd
import pytest

from planetshift_pipeline import breakdown as B
from planetshift_pipeline import groups as G
from planetshift_pipeline import land as L
from planetshift_pipeline import seafood as SF
from planetshift_pipeline.sources import fishstat

FACTORS = SF.load_factors()
ISSCAAP = SF.load_isscaap()


def rows(*data):
    return pd.DataFrame(
        data, columns=["iso3", "year", "isscaap_group", "inland", "system", "tonnes"]
    )


def factor(system, group, scope, gas):
    pt = SF.per_tonne(FACTORS).set_index(["system", "group", "scope"])
    return pt.at[(system, group, scope), gas]


def test_tables_cover_the_seafood_items_and_name_known_groups():
    assert set(ISSCAAP["fbs_code"]) == set(SF.ITEMS)
    groups = set(FACTORS["group"])
    assert set(ISSCAAP["capture_group"]) | {"inland"} <= groups
    assert set(ISSCAAP["aquaculture_group"]) <= groups
    kept = G.kept(G.load())
    assert set(kept.loc[kept["group"] == "seafood", "fbs_code"]) == set(SF.ITEMS)


def test_capture_burns_parker_fuel_outside_the_farm_gate_only():
    assert factor("capture", "crustaceans", "farmGate", "co2") == 0
    assert factor("capture", "crustaceans", "cradleToFarmGate", "co2") == pytest.approx(1739 * 3.3)
    assert factor("capture", "smallPelagic", "cradleToFarmGate", "n2o") == 0


def test_aquaculture_has_water_n2o_in_both_scopes_and_energy_in_cradle():
    n2o = 1.69 * 44 / 28
    for scope in SF.SCOPES:
        assert factor("aquaculture", "shrimps", scope, "n2o") == pytest.approx(n2o)
    assert factor("aquaculture", "shrimps", "farmGate", "co2") == 0
    assert factor("aquaculture", "salmonids", "cradleToFarmGate", "co2") == pytest.approx(
        551 * 0.074 + 617 * 0.070
    )
    assert factor("aquaculture", "shrimps", "cradleToFarmGate", "co2") > 2000


def test_inland_capture_takes_the_inland_group():
    out = SF.classified(
        rows(
            ("BGD", 2023, "Carps, barbels and other cyprinids", True, "capture", 10.0),
            ("BGD", 2023, "Carps, barbels and other cyprinids", False, "aquaculture", 30.0),
            ("BGD", 2023, "Shrimps, prawns", False, "capture", 5.0),
            ("BGD", 2023, "Red seaweeds", False, "aquaculture", 99.0),
        ),
        ISSCAAP,
    ).set_index(["fbs_code", "system"])["group"]
    assert out[(2761, "capture")] == "inland"
    assert out[(2761, "aquaculture")] == "cyprinids"
    assert out[(2765, "capture")] == "crustaceans"
    assert len(out) == 3


def test_a_country_blends_capture_and_aquaculture_by_its_production():
    production = pd.DataFrame(
        {
            "iso3": ["VNM", "VNM"],
            "fbs_code": [2765, 2765],
            "system": ["capture", "aquaculture"],
            "group": ["crustaceans", "shrimps"],
            "tonnes": [1.0, 3.0],
        }
    )
    b = SF.blended(production, FACTORS).set_index("scope")
    cradle = b.loc["cradleToFarmGate"]
    expected = 0.25 * factor("capture", "crustaceans", "cradleToFarmGate", "co2") + 0.75 * factor(
        "aquaculture", "shrimps", "cradleToFarmGate", "co2"
    )
    assert cradle["co2"] == pytest.approx(expected)
    assert cradle["n2o"] == pytest.approx(0.75 * SF.AQUATIC_N2O)
    assert cradle["capture_share"] == pytest.approx(0.25)


def test_candidates_are_tier_four_for_the_model_countries_in_the_window():
    data = rows(
        ("NOR", 2019, "Salmons, trouts, smelts", False, "aquaculture", 1000.0),
        ("NOR", 2023, "Salmons, trouts, smelts", False, "aquaculture", 1.0),
        ("NOR", 2023, "Cods, hakes, haddocks", False, "capture", 1.0),
        ("XXX", 2023, "Cods, hakes, haddocks", False, "capture", 1.0),
    )
    c = SF.candidates(data, 2023, ["NOR"])
    assert set(c["iso3"]) == {"NOR"} and set(c["tier"]) == {4}
    assert set(zip(c["fbs_code"], c["scope"], strict=True)) == {
        (code, scope) for code in (2761, 2762) for scope in SF.SCOPES
    }
    assert "2021-2023" in c["source"].iloc[0]
    salmon = c[(c["fbs_code"] == 2761) & (c["scope"] == "farmGate")]
    assert salmon["n2o"].iloc[0] == pytest.approx(SF.AQUATIC_N2O)


def test_fed_aquaculture_leaves_out_filter_feeders_and_capture():
    data = rows(
        ("CHN", 2023, "Oysters", False, "aquaculture", 50.0),
        ("CHN", 2023, "Tilapias and other cichlids", False, "aquaculture", 20.0),
        ("CHN", 2022, "Tilapias and other cichlids", False, "aquaculture", 10.0),
        ("CHN", 2023, "Tilapias and other cichlids", True, "capture", 99.0),
    )
    assert SF.fed_aquaculture(data, 2023).to_dict() == {"CHN": pytest.approx(10.0)}


def test_breakdown_uses_the_known_seafood_split():
    merged = pd.DataFrame(
        [
            ("NOR", 2761, "cradleToFarmGate", 80.0, 0.0, 2.6, 4, "x"),
            ("NOR", 2762, "cradleToFarmGate", 1700.0, 0.0, 0.0, 5, "proxy 2761: x"),
        ],
        columns=["iso3", "fbs_code", "scope", "co2", "ch4", "n2o", "tier", "source"],
    )
    empty = pd.DataFrame(columns=["iso3", "fbs_code", "scope", "gas", "source", "kg"])
    no_hestia = pd.DataFrame(
        columns=["fbs_item_code", "area", "scope", "url", "gas", "source", "kg"]
    )
    out = B.build(merged, empty, no_hestia, {}, None, None, SF.breakdown_profiles())
    assert out["world"]["2761"]["cradleToFarmGate"] == {
        "co2": {"fuel": 1.0},
        "n2o": {"other": 1.0},
    }
    assert out["world"]["2762"]["cradleToFarmGate"] == {"co2": {"fuel": 1.0}}


def test_fish_farms_split_their_energy_co2_between_electricity_and_fuel():
    factors = pd.DataFrame(
        {
            "system": ["capture", "aquaculture"],
            "group": ["smallPelagic", "carp"],
            "fuel_l_per_t": [100.0, 0.0],
            "electricity_mj_per_t": [0.0, 3600.0],
            "diesel_mj_per_t": [0.0, 0.0],
            "petrol_mj_per_t": [0.0, 0.0],
        }
    )
    production = pd.DataFrame(
        {
            "fbs_code": [2761, 2762, 2762],
            "system": ["capture", "aquaculture", "capture"],
            "group": ["smallPelagic", "carp", "smallPelagic"],
            "tonnes": [10.0, 10.0, 10.0],
        }
    )
    shares = SF.electricity_shares(production, factors)
    capture = 100 * (SF.FUEL_COMBUSTION + SF.FUEL_UPSTREAM)
    farmed = 3600 * SF.GRID
    assert shares[2761] == 0.0
    assert shares[2762] == pytest.approx(farmed / (farmed + capture))
    assert SF.co2_sources(0.0) == {"fuel": 1.0}


def test_land_gives_seafood_neither_pasture_nor_cropland():
    shares = pd.DataFrame({"dairy": [0.4], "ruminantMeat": [0.6]}, index=[1])
    pasture = L.pasture_json(pd.Series({1: 10.0}), shares, {1: "NOR"})
    assert "seafood" not in pasture["NOR"]["shares"]
    kept = G.kept(G.load())
    plant = set(kept.loc[~kept["group"].isin(G.ANIMAL_GROUPS), "fbs_code"])
    assert plant.isdisjoint(SF.ITEMS)


def test_fishstat_tidy_sums_by_system_and_drops_unknown_countries():
    quantity = pd.DataFrame(
        {
            "COUNTRY.UN_CODE": ["578", "578", "578", "999"],
            "SPECIES.ALPHA_3_CODE": ["SAL", "SAL", "COD", "COD"],
            "AREA.CODE": ["27", "27", "27", "27"],
            "PRODUCTION_SOURCE_DET.CODE": ["MARINE", "BRACKISHWATER", "CAPTURE", "CAPTURE"],
            "MEASURE": ["Q_tlw"] * 4,
            "PERIOD": [2023] * 4,
            "VALUE": [1.0, 2.0, 3.0, 4.0],
        }
    )
    species = pd.DataFrame(
        {
            "3A_Code": ["SAL", "COD"],
            "ISSCAAP_Group_En": ["Salmons, trouts, smelts", "Cods, hakes, haddocks"],
        }
    )
    areas = pd.DataFrame({"Code": ["27"], "InlandMarine_Group_En": ["Marine areas"]})
    countries = pd.DataFrame({"UN_Code": ["578", "999"], "ISO3_Code": ["NOR", ""]})
    out = fishstat.tidy(quantity, species, areas, countries).set_index("system")["tonnes"]
    assert out.to_dict() == {"aquaculture": 3.0, "capture": 3.0}
