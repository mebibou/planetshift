import json
from pathlib import Path

import pandas as pd
import pytest

from planetshift_pipeline.sources import hestia

FIXTURES = Path(__file__).parent / "fixtures"
CACHE = Path(__file__).resolve().parents[1] / "cache"


def fixture(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text())


WHEAT = fixture("hestia-wheatGrain-france-2010-2026-20260418.json")
RICE = fixture("hestia-riceGrainInHuskFlooded-india-2010-2026-20260308.json")


@pytest.mark.parametrize(
    ("term", "gas", "category"),
    [
        ("ch4ToAirEntericFermentation", "ch4", "onFarm"),
        ("ch4ToAirFloodedRice", "ch4", "onFarm"),
        ("n2OToAirInorganicFertiliserIndirect", "n2o", "onFarm"),
        ("co2ToAirUreaHydrolysis", "co2", "onFarm"),
        ("co2ToAirFuelCombustion", "co2", "farmEnergy"),
        ("n2OToAirFuelCombustionIndirect", "n2o", "farmEnergy"),
        ("ch4ToAirInputsProductionFossil", "ch4", "background"),
        ("n2OToAirInputsProduction", "n2o", "background"),
        ("co2ToAirSoilOrganicCarbonStockChangeLandUseChange", "co2", "landUse"),
        ("co2ToAirAboveGroundBiomassStockChangeManagementChange", "co2", "landUse"),
        ("n2OToAirOrganicSoilCultivationDirect", "n2o", "landUse"),
        ("ch4ToAirNaturalVegetationBurning", "ch4", "landUse"),
        ("co2ToAirCropResidueDecomposition", "co2", "excluded"),
        ("n2OToAirBackgroundSoilFluxDirect", "n2o", "excluded"),
        ("nh3ToAirExcreta", None, None),
        ("no3ToGroundwaterInorganicFertiliser", None, None),
    ],
)
def test_classifies_emission_terms(term, gas, category):
    assert hestia.gas_of(term) == gas
    assert hestia.category_of(term) == category


@pytest.mark.parametrize(
    ("scope", "category", "inputs", "counted"),
    [
        ("farmGate", "onFarm", [], True),
        ("farmGate", "farmEnergy", [], False),
        ("cradleToFarmGate", "farmEnergy", [], True),
        ("farmGate", "background", ["inorganicFertiliser"], False),
        ("cradleToFarmGate", "background", ["inorganicFertiliser"], True),
        ("cradleToFarmGate", "background", ["fuel"], True),
        ("cradleToFarmGate", "background", ["seed"], False),
        ("cradleToFarmGate", "background", ["crop"], False),
        ("cradleToFarmGate", "background", ["liveAnimal"], False),
        ("cradleToFarmGate", "landUse", [], False),
        ("cradleToFarmGate", "excluded", [], False),
    ],
)
def test_scopes_keep_on_farm_and_non_agricultural_background(scope, category, inputs, counted):
    assert hestia.counts_in(scope, category, inputs) is counted


def test_all_gases_add_up_to_the_aggregation_gwp100():
    ar6 = {"co2": 1.0, "ch4": 27.0, "n2o": 273.0}
    for node in (WHEAT, RICE):
        totals = hestia.gas_totals(node["emissionsResourceUse"], lambda *_: True)
        fossil_ch4 = hestia.gas_totals(
            [
                r
                for r in node["emissionsResourceUse"]
                if r["term"]["@id"] == "ch4ToAirInputsProductionFossil"
            ],
            lambda *_: True,
        )["ch4"]
        gwp = sum(totals[g] * ar6[g] for g in ar6) + fossil_ch4 * (29.8 - 27.0)
        assert gwp == pytest.approx(node["impacts"][0]["value"], rel=0.01)


def test_scope_totals_of_wheat_in_france():
    gate = hestia.scope_totals(WHEAT["emissionsResourceUse"], "farmGate")
    cradle = hestia.scope_totals(WHEAT["emissionsResourceUse"], "cradleToFarmGate")
    assert gate["n2o"] == pytest.approx(
        0.000535 + 0.000058 + 0.000018 + 0.000002 + 0.000168, rel=0.05
    )
    assert all(cradle[g] >= gate[g] for g in hestia.GASES)
    seed_ch4 = sum(
        r["value"]
        for r in WHEAT["emissionsResourceUse"]
        if r["term"]["@id"].startswith("ch4ToAirInputsProduction")
        and r["inputs"][0]["termType"] == "seed"
    )
    assert seed_ch4 > 0
    everything = hestia.gas_totals(
        WHEAT["emissionsResourceUse"], lambda c, _: c in ("onFarm", "farmEnergy", "background")
    )
    assert cradle["ch4"] == pytest.approx(everything["ch4"] - seed_ch4)


def test_rice_methane_is_on_farm():
    gate = hestia.scope_totals(RICE["emissionsResourceUse"], "farmGate")
    assert gate["ch4"] > 0.0167
    assert gate["co2"] < 0.291


@pytest.mark.parametrize(
    ("region", "area"),
    [
        ("GADM-FRA", "FRA"),
        ("region-world", "World"),
        ("region-western-europe", "region:region-western-europe"),
        ("GADM-FRA.1_1", None),
        ("GADM-Z01", None),
    ],
)
def test_area_of(region, area):
    assert hestia.area_of(region) == area


def test_per_tonne_of_item_converts_units():
    assert hestia.per_tonne_of_item({"co2": 0.1, "ch4": 0.02, "n2o": 0.001}, 1.5) == pytest.approx(
        {"co2": 150.0, "ch4": 30.0, "n2o": 1.5}
    )


def test_latest_aggregations_keeps_the_latest_period_of_mapped_products():
    hits = [
        {"@id": "wheatGrain-france-1990-2009-1", "endDate": "2009", "country": {"name": "France"}},
        {"@id": "wheatGrain-france-2010-2026-2", "endDate": "2026", "country": {"name": "France"}},
        {"@id": "wheatGrain-world-2010-2026-3", "endDate": "2026", "country": {"name": "World"}},
        {"@id": "wine-france-2010-2026-4", "endDate": "2026", "country": {"name": "France"}},
    ]
    assert hestia.latest_aggregations(hits, {"wheatGrain"}) == [
        "wheatGrain-france-2010-2026-2",
        "wheatGrain-world-2010-2026-3",
    ]


def test_node_rows_convert_to_each_mapped_item():
    terms = pd.DataFrame(
        [
            {
                "fbs_item_code": 2807,
                "hestia_term_id": "riceGrainInHuskFlooded",
                "priority": 1,
                "kg_product_per_kg_item": 1.0,
            },
            {
                "fbs_item_code": 9999,
                "hestia_term_id": "riceGrainInHuskFlooded",
                "priority": 1,
                "kg_product_per_kg_item": 0.5,
            },
        ]
    )
    rows = hestia.node_rows(RICE, terms)
    assert {(r["fbs_item_code"], r["scope"]) for r in rows} == {
        (2807, "farmGate"),
        (2807, "cradleToFarmGate"),
        (9999, "farmGate"),
        (9999, "cradleToFarmGate"),
    }
    by = {(r["fbs_item_code"], r["scope"]): r for r in rows}
    assert by[(9999, "farmGate")]["ch4"] == pytest.approx(by[(2807, "farmGate")]["ch4"] / 2)
    assert all(r["area"] == "IND" for r in rows)
    assert rows[0]["url"].endswith("/cycle/" + RICE["@id"])


def test_combine_keeps_best_priority_and_averages():
    base = {"area": "FRA", "scope": "farmGate", "fbs_item_code": 2731, "url": "u"}
    rows = [
        {**base, "term": "a", "priority": 1, "co2": 1.0, "ch4": 10.0, "n2o": 0.0},
        {**base, "term": "b", "priority": 1, "co2": 3.0, "ch4": 20.0, "n2o": 0.0},
        {**base, "term": "c", "priority": 2, "co2": 99.0, "ch4": 99.0, "n2o": 99.0},
    ]
    combined = hestia.combine(rows)
    assert list(combined.columns) == hestia.COLUMNS
    assert combined.iloc[0][["co2", "ch4", "n2o"]].tolist() == [2.0, 15.0, 0.0]


def test_combine_of_nothing_has_the_columns():
    assert list(hestia.combine([]).columns) == hestia.COLUMNS


def test_region_members_from_glossary_terms():
    glossary = fixture("hestia-regions.json")
    members = hestia.region_members_from(glossary["countries"], glossary["regions"])
    assert members["region-western-europe"] == ["DEU", "FRA"]
    assert members["region-europe"] == ["DEU", "FRA"]
    assert members["region-western-africa"] == ["SEN"]
    assert members["region-oceania"] == ["FJI"]
    assert members["region-world"] == ["DEU", "FJI", "FRA", "SEN"]


def test_terms_table_is_well_formed():
    terms = hestia.load_terms()
    assert terms.fbs_item_code.dtype.kind == "i"
    assert (terms.kg_product_per_kg_item > 0).all()
    assert terms.priority.isin([1, 2]).all()
    assert not terms.duplicated(["fbs_item_code", "hestia_term_id"]).any()
    assert terms.note.notna().all()


@pytest.mark.network
def test_fetch_intensities_from_the_cache_is_plausible():
    if not (CACHE / "hestia" / hestia.RELEASE / "aggregations.json").exists():
        pytest.skip("HESTIA cache not filled")
    intensities = hestia.fetch_intensities(CACHE)
    assert list(intensities.columns) == hestia.COLUMNS
    assert (intensities[list(hestia.GASES)] >= 0).all().all()
    gate = intensities[intensities.scope == "farmGate"]
    cradle = intensities[intensities.scope == "cradleToFarmGate"]
    joined = gate.merge(cradle, on=["fbs_item_code", "area"], suffixes=("", "_cradle"))
    assert (joined.co2_cradle >= joined.co2 - 1e-9).all()

    def median(code: int, gas: str) -> float:
        return gate[gate.fbs_item_code == code][gas].median()

    assert median(2807, "ch4") > 10 * median(2511, "ch4")
    assert 5 < median(2807, "ch4") < 80
    assert 0.2 < median(2511, "n2o") < 3
    if (gate.fbs_item_code == 2731).any():
        assert median(2731, "ch4") > 50 * median(2511, "ch4")


def test_fuel_burnt_on_the_farm_counts_from_cradle_to_farm_gate_only():
    fuel = [r for r in WHEAT["emissionsResourceUse"] if "FuelCombustion" in r["term"]["@id"]]
    assert fuel
    assert hestia.scope_totals(fuel, "farmGate") == {gas: 0.0 for gas in hestia.GASES}
    cradle = hestia.scope_totals(fuel, "cradleToFarmGate")
    assert cradle["co2"] == pytest.approx(
        sum(r["value"] for r in fuel if r["term"]["@id"].startswith("co2"))
    )
    assert {hestia.source_of(r["term"]["@id"]) for r in fuel} == {"fuel"}


def test_each_release_has_its_own_cache_folder():
    assert hestia.release_dir(Path("cache")) == Path("cache") / "hestia" / hestia.RELEASE
    assert hestia.RELEASE_NAMES[hestia.RELEASE] in hestia.SOURCES[0]["version"]
