"""Species committed to extinction per hectare of cropland and pasture, by country, and the ocean's
fish with and without fishing (species.json).

Scherer et al. (2023) give each country's characterisation factors for land occupation as the
global fraction of each species group's species lost per m² (vulnerability weighted, scaled so
that a group cannot lose more than all its species). Times the group's described species (IUCN
Red List 2025-1, Table 1a) and summed over the five groups, they give species committed to
extinction per hectare: "average" for the land farmed today, "marginal" for land newly farmed.
LC-IMPACT v2 recommends these factors for land use; its own country table is not used, as its
global factors summed over the world's farmland come to more than all species
(docs/methodology/en/biodiversity.md).
"""

import pandas as pd

from .cache import fetched
from .intensities import significant

ZENODO = "https://zenodo.org/records/10114493"
URL = "https://zenodo.org/api/records/10114493/files/CF_country.csv/content"
FILE = "scherer-2023-CF_country.csv"

#: IUCN Red List 2025-1, Table 1a: described species. Plants are the vascular plants Scherer et
#: al. model: ferns and allies, gymnosperms and flowering plants.
DESCRIBED = {
    "Mammals": 6_736,
    "Birds": 11_195,
    "Reptiles": 12_386,
    "Amphibians": 8_863,
    "Plants": 11_800 + 1_113 + 369_000,
}

#: Scherer et al.'s habitats by use and intensity; for animals, light use is merged with intense
#: use ("LightIntense").
HABITATS = {
    ("cropland", "light"): {"Plants": "Cropland_Light", "animals": "Cropland_LightIntense"},
    ("pasture", "light"): {"Plants": "Pasture_Light", "animals": "Pasture_LightIntense"},
    ("pasture", "minimal"): {"Plants": "Pasture_Minimal", "animals": "Pasture_Minimal"},
}
USES = ("cropland", "pasture")

#: Ruminant livestock units per ha of pasture: at or below the first, pasture takes the minimal-use
#: factor (rangeland grazed at a few head per km²); at or above the second, the light-use one;
#: in between, a linear mix of the two.
MINIMAL_BELOW, LIGHT_ABOVE = 0.15, 0.6
APPROACHES = {"average": "CF_occ_avg_glo", "marginal": "CF_occ_mar_glo"}
M2_PER_HA = 1e4

#: Bianchi et al. (2021), Table 1: global biomass of the fish fisheries target (10 g to 100 kg),
#: tonnes wet weight, without fishing and at the global peak catch.
FISH = {"unfished": 3.3e9, "fished": 1.1e9}
FISH_URL = "https://doi.org/10.1126/sciadv.abd7554"

SOURCES = [
    {
        "id": "scherer-2023",
        "name": "Scherer et al. (2023), Biodiversity impact assessment considering land use "
        "intensities and fragmentation, Environ. Sci. Technol. 57, 19612-19623: country "
        "characterisation factors for land occupation (CF_country.csv), the land-use factors "
        "of LC-IMPACT v2",
        "version": "Zenodo record 10114493",
        "url": ZENODO,
        "licence": "CC BY 4.0",
    },
    {
        "id": "iucn-2025-1",
        "name": "IUCN Red List version 2025-1, Table 1a: number of described species",
        "version": "2025-1",
        "url": "https://www.iucnredlist.org/resources/summary-statistics",
        "licence": "IUCN summary statistics, figures cited",
    },
    {
        "id": "bianchi-2021",
        "name": "Bianchi et al. (2021), Estimating global biomass and biogeochemical cycling of "
        "marine fish with and without fishing, Science Advances 7, eabd7554, Table 1",
        "version": "2021, doi:10.1126/sciadv.abd7554",
        "url": FISH_URL,
        "licence": "article CC BY-NC 4.0, figures cited",
    },
]


def path(cache_dir):
    return fetched(cache_dir / "scherer", URL, FILE)


def read(file) -> pd.DataFrame:
    """iso3, species_group, habitat and the two global occupation factors, PDF per m²."""
    raw = pd.read_csv(file, keep_default_na=False, encoding="latin-1")
    columns = ["iso3cd", "species_group", "habitat", *APPROACHES.values()]
    frame = pd.DataFrame(raw[columns]).rename(columns={"iso3cd": "iso3"})
    return frame.assign(
        **{c: pd.to_numeric(frame[c], errors="coerce") for c in APPROACHES.values()}
    )


def habitat_of(use: str, level: str, group: str) -> str:
    return HABITATS[(use, level)]["Plants" if group == "Plants" else "animals"]


def minimal_share(lsu_per_ha: float) -> float:
    """The share of a country's pasture scored at minimal use, from its grazing density."""
    return min(1.0, max(0.0, (LIGHT_ABOVE - lsu_per_ha) / (LIGHT_ABOVE - MINIMAL_BELOW)))


def grazing_density(lsu: pd.Series, pasture_ha: pd.Series) -> pd.Series:
    """Ruminant livestock units per ha of pasture, where there is pasture."""
    ha = pasture_ha[pasture_ha > 0]
    return lsu.reindex(ha.index).fillna(0.0) / ha


def per_ha(cf: pd.DataFrame, use: str, approach: str, level: str = "light") -> pd.Series:
    """Species committed per hectare of `use`, by iso3: each group's factor times its described
    species, summed; a country lacking any group has none. A country in several parts (Gaza and
    the West Bank) takes their mean."""
    column = APPROACHES[approach]
    parts = [
        pd.Series(
            cf[(cf["species_group"] == g) & (cf["habitat"] == habitat_of(use, level, g))]
            .groupby("iso3")[column]
            .mean()
        )
        * (n * M2_PER_HA)
        for g, n in DESCRIBED.items()
    ]
    return pd.concat(parts, axis=1).sum(axis=1, min_count=len(DESCRIBED)).dropna()


def mixed(table: dict, use: str, approach: str, iso3: str, minimal: float) -> float:
    """Cropland at light use; pasture mixing light and minimal use by `minimal`."""
    light = float(table[(use, "light", approach)][iso3])
    return (
        light
        if use == "cropland"
        else light + minimal * (float(table[(use, "minimal", approach)][iso3]) - light)
    )


def factors(cf: pd.DataFrame, iso3s, minimal: dict[str, float]) -> dict:
    """byCountry[iso3][use] = [average, marginal] species per ha, for the countries in `iso3s`
    the factors cover; `minimal` is each country's share of pasture at minimal use (none where
    absent)."""
    table = {
        (use, level, approach): per_ha(cf, use, approach, level)
        for use, level in HABITATS
        for approach in APPROACHES
    }
    covered = sorted(set(iso3s).intersection(*(s.index for s in table.values())))
    return {
        iso3: {
            use: [
                significant(mixed(table, use, a, iso3, minimal.get(iso3, 0.0)), 3)
                for a in APPROACHES
            ]
            for use in USES
        }
        for iso3 in covered
    }


def species_json(by_country: dict) -> dict:
    return {
        "byCountry": by_country,
        "described": sum(DESCRIBED.values()),
        "fish": FISH,
        "source": ZENODO,
    }
