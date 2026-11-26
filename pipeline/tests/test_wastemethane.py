"""The waste methane build: CEDS's sectors by country, the managed share and the factors.

CEDS v_2024_07_08 gives, in 2022, 38.1 Mt of landfill methane and 41.9 Mt of wastewater methane,
of 82.1 Mt for every waste sector."""

import pandas as pd
import pytest

from planetshift_pipeline import wastemethane as M

KG = 1e6


def ceds_table(rows: list[tuple[str, str, float]]) -> pd.DataFrame:
    return pd.DataFrame(rows, columns=["iso3", "sector", "kg"])


def treatment(landfill: float, dump: float, uncollected: float) -> dict[str, float]:
    return {
        "landfill": landfill,
        "openDump": dump,
        "incineration": 0.0,
        "recycling": 0.0,
        "composting": 0.0,
        "other": 1 - landfill - dump - uncollected,
        "uncollected": uncollected,
    }


def test_the_managed_share_is_landfill_over_all_that_is_buried_or_left():
    assert M.managed_share(treatment(0.6, 0.2, 0.2)) == pytest.approx(0.6)
    assert M.managed_share(treatment(0.0, 0.0, 0.0)) == 1.0


def test_a_country_without_what_a_waste_takes_the_world_share_weighted_by_landfill_methane():
    landfill = pd.Series({"AAA": 3.0, "BBB": 1.0, "CCC": 5.0})
    solidwaste = {
        "byCountry": {
            "AAA": {"treatment": treatment(1.0, 0.0, 0.0)},
            "BBB": {"treatment": treatment(0.2, 0.8, 0.0)},
            "ZZZ": {"treatment": treatment(0.0, 1.0, 0.0)},
        }
    }
    shares = M.managed_shares(solidwaste, landfill)
    assert shares["AAA"] == 1.0
    assert shares["CCC"] == pytest.approx((3 * 1.0 + 1 * 0.2) / 4)
    assert "ZZZ" not in shares


def test_each_country_keeps_its_landfill_and_wastewater_and_the_rest_counts_in_the_total():
    table = ceds_table(
        [
            ("AAA", M.SECTORS["landfill"], 2 * KG),
            ("AAA", M.SECTORS["wastewater"], 3 * KG),
            ("AAA", "5C_Waste-combustion", 1 * KG),
            ("BBB", M.SECTORS["wastewater"], 4 * KG),
            ("CCC", M.SECTORS["landfill"], 0.0),
        ]
    )
    doc = M.document(table, {"byCountry": {}}, {})
    assert doc["byCountry"] == {
        "AAA": {"landfill": 2 * KG, "wastewater": 3 * KG, "managed": 1.0},
        "BBB": {"landfill": 0.0, "wastewater": 4 * KG, "managed": 1.0},
    }
    assert doc["total"] == 10 * KG


def test_the_factors_are_ranges_and_the_decay_a_time_constant():
    assert M.decay_years() == {"median": 11.11, "low": 20.0, "high": 5.88}
    for r in (M.CAPTURE, M.DIVERSION, M.WASTEWATER_CUT):
        assert 0 < min(r.values()) <= r["median"] <= max(r.values()) < 1
