from planetshift_pipeline.sources import naturalearth as NE


def feature(**props):
    return {"type": "Feature", "properties": {"ADM0_A3": "XXX", **props}, "geometry": None}


def test_shapes_keep_the_full_english_name_and_a_capitalised_french_one():
    gj = {
        "features": [
            feature(
                ISO_A3="ESH",
                NAME="W. Sahara",
                NAME_EN="Western Sahara",
                NAME_FR="Sahara occidental",
            ),
            feature(ISO_A3="FRO", NAME="Faeroe Is.", NAME_EN="Faroe Islands", NAME_FR="îles Féroé"),
            feature(ISO_A3="ZZZ", NAME="Zed"),
        ]
    }
    props = [f["properties"] for f in NE.slim(gj)["features"]]
    assert [p["name"] for p in props] == ["Western Sahara", "Faroe Islands", "Zed"]
    assert [p["nameFr"] for p in props] == ["Sahara occidental", "Îles Féroé", "Zed"]
