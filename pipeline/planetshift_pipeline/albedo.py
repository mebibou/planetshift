"""The albedo forcing of a hectare of farmland in each country, by its latitude band (land.json's
`albedoPerHa`).

The band weights, mW m⁻² of global mean per Mha of forest turned to cropland, come from Jiao et
al. (2017, Climatic Change 142, Table 1): tropical broadleaf 0.071; temperate, the middle of its
deciduous (0.097) and mixed (0.246) forests; boreal, the mean of its two (0.231, 0.296). These
values hold for land where forest grows back, so each country's is taken on the share of its
farmland where it would, as regrowth's CO₂ uptake is (`land.regrowth_filled`).
"""

BAND_WEIGHTS = {"tropical": 0.071, "temperate": 0.17, "boreal": 0.26}
TROPICS, BOREAL = 23.5, 50.0
SIGNIFICANT = 4


def band_of(latitude: float) -> str:
    """The latitude band of a country's label point, in degrees north or south."""
    lat = abs(latitude)
    return "tropical" if lat < TROPICS else "temperate" if lat < BOREAL else "boreal"


def latitudes(gj: dict, iso3_of) -> dict[str, float]:
    """Each country's latitude: Natural Earth's label point, where the name sits on the map."""
    return {
        iso3_of(f["properties"]): float(f["properties"]["LABEL_Y"])
        for f in gj["features"]
        if f["properties"].get("LABEL_Y") is not None
    }


def per_hectare(share: dict[str, float], latitude: dict[str, float]) -> dict[str, float]:
    """W m⁻² of global mean per hectare of farmland, by country: its band's forest value (negative,
    farmland reflects more) times the share of its farmland where forest would grow back, the
    regrowth module's central share. A country without a latitude counts as temperate."""
    return {
        iso3: float(
            f"{-BAND_WEIGHTS[band_of(latitude.get(iso3, 35.0))] * 1e-9 * s:.{SIGNIFICANT}g}"
        )
        for iso3, s in share.items()
        if s > 0
    }
