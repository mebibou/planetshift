# Temperature through deep time

The deep-time page draws Earth's global mean surface temperature from 485 million years ago to 2100, on the same 1850–1900 baseline as the rest of Planetshift. Its last part is Explore's own series, so the scenario chosen in Explore ends the timeline. The page is a prototype, linked from the footer.

The page is about speed. Earth has been much warmer than today for millions of years at a time. The records show no change as fast as today's.

## The series

Four reconstructions cover the past, each over the span where it is finest. The app's own series cover 1850 onwards. Each is shifted so that 0 °C is the 1850–1900 mean.

| Series | Years | Resolution | Range shown | Shift to 1850–1900 |
| --- | --- | --- | --- | --- |
| PhanDA (Judd et al. 2024) | 485 million years ago to 1950 | 85 geological stages, from 11,700 years to 21.6 million years long | 5–95% | −14.46 °C, so that its Holocene stage mean equals LGMR's (−0.47 °C) |
| CENOGRID as global temperature (IPCC AR6) | 66 million to 24,000 years ago | 10,000-year means | none | +0.36 °C, added by AR6 to go from 1961–1990 |
| LGMR (Osman et al. 2021) | the last 24,000 years | 200-year means | 5–95% (the ensemble mean ± 1.645 standard deviations) | −13.49 °C, so that its last 200 years (1750–1950) are at 0 |
| PAGES 2k (2019), as in IPCC AR6 Figure 2.11a | 5 to 1845 CE, every five years | 10-year smoothing | 5–95% | +0.37 °C, added by AR6 |
| Observed, and the scenario without and with the levers | 1850 to 2100 | yearly | 5–95% for the scenario, none for the observed temperature | none: Explore's series are already on 1850–1900 |

PhanDA and LGMR give absolute temperatures, so Planetshift shifts them. The two AR6 series are already on 1850–1900.

IPCC AR6 turned CENOGRID, a record of oxygen isotopes (δ¹⁸O) in deep-sea shells (Westerhold et al. 2020), into global temperature with the formulas of Hansen et al. (2013), in Cross-Chapter Box 2.1. AR6's figure runs to 60 million years ago, but its published data is cut off 33.5 million years ago. For older times, Planetshift applies AR6's formula to CENOGRID's own binned record, whose bins are 5,000 years wide beyond 34 million years ago. Before the Pliocene, AR6 takes the deep ocean's temperature from Hansen et al.'s equation 3.5 and uses it as the change in surface temperature. Then it adds 0.36 °C. Where δ¹⁸O is below 1.75‰, when the early Cenozoic had little ice, Planetshift uses Hansen et al.'s equation 3.1 instead. AR6's figure shows that AR6 used it there too. The same formula reproduces AR6's published values 10, 20 and 33.5 million years ago. It gives a PETM peak of about 21 °C in 10,000-year means, about 14 °C 50 million years ago and about 10 °C 60 million years ago, as AR6's figure shows.

## The time axis

A plain time axis would leave the last century a tiny part of the 485-million-year view. A plain logarithmic axis compresses the old edge of any window instead. The page uses a logarithm of the years before 2100, shifted by half the window's span. Within any window, a year at the right edge gets at most three times the room of a year at the left. That is enough for today's warming to show in the 24,000-year and 2,000-year windows.

The stretch changes how slopes look. A slope near the right edge can look up to three times steeper than the same slope at the left.

## The markers

The markers are dated events, not series: the five mass extinctions (about 445, 372, 252, 201 and 66 million years ago), the Palaeocene–Eocene Thermal Maximum (about 56 million years ago), the last glacial maximum (about 21,000 years ago), the start of farming in south-west Asia (about 11,500 years ago) and 1850. When you pick a marker, the timeline zooms to a window that starts a fifth of the marker's age before it and ends at 2100.

## How fast

The rates compare today's warming with the past, in °C per century:

- the warming linked to major marine mass extinctions: more than 10 °C per million years, 0.001 °C per century (Song et al. 2021);
- the Holocene, from 9,000 years ago to 1850, in LGMR;
- the end of the last ice age, from 18,000 to 11,000 years ago, in LGMR;
- the fastest 1,000 years in LGMR's 24,000-year record, which fall at the end of the ice age;
- the observed trend over the last 50 years, a least-squares fit;
- the scenario without the levers, from the current year to 2100.

The past rates are averages over a thousand years or more. A short spike inside one of them would not show.

## Reading the page

- A view of millions of years shows the Earth up to 21 °C warmer than 1850–1900. Those periods had other continents, little or no ice, seas tens of metres higher, and no people. Those periods do not make today's warming harmless. Today's warming is far faster, and it affects eight billion people who depend on farming that developed in the steady climate of the last 10,000 years.
- PhanDA's points are averages over whole stages. A spike like today's would not appear inside a single stage, so the curve cannot show that nothing like today's spike happened before.
- Where PhanDA and the CENOGRID series overlap, a PhanDA stage and the CENOGRID series averaged over it differ by up to about 7 °C. The largest difference is in the Miocene, 23 to 5 million years ago. They come from different methods, and both are uncertain.
- The extinction markers are past events, not a forecast. Song et al.'s thresholds are rates and amounts of warming, not dates.
- The difference the levers make shows in the 1850–2100 and 2,000-year windows. Over longer spans, the difference is too small to see.

## Sources

- PhanDA: Judd et al. (2024), *A 485-million-year history of Earth's surface temperature*, Science 385, eadk3705. Data: [github.com/EJJudd/PhanDA](https://github.com/EJJudd/PhanDA). Licence: CC BY 4.0.
- CENOGRID: Westerhold et al. (2020), *An astronomically dated record of Earth's climate and its predictability over the last 66 million years*, Science 369, 1383–1387. Binned data: PANGAEA, [doi:10.1594/PANGAEA.917717](https://doi.org/10.1594/PANGAEA.917717), licence CC BY 4.0. As global temperature: IPCC AR6 WGI Cross-Chapter Box 2.1 Figure 1 data, [catalogue.ceda.ac.uk](https://catalogue.ceda.ac.uk/uuid/0f05c2fb8f814d60ac2d657a70e9a7f5). Licence: CC BY 4.0. The formulas: Hansen et al. (2013), Phil. Trans. R. Soc. A 371, 20120294.
- LGMR: Osman et al. (2021), *Globally resolved surface temperatures since the Last Glacial Maximum*, Nature 599, 239–244. Data: NOAA NCEI, [doi:10.25921/njxd-hg08](https://doi.org/10.25921/njxd-hg08), listed as CC0 in the US government's data catalogue; NCEI asks users to cite the publication, the online resource and the date accessed.
- PAGES 2k Consortium (2019), as in IPCC AR6 WGI Figure 2.11a data, [catalogue.ceda.ac.uk](https://catalogue.ceda.ac.uk/uuid/f3515388768344bfb2be0521f82388be). Licence: CC BY 4.0.
- Song et al. (2021), *Thresholds of temperature change for mass extinctions*, Nature Communications 12, 4694, [doi:10.1038/s41467-021-25019-2](https://doi.org/10.1038/s41467-021-25019-2).
