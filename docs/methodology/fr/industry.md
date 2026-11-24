# Bâtiments et industrie

À côté des transports et de l'électricité, deux parties de l'économie brûlent directement des combustibles fossiles. Dans les bâtiments, des chaudières au gaz et au fioul chauffent les pièces et l'eau, et des cuisinières servent à cuisiner. Dans l'industrie, l'acier et le ciment sont les plus gros émetteurs. Planetshift propose ici deux leviers, le chauffage propre et l'acier et le ciment propres. Adopté en entier, chacun évite moins de 0,02 °C de réchauffement en 2050, et environ 0,07 et 0,09 °C en 2100. Ils en évitent bien plus quand l'électricité qu'ils consomment est propre (voir *Résultats* plus bas).

## Comment ces émissions sont comptées

Comme celles des secteurs de l'[énergie et des transports](#method-sectors), ces émissions font partie du CO₂ fossile de chaque scénario. Elles ne s'y ajoutent pas, car les températures des scénarios les comprennent déjà.

Un levier en retire une part. Il consomme alors de l'électricité, dont le CO₂ est retranché de l'économie réalisée. La variation est convertie en réchauffement évité avec la même courbe de réponse au CO₂ que pour tous les autres leviers.

Brûler moins de combustible évite aussi le méthane qui fuit pendant sa production, ainsi que sa pollution de l'air. L'électricité consommée ajoute le méthane et la pollution de l'air du réseau. Le calcul est le même que pour les transports (voir *Le méthane et la pollution de l'air qui accompagnent le combustible* sur la page [Énergie et transport](#method-sectors)).

`industry.json` contient les données. Le code est dans `pipeline/planetshift_pipeline/industry.py`, et le module du levier dans `app/src/levers/industry/`.

## Les secteurs et leur avenir

Les émissions de chaque secteur partent en 2023 d'un inventaire récent. Elles suivent ensuite la forme de la trajectoire du scénario, comme pour les transports. Ces trajectoires sont les émissions avec lesquelles FaIR lui-même est lancé : RCMIP v5.1.0, les émissions harmonisées de CMIP6, par secteur CEDS.

- **Bâtiments** : le CO₂ du secteur *Residential Commercial Other* de RCMIP, ramené aux 3,0 milliards de tonnes de CO₂ direct des bâtiments estimés par l'AIE pour 2022, pris pour 2023. C'est le combustible brûlé sur place pour le chauffage, l'eau chaude et la cuisson. L'électricité et la chaleur de réseau qu'utilisent les bâtiments sont dans le secteur électrique. Le secteur de RCMIP contient aussi le carburant des machines agricoles et des bateaux de pêche. Le ramener à l'inventaire des bâtiments les laisse de côté (l'énergie des fermes a son propre levier).
- **Industrie** : le CO₂ du secteur *Industrial Sector* de RCMIP, ramené aux 9,0 milliards de tonnes de CO₂ direct de l'industrie estimés par l'AIE pour 2022, pris pour 2023. C'est le combustible brûlé dans les usines, et le CO₂ des procédés industriels comme la calcination du calcaire.

Émissions en milliards de tonnes de CO₂ par an (2023 / 2050 / 2100) :

| Secteur | SSP1-2.6 | SSP2-4.5 | SSP3-7.0 |
| --- | --- | --- | --- |
| Bâtiments | 3,00 / 2,87 / 1,45 | 3,00 / 2,75 / 1,88 | 3,00 / 3,05 / 1,98 |
| Industrie | 9,00 / 3,92 / 1,06 | 9,00 / 10,41 / 5,47 | 9,00 / 10,81 / 12,18 |

### L'acier et le ciment dans l'industrie

Les scénarios ne détaillent pas l'industrie par produit. L'acier et le ciment en sont donc des parts fixes, les mêmes chaque année et dans chaque scénario :

- **Acier** : 28,9 %. Ce sont les 2,6 milliards de tonnes de CO₂ direct de la sidérurgie en 2022 selon l'AIE, sur les 9,0 de l'industrie. Avec l'électricité qu'achètent les aciéries, l'empreinte du secteur est plus grande, environ 3,6 milliards de tonnes (worldsteel). Cette électricité est comptée dans le secteur électrique.
- **Ciment** : 28,7 %. La série ouverte du CO₂ de procédé des cimenteries du Global Carbon Budget (Andrew) donne 1,55 milliard de tonnes en 2023 (1,49 en 2024). Le CO₂ de procédé est celui que libère le calcaire quand il est calciné en clinker. La calcination représente environ 60 % du CO₂ direct d'une cimenterie, le combustible brûlé dans le four faisant le reste. Le ciment émet donc environ 2,6 milliards de tonnes directement, près des 2,4 de l'AIE.

Le reste de l'industrie, environ 42 %, n'a pas de levier : la chimie, l'aluminium, le papier, l'agroalimentaire et les autres.

## Chauffage propre

Ce levier remplace les chaudières par des pompes à chaleur, et les cuisinières au gaz par des plaques à induction. Il supprime le CO₂ du combustible, mais consomme de l'électricité. Le CO₂ de cette électricité dépend du réseau, comme pour un véhicule électrique.

Sur le réseau mondial actuel, qui émet 0,48 kg de CO₂ par kWh, une pompe à chaleur économise environ 29 % du CO₂ d'une chaudière au gaz (1 − 1,49 × 0,48). C'est proche du constat de l'AIE : une pompe à chaleur économise « au moins 20 %, même avec une électricité produite au gaz ». Sur un réseau propre, elle économise tout ce CO₂.

### L'électricité que consomme une pompe à chaleur

`heatPumpKwhPerKgCo2` est l'électricité nécessaire par kilogramme de CO₂ de chaudière évité. C'est le rendement de la chaudière, divisé par le coefficient de performance saisonnier (COP, la chaleur fournie par unité d'électricité) de la pompe à chaleur et par le CO₂ du combustible par kWh. Ces facteurs sont de 0,202 kg/kWh pour le gaz naturel et de 0,267 kg/kWh pour le fioul domestique, d'après les facteurs par défaut du GIEC de 56,1 et 74,1 t de CO₂ par TJ.

- Médiane : 1,49 kWh/kg, pour une chaudière au gaz à 90 % remplacée par une pompe à chaleur de COP saisonnier 3. Le rapport *The Future of Heat Pumps* de l'AIE (2022) estime les pompes à chaleur trois à cinq fois plus efficaces qu'une chaudière au gaz.
- Bas de la fourchette : 0,80 kWh/kg, pour une chaudière au fioul à 85 % remplacée par une pompe à chaleur de COP 4.
- Haut de la fourchette : 1,88 kWh/kg, pour une chaudière au gaz à condensation à 95 % remplacée par une pompe à chaleur de COP 2,5, comme dans les climats froids.

Le CO₂ qu'économise le chauffage propre est le CO₂ des bâtiments × (1 − `heatPumpKwhPerKgCo2` × l'intensité du réseau).

## Acier et ciment propres

Un seul levier couvre les deux : la part de leur production faite de façon propre. À adoption complète sur un réseau propre, il retire 49 % du CO₂ de l'industrie : 26 % pour l'acier et 23 % pour le ciment. Sur le réseau actuel, il en retire environ 27 %.

Les procédés propres consomment de l'électricité. De l'hydrogène produit avec l'électricité d'un réseau qui brûle encore du charbon économise peu. Au haut de la fourchette d'électricité, sur le réseau de SSP3-7.0, la part de l'acier peut ajouter du CO₂. La fourchette probable le montre.

### Acier

À adoption complète, le CO₂ direct de l'acier baisse de 90 % (75–95 %) :

- L'acier fait de fer réduit à l'hydrogène et fondu au four électrique à arc émet sur place 90 à 95 % de moins qu'un haut fourneau.
- La ferraille fondue au four électrique économise à peu près autant.
- Les hauts fourneaux avec captage du carbone émettent 75 à 90 % de moins.

Ces chiffres viennent de l'*Iron and Steel Technology Roadmap* de l'AIE (2020) et du rapport *Making Net-Zero Steel Possible* de la Mission Possible Partnership (2022).

La réduction directe à l'hydrogène demande 3,48 MWh d'électricité par tonne d'acier liquide, surtout pour produire l'hydrogène, et évite 1,82 t de CO₂ par rapport à un haut fourneau (Vogl et al. 2018) : la filière hydrogène consomme donc 1,9 kWh par kg évité. La ferraille au four électrique demande 0,67 MWh par tonne (même étude), soit 0,4 kWh/kg. La médiane, 1,5 kWh/kg, tire trois quarts de la baisse de l'hydrogène et un quart d'un plus grand usage de ferraille. La fourchette va de 0,4 (tout en ferraille) à 2,2 (une électrolyse moins efficace).

### Ciment

À adoption complète, le CO₂ direct du ciment baisse de 80 % (60–95 %). La baisse vient des substituts du clinker comme l'argile calcinée et le calcaire (LC3), d'autres combustibles, et du captage du carbone pour le CO₂ de procédé qu'aucun changement de combustible ne supprime (GCCA, *Concrete Future*, 2021 ; GIEC AR6 GT3, chapitre 11).

Le captage et la compression consomment environ 0,1 à 0,3 MWh par tonne de CO₂ évité (CEMCAP 2019). Le levier retient 0,25 kWh/kg en médiane, et de 0,1 à 1,0 kWh/kg là où les fours sont aussi chauffés à l'électricité.

### La formule

Pour l'acier et pour le ciment, `cut` est la part de leur CO₂ direct qui disparaît à adoption complète, et `kwhPerKgCo2` l'électricité consommée par kilogramme évité. Le CO₂ qu'économise l'industrie propre est le CO₂ de l'industrie × la somme, sur l'acier et le ciment, de part × réduction × (1 − kWh par kg × l'intensité du réseau).

Aucun des deux leviers ne compte le CO₂ de la fabrication des pompes à chaleur, des électrolyseurs ou des installations de captage.

## Méthane et pollution de l'air

Brûler des combustibles fossiles émet aussi du méthane et des polluants de l'air. CEDS donne ce qui accompagnait chaque kilogramme de CO₂ en 2022 :

- **Combustibles fossiles des bâtiments** : 5,6 g de méthane, surtout des fuites pendant la production du gaz qu'ils brûlent, 1,1 g de SO₂, 0,10 g de carbone noir, 0,12 g de carbone organique et 1,0 g de NOx. Le bois et la bouse brûlés pour cuisiner produisent une grande part de la suie des bâtiments. Ils sont laissés de côté, car aucun levier ne les remplace.
- **Usines d'acier et de ciment** : 2,1 g de méthane, 1,4 g de SO₂ et 1,4 g de NOx. Le méthane est plus bas que dans les autres secteurs, parce que leur CO₂ de procédé vient du calcaire, pas d'un combustible brûlé.
- **Électricité** : 4,1 g de méthane, 2,3 g de SO₂ et 1,5 g de NOx par kg de CO₂ du réseau. Ces valeurs baissent à mesure que l'électricité renouvelable rend le réseau plus propre.

Chaque levier réduit les co-émissions de son secteur au même rythme que le CO₂ qu'il retire. L'électricité qu'il consomme ajoute les co-émissions du secteur électrique. La méthode, le forçage par kg et leur évolution dans le temps sont sur la page [Énergie et transport](#method-sectors).

## Dans l'application

Le volet **Bâtiments et industrie** de la section Leviers compte deux curseurs. Chacun règle la part adoptée. Comme pour tous les leviers, cette part monte de l'année en cours jusqu'à l'année réglée par *Tous les leviers en place en* (`app/src/levers/industry/model.ts`).

Dans la répartition par levier du résumé, tout l'effet de ces leviers compte sous *Bâtiments et industrie*. Cela comprend l'économie supplémentaire qu'apporte l'électricité renouvelable à ces leviers quand les deux sont activés. L'électricité renouvelable seule est comptée sous *Énergie et transport*. Les émissions agricoles, la carte et la bande de l'agriculture du graphique Causes du réchauffement ne changent pas.

### Le calcul de chaque année

Chaque année $y$, chaque adoption $a$ a déjà suivi sa montée, et $g$ est l'intensité du réseau dans le scénario choisi. Le réseau sur lequel puisent ces leviers est $g' = g\,(1 - a_{\text{re}})$, où $a_{\text{re}}$ est le levier « Électricité renouvelable » du volet [Énergie et transport](#method-sectors) :

- Chauffage propre (`ch`) économise $a \times \text{CO}_2\text{ des bâtiments} \times (1 - k\,g')$, avec $k$ = `heatPumpKwhPerKgCo2`.
- Acier et ciment propres (`ci`) économise $a \times \text{CO}_2\text{ de l'industrie} \times \sum_{i} \text{part}_i \times \text{réduction}_i \times (1 - k_i\,g')$ sur $i$ dans l'acier et le ciment, avec $k_i$ = `kwhPerKgCo2`.

Les variations de CO₂ sont convoluées avec la courbe d'AGTP du CO₂ (le réchauffement dû à un kilogramme de CO₂ au fil du temps). Ce qui les accompagne est traité comme pour les transports :

- le CO₂ de la production du combustible (pour l'acier, celui de ses fours à coke et de ses mines de charbon), le méthane et le N₂O, sous *combustibles fossiles et industrie* ;
- la pollution de l'air, monoxyde de carbone et composés organiques volatils compris, sous sa propre cause.

La fourchette probable associe l'AGTP à 95 % au haut de chaque réduction et au bas de chaque consommation d'électricité. Elle associe l'AGTP à 5 % aux extrémités opposées.

## Résultats

Le tableau donne le réchauffement évité en °C : la médiane, puis la fourchette probable entre parenthèses. Chaque levier est à 100 % de 2026 à 2035, sur les données réelles et SSP2-4.5 avec les options par défaut. Les chiffres comptent le CO₂ de l'approvisionnement, le méthane, le N₂O et la pollution de l'air qui accompagnent le combustible. Chaque case donne ensuite le chiffre du CO₂ seul.

| Leviers | 2050 | 2100 |
| --- | --- | --- |
| Chauffage propre | 0,015 (0,001–0,040) ; CO₂ seul 0,009 | 0,069 (0,042–0,119) ; CO₂ seul 0,052 |
| Acier et ciment propres | 0,016 (−0,005 à 0,065) ; CO₂ seul 0,025 | 0,094 (0,037–0,194) ; CO₂ seul 0,092 |
| Électricité renouvelable seule | 0,105 (0,057–0,192) ; CO₂ seul 0,096 | 0,279 (0,184–0,416) ; CO₂ seul 0,234 |
| Chauffage propre avec électricité renouvelable | 0,129 (0,068–0,236) ; CO₂ seul 0,113 | 0,369 (0,244–0,549) ; CO₂ seul 0,303 |
| Acier et ciment propres avec électricité renouvelable | 0,132 (0,066–0,259) ; CO₂ seul 0,131 | 0,395 (0,244–0,617) ; CO₂ seul 0,345 |

Le chauffage propre gagne aux co-émissions dès le départ. Le gaz qu'il ne brûle plus aurait laissé fuir du méthane, et brûler du gaz émet peu de SO₂.

L'acier et le ciment propres perdent plus d'un tiers de leur effet de 2050 aux co-émissions. Le SO₂ de leurs usines refroidit le climat, donc le supprimer réchauffe. La filière hydrogène consomme aussi beaucoup d'électricité du réseau, dont elle ajoute le CO₂ et le méthane. En 2100, ils gagnent un peu. Le CO₂ des fours à coke et le CO qu'émettent les fours sont comptés avec le charbon qui n'est plus brûlé, et ils compensent cette perte.

Avec l'électricité renouvelable en entier, le chauffage propre y ajoute 0,024 °C en 2050 et 0,089 °C en 2100. L'acier et le ciment propres y ajoutent 0,027 et 0,115 °C. Sur un réseau propre, chaque levier économise plus que lorsqu'il agit seul.

Les effets sont petits en 2050, pour deux raisons. Le CO₂ évité s'accumule lentement. Et sur le réseau actuel, l'électricité que consomment les procédés propres annule une grande partie de ce qu'ils économisent.

## Autres industries

Certaines industries n'ont pas de levier. Soit les scénarios ne leur donnent pas de trajectoire, soit il n'existe pas de chiffre clair, soit leurs émissions sont surtout de l'électricité, que le levier « Électricité renouvelable » couvre déjà :

- **La chimie** : environ 1,3 milliard de tonnes de CO₂ direct (AIE). Une grande partie de son carbone fossile finit dans les produits plutôt que dans l'air. Une simple part du CO₂ de l'industrie représenterait mal ce fait.
- **L'aluminium** : environ 1,1 milliard de tonnes de CO₂e électricité comprise, et environ 0,27 milliard directement (AIE, International Aluminium Institute). L'essentiel est l'électricité des fonderies.
- **Les plastiques** : 1,8 milliard de tonnes de CO₂e sur leur cycle de vie en 2019 (OCDE, *Global Plastics Outlook*, 2022), réparties entre la chimie, l'électricité et les déchets.
- **Le textile et l'habillement** : entre environ 0,9 et 4 milliards de tonnes de CO₂e selon le périmètre (Apparel Impact Institute 2025 ; McKinsey et Global Fashion Agenda 2020 ; Quantis 2018). L'essentiel est l'électricité et la chaleur des filatures et des usines d'Asie.

## Hypothèses

- Le CO₂ direct des bâtiments et de l'industrie suit la forme de son scénario, ramené à 3,0 et 9,0 milliards de tonnes en 2023.
- L'acier et le ciment représentent 28,9 % et 28,7 % du CO₂ direct de l'industrie, chaque année et dans chaque scénario.
- Une pompe à chaleur demande 1,49 kWh par kg de CO₂ de chaudière évité, chaque année. Pompes à chaleur et chaudières ne deviennent pas plus efficaces avec le temps.
- L'acier et le ciment propres réduisent de 90 % et 80 % leur CO₂ direct à adoption complète. Ils consomment 1,5 et 0,25 kWh d'électricité par kg évité, sur le réseau qui reste après l'électricité renouvelable.
- La fabrication des équipements n'est pas comptée.
- Ce qui accompagne le combustible des bâtiments et des usines d'acier et de ciment (le CO₂ de sa production, le méthane, le N₂O et la pollution de l'air) suit les rapports de CEDS en 2022 par kg de leur CO₂ fossile, CO₂ de procédé compris pour l'industrie. Ces rapports évoluent avec les facteurs d'émission du scénario. L'électricité consommée ajoute les co-émissions du réseau (voir [Énergie et transport](#method-sectors)).

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
