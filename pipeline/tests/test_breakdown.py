import json
from pathlib import Path

import pandas as pd
import pytest

from planetshift_pipeline import breakdown as B
from planetshift_pipeline.sources import hestia

FIXTURES = Path(__file__).parent / "fixtures"
WHEAT = json.loads((FIXTURES / "hestia-wheatGrain-france-2010-2026-20260418.json").read_text())
RICE = json.loads(
    (FIXTURES / "hestia-riceGrainInHuskFlooded-india-2010-2026-20260308.json").read_text()
)


@pytest.mark.parametrize(
    ("term", "inputs", "source"),
    [
        ("ch4ToAirEntericFermentation", [], "enteric"),
        ("ch4ToAirExcreta", [], "manure"),
        ("n2OToAirExcretaDirect", [], "manure"),
        ("n2OToAirExcretaIndirect", [], "manure"),
        ("ch4ToAirFloodedRice", [], "rice"),
        ("n2OToAirInorganicFertiliserDirect", [], "syntheticFertiliser"),
        ("n2OToAirInorganicFertiliserIndirect", [], "syntheticFertiliser"),
        ("co2ToAirUreaHydrolysis", [], "syntheticFertiliser"),
        ("n2OToAirOrganicFertiliserDirect", [], "organicFertiliser"),
        ("n2OToAirOrganicFertiliserIndirect", [], "organicFertiliser"),
        ("n2OToAirCropResidueDecompositionDirect", [], "residues"),
        ("n2OToAirCropResidueBurningIndirect", [], "residues"),
        ("ch4ToAirCropResidueBurning", [], "residues"),
        ("co2ToAirFuelCombustion", [], "fuel"),
        ("ch4ToAirFuelCombustion", [], "fuel"),
        ("n2OToAirFuelCombustionIndirect", [], "fuel"),
        ("co2ToAirInputsProduction", ["fuel"], "fuel"),
        ("ch4ToAirInputsProductionFossil", ["electricity"], "electricity"),
        ("co2ToAirInputsProduction", ["inorganicFertiliser"], "inputsManufacture"),
        ("n2OToAirInputsProduction", ["pesticideAI"], "inputsManufacture"),
        ("ch4ToAirInputsProductionNonFossil", ["material"], "inputsManufacture"),
        ("co2ToAirLimeNeutralisation", [], "other"),
        ("ch4ToAirAquacultureSystems", [], "other"),
        ("n2OToAirWasteTreatmentDirect", [], "other"),
        ("co2ToAirSoilOrganicCarbonStockChangeLandUseChange", [], None),
        ("n2OToAirOrganicSoilCultivationDirect", [], None),
        ("co2ToAirCropResidueDecomposition", [], None),
        ("nh3ToAirExcreta", [], None),
    ],
)
def test_term_sources(term, inputs, source):
    assert hestia.source_of(term, inputs) == source


@pytest.mark.parametrize("node", [WHEAT, RICE], ids=["wheat", "rice"])
@pytest.mark.parametrize("scope", hestia.SCOPES)
def test_every_counted_term_has_a_source_and_the_sources_sum_to_the_total(node, scope):
    rows = node["emissionsResourceUse"]
    by_source = hestia.source_totals(rows, scope)
    assert all(source in B.SOURCES for _, source in by_source)
    totals = hestia.scope_totals(rows, scope)
    for gas in hestia.GASES:
        assert sum(v for (g, _), v in by_source.items() if g == gas) == pytest.approx(totals[gas])


def test_rice_methane_is_from_the_paddy():
    by_source = hestia.source_totals(RICE["emissionsResourceUse"], "farmGate")
    assert set(s for g, s in by_source if g == "ch4") >= {"rice"}
    assert by_source[("ch4", "rice")] > 0.9 * sum(
        v for (g, _), v in by_source.items() if g == "ch4"
    )


def test_combine_sources_follows_combine():
    terms = pd.DataFrame(
        {
            "fbs_item_code": [2511, 2511],
            "hestia_term_id": ["wheatGrain", "durumWheatGrain"],
            "priority": [1, 2],
            "kg_product_per_kg_item": [1.0, 1.0],
        }
    )
    node = {**WHEAT, "product": {"term": {"@id": "wheatGrain"}}}
    other = {**WHEAT, "@id": "x", "product": {"term": {"@id": "durumWheatGrain"}}}
    rows = [r for n in (node, other) for r in hestia.node_rows(n, terms)]
    source_rows = [r for n in (node, other) for r in hestia.node_source_rows(n, terms)]
    out = hestia.combine_sources(rows, source_rows)
    intensities = hestia.combine(rows).set_index(["area", "scope"])
    for (area, scope, gas), kg in out.groupby(["area", "scope", "gas"])["kg"].sum().items():
        assert kg == pytest.approx(intensities.loc[(area, scope), gas])
    assert set(out["url"]) == set(intensities["url"])


def test_rounded_shares_sum_to_one_and_drop_zeros():
    out = B.rounded({"enteric": 0.66666, "manure": 0.33333, "other": 0.00001})
    assert out == {"enteric": 0.667, "manure": 0.333}
    assert sum(B.rounded({"a": 1 / 3, "b": 1 / 3, "c": 1 / 3}).values()) == pytest.approx(1.0)


def test_shares_ignore_negative_parts():
    assert B.shares({"fuel": 3.0, "other": -1.0}) == {"fuel": 1.0}
    assert B.shares({"fuel": 0.0}) is None


def cell(iso3, code, tier, source, ch4=1.0, n2o=0.0, co2=0.0, scope="farmGate"):
    return {
        "iso3": iso3,
        "fbs_code": code,
        "scope": scope,
        "co2": co2,
        "ch4": ch4,
        "n2o": n2o,
        "tier": tier,
        "source": source,
    }


def faostat_rows(*rows):
    return pd.DataFrame(rows, columns=["iso3", "fbs_code", "scope", "gas", "source", "kg"])


HESTIA_COLUMNS = ["fbs_item_code", "area", "scope", "url", "gas", "source", "kg"]


def resolve(cells, faostat, hestia_rows=(), weights=None):
    merged = pd.DataFrame(cells)
    return B.Resolver(merged, faostat, pd.DataFrame(list(hestia_rows), columns=HESTIA_COLUMNS)).run(
        weights or {(c["iso3"], c["fbs_code"]): 1.0 for c in cells}
    )


def test_each_tier_takes_its_own_profile():
    faostat = faostat_rows(
        ("FRA", 2731, "farmGate", "ch4", "enteric", 9.0),
        ("FRA", 2731, "farmGate", "ch4", "manure", 1.0),
        ("DEU", 2731, "farmGate", "ch4", "enteric", 1.0),
        ("DEU", 2731, "farmGate", "ch4", "manure", 1.0),
    )
    hestia_rows = [
        (2807, "IND", "farmGate", "u", "ch4", "rice", 3.0),
        (2807, "IND", "farmGate", "u", "ch4", "residues", 1.0),
    ]
    cells = [
        cell("FRA", 2731, 3, "fao"),
        cell("DEU", 2731, 4, "pn"),
        cell("ITA", 2731, 4, "pn"),
        cell("FRA", 2735, 5, "proxy 2731: fao"),
        cell("IND", 2807, 1, "u"),
    ]
    world, done = resolve(cells, faostat, hestia_rows)
    assert done[("FRA", 2731, "farmGate")]["ch4"] == pytest.approx({"enteric": 0.9, "manure": 0.1})
    assert done[("DEU", 2731, "farmGate")]["ch4"] == pytest.approx({"enteric": 0.5, "manure": 0.5})
    assert done[("ITA", 2731, "farmGate")]["ch4"] == pytest.approx(
        {"enteric": 10 / 12, "manure": 2 / 12}
    )
    assert done[("FRA", 2735, "farmGate")] == done[("FRA", 2731, "farmGate")]
    assert done[("IND", 2807, "farmGate")]["ch4"] == pytest.approx({"rice": 0.75, "residues": 0.25})


def test_processed_items_blend_their_primaries_by_contribution():
    faostat = faostat_rows(
        ("FRA", 2536, "farmGate", "n2o", "syntheticFertiliser", 1.0),
        ("FRA", 2537, "farmGate", "n2o", "residues", 1.0),
    )
    cells = [
        cell("FRA", 2536, 3, "fao", ch4=0.0, n2o=1.1),
        cell("FRA", 2537, 3, "fao", ch4=0.0, n2o=1.6),
        cell(
            "FRA",
            2542,
            5,
            "processed from 2536 / 0.11 + 2537 / 0.16 (extraction rate): fao",
            ch4=0.0,
            n2o=20.0,
        ),
    ]
    _, done = resolve(cells, faostat)
    assert done[("FRA", 2542, "farmGate")]["n2o"] == pytest.approx(
        {"syntheticFertiliser": 0.5, "residues": 0.5}
    )


def test_a_gas_without_any_profile_is_other_and_zero_gases_are_left_out():
    _, done = resolve([cell("FRA", 2511, 4, "pn", ch4=0.0, co2=2.0)], faostat_rows())
    assert done[("FRA", 2511, "farmGate")] == {"co2": {"other": 1.0}}


def test_world_is_weighted_by_each_countrys_emissions():
    faostat = faostat_rows(
        ("FRA", 2731, "farmGate", "ch4", "enteric", 1.0),
        ("BRA", 2731, "farmGate", "ch4", "manure", 1.0),
    )
    cells = [cell("FRA", 2731, 3, "f", ch4=1.0), cell("BRA", 2731, 3, "f", ch4=3.0)]
    world, _ = resolve(cells, faostat, weights={("FRA", 2731): 1.0, ("BRA", 2731): 1.0})
    assert world[(2731, "farmGate")]["ch4"] == pytest.approx({"enteric": 0.25, "manure": 0.75})


def test_json_leaves_out_countries_equal_to_the_world():
    profile = {"ch4": {"enteric": 1.0}}
    out = B.breakdown_json(
        {(2731, "farmGate"): profile},
        {("FRA", 2731, "farmGate"): profile, ("BRA", 2731, "farmGate"): {"ch4": {"manure": 1.0}}},
    )
    assert out["world"] == {"2731": {"farmGate": {"ch4": {"enteric": 1.0}}}}
    assert out["byCountry"] == {"BRA": {"2731": {"farmGate": {"ch4": {"manure": 1.0}}}}}


def test_primaries_and_proxies_parse_the_source_text():
    assert B.primaries("processed from 2536 / 0.11 + 2537 / 0.16 (extraction rate): x") == [
        (2536, 0.11),
        (2537, 0.16),
    ]
    assert B.proxy_of("proxy 2513: https://hestia.earth/x") == 2513
    assert B.proxy_of("median of cereals worldwide") is None


def gn_rows(rows):
    return pd.DataFrame(rows, columns=["area_code", "item_code", "element_code", "year", "value"])


def test_electricity_shares_take_each_country_s_latest_year_and_the_world_s_elsewhere():
    gn = gn_rows(
        [
            (1, B.ELECTRICITY, 7273, 2021, 10.0),
            (1, B.ELECTRICITY, 7273, 2022, 30.0),
            (1, B.TOTAL_ENERGY, 7273, 2022, 100.0),
            (2, B.ELECTRICITY, 7273, 2022, 10.0),
            (2, B.TOTAL_ENERGY, 7273, 2022, 100.0),
            (2, B.TOTAL_ENERGY, 7225, 2022, 5.0),
        ]
    )
    shares = B.electricity_shares(gn, {1: "AAA", 2: "BBB", 3: "CCC"})
    assert shares[("AAA", "co2")] == pytest.approx(0.3)
    assert shares[("BBB", "co2")] == pytest.approx(0.1)
    assert shares[("CCC", "co2")] == pytest.approx(0.2)
    assert shares[("BBB", "ch4")] == 0.0
    assert shares[("AAA", "n2o")] == 0.0


def test_split_energy_keeps_the_kg_and_leaves_other_sources():
    frame = pd.DataFrame(
        {
            "iso3": ["AAA", "AAA"],
            "fbs_code": [2511, 2511],
            "scope": ["cradleToFarmGate"] * 2,
            "gas": ["co2", "co2"],
            "source": ["energy", "inputsManufacture"],
            "kg": [100.0, 40.0],
        }
    )
    out = B.split_energy(frame, {("AAA", "co2"): 0.25})
    by_source = out.groupby("source")["kg"].sum().to_dict()
    assert by_source == pytest.approx(
        {"electricity": 25.0, "fuel": 75.0, "inputsManufacture": 40.0}
    )


def test_electricity_per_fuel_co2_is_the_grid_over_the_fuel_it_replaces():
    gn = gn_rows(
        [
            (1, B.ELECTRICITY, B.CO2, 2022, 0.5),
            (1, B.ELECTRICITY, B.ENERGY_USE, 2022, 3.6),
            (1, B.FUEL, B.CO2, 2022, 0.07),
            (1, B.FUEL, B.ENERGY_USE, 2022, 1.0),
            (2, B.FUEL, B.CO2, 2022, 0.14),
            (2, B.FUEL, B.ENERGY_USE, 2022, 1.0),
        ]
    )
    drawn = B.electricity_per_fuel_co2(gn, {1: "AAA", 2: "BBB"}, 0.1)
    assert drawn["AAA"] == pytest.approx(0.1 * 0.5 / 0.07)
    assert drawn["BBB"] == drawn["World"]
    assert drawn["World"] == pytest.approx(0.1 * 0.5 / 0.105)
