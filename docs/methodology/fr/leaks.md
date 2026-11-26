# Fuites de méthane

Produire le pétrole, le gaz et le charbon fait fuir du méthane. Les puits de pétrole et de gaz dégazent et torchent leur gaz, les conduites et les compresseurs fuient, et les mines de charbon libèrent le méthane contenu dans les veines. En 2022, ces fuites ont atteint 131 millions de tonnes, environ un tiers du méthane qu'émettent les humains. Par kg, le méthane réchauffe bien plus que le CO₂, mais il ne dure qu'une dizaine d'années : le réduire ralentit le réchauffement en quelques années. Planetshift propose deux leviers pour le réduire : les fuites de pétrole et de gaz, et le méthane des mines de charbon. Avec les deux en entier de 2026 à 2035, ils évitent 0,072 °C de réchauffement en 2050 et 0,136 °C en 2100 (médiane, SSP2-4.5).

Une grande partie coûte peu. Le GIEC estime le potentiel à 1,15 milliard de tonnes de CO₂e par an pour le pétrole et le gaz et à 0,50 pour les mines de charbon en 2030, en grande partie sans coût net, car le gaz économisé se vend (AR6 GTIII, tableau 12.SM.1.1).

## Le méthane qui fuit

Le Community Emissions Data System (CEDS, version v_2024_07_08, CC BY 4.0) donne le méthane de chaque pays par secteur jusqu'en 2022. Les leviers agissent sur ses secteurs fugitifs :

- **Pétrole** : la production de pétrole, avec le gaz qu'elle torche et dégaze (`1B2_Fugitive-petr`), 50,3 millions de tonnes.
- **Gaz** : la production de gaz (`1B2b_Fugitive-NG-prod`), 23,5 millions de tonnes, et son transport et sa distribution (`1B2b_Fugitive-NG-distr`), 11,1 millions de tonnes.
- **Charbon** : les mines de charbon (`1B1_Fugitive-solid-fuels`), 46,1 millions de tonnes.

Le combustible que brûlent les raffineries et les cokeries (`1A1bc`) n'est pas une fuite. Aucun levier ici ne réduit son méthane, qui fait moins de 0,1 million de tonnes.

Après 2022, chaque groupe suit le méthane de l'énergie de son scénario (RCMIP v5.1.0, *Energy Sector*), par rapport à 2023. C'est la même évolution que suit le ratio du méthane de l'approvisionnement en combustible sur la page [Énergie et transport](#method-sectors). Fuites en millions de tonnes par an (2023 / 2050 / 2100) :

| Groupe | SSP1-2.6 | SSP2-4.5 | SSP3-7.0 |
| --- | --- | --- | --- |
| Pétrole et gaz | 84,8 / 38,9 / 5,4 | 84,8 / 76,0 / 80,9 | 84,8 / 93,1 / 109,5 |
| Mines de charbon | 46,1 / 21,1 / 3,0 | 46,1 / 41,3 / 44,0 | 46,1 / 50,6 / 59,5 |

Ces fuites font partie du méthane de chaque scénario : le réchauffement du scénario les comprend déjà. Les leviers en retirent une part.

## Les leviers

- **Fuites de pétrole et de gaz** (`ogm`) : trouver et réparer les fuites, remplacer les équipements qui dégazent par conception, et cesser le dégazage et le torchage de routine. À 100 %, 75 % du méthane du pétrole et du gaz est retiré. C'est l'estimation de l'AIE de la part que les technologies d'aujourd'hui peuvent éviter, et le GIEC la reprend dans son tableau.
- **Méthane des mines de charbon** (`cmm`) : drainer le méthane des veines avant et pendant l'extraction et l'utiliser ou le torcher, et oxyder le méthane dilué dans l'air de ventilation des mines. À 100 %, 50 % du méthane des mines de charbon est retiré. Le reste vient des mines abandonnées et des mines à ciel ouvert sans drainage.

Comme tous les leviers, chacun monte en puissance de l'année en cours jusqu'à l'année fixée par *Tous les leviers en place en*.

## Avec les leviers sur les combustibles

Les leviers de l'énergie, du chauffage et de l'industrie brûlent moins de combustible : on en produit moins, et moins de méthane fuit. Ils comptent ce méthane dans le méthane par kg de leur CO₂ (voir *Le méthane et la pollution de l'air qui accompagnent le combustible* sur la page [Énergie et transport](#method-sectors)). Une partie de ce ratio, ce sont les fuites : pour chaque secteur, la part de chaque combustible dans son CO₂ multipliée par les fuites par kg de CO₂ issu de la combustion de ce combustible. En 2022, pour le transport routier, 4,8 g de ses 5,0 g de méthane par kg de CO₂ sont des fuites de pétrole et de gaz. Pour l'électricité, sur 4,1 g, 1,4 g sont des fuites de pétrole et de gaz et 2,6 g celles des mines de charbon.

Les leviers sur les fuites réduisent cette partie du ratio de la même part que les fuites du scénario. Avec les deux sortes de leviers en entier, une voiture qui ne roule plus à l'essence évite moins de méthane, car le pétrole qu'elle aurait brûlé fuit moins. Les deux sortes de leviers se recouvrent donc. Ensemble, ils évitent moins que la somme de chacun seul, et le recouvrement n'est compté qu'une fois.

Dans la répartition par groupe de leviers, le recouvrement est réparti entre les groupes selon leur valeur de Shapley, comme celui du réseau entre l'électricité renouvelable et les autres leviers de l'énergie (voir [Leviers](#method-levers)). Avec tous les leviers de l'énergie, du chauffage et de l'industrie en entier, la part du groupe des fuites de méthane en 2100 passe de 0,136 °C seul à 0,084 °C, et les groupes de l'énergie et des bâtiments et de l'industrie perdent chacun un peu aussi.

## Le CO₂ qu'il devient

Ce méthane est fossile. Avec l'écart `fossilMethaneCo2` activé (par défaut), chaque kg de méthane évité évite aussi les 2,74 kg de CO₂ qu'il serait devenu, la même année (voir [Énergie et transport](#method-sectors)). Cela ajoute 0,002 °C en 2050 et 0,005 °C en 2100 à ce qu'évitent les deux leviers.

## Dans l'application

Le volet **Fuites de méthane** de la section Leviers contient les deux curseurs, sous *Combustibles fossiles et industrie*. Dans la répartition par levier, leur effet compte comme *Fuites de méthane*. Leur méthane, et le CO₂ qu'il devient, sont dans les émissions évitées. Les émissions agricoles et la bande de l'agriculture du graphique des causes du réchauffement ne changent pas.

La couche **Fuites de méthane** de la carte colore chaque pays selon ses fuites avec les leviers en entier, en tonnes par an. Le chiffre d'aujourd'hui est celui de CEDS pour 2022, là où le combustible est produit, pas là où il est brûlé. Avec les leviers, chaque part baisse de ce que retire son levier. Les leviers qui brûlent moins de combustible réduisent aussi les fuites du monde, mais la carte ne les répartit pas par pays. L'infobulle donne la part du pétrole et du gaz et celle du charbon.

`fossilmethane.json` contient les données. Le code est `pipeline/planetshift_pipeline/fossil_methane.py`, et le module du levier `app/src/levers/fossilMethane/`.

### Le calcul de chaque année

Chaque année $y$, l'adoption $a$ de chaque levier tient déjà compte de la montée en puissance. La part des fuites de chaque groupe qui disparaît est $c_{\text{og}} = 0{,}75\,a_{\text{ogm}}$ et $c_{\text{coal}} = 0{,}5\,a_{\text{cmm}}$. Alors :

- les fuites du scénario varient de $-(c_{\text{og}}\,L_{\text{og}}(y) + c_{\text{coal}}\,L_{\text{coal}}(y))$, avec $L$ les fuites de chaque groupe ci-dessus ;
- le méthane par kg de CO₂ de chaque secteur qu'utilisent les leviers de l'énergie et de l'industrie perd $c_{\text{og}}\,r_{\text{og}}(y) + c_{\text{coal}}\,r_{\text{coal}}(y)$, avec $r$ ses fuites par kg de CO₂ (`perKgCo2` dans `fossilmethane.json`), qui suivent la même évolution que le ratio dont elles font partie.

Les variations de méthane sont transmises à FaIR, que l'application fait tourner (voir la [page sur la température](#method-climate)). Les réductions n'ont pas de fourchette propre : la fourchette probable est celle de 5 à 95 % des membres de FaIR.

## Résultats

Le réchauffement évité en °C, en médiane avec la fourchette probable entre parenthèses. Chaque levier est à 100 % de 2026 à 2035, sur les données réelles avec les options par défaut.

| Leviers | 2050 | 2100 |
| --- | --- | --- |
| Fuites de pétrole et de gaz | 0,052 (0,042–0,077) | 0,100 (0,071–0,140) |
| Méthane des mines de charbon | 0,019 (0,015–0,028) | 0,036 (0,026–0,051) |
| Les deux | 0,072 (0,057–0,105) | 0,136 (0,097–0,191) |
| Les deux, SSP1-2.6 | 0,048 | 0,037 |
| Les deux, SSP3-7.0 | 0,069 | 0,137 |

Dans SSP1-2.6, l'usage du pétrole, du gaz et du charbon recule vite : il reste moins de méthane à éviter en 2100. En 2035, les deux leviers en entier évitent 86 millions de tonnes de méthane par an dans SSP2-4.5, dont 63 du pétrole et du gaz.

## Hypothèses

- Les fuites sont le méthane fugitif de CEDS en 2022, qui suit le méthane de l'énergie de chaque scénario après 2023.
- À adoption complète, 75 % des fuites du pétrole et du gaz et 50 % de celles des mines de charbon disparaissent, dans chaque pays, chaque année et chaque scénario.
- Les leviers sur les fuites réduisent la partie fuites du méthane des leviers de l'énergie, du chauffage et de l'industrie des mêmes parts.
- Les fuites de la carte sont celles du pays de production en 2022, et ne changent qu'avec les leviers sur les fuites.

Les leviers laissent de côté les puits et mines abandonnés, et les fuites que les inventaires manquent. La page [Limites](#method-limitations) en parle.

## Sources

- Community Emissions Data System (CEDS), v_2024_07_08 : [doi:10.5281/zenodo.12803197](https://doi.org/10.5281/zenodo.12803197). Licence : CC BY 4.0.
- Protocole RCMIP v5.1.0, émissions des SSP par secteur : [doi:10.5281/zenodo.4589756](https://doi.org/10.5281/zenodo.4589756). Licence : CC BY-SA 4.0.
- GIEC (2022). Climate Change 2022: Mitigation of Climate Change, Groupe de travail III, matériel supplémentaire du chapitre 12, tableau 12.SM.1.1.
- AIE (2025). Global Methane Tracker 2025, [iea.org/reports/global-methane-tracker-2025](https://www.iea.org/reports/global-methane-tracker-2025).
