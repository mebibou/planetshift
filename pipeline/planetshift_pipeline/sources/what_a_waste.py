"""Municipal solid waste by country from the World Bank's What a Waste 3.0 country dataset: the
tonnes generated in 2022 (the World Bank's estimate for that year from each country's latest
figure), what it is made of and where it goes."""

from pathlib import Path

import pandas as pd

from ..cache import fetched

VERSION = "3.0 (March 2026)"
URL = (
    "https://datacatalogfiles.worldbank.org/ddh-published/0039597/DR0095901/"
    "What_a_Waste_3.0_COUNTRY_Dataset_&_Codebook.xlsx"
)
FILE = "what_a_waste_3.0_country.xlsx"
PAGE = "https://datacatalog.worldbank.org/search/dataset/0039597"
LICENCE = "CC BY 4.0"
SHEET = "Country dataset"
YEAR = 2022
TONNES = f"msw_total_msw_generated_tonnes_year_projected_{YEAR}"
PEOPLE = f"population_number_of_people_{YEAR}"
INCOME = f"income_id_{YEAR}"

SOURCES = [
    {
        "id": "what-a-waste",
        "name": "World Bank, What a Waste 3.0 country dataset: municipal solid waste generated "
        f"({YEAR} estimate), its composition and its treatment, by country",
        "version": VERSION,
        "url": PAGE,
        "licence": LICENCE,
    }
]

#: The dataset's composition columns (composition_msw_<name>_percent), grouped.
TYPES: dict[str, tuple[str, ...]] = {
    "foodGreen": ("food_organic_waste", "yard_garden_green_waste"),
    "paper": ("paper_cardboard",),
    "plastic": ("plastic",),
    "glass": ("glass",),
    "metal": ("metal",),
    "textiles": ("textile_waste",),
    "other": ("rubber_leather", "wood", "weee", "hazardous", "diapers_and_hygiene", "other"),
}

#: The dataset's treatment columns (waste_treatment_<name>_percent), grouped; waste never
#: collected has its own column.
TREATMENTS: dict[str, tuple[str, ...]] = {
    "landfill": (
        "controlled_landfill",
        "sanitary_landfill_landfill_gas_system",
        "landfill_unspecified",
    ),
    "openDump": ("open_dumpsite",),
    "incineration": ("incineration", "rdf"),
    "recycling": ("recycling",),
    "composting": ("compost", "anaerobic_digestion", "mbt"),
    "other": ("other", "unaccounted_for"),
}
UNCOLLECTED = "waste_uncollected_percent"

#: The World Bank's income groups, by the first word of the dataset's code.
INCOME_GROUPS = {
    "HIC": "high",
    "UMIC": "upperMiddle",
    "UMC": "upperMiddle",
    "LMIC": "lowerMiddle",
    "LMC": "lowerMiddle",
    "LIC": "low",
}

#: A country's shares are kept when they add up to 1 within this margin, then scaled to 1.
TOLERANCE = 0.1


def path(cache_dir: Path) -> Path:
    return fetched(Path(cache_dir) / "worldbank", URL, FILE)


def composition_column(name: str) -> str:
    return f"composition_msw_{name}_percent"


def treatment_column(name: str) -> str:
    return f"waste_treatment_{name}_percent"


def grouped(raw: pd.DataFrame, groups: dict[str, tuple[str, ...]], column) -> pd.DataFrame:
    """Each group's share: the sum of its columns, NaN where the country gives none of them."""
    numbers = raw.apply(pd.to_numeric, errors="coerce")
    return pd.DataFrame(
        {
            g: numbers.reindex(columns=[column(n) for n in names]).sum(axis=1, min_count=1)
            for g, names in groups.items()
        }
    )


def whole(shares: pd.DataFrame, tolerance: float = TOLERANCE) -> pd.DataFrame:
    """The rows whose shares add up to 1 within `tolerance`, scaled to 1; the others NaN."""
    total = shares.sum(axis=1, min_count=1)
    kept = (total - 1).abs() <= tolerance
    return shares.fillna(0).div(total, axis=0).where(kept, axis=0)


def read(file: Path) -> pd.DataFrame:
    """One row per ISO3 code: tonnes, people and income group in YEAR, and the shares of each
    type and treatment (`type_<group>`, `treatment_<group>`), NaN where the country has none."""
    raw = pd.read_excel(file, sheet_name=SHEET, header=1).set_index("iso3c")
    treatments = grouped(raw, TREATMENTS, treatment_column).assign(
        uncollected=pd.to_numeric(raw[UNCOLLECTED], errors="coerce")
    )
    return pd.concat(
        [
            pd.DataFrame(
                {
                    "tonnes": pd.to_numeric(raw[TONNES], errors="coerce"),
                    "people": pd.to_numeric(raw[PEOPLE], errors="coerce"),
                    "income": raw[INCOME].astype(str).str.split().str[0].map(INCOME_GROUPS),
                }
            ),
            whole(grouped(raw, TYPES, composition_column)).add_prefix("type_"),
            whole(treatments).add_prefix("treatment_"),
        ],
        axis=1,
    ).rename_axis("iso3")
