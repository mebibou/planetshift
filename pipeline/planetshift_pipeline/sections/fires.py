"""fires.json: each country's burned area and fire carbon in the latest fire season, against the
seasons before it."""

from .. import fires as F
from ..inputs import Build, log, write


def build(b: Build) -> None:
    area_rows = F.burned_rows(F.read(F.path(b.cache, "burned")))
    carbon_rows = F.read(F.path(b.cache, "carbon"))
    gaps = (
        F.check_baseline(area_rows, "Burned Area (km^2)", "Burned Area Mean Annual (km^2)"),
        F.check_baseline(carbon_rows, "Carbon Emitted", "Carbon Emitted Mean Annual (kg)"),
    )
    log.info("fires: baselines are the means of the seasons before the last within %s", gaps)
    regions = F.by_region(F.burned(area_rows), F.carbon(carbon_rows))
    countries = set(b.iso3.values())
    named = dict(zip(b.area_table["area"], b.area_table["iso3"], strict=True))
    iso3_by_name = {**{n: c for n, c in named.items() if c in countries}, **F.load_names()}
    data = F.by_country(regions, iso3_by_name, countries)
    season = F.last_season(area_rows)
    log.info(
        "fires %d-%d: %d countries of the model, world burned %+.0f%% and fire carbon %+.0f%% "
        "against the mean; not in the model: %s; missing: %s",
        *season,
        len(data),
        regions[F.WORLD]["burnedAnomaly"] * 100,
        regions[F.WORLD]["carbonAnomaly"] * 100,
        F.unnamed(regions, iso3_by_name),
        sorted(countries - set(data)),
    )
    baseline = {
        "burned": (int(area_rows[F.SEASON[0]].min()), season[0] - 1),
        "carbon": (int(carbon_rows[F.SEASON[0]].min()), season[0] - 1),
    }
    write(b.out, "fires.json", F.fires_json(data, regions[F.WORLD], season, baseline))
