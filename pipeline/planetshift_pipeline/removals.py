"""Carbon stored in farmland by practice (removals.csv), with climate zones expanded to ISO3."""

from pathlib import Path

import pandas as pd

PIPELINE_DIR = Path(__file__).resolve().parent.parent
REMOVALS_CSV = PIPELINE_DIR / "removals.csv"
ZONES_CSV = PIPELINE_DIR / "removals_zones.csv"

PRACTICES = ("coverCrops", "agroforestry", "biochar", "enhancedWeathering")
APPLIES_TO = ("cropland", "pasture", "farmland")
WORLD = "World"

#: Citation keys of removals.csv: title, authors, year and DOI or address.
CITATIONS = {
    "poeplau-don-2015": "Carbon sequestration in agricultural soils via cultivation of cover "
    "crops – A meta-analysis (Poeplau & Don, 2015), doi:10.1016/j.agee.2014.10.024",
    "lessmann-2022": "Global variation in soil carbon sequestration potential through improved "
    "cropland management (Lessmann et al., 2022), doi:10.1111/gcb.15954",
    "ipcc-2006-cropland": "2006 IPCC Guidelines for National Greenhouse Gas Inventories, "
    "vol. 4 ch. 5 Cropland, with its 2019 Refinement",
    "cardinael-2018": "Revisiting IPCC Tier 1 coefficients for soil organic and biomass carbon "
    "storage in agroforestry systems (Cardinael et al., 2018), doi:10.1088/1748-9326/aaeb5f",
    "roe-2021": "Land-based measures to mitigate climate change: potential and feasibility by "
    "country (Roe et al., 2021), doi:10.1111/gcb.15873",
    "ipcc-ar6-ch7": "IPCC AR6 WGIII, ch. 7 Agriculture, Forestry and Other Land Uses (2022), "
    "doi:10.1017/9781009157926.009",
    "ipcc-2019-biochar": "2019 Refinement to the 2006 IPCC Guidelines, vol. 4 ch. 2 appendix 4, "
    "biochar carbon in mineral soils",
    "wang-2016": "Biochar stability in soil: meta-analysis of decomposition and priming effects "
    "(Wang, Xiong & Kuzyakov, 2016), doi:10.1111/gcbb.12266",
    "lehmann-2021": "Biochar in climate change mitigation (Lehmann et al., 2021), "
    "doi:10.1038/s41561-021-00852-8",
    "woolf-2010": "Sustainable biochar to mitigate global climate change (Woolf et al., 2010), "
    "doi:10.1038/ncomms1053",
    "beerling-2020": "Potential for large-scale CO2 removal via enhanced rock weathering with "
    "croplands (Beerling et al., 2020), doi:10.1038/s41586-020-2448-9",
    "beerling-2024": "Enhanced weathering in the US Corn Belt delivers carbon removal with "
    "agronomic benefits (Beerling et al., 2024), doi:10.1073/pnas.2319436121",
    "mcbride-2025": "Quantifying potential carbon dioxide removal via enhanced weathering using "
    "porewater from a field trial in Scotland (McBride et al., 2025), "
    "doi:10.3389/fclim.2025.1606574",
    "ipcc-ar6-ch12": "IPCC AR6 WGIII, ch. 12 Cross-sectoral perspectives (2022), section 12.3.1.2 "
    "Enhanced weathering, doi:10.1017/9781009157926.014",
}

SOURCES = [
    {
        "id": "removals-literature",
        "name": "Published rates of carbon storage on farmland (cover crops, agroforestry, "
        "biochar, enhanced weathering): see pipeline/removals.csv",
        "version": "syntheses and field trials 2010-2025",
        "url": "https://doi.org/10.1088/1748-9326/aaeb5f",
        "licence": "values cited from the publications",
    }
]


def load(path: Path = REMOVALS_CSV) -> pd.DataFrame:
    return pd.read_csv(path, dtype={"zone": str, "value": str}, keep_default_na=False)


def load_zones(path: Path = ZONES_CSV) -> dict[str, str]:
    zones = pd.read_csv(path)
    return dict(zip(zones["iso3"], zones["zone"], strict=True))


def rates(rows: pd.DataFrame, zones: dict[str, str], countries: set[str]) -> dict:
    """{iso3 | 'World': {median, low, high}}: each country takes its zone's rate; a practice
    with one rate for the world has only 'World'."""
    by_zone = {
        r["zone"]: {
            "median": float(r["value"]),
            "low": float(r["low"]),
            "high": float(r["high"]),
        }
        for _, r in rows.iterrows()
    }
    per_country = {
        iso3: by_zone[zone]
        for iso3, zone in sorted(zones.items())
        if iso3 in countries and zone in by_zone
    }
    return {WORLD: by_zone[WORLD], **per_country}


def source_text(keys: pd.Series) -> str:
    unique = dict.fromkeys(k for cell in keys for k in cell.split(";") if k)
    return "; ".join(CITATIONS[k] for k in unique)


def removal(rows: pd.DataFrame, zones: dict[str, str], countries: set[str]) -> dict:
    field = dict(zip(rows["field"], rows["value"], strict=False))
    return {
        "rate": rates(rows[rows["field"] == "rate"], zones, countries),
        "appliesTo": field["appliesTo"],
        "maxShare": float(field["maxShare"]),
        "years": int(float(field["years"])),
        "source": source_text(rows["source"]),
    }


def removals_json(
    rows: pd.DataFrame, zones: dict[str, str], countries: set[str]
) -> dict[str, dict]:
    return {p: removal(rows[rows["practice"] == p], zones, countries) for p in PRACTICES}
