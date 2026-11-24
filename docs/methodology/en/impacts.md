# What the warming means

Explore gives the warming each future reaches, without the levers and with them. The card *What the warming means* shows what the IPCC assessed at those two levels of warming. That covers how much more often heat extremes, heavy rain and drought occur, how many species are at risk, and what happens to coral reefs, Arctic sea ice and fisheries. The card also gives one study on heatwaves and people. Its values come from `impacts.json`.

## The warming read

Each future is read at the horizon (2050 or 2100), at the 20-year mean of its median warming centred on that year. The IPCC defines a level of global warming this way, and the temperature chart uses the same mean to find the year a Paris Agreement level is crossed. At 2100 the mean is shorter, because the run ends there. It covers 2090 to 2100. The card gives both futures' warming beside its title, and again above the table's columns.

The climate model's own range of warming (5–95%) is not used. Reading the impacts at the edges of that range would mix two different uncertainties: the climate model's and the impact studies'. Each row's (i) gives the source's own range at the warming of each future. It is never merged with the range of the warming.

## Reading between levels

Each source assessed its impacts at a few levels of warming only. Between two levels, the card interpolates linearly. A drought seen once in 10 years comes 2.04 times as often at 1.5 °C and 2.38 times at 2 °C. At 1.8 °C, 60% of the way from one level to the other, the card gives 2.24 times.

Where a source gives a value and a range, the card interpolates each of them separately. A range does not always widen as the warming rises. In Figure SPM.6, the 95th percentile of drought frequency is 7.68 at 3 °C and 7.21 at 4 °C, so the range narrows between them. Interpolating each bound separately keeps that narrowing.

The card gives no value above the highest level or below the lowest level a source assessed. For a future above it, the card shows *not assessed above* that level, and for a future below it, *not assessed below*. Two of the sources (SR1.5 and the heatwave study) stop at 2 °C. Their impacts only grow with warming: coral reefs lost, ice-free summers, range lost, catch lost, people exposed. So for a future above 2 °C, the card shows at least the value at 2 °C, such as *≥ 99%* of coral reefs, and the row's (i) says so. The other future, if it is at or below 2 °C, is read as usual. With every lever in full, a future at 1.7 °C can then be compared with one at 2.8 °C.

## The sources

The card first shows six impacts, the same at every horizon: land species, coral reefs, the ice-free Arctic, heatwave exposure, once-in-50-year heat extremes and droughts. Where a future lies below what a source assessed, the card shows *not assessed below* that level instead of a figure, after the impacts it can give. Every impact is also in a folded table under them. Its rows are grouped by source, and each source gives the levels it was assessed at.

| Group | Rows | Levels | Values |
| --- | --- | --- | --- |
| IPCC AR6 WGI, Figure SPM.6 (panels a to d) | Hot extremes over land once in 10 and once in 50 years in 1850–1900; heavy 1-day rain over land once in 10 years; agricultural and ecological drought once in 10 years, in drying regions | 1, 1.5, 2, 3 and 4 °C | How many times as often, the median of the CMIP6 models, with their 5–95% range |
| IPCC AR6 WGII, SPM B.4.1 (p. 14) | Land species at very high risk of extinction | 1.5, 2, 3, 4 and 5 °C | A range: 3–14%, 3–18%, 3–29%, 3–39% and 3–48% |
| IPCC SR1.5, SPM B.3.1, B.4.1, B.4.2 (p. 8) and B.4.4 (p. 9) | Coral reefs lost; ice-free Arctic summers; insects, plants and vertebrates losing over half their range; marine fishery catch lost | 1.5 and 2 °C | Coral reefs a further 70–90% and more than 99%; one ice-free summer a century and at least one a decade; insects 6% and 18%, plants 8% and 16%, vertebrates 4% and 8%; about 1.5 and more than 3 million tonnes a year |
| Dosio et al. (2018), section 3.4 (p. 6) | People exposed to severe heatwaves at least once every 5 years | 1.5 and 2 °C | 13.8% (9.4–18.2%) and 36.9% (32.1–45.0%) of the world's people |

Figure SPM.6's values come from its data on the CEDA archive (doi:10.5285/93d1b84fbb144901809eaf67b35eb5c4, version v20210809, CC BY 4.0), the frequency files of each panel. The figure draws the median and the 5–95% range of the models, and the card shows the same. The drought row is soil moisture in the regions that are drying.

The other values are written in `pipeline/impacts.csv`, each with its paragraph and page. Where the IPCC gives a lower bound, the card uses that bound as the value. More than 99% of coral reefs is shown as 99–100%, at least one ice-free summer a decade as 10 in 100, and more than 3 million tonnes as 3 million. Each row's (i) says so. The ice-free summers are counted as summers out of 100, so that one a century and one a decade can be interpolated on the same line.

The heatwave row is not an IPCC finding. It comes from one study, Dosio et al. (2018), cited by the World Resources Institute among the differences between 1.5 °C and 2 °C. It keeps the same population, SSP3's, at both levels, so its shares do not follow the population of Planetshift's scenario. Its range is the spread of the study's seven models.

## What is left out

Economic damages are left out: their estimates depend on choices about growth, adaptation and discounting that the card could not show. Sea level and ocean acidity change slowly after the warming and would need their own outputs, not a row read at one level of warming.

The impacts are global. They do not say where the heat, rain or drought falls, nor who bears it.

The IPCC's values are cited as published, with their paragraph and page. The text of the reports is not reused.
