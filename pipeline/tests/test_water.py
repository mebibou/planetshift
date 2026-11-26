import pandas as pd
import pytest

from planetshift_pipeline import intensities as I
from planetshift_pipeline import water as W
from planetshift_pipeline.sources import hestia

SOY = {
    "@id": "soybeanSeedWhole-brazil-2010-2026-20261116",
    "country": {"@id": "GADM-BRA"},
    "product": {"term": {"@id": "soybeanSeedWhole", "units": "kg"}},
    "emissionsResourceUse": [
        {"term": {"@id": "co2ToAirFuelCombustion"}, "value": 0.05, "inputs": []},
        {"term": {"@id": hestia.DURING_CYCLE}, "value": 0.5, "inputs": []},
        {
            "term": {"@id": hestia.INPUTS_PRODUCTION},
            "value": 7.0,
            "inputs": [{"@id": "diesel", "termType": "fuel"}],
        },
        {
            "term": {"@id": hestia.INPUTS_PRODUCTION},
            "value": 20.0,
            "inputs": [{"@id": "soybeanSeed", "termType": "seed"}],
        },
        {"term": {"@id": "freshwaterConsumptionDuringCycle"}, "value": 0.4, "inputs": []},
    ],
    "impacts": [
        {"term": {"@id": "gwp100"}, "value": 0.3},
        {"term": {"@id": hestia.SCARCITY}, "value": 18.9, "methodModel": {"@id": "aware2-0"}},
        {
            "term": {"@id": hestia.SCARCITY},
            "value": 20.6,
            "methodModel": {"@id": "environmentalFootprintV3-1"},
        },
    ],
}
TERMS = pd.DataFrame(
    [
        {
            "fbs_item_code": 2555,
            "hestia_term_id": "soybeanSeedWhole",
            "priority": 1,
            "kg_product_per_kg_item": 1.0,
        }
    ]
)


def test_trim_keeps_the_withdrawals_and_awares_scarcity_apart_from_the_gases():
    node = hestia.trim_node(SOY)
    assert [r["term"]["@id"] for r in node["emissionsResourceUse"]] == ["co2ToAirFuelCombustion"]
    assert [r["term"]["@id"] for r in node["resourceUse"]] == [
        hestia.DURING_CYCLE,
        hestia.INPUTS_PRODUCTION,
        hestia.INPUTS_PRODUCTION,
    ]
    assert [i["value"] for i in node["impacts"]] == [0.3, 18.9]
    assert hestia.category_of(hestia.DURING_CYCLE) is None


def test_withdrawals_sum_the_farm_and_the_non_agricultural_inputs():
    rows = hestia.node_water_rows(hestia.trim_node(SOY), TERMS)
    assert rows == [
        {
            "fbs_item_code": 2555,
            "area": "BRA",
            "term": "soybeanSeedWhole",
            "priority": 1,
            "litres": pytest.approx(7500.0),
            "scarcity": pytest.approx(18900.0),
            "url": "https://hestia.earth/cycle/" + SOY["@id"],
        }
    ]


def test_an_aggregation_without_farm_withdrawals_gives_no_water():
    node = hestia.trim_node({**SOY, "emissionsResourceUse": SOY["emissionsResourceUse"][:1]})
    assert hestia.node_water_rows(node, TERMS) == []
    assert list(hestia.combine_water([]).columns) == hestia.WATER_COLUMNS


def test_combine_water_keeps_the_best_priority_and_averages():
    base = {"fbs_item_code": 2511, "area": "FRA", "url": "u"}
    rows = [
        {**base, "term": "a", "priority": 1, "litres": 100.0, "scarcity": None},
        {**base, "term": "b", "priority": 1, "litres": 300.0, "scarcity": 50.0},
        {**base, "term": "c", "priority": 2, "litres": 9e9, "scarcity": 9e9},
    ]
    row = hestia.combine_water(rows).iloc[0]
    assert (row.litres, row.scarcity) == (200.0, 50.0)


def test_literature_converts_litres_per_kg_retail_to_the_fbs_item():
    terms = pd.DataFrame(
        [
            {
                "fbs_item_code": 2731,
                "product": "Bovine Meat (beef herd)",
                "farm_kg_co2e_per_kg": 39.4,
                "weight_kt": 3.0,
                "kg_product_per_kg_item": 1.0,
            },
            {
                "fbs_item_code": 2731,
                "product": "Buffalo",
                "farm_kg_co2e_per_kg": 29.0,
                "weight_kt": 1.0,
                "kg_product_per_kg_item": 1.0,
            },
            {
                "fbs_item_code": 2807,
                "product": "Rice",
                "farm_kg_co2e_per_kg": 3.55,
                "weight_kt": 1.0,
                "kg_product_per_kg_item": 0.667,
            },
        ]
    )
    rows = W.literature_rows(
        terms,
        {"Beef (beef herd)": 1451.0, "Rice": 2248.0},
        {"Beef (beef herd)": 56.2, "Rice": 3.55},
    )
    world = W.literature_water(rows).set_index("fbs_item_code")
    assert world.loc[2731, "litres"] == pytest.approx(1451.0 * 39.4 / 56.2 * 1000)
    assert world.loc[2807, "litres"] == pytest.approx(2248.0 * 0.667 * 1000)
    assert set(world["area"]) == {"World"}


def test_animals_carry_their_water_less_their_concentrate_feed_never_below_zero():
    intake = pd.DataFrame(
        {"high_income": [3.0, 2.2], "other": [0.8, 2.0]}, index=["ruminantMeat", "eggs"]
    )
    rations = pd.DataFrame(
        {"ruminantMeat": [0.7, 0.3], "eggs": [0.7, 0.3]}, index=["grain", "oilseed"]
    )
    classes = {"grain": 300e3, "oilseed": 100e3}
    assert W.feed_litres("ruminantMeat", False, intake, rations, classes) == pytest.approx(
        0.8 * (0.7 * 300e3 + 0.3 * 100e3)
    )
    world = pd.DataFrame(
        {"fbs_item_code": [2731, 2744], "litres": [1.0e6, 0.3e6], "url": ["pn", "pn"]}
    )
    out = W.animal_water(
        world,
        ["FRA", "IND"],
        {"FRA"},
        {2731: "ruminantMeat", 2744: "eggs"},
        lambda g, rich: W.feed_litres(g, rich, intake, rations, classes),
    ).set_index(["area", "fbs_item_code"])["litres"]
    assert out[("IND", 2731)] == pytest.approx(1.0e6 - 0.8 * 240e3)
    assert out[("FRA", 2731)] == pytest.approx(1.0e6 - 3.0 * 240e3)
    assert out[("FRA", 2744)] == 0.0


def test_class_litres_weigh_the_crops_by_their_feed_use():
    crops = pd.DataFrame(
        {
            "iso3": ["FRA", "FRA", "IND"],
            "fbs_code": [2511, 2514, 2514],
            "litres": [300.0, 100.0, 50.0],
        }
    )
    feed = pd.DataFrame(
        {"iso3": ["FRA", "FRA", "IND"], "fbs_code": [2511, 2514, 2514], "feed": [1.0, 3.0, 0.0]}
    )
    assert W.class_litres(crops, feed, {2511: "grain", 2514: "grain"}) == {"grain": 150.0}


def test_the_emissions_tiers_carry_the_water():
    grid = pd.DataFrame(
        [
            {"iso3": c, "fbs_code": code, "scope": W.SCOPE}
            for c in ("FRA", "IND")
            for code in (2511, 2513)
        ]
    )
    hestia_rows = pd.DataFrame(
        {
            "fbs_item_code": [2511],
            "area": ["FRA"],
            "litres": [300e3],
            "scarcity": [9e5],
            "url": ["h"],
        }
    )
    world = pd.DataFrame(
        {"fbs_item_code": [2511], "area": ["World"], "litres": [650e3], "url": ["pn"]}
    )
    merged = I.merge(
        grid,
        [
            W.candidates(hestia_rows, ["FRA", "IND"], {}, 1, 2),
            W.candidates(world, ["FRA", "IND"], {}, 4, 4),
        ],
        {2513: [2511]},
        {},
        {2511: "cereals", 2513: "cereals"},
        pd.DataFrame({"iso3": ["FRA", "IND"], "fbs_code": [2511, 2511], "production": [1.0, 1.0]}),
        pd.DataFrame(columns=["iso3", "fbs_code", "processing"]),
        {},
    )
    litres = W.litres_of(merged).set_index(["iso3", "fbs_code"])
    assert litres.loc[("FRA", 2511), ["litres", "tier"]].tolist() == [300e3, 1]
    assert litres.loc[("IND", 2511), ["litres", "tier"]].tolist() == [650e3, 4]
    assert litres.loc[("IND", 2513), ["litres", "tier"]].tolist() == [650e3, 5]
    assert W.scarcity_rows(hestia_rows, ["FRA", "IND"]).values.tolist() == [["FRA", 2511, 9e5]]


def test_water_json_indexes_the_sources_and_leaves_out_zeros():
    litres = pd.DataFrame(
        {
            "iso3": ["FRA", "FRA"],
            "fbs_code": [2511, 2731],
            "litres": [301234.0, 0.0],
            "tier": [1, 4],
            "source": ["h", "pn"],
        }
    )
    scarcity = pd.DataFrame({"iso3": ["FRA"], "fbs_code": [2511], "scarcity": [9e5]})
    cake = pd.DataFrame({"iso3": ["BRA"], "primary_code": [2555], "co2": [2.4e11]})
    data = W.water_json(litres, scarcity, cake, {"FRA": 2.9e6, "NGA": 0.0})
    assert data == {
        "sources": ["h", "pn"],
        "byCountry": {"FRA": {"2511": [301000.0, 1, 0], "2731": [0.0, 4, 1]}},
        "scarcity": {"FRA": {"2511": 900000.0}},
        "oilcake": {"BRA": {"2555": 2.4e11}},
        "irrigatedHa": {"FRA": 2.9e6},
    }


def test_aquastat_agriculture_is_the_total_times_its_share():
    total = [{"countryiso3code": "WLD", "value": 3853.0}, {"countryiso3code": "FRA", "value": None}]
    share = [{"countryiso3code": "WLD", "value": 71.0}, {"countryiso3code": "FRA", "value": 10.0}]
    assert W.aquastat_agriculture(total, share) == {"WLD": pytest.approx(3853.0 * 0.71 * 1e12)}
