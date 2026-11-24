import json
from pathlib import Path

import pytest

from planetshift_pipeline import deeptime as D

OUT = Path(__file__).resolve().parent.parent.parent / "app" / "public" / "data"

PHANDA = """Period,Epoch,Stage,UpperAge,LowerAge,AverageAge,GMST_05,GMST_16,GMST_50,GMST_84,GMST_95
Quaternary,Holocene,Holocene,0,0.0117,0.00585,13,13.5,14,14.5,15
Quaternary,Pleistocene,Upper Pleistocene,0.0117,0.129,0.07,10,10.5,11,11.5,12
"""
LGMR = """age_bp,gmst,gmst_sd
100,13.5,0.2
5100,13.0,0.2
13100,10.0,0.4
"""
AR6 = """60 to 0.02 Ma - Westerhold,,
Age (before 2000),GMST,Adjusted
0,-0.70,-0.34
24000,-5.0,-4.64
28000,-6.0,-5.64
34000,-3.0,-2.64
,,
"""
CENOGRID = """/* DATA DESCRIPTION:
Citation:\tWesterhold, T et al. (2020)
*/
Tuned time [Ma]\tForam benth δ18O [‰ PDB] (ISOBENbinned_d18O)\t\
Foram benth δ18O [‰ PDB] (ISOBENbinned_d18Ointerp)
0.000\t3.2\t3.2
0.034\t\t2.68
0.040\t1.5\t1.5
70.000\t0.5\t0.5
"""
PAGES = """Year CE,median,5,95
1900,0.1,0.0,0.2
1849,-0.1,-0.2,0.0
1845,-0.2,-0.3,-0.1
1843,-0.3,-0.4,-0.2
"""


def built() -> dict:
    return D.deeptime_json(D.parse_phanda(PHANDA), AR6, D.parse_lgmr(LGMR), PAGES, CENOGRID)


def test_lgmr_s_youngest_bin_is_the_baseline():
    data = built()
    assert data["offsets"]["lgmr"] == -13.5
    assert data["lgmr"]["years"] == [1950 - 13100, 1950 - 5100, 1850]
    assert data["lgmr"]["mean"][-1] == 0


def test_lgmr_s_band_is_its_sd_as_a_5_to_95_range():
    lgmr = built()["lgmr"]
    assert lgmr["p95"][-1] == pytest.approx(1.645 * 0.2, abs=0.01)
    assert lgmr["p05"][0] == pytest.approx(-3.5 - 1.645 * 0.4, abs=0.01)


def test_phanda_s_holocene_meets_lgmr_s_holocene_mean():
    data = built()
    holocene = (13.5 + 13.0) / 2 - 13.5
    assert data["offsets"]["phanda"] == pytest.approx(holocene - 14, abs=0.01)
    assert data["phanda"]["p50"][-1] == pytest.approx(holocene, abs=0.01)


def test_phanda_s_stages_run_oldest_first_in_years_ce():
    phanda = built()["phanda"]
    assert phanda["from"] == [1950 - 129_000, 1950 - 11_700]
    assert phanda["to"] == [1950 - 11_700, 1950]


def test_the_cenozoic_keeps_ar6_s_adjusted_values_before_lgmr_in_10_000_year_means():
    cenozoic = built()["cenozoic"]
    assert cenozoic["years"][-2:] == [2000 - 34_000, 2000 - 26_000]
    assert cenozoic["median"][-2:] == [-2.64, pytest.approx((-4.64 - 5.64) / 2)]


def test_cenogrid_s_interpolated_bins_are_read_in_years_before_2000():
    assert D.parse_cenogrid(CENOGRID) == [(0.0, 3.2), (34_000.0, 2.68), (40_000.0, 1.5), (7e7, 0.5)]


def test_ar6_s_pre_pliocene_formula_reproduces_its_values():
    # AR6's own values at 10, 20 and 33.5 Ma: 2.47, 3.77 and 2.52 °C before its 0.36 °C.
    assert D.early_cenozoic_warming(2.700) == pytest.approx(2.47 + 0.36)
    assert D.early_cenozoic_warming(2.212) == pytest.approx(3.77 + 0.36)
    assert D.early_cenozoic_warming(2.680) == pytest.approx(2.52 + 0.36)


def test_the_ice_free_early_cenozoic_uses_hansen_s_eq_3_1_and_meets_eq_3_5_at_1_75():
    assert D.early_cenozoic_warming(1.0) == pytest.approx(-4 + 12 + 0.36)
    assert D.early_cenozoic_warming(1.75 - 1e-9) == pytest.approx(D.early_cenozoic_warming(1.75))


def test_cenogrid_extends_ar6_only_beyond_its_last_age_and_to_the_cenozoic_s_start():
    ar6 = [(24_000.0, -4.64), (34_000.0, -2.64)]
    cenogrid = D.parse_cenogrid(CENOGRID)
    assert D.extended(ar6, cenogrid) == ar6 + [(40_000.0, D.early_cenozoic_warming(1.5))]


def test_pages2k_stops_before_the_instrumental_years_every_five_years():
    pages = built()["pages2k"]
    assert pages["years"] == [1845]
    assert pages["median"] == [-0.2]


def test_every_series_states_its_offset_and_the_baseline():
    data = built()
    assert data["baseline"] == "1850-1900"
    assert set(data["offsets"]) == {"phanda", "cenozoic", "lgmr", "pages2k"}


def test_the_built_file_spans_485_million_years_to_1850():
    path = OUT / "deeptime.json"
    if not path.exists():
        pytest.skip("not built")
    data = json.loads(path.read_text())
    assert data["phanda"]["from"][0] < -485e6
    assert len(data["phanda"]["p50"]) == 85
    assert data["lgmr"]["years"][-1] == 1850
    assert data["lgmr"]["mean"][-1] == 0
    assert data["pages2k"]["years"][-1] <= 1849
    years = data["cenozoic"]["years"]
    assert years == sorted(set(years))
    assert years[0] < 2000 - 65.9e6
