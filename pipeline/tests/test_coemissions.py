"""The co-emissions build: ratios from CEDS-shaped frames, how they change, the forcing per kg and
its linearisation, and (marked `network`) the built file against inventories and FaIR itself.

Recent totals: methane from fossil fuel supply about 120–135 Mt in 2022 (IEA Global Methane
Tracker 2023: about 120 Mt from oil, gas and coal; CEDS 131 Mt); power plants about 30 Mt of SO₂
(CEDS), for about 14 Gt of CO₂."""

import numpy as np
import pandas as pd
import pytest

from planetshift_pipeline import climate, climate_fair, sectors
from planetshift_pipeline import coemissions as C
from planetshift_pipeline.cache import DEFAULT_CACHE
from planetshift_pipeline.climate import SSPS
from planetshift_pipeline.sources import ceds, rcmip

G = 1e-3
MT = 1e9


def table(rows: list[tuple[str, str, float]]) -> pd.DataFrame:
    return pd.DataFrame(rows, columns=["sector", "fuel", "kg"])


def tables(by_species: dict[str, list[tuple[str, str, float]]]) -> dict[str, pd.DataFrame]:
    empty = table([])
    return {s: table(by_species[s]) if s in by_species else empty for s in ("co2", *C.SPECIES)}


ROAD = "1A3b_Road"
POWER = "1A1a_Electricity-public"


def test_a_sector_counts_its_fossil_fuels_only():
    t = tables(
        {
            "co2": [(ROAD, "diesel_oil", 900.0), (ROAD, "natural_gas", 100.0)],
            "so2": [(ROAD, "diesel_oil", 3.0), (ROAD, "biomass", 50.0)],
            "nox": [(ROAD, "light_oil", 5.0), (ROAD, "process", 7.0)],
        }
    )
    own = C.own_per_kg(t, "roadPassenger")
    assert own["so2"] == pytest.approx(3 / 1000)
    assert own["nox"] == pytest.approx(5 / 1000)
    assert C.fuel_shares(t["co2"], "roadPassenger") == {"coal": 0.0, "oil": 0.9, "gas": 0.1}


def test_industry_counts_its_processes_and_aviation_none_of_its_own():
    t = tables(
        {
            "co2": [
                ("2A1_Cement-production", "process", 600.0),
                ("1A2f_Ind-Comb-Non-metalic-minerals", "hard_coal", 400.0),
                ("1A3ai_International-aviation", "light_oil", 100.0),
            ],
            "so2": [
                ("2A1_Cement-production", "process", 1.0),
                ("1A3ai_International-aviation", "light_oil", 1.0),
            ],
        }
    )
    assert C.own_per_kg(t, "industry")["so2"] == pytest.approx(1 / 1000)
    assert C.fuel_shares(t["co2"], "industry")["coal"] == pytest.approx(0.4)
    assert C.own_per_kg(t, "aviation")["so2"] == 0


def test_fuel_supply_is_shared_by_the_co2_of_burning_each_fuel():
    t = tables(
        {
            "co2": [(POWER, "hard_coal", 1000.0), (ROAD, "diesel_oil", 500.0)],
            "ch4": [
                ("1B1_Fugitive-solid-fuels", "process", 4.0),
                ("1B2_Fugitive-petr", "process", 2.5),
            ],
        }
    )
    supply = C.supply_per_kg(t)
    assert supply["coal"]["ch4"] == pytest.approx(4 / 1000)
    assert supply["oil"]["ch4"] == pytest.approx(2.5 / 500)
    upstream = C.upstream_per_kg({"coal": 0.5, "oil": 0.5, "gas": 0.0}, supply)
    assert upstream["ch4"] == pytest.approx(0.5 * 0.004 + 0.5 * 0.005)


def test_an_emission_factor_follows_the_ssp_but_never_worsens_and_is_held_once_co2_halves():
    co2 = np.array([10.0, 10.0, 8.0, 4.0, 1.0])
    species = np.array([2.0, 1.0, 0.8, 0.8, 0.9])
    assert C.held_trend(species, co2) == pytest.approx([1.0, 0.5, 0.5, 0.5, 0.5])
    assert C.held_trend(np.array([1.0, 2.0]), np.array([1.0, 1.0])) == pytest.approx([1, 1])


def test_the_cloud_slope_is_the_derivative_of_faris_log_and_close_to_a_real_cut():
    parameters = pd.DataFrame(
        {
            "aci_shape[Sulfur]": [0.01, 0.005],
            "aci_shape[BC]": [0.0, 0.02],
            "aci_shape[OC]": [0.001, 0.0],
            "aci_scale": [-1.0, -0.6],
            "erfari_radiative_efficiency[Sulfur]": [-0.003, -0.002],
            "erfari_radiative_efficiency[BC]": [0.03, 0.02],
            "erfari_radiative_efficiency[OC]": [-0.004, -0.005],
            "erfari_radiative_efficiency[NOx]": [-0.0001, -0.0001],
            "ozone_radiative_efficiency[NOx]": [0.001, 0.0015],
            "forcing_scale[Light absorbing particles on snow and ice]": [1.0, 0.5],
        }
    )
    species = pd.DataFrame({"lapsi_radiative_efficiency": [0.014]}, index=["BC"])
    totals = {"Sulfur": np.array([80.0]), "BC": np.array([6.0]), "OC": np.array([15.0])}
    erf = C.erf_per_kg(parameters, species, totals)
    shapes = {s: parameters[f"aci_shape[{s}]"].to_numpy() for s in ("Sulfur", "BC", "OC")}
    scale = parameters["aci_scale"].to_numpy()

    def aci(sulfur: float) -> np.ndarray:
        return C.aci_forcing(scale, shapes, {"Sulfur": sulfur, "BC": 6.0, "OC": 15.0})

    slope = (aci(80.0 + 1e-4) - aci(80.0 - 1e-4)) / 2e-4
    ari = parameters["erfari_radiative_efficiency[Sulfur]"].to_numpy()
    assert erf["so2"][0] * MT == pytest.approx(ari + slope, rel=1e-6)
    # Removing a quarter of the world's SO₂ at once: the linear slope is within a tenth.
    exact = aci(60.0) - aci(80.0)
    assert (erf["so2"][0] * MT - ari) * -20 == pytest.approx(exact, rel=0.1)
    assert erf["bc"][0] * MT == pytest.approx([0.03 + 0.014, 0.02 - 0.6 * 0.02 / 1.52 + 0.007])
    assert erf["nox"][0] * MT == pytest.approx([0.0009, 0.0014])


def test_a_sectors_particle_forcing_is_added_up_member_by_member():
    ratios = {"shipping": {"so2": np.array([2.0]), "bc": np.array([1.0]), "oc": np.array([0.0])}}
    erf = {
        "so2": np.array([[-1.0, -3.0]]),
        "bc": np.array([[3.0, 1.0]]),
        "oc": np.array([[0.0, 0.0]]),
    }
    assert C.particle_erf_per_kg_co2(ratios, erf)["shipping"][0] == pytest.approx([1.0, -5.0])


def test_ships_nox_does_about_four_times_roads_and_the_places_average_to_faris_coefficient():
    ratio = C.ship_to_land()
    assert ratio["median"] == pytest.approx(4.0, abs=0.05)
    assert ratio["low"] < 3 < ratio["median"] < ratio["high"] < 6
    share = np.array([0.15, 0.05])
    f = C.nox_factors(share, ratio)
    for end in ("median", "low", "high"):
        average = (1 - share) * f["land"][end] + share * f["sea"][end]
        assert average == pytest.approx([1, 1])
    assert f["land"]["median"][0] < 1 < f["sea"]["median"][0]


def test_a_sectors_nox_methane_is_its_nox_times_its_places_factor():
    ratios = {"shipping": {"nox": np.array([0.02])}, "electricity": {"nox": np.array([0.001])}}
    kept = np.array([[1.0, 2.0, 3.0]])
    factors = {
        "land": {"median": np.array([0.7]), "low": np.array([0.8]), "high": np.array([0.6])},
        "sea": {"median": np.array([2.8]), "low": np.array([2.2]), "high": np.array([3.5])},
    }
    out = C.nox_ch4_per_kg_co2(ratios, kept, factors)
    assert out["electricity"]["median"][0] == pytest.approx(0.001 * 2 * 0.7)
    assert out["shipping"]["median"][0] == pytest.approx(0.02 * 2 * 2.8)
    assert out["shipping"]["low"][0] < out["shipping"]["median"][0] < out["shipping"]["high"][0]


def test_less_nox_leaves_more_methane_in_proportion_to_its_removal():
    sink = C.methane_sink(np.array([[100.0], [110.0], [120.0]]), np.array([60.0] * 3), 40.0)
    assert sink[:, 0] == pytest.approx([10.0, 10.0, 10.0])
    kept = C.nox_methane(np.array([[300.0]]), np.array([120.0]), 20.0, -0.004)
    assert kept[0, 0] == pytest.approx(300 * 0.004 / (1 - 0.4))


REQUIRED = [
    DEFAULT_CACHE / "ceds" / ceds.FILE,
    DEFAULT_CACHE / "rcmip" / "rcmip-emissions-annual-means-v5-1-0.csv",
]


@pytest.fixture(scope="module")
def built():
    if not all(p.exists() for p in REQUIRED):
        pytest.skip("CEDS or RCMIP not downloaded")
    return C.build(DEFAULT_CACHE, members=100)


@pytest.mark.network
def test_the_file_matches_the_contract(built):
    document, _ = built
    assert set(document) == {
        "years",
        "perKgCo2",
        "erfPerKg",
        "noxCh4PerKg",
        "noxCh4PerKgCo2",
        "noxPlaceFactor",
        "particleErfPerKgCo2",
        "source",
    }
    n = len(document["years"])
    for ssp in SSPS:
        assert set(document["perKgCo2"][ssp]) == set(C.SECTORS)
        for by_species in document["perKgCo2"][ssp].values():
            assert all(len(v) == n and min(v) >= 0 for v in by_species.values())
        erf = document["erfPerKg"][ssp]
        assert max(erf["so2"]["median"]) < 0 < min(erf["bc"]["median"])
        assert max(erf["oc"]["median"]) < 0
        for band in erf.values():
            assert all(
                lo <= m <= hi
                for lo, m, hi in zip(band["low"], band["median"], band["high"], strict=True)
            )


@pytest.mark.network
def test_base_year_ratios_meet_the_inventories(built):
    _, diagnostics = built
    base, supply = diagnostics["base"], diagnostics["supply"]
    t = C.load_tables(ceds.path(DEFAULT_CACHE))
    supply_mt = sum(
        t["ch4"][t["ch4"]["sector"].isin(s)]["kg"].sum() for s in C.SUPPLY_SECTORS.values()
    )
    assert 110 * MT < supply_mt < 145 * MT
    assert 3 * G < supply["coal"]["ch4"] < supply["oil"]["ch4"] < supply["gas"]["ch4"] < 6 * G
    assert base["electricity"]["own"]["so2"] == pytest.approx(2.3 * G, rel=0.1)
    assert base["shipping"]["own"]["nox"] > base["roadPassenger"]["own"]["nox"]
    assert base["industry"]["supply"]["ch4"] < base["electricity"]["supply"]["ch4"]


def convolve(values: np.ndarray, response: np.ndarray) -> np.ndarray:
    return np.array([np.dot(values[: t + 1], response[t::-1]) for t in range(len(values))])


@pytest.mark.network
def test_forcing_per_kg_and_nox_methane_reproduce_faris_own_response(built):
    """A cut of SO₂, black carbon or NOx held from 2025 under SSP2-4.5: the linear model (forcing
    per kg × the response to a year of forcing, NOx's methane through methane's AGTP) against
    FaIR run with the cut, medians within a sixth (a quarter for black carbon, whose members
    disagree even on the sign of its forcing, so a median of products is far from the product of
    medians)."""
    document, _ = built
    setup = climate_fair.load_setup(DEFAULT_CACHE, 100)
    df = rcmip.load(DEFAULT_CACHE)
    years = np.arange(climate_fair.START, climate.PULSE_YEAR + climate.HORIZON + 1)
    base = rcmip.fair_emissions(df, "ssp245", setup.emitted, years)
    cuts = {"so2": ("Sulfur", 10.0), "bc": ("BC", 1.0), "nox": ("NOx", 10.0)}

    def cut(specie: str, size: float) -> dict[str, np.ndarray]:
        return base | {specie: base[specie] - np.where(years >= 2025, size, 0.0)}

    run = climate_fair.run(setup, {"base": base} | {k: cut(*v) for k, v in cuts.items()}, 2102)
    response = np.median(sectors.forcing_runs(setup, base, (1.0,))[1.0], axis=-1)
    agtp = np.median(
        climate.pulse_runs(setup, base, [("ch4", climate.PULSE_YEAR, 1.0)], climate.HORIZON)[
            climate.pulse_key("ch4", climate.PULSE_YEAR, 1.0)
        ],
        axis=-1,
    )
    span = np.arange(2025, 2101)
    at = (span - 2025)[[25, 75]]
    for i, (name, (_, size)) in enumerate(cuts.items(), start=1):
        faired = np.median(run.temperature[:, i, :] - run.temperature[:, 0, :], axis=-1)
        faired = faired[span - climate_fair.START]
        erf = np.interp(span, document["years"], document["erfPerKg"]["ssp245"][name]["median"])
        linear = convolve(erf * size * MT * -1, response)
        if name == "nox":
            kept = np.interp(span, document["years"], document["noxCh4PerKg"]["ssp245"]["median"])
            linear = linear + convolve(kept * size * MT, agtp)
        assert linear[at] == pytest.approx(faired[at], rel=1 / 4 if name == "bc" else 1 / 6), name
