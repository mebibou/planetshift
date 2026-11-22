# Bâtiments et industrie

À côté des transports et de l'électricité, deux parties de l'économie brûlent directement des combustibles fossiles : les bâtiments, où des chaudières au gaz et au fioul chauffent les pièces et l'eau et où l'on cuisine, et l'industrie, où l'acier et le ciment sont les plus gros émetteurs. Planetshift suit leur CO₂ direct dans chaque scénario futur, avec deux leviers qui agissent dessus. `industry.json` contient les données ; le code est `pipeline/planetshift_pipeline/industry.py` et le module de levier `app/src/levers/industry/`.

Comme pour les secteurs de l'[énergie et des transports](#method-sectors), ces émissions font partie du CO₂ fossile de chaque scénario et ne s'y ajoutent pas : les températures des scénarios les comprennent déjà. Un levier en retire une part, moins le CO₂ de l'électricité qu'il consomme alors, et la variation est convertie en réchauffement évité avec la même courbe de réponse au CO₂ que tous les autres leviers. Le combustible qui n'est plus brûlé retire aussi le méthane qui fuit pendant sa production et sa pollution de l'air, et l'électricité consommée apporte celles du réseau, comme pour le transport (voir *Le méthane et la pollution de l'air qui accompagnent le combustible* sur la page [Énergie et transport](#method-sectors)).

## Les secteurs et leur avenir

Les émissions de chaque secteur partent en 2023 d'un inventaire récent et suivent ensuite la forme de la trajectoire du scénario, tirée des émissions avec lesquelles FaIR lui-même est lancé (RCMIP v5.1.0, les émissions harmonisées de CMIP6, par secteur CEDS), comme pour les transports.

- **Bâtiments** : le CO₂ du secteur *Residential Commercial Other* de RCMIP, ramené aux 3,0 milliards de tonnes de CO₂ direct des bâtiments estimés par l'AIE pour 2022, pris pour 2023. C'est le combustible brûlé sur place pour le chauffage, l'eau chaude et la cuisson ; l'électricité et la chaleur de réseau qu'utilisent les bâtiments sont dans le secteur électrique. Le secteur de RCMIP contient aussi le carburant des machines agricoles et des bateaux de pêche : le ramener à l'inventaire des bâtiments les laisse de côté (l'énergie de la ferme a son propre levier).
- **Industrie** : le CO₂ du secteur *Industrial Sector* de RCMIP, le combustible brûlé dans les usines et le CO₂ des procédés industriels comme la calcination du calcaire, ramené aux 9,0 milliards de tonnes de CO₂ direct de l'industrie estimés par l'AIE pour 2022, pris pour 2023.

Émissions en milliards de tonnes de CO₂ par an (2023 / 2050 / 2100) :

| Secteur | SSP1-2.6 | SSP2-4.5 | SSP3-7.0 |
| --- | --- | --- | --- |
| Bâtiments | 3,00 / 2,87 / 1,45 | 3,00 / 2,75 / 1,88 | 3,00 / 3,05 / 1,98 |
| Industrie | 9,00 / 3,92 / 1,06 | 9,00 / 10,41 / 5,47 | 9,00 / 10,81 / 12,18 |

Les scénarios ne détaillent pas l'industrie par produit : l'acier et le ciment en sont donc des parts fixes, les mêmes chaque année et dans chaque scénario.

- **Acier** : 28,9 %, les 2,6 milliards de tonnes de CO₂ direct de la sidérurgie en 2022 selon l'AIE, sur les 9,0 de l'industrie. Avec l'électricité qu'achètent les aciéries, l'empreinte du secteur est plus grande, environ 3,6 milliards de tonnes (worldsteel), mais cette électricité est dans le secteur électrique.
- **Ciment** : 28,7 %. La série ouverte du CO₂ des procédés de cimenterie du Global Carbon Budget (Andrew, le CO₂ libéré quand le calcaire est calciné en clinker) donne 1,55 milliard de tonnes en 2023 (1,49 en 2024). La calcination représente environ 60 % du CO₂ direct d'une cimenterie, le reste étant le combustible brûlé dans le four : le ciment émet donc environ 2,6 milliards de tonnes directement, proche des 2,4 de l'AIE.

Le reste de l'industrie, chimie, aluminium, papier, agroalimentaire et autres, environ 42 %, n'a pas de levier.

## Les leviers

**Chauffage propre.** Remplacer une chaudière par une pompe à chaleur (et une cuisinière au gaz par une plaque à induction) supprime le CO₂ du combustible mais consomme de l'électricité, dont le CO₂ dépend du réseau, comme pour un véhicule électrique. `heatPumpKwhPerKgCo2` est l'électricité nécessaire par kilogramme de CO₂ de la chaudière évité : le rendement de la chaudière divisé par le coefficient de performance saisonnier (COP) de la pompe à chaleur et par le CO₂ du combustible par kWh (gaz naturel 0,202 kg/kWh, fioul domestique 0,267 kg/kWh, d'après les facteurs par défaut du GIEC de 56,1 et 74,1 t de CO₂ par TJ).

- Médiane : 1,49 kWh/kg, une chaudière au gaz à 90 % remplacée par une pompe à chaleur de COP saisonnier 3. Le rapport *The Future of Heat Pumps* de l'AIE (2022) estime les pompes à chaleur trois à cinq fois plus efficaces qu'une chaudière au gaz.
- Bas de la fourchette : 0,80 kWh/kg, une chaudière au fioul à 85 % remplacée par une pompe à chaleur de COP 4.
- Haut de la fourchette : 1,88 kWh/kg, une chaudière au gaz à condensation à 95 % remplacée par une pompe à chaleur de COP 2,5, comme dans les climats froids.

Le CO₂ qu'économise le chauffage propre est alors le CO₂ des bâtiments × (1 − `heatPumpKwhPerKgCo2` × l'intensité du réseau). Sur le réseau mondial actuel, à 0,48 kg/kWh, une pompe à chaleur économise environ 29 % du CO₂ d'une chaudière au gaz (1 − 1,49 × 0,48), proche des « au moins 20 %, même avec une électricité produite au gaz » de l'AIE ; sur un réseau propre, elle l'économise en entier.

**Acier et ciment propres.** Un seul levier pour les deux, la part de leur production faite de façon propre. Pour chacun, `cut` est la part de son CO₂ direct qui disparaît à adoption complète et `kwhPerKgCo2` l'électricité consommée par kilogramme évité :

- Acier : une réduction de 90 % (75–95 %). L'acier fait de fer réduit à l'hydrogène et fondu au four électrique à arc émet sur place 90 à 95 % de moins qu'un haut fourneau, la ferraille fondue au four électrique à peu près autant, et les hauts fourneaux avec captage du carbone 75 à 90 % de moins (AIE, *Iron and Steel Technology Roadmap*, 2020 ; Mission Possible Partnership, *Making Net-Zero Steel Possible*, 2022). La réduction directe à l'hydrogène demande environ 3,5 MWh d'électricité par tonne d'acier, surtout pour produire l'hydrogène (Vogl et al. 2018), contre environ 2 t de CO₂ direct pour un haut fourneau : 1,9 kWh par kg évité. La ferraille au four électrique demande environ 0,6 MWh par tonne, 0,3 kWh/kg. La médiane, 1,5 kWh/kg, correspond aux trois quarts d'hydrogène et à un quart de ferraille en plus ; la fourchette va de 0,3 (tout en ferraille) à 2,2 (une électrolyse moins efficace).
- Ciment : une réduction de 80 % (60–95 %), grâce aux substituts du clinker comme l'argile calcinée et le calcaire (LC3), à d'autres combustibles et, pour le CO₂ des procédés qu'aucun changement de combustible ne supprime, au captage du carbone (GCCA, *Concrete Future*, 2021 ; GIEC AR6 GT3, chapitre 11). Le captage et la compression consomment environ 0,1 à 0,3 MWh par tonne de CO₂ évité (CEMCAP 2019) : 0,25 kWh/kg en médiane, de 0,1 à 1,0 là où les fours sont aussi chauffés à l'électricité.

Le CO₂ qu'économise l'industrie propre est le CO₂ de l'industrie × la somme, sur l'acier et le ciment, de part × réduction × (1 − kWh par kg × l'intensité du réseau). À adoption complète sur un réseau propre, cela fait 49 % du CO₂ de l'industrie (26 % pour l'acier, 23 % pour le ciment) ; sur le réseau actuel, environ 27 %. De l'hydrogène produit avec l'électricité d'un réseau qui brûle encore du charbon économise peu, et au haut de la fourchette d'électricité sur le réseau de SSP3-7.0, la part de l'acier peut ajouter du CO₂, ce que montre la fourchette probable.

Aucun des deux leviers ne compte le CO₂ de la fabrication des pompes à chaleur, des électrolyseurs ou des installations de captage.

**Méthane et pollution de l'air.** Par kg de leur CO₂ en 2022 (CEDS), les combustibles fossiles des bâtiments s'accompagnaient de 5,6 g de méthane, surtout des fuites pendant la production du gaz qu'ils brûlent, de 1,1 g de SO₂, de 0,10 g de carbone noir, de 0,12 g de carbone organique et de 1,0 g de NOx ; le bois et la bouse brûlés pour cuisiner, une grande part de la suie des bâtiments, sont laissés de côté, car aucun levier ne les remplace. Les usines d'acier et de ciment s'accompagnaient de 2,1 g de méthane, moins que les autres secteurs parce que leur CO₂ de procédé, issu du calcaire, ne brûle aucun combustible, de 1,4 g de SO₂ et de 1,4 g de NOx. Chaque levier les réduit avec le CO₂ qu'il retire, et l'électricité qu'il consomme apporte celles du secteur électrique (4,1 g de méthane, 2,3 g de SO₂ et 1,5 g de NOx par kg de CO₂ du réseau, en baisse à mesure que l'électricité renouvelable nettoie le réseau). La méthode, le forçage par kg et leur évolution dans le temps sont sur la page [Énergie et transport](#method-sectors).

## Dans l'application

Le volet **Bâtiments et industrie** de la section Leviers compte deux curseurs, chacun la part adoptée, qui monte de l'année en cours jusqu'à l'année réglée par *Tous les leviers en place en*, comme pour tous les leviers (`app/src/levers/industry/model.ts`). Chaque année *y*, avec chaque adoption *a* déjà rapportée à cette montée et *g* l'intensité du réseau dans le scénario choisi, le réseau sur lequel puisent ces leviers est *g′* = *g* × (1 − *a*re), où *a*re est le levier « Électricité renouvelable » du volet [Énergie et transport](#method-sectors) :

- Chauffage propre (`ch`) économise *a* × le CO₂ des bâtiments × (1 − `heatPumpKwhPerKgCo2` × *g′*).
- Acier et ciment propres (`ci`) économise *a* × le CO₂ de l'industrie × Σ part × réduction × (1 − `kwhPerKgCo2` × *g′*) sur l'acier et le ciment.

Les variations de CO₂ sont convoluées avec la courbe d'AGTP du CO₂, et le méthane et la pollution de l'air qui les accompagnent sont traités comme pour le transport, le méthane sous *combustibles fossiles et industrie* et la pollution de l'air sous sa propre cause. La fourchette probable associe l'AGTP à 95 % au haut de chaque réduction et au bas de chaque consommation d'électricité (et l'AGTP à 5 % aux extrémités opposées). Dans la répartition par levier du résumé, tout compte sous *Bâtiments et industrie*, y compris l'économie supplémentaire qu'apporte l'électricité renouvelable à ces leviers quand les deux sont activés ; l'électricité renouvelable seule est comptée sous *Énergie et transport*. Les émissions agricoles, la carte et la bande de l'agriculture du graphique Causes du réchauffement ne changent pas.

## Résultats

Réchauffement évité en °C, médiane (fourchette probable), chaque levier à 100 % de 2026 à 2035, sur les données réelles et SSP2-4.5 avec les options par défaut, en comptant le méthane et la pollution de l'air qui accompagnent le combustible (le CO₂ seul indiqué ensuite) :

| Leviers | 2050 | 2100 |
| --- | --- | --- |
| Chauffage propre | 0,014 (0,001–0,036) ; CO₂ seul 0,009 | 0,066 (0,040–0,112) ; CO₂ seul 0,052 |
| Acier et ciment propres | 0,012 (−0,005 à 0,051) ; CO₂ seul 0,025 | 0,088 (0,036–0,177) ; CO₂ seul 0,092 |
| Électricité renouvelable seule | 0,085 (0,043–0,162) ; CO₂ seul 0,096 | 0,253 (0,167–0,377) ; CO₂ seul 0,234 |
| Chauffage propre avec électricité renouvelable | 0,106 (0,053–0,200) ; CO₂ seul 0,113 | 0,338 (0,224–0,502) ; CO₂ seul 0,303 |
| Acier et ciment propres avec électricité renouvelable | 0,106 (0,050–0,215) ; CO₂ seul 0,131 | 0,361 (0,223–0,560) ; CO₂ seul 0,345 |

Le chauffage propre gagne aux co-émissions dès le départ : le gaz qu'il ne brûle plus avait des fuites de méthane, et brûler du gaz émet peu de SO₂. L'acier et le ciment propres perdent l'essentiel de leur effet de 2050 : le SO₂ de leurs usines refroidit, et la filière hydrogène consomme beaucoup d'électricité du réseau, dont elle ajoute le CO₂ et le méthane ; en 2100, la perte est faible. Avec l'électricité renouvelable en entier, le chauffage propre y ajoute 0,021 °C en 2050 et 0,085 °C en 2100, et l'acier et le ciment propres 0,021 et 0,108 °C : sur un réseau propre, chacun économise plus que seul. Les effets sont petits en 2050, parce que le CO₂ évité s'accumule lentement et que le réseau actuel reprend une grande partie de ce qu'économisent les procédés gourmands en électricité.

## Autres industries

Laissées de côté comme leviers, faute de trajectoire dans les scénarios ou de chiffre clair, ou parce que leurs émissions sont surtout de l'électricité déjà couverte par le levier « Électricité renouvelable » :

- La chimie, environ 1,3 milliard de tonnes de CO₂ direct (AIE) ; une grande partie de son carbone fossile finit dans les produits plutôt que dans l'air, ce qu'une simple part représenterait mal.
- L'aluminium, environ 1,1 milliard de tonnes de CO₂e électricité comprise, environ 0,27 milliard directement (AIE, International Aluminium Institute) : surtout l'électricité des fonderies.
- Les plastiques, 1,8 milliard de tonnes de CO₂e sur leur cycle de vie en 2019 (OCDE, *Global Plastics Outlook*, 2022), réparties entre la chimie, l'électricité et les déchets.
- Le textile et l'habillement, entre environ 0,9 et 4 milliards de tonnes de CO₂e selon le périmètre (Apparel Impact Institute 2025 ; McKinsey et Global Fashion Agenda 2020 ; Quantis 2018), surtout l'électricité et la chaleur des filatures et usines d'Asie.

## Hypothèses

- Le CO₂ direct des bâtiments et de l'industrie suit la forme de son scénario, ramené à 3,0 et 9,0 milliards de tonnes en 2023.
- L'acier et le ciment représentent 28,9 % et 28,7 % du CO₂ direct de l'industrie, chaque année et dans chaque scénario.
- Une pompe à chaleur demande 1,49 kWh par kg de CO₂ de chaudière évité, chaque année ; pompes à chaleur et chaudières ne deviennent pas plus efficaces avec le temps.
- L'acier et le ciment propres réduisent de 90 % et 80 % leur CO₂ direct à adoption complète et consomment 1,5 et 0,25 kWh d'électricité par kg évité, sur le réseau qui reste après l'électricité renouvelable.
- La fabrication des équipements n'est pas comptée.
- Le méthane et la pollution de l'air qui accompagnent le combustible des bâtiments et des usines d'acier et de ciment sont les rapports de CEDS en 2022 par kg de leur CO₂ fossile, CO₂ de procédé compris pour l'industrie, qui évoluent avec les facteurs d'émission du scénario ; l'électricité consommée apporte ceux du réseau (voir [Énergie et transport](#method-sectors)).

## Sources

- Protocole RCMIP v5.1.0, émissions des SSP par secteur : [doi:10.5281/zenodo.4589756](https://doi.org/10.5281/zenodo.4589756). Licence : CC BY-SA 4.0.
- Community Emissions Data System (CEDS), v_2024_07_08 : [doi:10.5281/zenodo.12803197](https://doi.org/10.5281/zenodo.12803197). Licence : CC BY 4.0.
- Andrew, R. M. Global CO₂ emissions from cement production, la série du Global Carbon Budget, version 260830 : [doi:10.5281/zenodo.22178444](https://doi.org/10.5281/zenodo.22178444) ; méthode dans Andrew (2019), Earth System Science Data 11, 1675–1710. Licence : CC BY 4.0.
- AIE (2023). Tracking Clean Energy Progress 2023 : bâtiments, industrie, sidérurgie, ciment, [iea.org/reports/tracking-clean-energy-progress-2023](https://www.iea.org/reports/tracking-clean-energy-progress-2023). Licence : CC BY 4.0.
- AIE (2022). The Future of Heat Pumps, [iea.org/reports/the-future-of-heat-pumps](https://www.iea.org/reports/the-future-of-heat-pumps). Licence : CC BY 4.0.
- AIE (2020). Iron and Steel Technology Roadmap, [iea.org/reports/iron-and-steel-technology-roadmap](https://www.iea.org/reports/iron-and-steel-technology-roadmap).
- GIEC (2006). Lignes directrices pour les inventaires nationaux de gaz à effet de serre, volume 2, chapitre 1, tableau 1.4 : facteurs d'émission de CO₂ par défaut pour la combustion.
- GIEC (2022). Climate Change 2022: Mitigation of Climate Change, groupe de travail III, chapitre 11 (Industrie).
- Mission Possible Partnership (2022). Making Net-Zero Steel Possible.
- Vogl, V., Åhman, M. et Nilsson, L. J. (2018). Assessment of hydrogen direct reduction for fossil-free steelmaking. Journal of Cleaner Production 203, 736–745, [doi:10.1016/j.jclepro.2018.08.279](https://doi.org/10.1016/j.jclepro.2018.08.279).
- GCCA (2021). Concrete Future: the GCCA 2050 Cement and Concrete Industry Roadmap for Net Zero Concrete.
- CEMCAP (2019). CO₂ capture from cement production, résultats finaux (projet Horizon 2020 de l'UE).
- worldsteel. Indicateurs de durabilité (CO₂ par tonne d'acier, électricité comprise).
