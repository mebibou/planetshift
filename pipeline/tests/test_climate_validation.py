"""Checks of the climate build against observations and published numbers.

They run FaIR on the first MEMBERS members of the calibrated ensemble, from the cache."""

import json

import numpy as np
import pytest

from planetshift_pipeline import climate, climate_fair
from planetshift_pipeline.cache import DEFAULT_CACHE
from planetshift_pipeline.sources import primap, rcmip, temperature

MEMBERS = 100
REQUIRED = [
    DEFAULT_CACHE / "rcmip" / "rcmip-emissions-annual-means-v5-1-0.csv",
    DEFAULT_CACHE / "primap" / primap.URL.rsplit("/", 1)[1],
]

pytestmark = pytest.mark.network


@pytest.fixture(scope="module")
def built():
    if not all(p.exists() for p in REQUIRED):
        pytest.skip("RCMIP or PRIMAP-hist not downloaded")
    return climate.build(DEFAULT_CACHE, members=MEMBERS, diagnostics=True)


def window_mean(diagnostics: dict, ssp: str, part: str, first: int, last: int) -> np.ndarray:
    years = diagnostics["years"]
    keep = (years >= first) & (years <= last)
    return diagnostics["by_cause"][ssp][part][keep].mean(axis=0)


def test_document_matches_the_contract(built):
    document, _ = built
    assert set(document) == {
        "observed",
        "agtp",
        "scenarioTemperature",
        "agricultureEmissions",
        "attribution",
        "attributionByGas",
        "naturalOnly",
        "permafrost",
        "shippingSulphur2020",
    }
    for method in ("fair", "ar6"):
        for gas in climate.AGTP_GASES:
            curve = document["agtp"][method][gas]
            assert len(curve["median"]) == len(curve["p05"]) == climate.HORIZON + 1
    for ssp in climate.SSPS:
        scenario = document["scenarioTemperature"][ssp]
        assert scenario["years"][0] == 1850 and scenario["years"][-1] == 2100
        emitted = document["agricultureEmissions"][ssp]["ch4"]
        assert emitted["years"][0] == 1850 and emitted["years"][-1] == 2100
        for part in document["attribution"][ssp].values():
            assert part["years"][-1] == 2100
            assert len(part["median"]) == len(part["years"])
        by_gas = document["attributionByGas"][ssp]
        assert set(by_gas["co2"]) == {"fossilIndustry", "agriculture", "landUse", "other"}
        assert set(by_gas["ch4"]) == {"fossilIndustry", "agriculture", "waste", "burning", "other"}
        assert set(by_gas["n2o"]) == {"fossilIndustry", "agriculture", "waste", "other"}
        assert {"waste", "landAlbedo"} <= set(document["attribution"][ssp])
        assert set(by_gas["hfc"]) == {"other"}
        assert by_gas["co2"]["landUse"] == document["attribution"][ssp]["landUse"]
    assert len(json.dumps(document, separators=(",", ":"))) < 1_000_000


def test_fair_reproduces_observed_warming_of_the_last_decade(built):
    """FaIR's median warming over 2015–2024 is within 0.1 °C of HadCRUT5's, and HadCRUT5's lies
    inside FaIR's 5–95% range."""
    _, diagnostics = built
    years, observed = temperature.hadcrut5(DEFAULT_CACHE)
    seen = observed[(years >= 2015) & (years <= 2024)].mean()
    modelled = window_mean(diagnostics, "ssp245", "total", 2015, 2024)
    assert 1.1 < seen < 1.35
    assert abs(np.median(modelled) - seen) < 0.1
    assert np.percentile(modelled, 5) < seen < np.percentile(modelled, 95)


def test_fair_reproduces_the_assessed_warming_of_the_last_decade(built):
    """Indicators of Global Climate Change 2024 (Forster et al. 2025) assess the observed warming
    over 2015–2024 at 1.24 °C (1.11–1.35), from four records; FaIR's median lies inside that
    range."""
    _, diagnostics = built
    modelled = window_mean(diagnostics, "ssp245", "total", 2015, 2024)
    assert 1.11 < np.median(modelled) < 1.35
    assert abs(np.median(modelled) - 1.24) < 0.1


def test_natural_factors_alone_warm_little_over_2010_2019(built):
    """AR6 WG1 SPM (Figure SPM.2) assesses the change from solar and volcanic drivers between
    1850–1900 and 2010–2019 at −0.1 to +0.1 °C."""
    document, diagnostics = built
    natural = document["naturalOnly"]
    assert natural["years"][0] == 1850 and natural["years"][-1] == 2100
    years = diagnostics["years"]
    decade = diagnostics["natural"][(years >= 2010) & (years <= 2019)].mean(axis=0)
    assert -0.1 < np.median(decade) < 0.1


def test_agriculture_share_of_present_warming_is_in_the_published_range(built):
    """Direct livestock CH₄ and N₂O made about 19% of modelled warming in 2010
    (doi:10.1111/gcb.13975); with FaIR, agricultural CH₄ alone made about 0.19 °C of about 1.06 °C
    in 2010–2019, 18% (the 2024 report to New Zealand's Parliamentary Commissioner for the
    Environment). All agriculture, here, must give 12–30% and 0.12–0.30 °C over 2010–2019."""
    _, diagnostics = built
    agriculture = np.median(window_mean(diagnostics, "ssp245", "agriculture", 2010, 2019))
    total = np.median(window_mean(diagnostics, "ssp245", "total", 2010, 2019))
    assert 0.12 < agriculture < 0.30
    assert 0.12 < agriculture / total < 0.30


def test_waste_and_land_albedo_are_in_the_published_range(built):
    """Reisinger (2024, for New Zealand's Parliamentary Commissioner for the Environment) finds
    waste methane made about 0.08 °C of present warming with FaIR; waste here must make
    0.04–0.10 °C over 2015–2024. AR6 WG1 assesses land use's albedo and irrigation forcing at
    about −0.2 W m⁻² in 2019, so its effect must be a cooling of 0.04–0.15 °C."""
    _, diagnostics = built
    waste = np.median(window_mean(diagnostics, "ssp245", "waste", 2015, 2024))
    albedo = np.median(window_mean(diagnostics, "ssp245", "landAlbedo", 2015, 2024))
    assert 0.04 < waste < 0.10
    assert -0.15 < albedo < -0.04


def test_hfcs_warm_as_little_as_their_forcing_today(built):
    """AR6 WG1 Table 7.5 puts the HFCs' effective radiative forcing in 2019 at 0.04 W m⁻², about
    a fiftieth of CO₂'s; their warming over 2015–2024 must be 0.005–0.04 °C, and grow by 2100."""
    _, diagnostics = built
    hfc = diagnostics["by_gas"]["ssp245"]["hfc"]
    years = diagnostics["years"]
    now = np.median(hfc["total"][(years >= 2015) & (years <= 2024)].mean(axis=0))
    assert 0.005 < now < 0.04
    assert np.median(hfc["total"][years == 2100]) > now


def test_future_food_warming_compares_with_the_2023_food_consumption_study(built):
    """The 2023 food-consumption study (doi:10.1038/s41558-023-01605-8; preprint
    doi:10.21203/rs.3.rs-1964969/v1, CC BY 4.0) finds that food consumption at today's per-capita
    diets, growing with population, adds 0.7 ± 0.2 to 0.9 ± 0.2 °C by 2100 from emissions after
    2020, including the food chain's energy CO₂. Agriculture and land use from 2020 on, on
    SSP2-4.5 (whose agricultural emissions barely grow and whose land-use CO₂ falls to near zero),
    must warm by less than their upper bound and by at least a quarter of their lower one; SSP3-7.0
    (their baseline's socio-economics) must warm more."""
    _, diagnostics = built
    years = diagnostics["years"]
    food = {
        ssp: np.median(diagnostics["future_food"][ssp][years == 2100][0])
        for ssp in ("ssp245", "ssp370")
    }
    assert 0.25 * 0.7 < food["ssp245"] < 0.9 + 0.2
    assert food["ssp370"] > food["ssp245"]


def test_causes_are_nearly_additive(built):
    _, diagnostics = built
    years = diagnostics["years"]
    for ssp in climate.SSPS:
        gap = diagnostics["additivity_gap"][ssp][(years >= 1850) & (years <= 2050)]
        assert np.abs(gap).max() < 0.1


@pytest.mark.parametrize("gas", ["co2", "ch4", "n2o"])
def test_pulses_are_linear_within_one_percent(built, gas):
    _, diagnostics = built
    pulses = diagnostics["pulses"]
    small = pulses[climate.pulse_key(gas, climate.PULSE_YEAR, 1.0)]
    large = pulses[climate.pulse_key(gas, climate.PULSE_YEAR, 10.0)]
    assert climate.relative_spread(large, small) < 0.01


@pytest.mark.parametrize("gas", ["co2", "ch4", "n2o", "hfc"])
def test_agtp_is_stable_across_pulse_years_within_ten_percent(built, gas):
    _, diagnostics = built
    assert climate.year_spread(diagnostics["pulses"], gas) < 0.10


def test_methane_agtp_peaks_within_fifteen_years_and_decays(built):
    document, _ = built
    curve = np.array(document["agtp"]["fair"]["ch4"]["median"])
    peak = int(np.argmax(curve))
    assert 2 <= peak <= 15
    assert curve[50] < 0.4 * curve[peak]
    assert curve[100] < 0.15 * curve[peak]


def test_co2_agtp_is_roughly_flat_after_its_first_decade(built):
    document, _ = built
    curve = np.array(document["agtp"]["fair"]["co2"]["median"])
    settled = curve[10:101]
    assert settled.max() / settled.min() < 1.5


@pytest.mark.parametrize("gas", ["co2", "ch4", "n2o", "hfc"])
def test_fair_and_ar6_agtp_agree_within_a_factor_of_two_and_a_half(built, gas):
    """Same order of magnitude at 20, 50 and 100 years. They agree within about 25% at 20 years;
    FaIR's CH₄ curve has a longer tail (about twice AR6's at 50 years), from its ensemble's larger
    slow climate response rather than its carbon cycle (it stays with that feedback turned off)."""
    document, _ = built
    fair = np.array(document["agtp"]["fair"][gas]["median"])
    ar6 = np.array(document["agtp"]["ar6"][gas]["median"])
    for horizon in (20, 50, 100):
        assert 0.4 < fair[horizon] / ar6[horizon] < 2.5


def test_methane_pulse_adds_no_oxidation_co2():
    """Agricultural CH₄ is biogenic: a CH₄ pulse must not add the CO₂ its carbon would make if it
    were fossil. With the effect of warming on carbon uptake turned off, a CH₄ pulse leaves CO₂
    exactly unchanged, while a pulse of the CO₂ its full oxidation would give (44.01/16.043 kg per
    kg) does not."""
    if not REQUIRED[0].exists():
        pytest.skip("RCMIP not downloaded")
    setup = climate_fair.load_setup(DEFAULT_CACHE, members=10)
    years = np.arange(climate_fair.START, 2061)
    base = rcmip.fair_emissions(rcmip.load(DEFAULT_CACHE), "ssp245", setup.emitted, years)
    ch4_mt = 10.0
    oxidised_gt = ch4_mt * 44.01 / 16.043 / 1e3
    runs = climate_fair.run(
        setup,
        {
            "base": base,
            "ch4": climate.pulsed(base, "ch4", 2025, ch4_mt),
            "co2": climate.pulsed(base, "co2", 2025, oxidised_gt),
        },
        2061,
        carbon_feedback=False,
    )
    after = runs.years == 2045
    from_ch4 = np.median(runs.co2[after, 1] - runs.co2[after, 0])
    from_co2 = np.median(runs.co2[after, 2] - runs.co2[after, 0])
    assert from_co2 > 0
    assert from_ch4 == 0


def convolved(emissions: dict[str, np.ndarray], agtp: dict[str, np.ndarray]) -> np.ndarray:
    """ΔT(t) = Σ_gas Σ_τ≤t E(τ)·AGTP(t−τ), the browser's convolution, over the whole history."""
    n = len(emissions["ch4"])
    return sum(np.convolve(emissions[g], agtp[g])[:n] for g in ("co2", "ch4", "n2o"))


def test_agtp_convolution_of_agricultural_emissions_matches_fair_attribution(built):
    """The plan's cross-check: convolving agriculture's emissions with the AGTP curves gives
    agriculture's warming in 2010–2019 within 20% of the full FaIR attribution. The curves come from
    a 2035 background, so they misjudge the response to 19th-century emissions; that, and FaIR's
    non-linearity, set the tolerance."""
    document, diagnostics = built
    years = diagnostics["years"]
    agtp = {
        g: np.concatenate([document["agtp"]["fair"][g]["median"], np.zeros(len(years))])
        for g in ("co2", "ch4", "n2o")
    }
    warming = climate.anomaly(years, convolved(diagnostics["agriculture"]["ssp245"], agtp))
    recent = (years >= 2010) & (years <= 2019)
    attributed = np.median(window_mean(diagnostics, "ssp245", "agriculture", 2010, 2019))
    assert warming[recent].mean() == pytest.approx(attributed, rel=0.2)


def test_the_natural_forcing_has_hunga_tonga_and_solar_cycle_25():
    """The facts docs/methodology/en/climate.md gives: each calendar year's mean sits at the end of
    the year, the volcanic series ends in 2022 with the eruption, cycle 25 peaks in 2024."""
    if not (DEFAULT_CACHE / "fair" / "volcanic_solar.csv").exists():
        pytest.skip("FaIR's natural forcing not downloaded")
    forcing = climate_fair.load_setup(DEFAULT_CACHE, members=1).natural_forcing

    def calendar(variable: str, year: int) -> float:
        return float(forcing[forcing["Variable"] == variable][str(year + 1)].iloc[0])

    assert calendar("Volcanic", 2021) - calendar("Volcanic", 2022) == pytest.approx(0.10, abs=0.01)
    assert calendar("Volcanic", 2023) == pytest.approx(calendar("Volcanic", 2022))
    assert calendar("Volcanic", 2032) == 0
    solar = {y: calendar("Solar", y) for y in range(2019, 2030)}
    assert max(solar, key=solar.get) == 2024
    assert solar[2024] == pytest.approx(0.09, abs=0.005)
    assert solar[2019] == pytest.approx(-0.02, abs=0.005)
