"""Fish and seafood intensities: wild capture and aquaculture blended by each country's production
(docs/methodology/en/seafood.md).

Capture burns fuel at sea (Parker et al. 2018, by species group); aquaculture emits N2O from the
water and uses energy on the farm (MacLeod et al. 2020). Feed is left out, as for livestock: it is
counted on the crops and fish that feed.json gives to seafood. Quantities are live weight, the
unit of FishStat and of the Food Balance Sheets' fish items.
"""

from pathlib import Path

import pandas as pd

from .intensities import GASES, SCOPES

HERE = Path(__file__).resolve().parent.parent
ISSCAAP_CSV = HERE / "seafood_isscaap.csv"
FACTORS_CSV = HERE / "seafood_factors.csv"

ITEMS = (2761, 2762, 2763, 2764, 2765, 2766, 2767, 2769)
YEARS = 3

PARKER = "https://doi.org/10.1038/s41558-018-0117-x"
MACLEOD = "https://doi.org/10.1038/s41598-020-68231-8"
SOURCES = [
    {
        "id": "parker-2018",
        "name": "Parker et al. (2018), Fuel use and greenhouse gas emissions of world fisheries, "
        "Nature Climate Change 8, 333-337, Table 1 and Methods",
        "version": "2018, fishing year 2011",
        "url": PARKER,
        "licence": "article under Springer Nature copyright; published figures reused with "
        "citation",
    },
    {
        "id": "macleod-2020",
        "name": "MacLeod et al. (2020), Quantifying greenhouse gas emissions from global "
        "aquaculture, Scientific Reports 10, 11679, Supplementary Tables D and E",
        "version": "2020, production year 2017",
        "url": MACLEOD,
        "licence": "CC BY 4.0",
    },
    {
        "id": "ember-2024",
        "name": "Ember, Global Electricity Review 2024 (world carbon intensity of electricity)",
        "version": "2024, year 2023",
        "url": "https://ember-energy.org/latest-insights/global-electricity-review-2024/",
        "licence": "CC BY 4.0",
    },
]

#: kg CO2 per litre of marine fuel burnt, and per litre for its extraction, refining and delivery
#: (Parker et al. 2018, Methods). Their 1.1 kg per litre for vessels, gear and refrigerants is left
#: out, as the making of tractors and buildings is for farms.
FUEL_COMBUSTION = 2.8
FUEL_UPSTREAM = 0.5
#: kg CO2 per MJ: diesel and petrol burnt (MacLeod et al. 2020, Supplementary Table E), and the
#: world's electricity, 480 g per kWh in 2023 (Ember, Global Electricity Review 2024).
DIESEL = 0.074
PETROL = 0.070
GRID = 0.480 / 3.6
#: N2O from the water of fish farms, 1.69 g N2O-N per kg of live weight produced (MacLeod et al.
#: 2020, after Hu et al. 2012), in kg N2O per tonne.
AQUATIC_N2O = 1.69 * 44 / 28


def load_isscaap(path: Path = ISSCAAP_CSV) -> pd.DataFrame:
    return pd.read_csv(path, dtype={"fbs_code": int})


def load_factors(path: Path = FACTORS_CSV) -> pd.DataFrame:
    df = pd.read_csv(path)
    numbers = ["fuel_l_per_t", "electricity_mj_per_t", "diesel_mj_per_t", "petrol_mj_per_t"]
    return df.assign(
        **{c: df[c].fillna(0.0) for c in numbers},
        fed=df["fed"].astype(str).str.lower() == "true",
    )


def per_tonne(factors: pd.DataFrame) -> pd.DataFrame:
    """kg of each gas per tonne of live weight by system, group and scope. Farm gate counts what
    happens in the water (aquatic N2O); cradle to farm gate adds the energy, as for crops and
    livestock, so wild capture has nothing at the farm gate."""
    capture = factors["system"] == "capture"
    energy = (
        factors["fuel_l_per_t"] * (FUEL_COMBUSTION + FUEL_UPSTREAM)
        + factors["electricity_mj_per_t"] * GRID
        + factors["diesel_mj_per_t"] * DIESEL
        + factors["petrol_mj_per_t"] * PETROL
    )
    n2o = (~capture).astype(float) * AQUATIC_N2O
    base = factors[["system", "group"]]
    return pd.concat(
        [
            base.assign(scope="farmGate", co2=0.0, ch4=0.0, n2o=n2o),
            base.assign(scope="cradleToFarmGate", co2=energy, ch4=0.0, n2o=n2o),
        ],
        ignore_index=True,
    )


def years(fishstat: pd.DataFrame, year: int) -> tuple[int, int]:
    """The YEARS years of FishStat up to `year` (or its latest year, if earlier)."""
    last = min(year, int(fishstat["year"].max()))
    return last - YEARS + 1, last


def window(fishstat: pd.DataFrame, year: int) -> pd.DataFrame:
    return fishstat[fishstat["year"].between(*years(fishstat, year))]


def classified(fishstat: pd.DataFrame, isscaap: pd.DataFrame) -> pd.DataFrame:
    """Production (iso3, fbs_code, system, group, tonnes) summed over the rows' years: capture
    by Parker et al.'s group (`inland` for inland waters), aquaculture by MacLeod et al.'s.
    Aquatic plants, mammals, crocodiles, pearls, corals and sponges have no group and drop out."""
    df = fishstat.merge(isscaap, on="isscaap_group")
    capture = df["system"] == "capture"
    group = df["aquaculture_group"].where(
        ~capture, df["capture_group"].where(~df["inland"], "inland")
    )
    return (
        df.assign(group=group)
        .groupby(["iso3", "fbs_code", "system", "group"], as_index=False)["tonnes"]
        .sum()
    )


def blended(production: pd.DataFrame, factors: pd.DataFrame) -> pd.DataFrame:
    """kg per tonne by (iso3, fbs_code, scope): the groups' factors weighted by the country's
    production of each, with its capture share."""
    rows = production[production["tonnes"] > 0].merge(per_tonne(factors), on=["system", "group"])
    weighted = rows.assign(
        **{g: rows[g] * rows["tonnes"] for g in GASES},
        captured=rows["tonnes"].where(rows["system"] == "capture", 0.0),
    )
    sums = weighted.groupby(["iso3", "fbs_code", "scope"], as_index=False)[
        [*GASES, "tonnes", "captured"]
    ].sum()
    return sums.assign(
        **{g: sums[g] / sums["tonnes"] for g in GASES},
        capture_share=sums["captured"] / sums["tonnes"],
    )[["iso3", "fbs_code", "scope", *GASES, "capture_share"]]


def source_text(capture_share: float, first: int, last: int) -> str:
    return (
        f"{PARKER} (capture fuel), {MACLEOD} (aquaculture); FAO FishStat {first}-{last}: "
        f"{capture_share:.0%} wild capture"
    )


def candidates(
    fishstat: pd.DataFrame,
    year: int,
    countries: list[str],
    isscaap: pd.DataFrame | None = None,
    factors: pd.DataFrame | None = None,
) -> pd.DataFrame:
    """Tier-4 intensities of the seafood items for each country with FishStat production of
    them; the merge gives the others a proxy item or the group's median."""
    rows = window(fishstat, year)
    first, last = years(fishstat, year)
    production = classified(rows, load_isscaap() if isscaap is None else isscaap)
    b = blended(production, load_factors() if factors is None else factors)
    b = b[b["iso3"].isin(countries)]
    return b.assign(
        tier=4,
        rank=0,
        source=[source_text(s, first, last) for s in b["capture_share"]],
    )[["iso3", "fbs_code", "scope", *GASES, "tier", "rank", "source"]].reset_index(drop=True)


def fed_aquaculture(
    fishstat: pd.DataFrame,
    year: int,
    isscaap: pd.DataFrame | None = None,
    factors: pd.DataFrame | None = None,
) -> pd.Series:
    """Tonnes a year of aquaculture of fed species by iso3 (bivalves and other filter feeders
    are not fed), the average of the window's years: what eats the aquafeed in feed.json."""
    rows = window(fishstat, year)
    production = classified(rows, load_isscaap() if isscaap is None else isscaap)
    f = load_factors() if factors is None else factors
    fed_groups = set(f.loc[(f["system"] == "aquaculture") & f["fed"], "group"])
    fed = production[(production["system"] == "aquaculture") & production["group"].isin(fed_groups)]
    return fed.groupby("iso3")["tonnes"].sum() / YEARS


def electricity_shares(production: pd.DataFrame, factors: pd.DataFrame) -> dict[int, float]:
    """fbs_code -> the share of its energy CO2 that is the electricity of fish farms, over the
    world's production of each group; capture burns fuel only."""
    rows = (
        production.groupby(["fbs_code", "system", "group"], as_index=False)["tonnes"]
        .sum()
        .merge(factors, on=["system", "group"])
    )
    electricity = rows["tonnes"] * rows["electricity_mj_per_t"] * GRID
    fuel = rows["tonnes"] * (
        rows["fuel_l_per_t"] * (FUEL_COMBUSTION + FUEL_UPSTREAM)
        + rows["diesel_mj_per_t"] * DIESEL
        + rows["petrol_mj_per_t"] * PETROL
    )
    sums = pd.DataFrame({"fbs_code": rows["fbs_code"], "e": electricity, "all": electricity + fuel})
    totals = sums.groupby("fbs_code")[["e", "all"]].sum()
    return {int(c): float(r.e / r["all"]) for c, r in totals.iterrows() if r["all"] > 0}


def co2_sources(electricity: float) -> dict[str, float]:
    return {k: v for k, v in {"fuel": 1 - electricity, "electricity": electricity}.items() if v > 0}


def breakdown_profiles(
    production: pd.DataFrame | None = None, items: tuple[int, ...] = ITEMS
) -> dict[tuple, dict[str, dict]]:
    """(fbs_code, scope) -> {gas: {source: share}}: CO2 is fuel and electricity, N2O the water of
    fish farms, which no other source names. Without production, CO2 is all fuel."""
    shares = electricity_shares(production, load_factors()) if production is not None else {}
    return {
        (code, scope): {"co2": co2_sources(shares.get(code, 0.0)), "n2o": {"other": 1.0}}
        for code in items
        for scope in SCOPES
    }


def world_totals(production: pd.DataFrame, factors: pd.DataFrame) -> dict[str, float]:
    """World tonnes, capture fuel (litres) and kg CO2e (AR6) of capture and aquaculture, from
    `classified` rows of one year, for the validation."""
    f = factors.set_index(["system", "group"])
    rows = production.join(f, on=["system", "group"])
    pt = per_tonne(factors).query("scope == 'cradleToFarmGate'").set_index(["system", "group"])
    rows = rows.join(pt[[*GASES]], on=["system", "group"])
    co2e = rows["co2"] + rows["ch4"] * 27 + rows["n2o"] * 273
    capture = rows["system"] == "capture"
    return {
        "captureTonnes": float(rows.loc[capture, "tonnes"].sum()),
        "aquacultureTonnes": float(rows.loc[~capture, "tonnes"].sum()),
        "captureLitres": float((rows["fuel_l_per_t"] * rows["tonnes"])[capture].sum()),
        "captureKgCo2e": float((co2e * rows["tonnes"])[capture].sum()),
        "aquacultureKgCo2e": float((co2e * rows["tonnes"])[~capture].sum()),
        "aquacultureKgN2o": float((rows["n2o"] * rows["tonnes"])[~capture].sum()),
    }
