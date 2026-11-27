# What the warming means

Explore gives the warming each future reaches, without the levers and with them. The card *What the warming means* shows what the IPCC assessed at those two levels of warming. That covers how much more often heat extremes, heavy rain and drought occur, how much more land burns, how many species are at risk, and what happens to coral reefs, Arctic sea ice and fisheries. The card also gives the results of two studies: one on heatwaves and people, one on river floods and people. Its values come from `impacts.json`.

## The warming read

Each future is read at the horizon (2050 or 2100), at the 20-year mean of its median warming centred on that year. The IPCC defines a level of global warming this way, and the temperature chart uses the same mean to find the year a Paris Agreement level is crossed. At 2100 the mean is shorter, because the run ends there. It covers 2090 to 2100. The card gives both futures' warming beside its title, and again above the table's columns.

The climate model's own range of warming (5–95%) is not used. Reading the impacts at the edges of that range would mix two different uncertainties: the climate model's and the impact studies'. Each row's (i) gives the source's own range at the warming of each future. It is never merged with the range of the warming.

## Reading between levels

Each source assessed its impacts at a few levels of warming only. Between two levels, the card interpolates linearly. A drought seen once in 10 years comes 2.04 times as often at 1.5 °C and 2.38 times at 2 °C. At 1.8 °C, 60% of the way from one level to the other, the card gives 2.24 times.

Where a source gives a value and a range, the card interpolates each of them separately. A range does not always widen as the warming rises. In Figure SPM.6, the 95th percentile of drought frequency is 7.68 at 3 °C and 7.21 at 4 °C, so the range narrows between them. Interpolating each bound separately keeps that narrowing.

The card gives no value above the highest level or below the lowest level a source assessed. For a future above it, the card shows *not assessed above* that level, and for a future below it, *not assessed below*. Two of the sources (SR1.5 and the heatwave study) stop at 2 °C. Their impacts only grow with warming: coral reefs lost, ice-free summers, range lost, catch lost, people exposed. So for a future above 2 °C, the card shows at least the value at 2 °C, such as *≥ 99%* of coral reefs, and the row's (i) says so. The other future, if it is at or below 2 °C, is read as usual. With every lever in full, a future at 1.7 °C can then be compared with one at 2.8 °C. The flood study stops at 3 °C and is read the same way. Above 3 °C, the card shows at least its value at 3 °C.

## The sources

The card first shows six impacts, the same at every horizon: land species, coral reefs, the ice-free Arctic, heatwave exposure, once-in-50-year heat extremes and droughts. Where a future lies below what a source assessed, the card shows *not assessed below* that level instead of a figure, after the impacts it can give. Every impact is also in a folded table under them. Its rows are grouped by source, and each source gives the levels it was assessed at.

| Group | Rows | Levels | Values |
| --- | --- | --- | --- |
| IPCC AR6 WGI, Figure SPM.6 (panels a to d) | Hot extremes over land once in 10 and once in 50 years in 1850–1900; heavy 1-day rain over land once in 10 years; agricultural and ecological drought once in 10 years, in drying regions | 1, 1.5, 2, 3 and 4 °C | How many times as often, the median of the CMIP6 models, with their 5–95% range |
| IPCC AR6 WGII, SPM B.4.1 (p. 14) | Land species at very high risk of extinction | 1.5, 2, 3, 4 and 5 °C | A range: 3–14%, 3–18%, 3–29%, 3–39% and 3–48% |
| IPCC SR1.5, SPM B.3.1, B.4.1, B.4.2 (p. 8) and B.4.4 (p. 9) | Coral reefs lost; ice-free Arctic summers; insects, plants and vertebrates losing over half their range; marine fishery catch lost | 1.5 and 2 °C | Coral reefs a further 70–90% and more than 99%; one ice-free summer a century and at least one a decade; insects 6% and 18%, plants 8% and 16%, vertebrates 4% and 8%; about 1.5 and more than 3 million tonnes a year |
| Dosio et al. (2018), section 3.4 (p. 6) | People exposed to severe heatwaves at least once every 5 years | 1.5 and 2 °C | 13.8% (9.4–18.2%) and 36.9% (32.1–45.0%) of the world's people |
| IPCC AR6 WGII, Chapter 2, 2.5.3.2.1 (pp. 271–272) | Increase in the area burned worldwide, from climate change alone | 2 and 4 °C | A range: 30–35% below 2 °C, 50–70% at about 4 °C |
| Hirabayashi et al. (2021), Supplementary Table S5 | People exposed each year to the 100-year river flood of 1971–2000 | 1.5, 2 and 3 °C | 199, 207 and 223 million, the median of nine CMIP6 models, with their lowest and highest (173–226, 174–230 and 177–258 million) |

Figure SPM.6's values come from its data on the CEDA archive (doi:10.5285/93d1b84fbb144901809eaf67b35eb5c4, version v20210809, CC BY 4.0), the frequency files of each panel. The figure draws the median and the 5–95% range of the models, and the card shows the same. The drought row is soil moisture in the regions that are drying.

The other values are written in `pipeline/impacts.csv`, each with its paragraph and page. Where the IPCC gives a lower bound, the card uses that bound as the value. More than 99% of coral reefs is shown as 99–100%, at least one ice-free summer a decade as 10 in 100, and more than 3 million tonnes as 3 million. Each row's (i) says so. The ice-free summers are counted as summers out of 100, so that one a century and one a decade can be interpolated on the same line.

The heatwave row is not an IPCC finding. It comes from one study, Dosio et al. (2018), cited by the World Resources Institute among the differences between 1.5 °C and 2 °C. It keeps the same population, SSP3's, at both levels, so its shares do not follow the population of Planetshift's scenario. Its range is the spread of the study's seven models.

The wildfire row is the IPCC's assessment of the area burned worldwide (medium confidence). Climate change alone would raise it by about 30–35% if the warming stays below 2 °C, and by 50–70% at about 4 °C. The card takes the value for below 2 °C as its value at 2 °C, so a future below 2 °C shows *not assessed below 2 °C*. The first choice was the change in days of extreme fire weather. It would have been built like Figure SPM.6, from Quilcaille et al. (2023)'s CMIP6 fire weather data (CC BY 4.0, doi:10.3929/ethz-b-000583391). That paper finds +86% on average at 3 °C. The dataset has yearly maps for each model run, 1 to 2 GB for each indicator. It does not have the global warming of each run, which is needed to find when a run reaches each level. Its repository also blocks automated downloads, so the pipeline could not fetch the files.

The flood row comes from one study, Hirabayashi et al. (2021), not from the IPCC. It counts, each year, the people who live where the river flood seen once in 100 years in 1971–2000 reaches. The count runs over nine CMIP6 models under SSP5-8.5. The population stays at its 2015 level, so the row shows the change in floods, not in population. Its values are those of Supplementary Table S5, written in `pipeline/impacts_floods.csv`. The card gives the models' median, with the lowest and highest model as its range. The paper's text gives 2.2% of the world's people in 1971–2000 and 3.2% at 3 °C. The median at 3 °C, 223 million, is 3.2% of about 7 billion people. The study reports up to 3 °C: only five of its nine models reach 4 °C. It was chosen over Alfieri et al. (2017), which AR6 WGII cites, because it uses CMIP6 and gives each model's value at each level. That lets the card show a median and a range, as it does for Figure SPM.6. Its article and supplement are under CC BY 4.0.

## What is left out

Economic damages are left out: their estimates depend on choices about growth, adaptation and discounting that the card could not show. Sea level and ocean acidity change slowly after the warming and need their own outputs, not a row read at one level of warming. The summary has one for sea level, the rise the levers avoid (see [the temperature page](#method-climate)). The ocean's pH has a chart of its own (see [the temperature page](#method-climate)).

Flood damages are left out, like the other economic damages.

From 1998 to 2015, the area burned worldwide fell by about 1.4% a year, mainly as farming spread and intensified (AR6 WGII, 2.4.4.2.2), while fire weather and extreme fires grew in many regions. The wildfire row is climate change alone, so it does not show that fall. Counts of flood disasters depend on how many people live on flood plains and how disasters are reported, so the card does not use them. In the climate model, FaIR, the carbon that fires release does not feed back into the warming. AR6 WGI puts that feedback at 0.01–0.06 W m⁻² per °C, with very low confidence in its size. It leaves the feedback out of its total of feedbacks (sections 5.4.3.2 and 5.4.8, p. 739). The aerosols from fires, which cool, may offset part of it. The emissions of future fires follow the SSP scenario and do not change with the levers. See [Limitations](#method-limitations).

The impacts are global. They do not say where the heat, rain, drought, fire or flood happens, or who is affected.

The IPCC's values are cited as published, with their paragraph and page. The text of the reports is not reused.
