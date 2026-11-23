"""Intensities from Poore & Nemecek (2018), split into gases (docs/methodology/en/literature.md)."""

from __future__ import annotations

import logging
import zipfile
from pathlib import Path

import pandas as pd

from ..cache import fetched
from . import hestia

log = logging.getLogger(__name__)

SOURCE_URL = "https://doi.org/10.1126/science.aaq0216"
TERMS_CSV = Path(__file__).resolve().parents[2] / "literature_terms.csv"
GLE_URL = "https://bulks-faostat.fao.org/production/Emissions_livestock_E_All_Data_(Normalized).zip"
SOURCES = [
    {
        "id": "poore-nemecek-2018",
        "name": "Poore & Nemecek, Science 2018, data S2",
        "version": "2018",
        "url": SOURCE_URL,
        "licence": "CC BY 4.0",
    }
]

GASES = hestia.GASES
SCOPES = hestia.SCOPES
COLUMNS = hestia.COLUMNS
# IPCC AR5 GWP100 with climate-carbon feedbacks, as Poore & Nemecek used.
GWP100 = {"co2": 1.0, "ch4": 34.0, "n2o": 298.0}

WORLD_AREA_CODE = 5000
ON_FARM_ELEMENTS = {
    72254: "ch4",  # enteric fermentation
    72256: "ch4",  # manure management
    72306: "n2o",  # manure management
    72300: "n2o",  # manure left on pasture
}


def co2e(gases: dict) -> float:
    return sum(gases[gas] * GWP100[gas] for gas in GASES)


def split(total_co2e: float, profile: dict) -> dict:
    """kg of each gas that make up total_co2e in the proportions of profile's CO2e."""
    weight = co2e(profile)
    return {gas: total_co2e * profile[gas] / weight if weight > 0 else 0.0 for gas in GASES}


def hestia_profiles(intensities: pd.DataFrame) -> dict:
    """(fbs item, scope) → mean kg of each gas per tonne: the World row, or the countries' mean."""
    return item_profiles(intensities) if not intensities.empty else {}


def item_profiles(intensities: pd.DataFrame) -> dict:
    """The World row of each item, else the mean of the countries'."""
    world = intensities[intensities.area == "World"]
    countries = intensities[intensities.area.str.len() == 3]
    rows = pd.concat([world, countries[~countries.fbs_item_code.isin(world.fbs_item_code)]])
    means = rows.groupby(["fbs_item_code", "scope"])[list(GASES)].mean()
    return {
        (int(code), scope): dict(values) for (code, scope), values in means.to_dict("index").items()
    }


def faostat_profiles(emissions: pd.DataFrame) -> dict:
    """Species → kg of each on-farm gas, world, latest year (FAOSTAT Emissions from livestock)."""
    world = emissions[
        (emissions["Area Code"] == WORLD_AREA_CODE)
        & emissions["Element Code"].isin(ON_FARM_ELEMENTS)
    ]
    return species_profiles(world) if not world.empty else {}


def species_profiles(world: pd.DataFrame) -> dict:
    """Species → kg of each gas, the latest year of the world's rows."""
    latest = world[world.Year == world.Year.max()].assign(
        gas=lambda frame: frame["Element Code"].map(ON_FARM_ELEMENTS)
    )
    totals = latest.groupby(["Item", "gas"]).Value.sum().unstack(fill_value=0.0)
    return {
        item: {gas: float(row.get(gas, 0.0)) for gas in GASES}
        for item, row in totals.to_dict("index").items()
    }


def scoped(farm_co2e: float, profile: str, hestia_by_item: dict, faostat_by_species: dict) -> dict:
    """kg of each gas per unit of the product, by scope, or {} when the profile is unknown."""
    kind, _, key = profile.partition(":")
    return (
        faostat_scoped(farm_co2e, faostat_by_species.get(key))
        if kind == "faostat"
        else hestia_scoped(
            farm_co2e,
            hestia_by_item.get((int(key), "cradleToFarmGate")),
            hestia_by_item.get((int(key), "farmGate")),
        )
    )


def faostat_scoped(farm_co2e: float, gases: dict | None) -> dict:
    """A FAOSTAT species' split, the same in both scopes."""
    return {scope: split(farm_co2e, gases) for scope in SCOPES} if gases else {}


def hestia_scoped(farm_co2e: float, cradle: dict | None, gate: dict | None) -> dict:
    """A HESTIA item's split in each scope, the farm gate scaled by its share of the cradle's."""
    return (
        {
            "cradleToFarmGate": split(farm_co2e, cradle),
            "farmGate": split(farm_co2e * co2e(gate) / co2e(cradle), gate),
        }
        if cradle and gate and co2e(cradle) > 0
        else {}
    )


def load_terms(path: Path = TERMS_CSV) -> pd.DataFrame:
    return pd.read_csv(path, dtype={"fbs_item_code": int})


def literature_rows(terms: pd.DataFrame, hestia_by_item: dict, faostat_by_species: dict) -> list:
    return [
        {
            "fbs_item_code": int(term.fbs_item_code),
            "scope": scope,
            "weight": float(term.weight_kt),
            **{gas: gases[gas] * float(term.kg_product_per_kg_item) * 1000 for gas in GASES},
        }
        for term in terms.itertuples()
        for scope, gases in scoped(
            float(term.farm_kg_co2e_per_kg), term.gas_profile, hestia_by_item, faostat_by_species
        ).items()
    ]


def combine(rows: list) -> pd.DataFrame:
    """Averages the products of one FBS item, weighted by their food and waste in 2009-11."""
    return (
        averaged(pd.DataFrame(rows))
        if rows
        else pd.DataFrame(columns=COLUMNS).astype({"fbs_item_code": int})
    )


def averaged(frame: pd.DataFrame) -> pd.DataFrame:
    """Each item's products averaged by their weight, per scope."""
    weighted = (
        frame[list(GASES)]
        .mul(frame.weight, axis=0)
        .assign(fbs_item_code=frame.fbs_item_code, scope=frame.scope, weight=frame.weight)
    )
    sums = weighted.groupby(["fbs_item_code", "scope"], as_index=False).sum()
    return (
        sums.assign(**{gas: sums[gas] / sums.weight for gas in GASES}, area="World", url=SOURCE_URL)
        .astype({"fbs_item_code": int})[COLUMNS]
        .sort_values(["fbs_item_code", "scope"])
        .reset_index(drop=True)
    )


def read_livestock_emissions(cache_dir: Path) -> pd.DataFrame:
    path = fetched(Path(cache_dir), GLE_URL)
    with zipfile.ZipFile(path) as archive:
        name = next(n for n in archive.namelist() if "All_Data" in n)
        return pd.read_csv(
            archive.open(name),
            encoding="latin-1",
            usecols=["Area Code", "Element Code", "Item", "Year", "Value"],
        )


def fetch_literature_intensities(cache_dir: Path) -> pd.DataFrame:
    """kg of CO2, CH4 and N2O per tonne of each FBS item, world averages from Poore & Nemecek."""
    rows = literature_rows(
        load_terms(),
        hestia_profiles(hestia.fetch_intensities(cache_dir)),
        faostat_profiles(read_livestock_emissions(cache_dir)),
    )
    return combine(rows)
