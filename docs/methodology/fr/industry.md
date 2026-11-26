# Bâtiments et industrie

À côté des transports et de l'électricité, deux parties de l'économie brûlent directement des combustibles fossiles. Dans les bâtiments, des chaudières au gaz et au fioul chauffent les pièces et l'eau, et des cuisinières servent à cuisiner. Dans l'industrie, l'acier et le ciment sont les plus gros émetteurs, suivis de la chimie. Planetshift propose ici deux leviers, le chauffage propre et l'industrie propre, qui couvre l'acier, le ciment et la chimie. Adopté en entier, chacun évite moins de 0,02 °C de réchauffement en 2050, et environ 0,06 et 0,11 °C en 2100. Ils en évitent bien plus quand l'électricité qu'ils consomment est propre (voir *Résultats* plus bas).

## Comment ces émissions sont comptées

Comme celles des secteurs de l'[énergie et des transports](#method-sectors), ces émissions font partie du CO₂ fossile de chaque scénario. Elles ne s'y ajoutent pas, car les températures des scénarios les comprennent déjà.

Un levier en retire une part. Il consomme alors de l'électricité, dont le CO₂ est retranché de l'économie réalisée. La variation est convertie en réchauffement évité avec la même courbe de réponse au CO₂ que pour tous les autres leviers.

Brûler moins de combustible évite aussi le méthane qui fuit pendant sa production, ainsi que sa pollution de l'air. L'électricité consommée ajoute le méthane et la pollution de l'air du réseau. Le calcul est le même que pour les transports (voir *Le méthane et la pollution de l'air qui accompagnent le combustible* sur la page [Énergie et transport](#method-sectors)).

`industry.json` contient les données. Le code est dans `pipeline/planetshift_pipeline/industry.py`, et le module du levier dans `app/src/levers/industry/`.

## Les secteurs et leur avenir

Les émissions de chaque secteur partent d'un inventaire récent. Elles suivent ensuite la forme de la trajectoire du scénario, comme pour les transports. Ces trajectoires sont les émissions avec lesquelles tourne FaIR lui-même : RCMIP v5.1.0, les émissions harmonisées de CMIP6, par secteur CEDS.

- **Bâtiments** : le CO₂ du secteur *Residential Commercial Other* de RCMIP, ramené aux 2,68 milliards de tonnes de CO₂ fossile des combustibles résidentiels, commerciaux et institutionnels que donne CEDS pour 2022, sa dernière année, et porté à 2023 par la forme du scénario, comme le transport routier. C'est le combustible fossile brûlé sur place pour le chauffage, l'eau chaude et la cuisson. L'électricité et la chaleur de réseau qu'utilisent les bâtiments sont dans le secteur électrique. Le secteur de RCMIP contient aussi le carburant des machines agricoles et des bateaux de pêche. Le ramener à l'inventaire des bâtiments les laisse de côté (l'énergie des fermes a son propre levier).
- **Industrie** : le CO₂ du secteur *Industrial Sector* de RCMIP, ramené aux 9,0 milliards de tonnes de CO₂ direct de l'industrie estimés par l'AIE pour 2022, pris pour 2023. C'est le combustible brûlé dans les usines, et le CO₂ des procédés industriels comme la calcination du calcaire.

Émissions en milliards de tonnes de CO₂ par an (2023 / 2050 / 2100) :

| Secteur | SSP1-2.6 | SSP2-4.5 | SSP3-7.0 |
| --- | --- | --- | --- |
| Bâtiments | 2,69 / 2,57 / 1,30 | 2,61 / 2,40 / 1,64 | 2,70 / 2,75 / 1,78 |
| Industrie | 9,00 / 3,92 / 1,06 | 9,00 / 10,41 / 5,47 | 9,00 / 10,81 / 12,18 |

### L'acier, le ciment et la chimie dans l'industrie

Les scénarios ne détaillent pas l'industrie par produit. L'acier, le ciment et la chimie en sont donc des parts fixes, les mêmes chaque année et dans chaque scénario :

- **Acier** : 28,9 %. Ce sont les 2,6 milliards de tonnes de CO₂ direct de la sidérurgie en 2022 selon l'AIE, sur les 9,0 de l'industrie. Avec l'électricité qu'achètent les aciéries, l'empreinte du secteur est plus grande, environ 3,6 milliards de tonnes (worldsteel). Cette électricité est comptée dans le secteur électrique.
- **Ciment** : 28,7 %. La série ouverte du CO₂ de procédé des cimenteries du Global Carbon Budget (Andrew) donne 1,55 milliard de tonnes en 2023 (1,49 en 2024). Le CO₂ de procédé est celui que libère le calcaire quand il est calciné en clinker. La calcination représente environ 60 % du CO₂ direct d'une cimenterie, le combustible brûlé dans le four faisant le reste. Le ciment émet donc environ 2,6 milliards de tonnes directement, près des 2,4 de l'AIE.
- **Chimie** : 5,7 %. Les produits chimiques de base (éthylène, propylène, aromatiques, méthanol et ammoniac) ont émis environ 935 millions de tonnes de CO₂ direct en 2022, dont 45 % pour l'ammoniac (AIE, *Tracking Clean Energy Progress*, chimie). L'ammoniac est laissé de côté, ce qui laisse 0,51 milliard de tonnes pour le méthanol et les produits chimiques à haute valeur. L'ammoniac est la matière des engrais azotés. Son CO₂ n'est réduit que du côté de la ferme, par « Moins d'azote, mieux employé », dans le périmètre du berceau à la sortie de ferme (voir [Pratiques agricoles](#method-practices)), pour qu'aucune tonne ne soit réduite deux fois.

Le reste de l'industrie, environ 37 %, n'a pas de levier : l'ammoniac, l'aluminium, le papier, l'agroalimentaire et les autres.

## Chauffage propre

Ce levier remplace les chaudières par des pompes à chaleur, et les cuisinières au gaz par des plaques à induction. Il supprime le CO₂ du combustible, mais consomme de l'électricité. Le CO₂ de cette électricité dépend du réseau, comme pour un véhicule électrique.

Sur le réseau mondial actuel, qui émet 0,48 kg de CO₂ par kWh, une pompe à chaleur économise environ 29 % du CO₂ d'une chaudière au gaz (1 − 1,49 × 0,48). C'est proche du constat de l'AIE : une pompe à chaleur économise « au moins 20 %, même avec une électricité produite au gaz ». Sur un réseau propre, elle économise tout ce CO₂.

### L'électricité que consomme une pompe à chaleur

`heatPumpKwhPerKgCo2` est l'électricité nécessaire par kilogramme de CO₂ de chaudière évité. C'est le rendement de la chaudière, divisé par le coefficient de performance saisonnier (COP, la chaleur fournie par unité d'électricité) de la pompe à chaleur et par le CO₂ du combustible par kWh. Ces facteurs sont de 0,202 kg/kWh pour le gaz naturel et de 0,267 kg/kWh pour le fioul domestique, d'après les facteurs par défaut du GIEC de 56,1 et 74,1 t de CO₂ par TJ.

- Médiane : 1,49 kWh/kg, pour une chaudière au gaz à 90 % remplacée par une pompe à chaleur de COP saisonnier 3. Le rapport *The Future of Heat Pumps* de l'AIE (2022) estime les pompes à chaleur trois à cinq fois plus efficaces qu'une chaudière au gaz.
- Bas de la fourchette : 0,80 kWh/kg, pour une chaudière au fioul à 85 % remplacée par une pompe à chaleur de COP 4.
- Haut de la fourchette : 1,88 kWh/kg, pour une chaudière au gaz à condensation à 95 % remplacée par une pompe à chaleur de COP 2,5, comme dans les climats froids.

Le CO₂ qu'économise le chauffage propre est le CO₂ des bâtiments × (1 − `heatPumpKwhPerKgCo2` × l'intensité du réseau).

## Industrie propre

Un seul levier couvre l'acier, le ciment et la chimie : la part de leur production faite de façon propre. À adoption complète sur un réseau propre, il retire 56 % du CO₂ de l'industrie : 26 % pour l'acier, 26 % pour le ciment et 5 % pour la chimie. Sur le réseau actuel, il en retire environ 31 %.

Les procédés propres consomment de l'électricité. De l'hydrogène produit avec l'électricité d'un réseau qui brûle encore du charbon économise peu. Au haut de la fourchette d'électricité, sur le réseau de SSP3-7.0, la part de l'acier peut ajouter du CO₂. La fourchette probable le montre.

### Acier

À adoption complète, le CO₂ direct de l'acier baisse de 90 % (90–97 %). Les chiffres viennent de l'*Iron and Steel Technology Roadmap* de l'AIE (2020) :

- Dans le scénario de développement durable de l'AIE, le CO₂ direct par tonne d'acier brut baisse de 90 % d'ici 2070 (p. 54). C'est la médiane.
- La réduction par fusion avec captage du carbone émettrait environ 90 % de moins qu'un haut fourneau (p. 92), et dans les filières de l'AIE avec captage, 90 % du CO₂ est capté (note de la figure 2.11, p. 107). C'est le bas de la fourchette.
- La ferraille fondue au four électrique émet sur place 0,04 t de CO₂ par tonne d'acier brut, contre 1,2 t pour un haut fourneau (tableau p. 42), soit 97 % de moins. C'est le haut de la fourchette.
- Le fer réduit à l'hydrogène produit avec une électricité propre donnerait un acier primaire sans émissions (p. 93).

La réduction directe à l'hydrogène demande 3,48 MWh d'électricité par tonne d'acier liquide, surtout pour produire l'hydrogène, et évite 1,82 t de CO₂ par rapport à un haut fourneau (Vogl et al. 2018) : la filière hydrogène consomme donc 1,9 kWh par kg évité. La ferraille au four électrique demande 0,67 MWh par tonne (même étude), soit 0,4 kWh/kg. La médiane, 1,5 kWh/kg, tire trois quarts de la baisse de l'hydrogène et un quart d'un plus grand usage de ferraille. La fourchette va de 0,4 (tout en ferraille) à 2,2 (une électrolyse moins efficace).

### Ciment

À adoption complète, chaque four capte son CO₂, de procédé comme de combustion. Voldsund et al. (2019) comparent six technologies de captage sur le même four de référence, pour le projet européen CEMCAP. Toutes évitent 90 à 93 % du CO₂ à la cheminée (leur tableau 14). Le CO₂ direct du ciment baisse donc de 90 % (90–93 %).

L'électricité vient des tableaux 14 et 15 de la même étude, par kg de clinker :

- Le captage en oxycombustion, celui qui demande le moins d'énergie primaire par kg évité, fait passer la consommation électrique de l'usine de 474 à 1 094 kJ, moins les 83 kJ qu'il produit. Il ramène le CO₂ à la cheminée de 846 à 88 g. Cela fait 0,20 kWh par kg évité, la médiane et le bas de la fourchette.
- La liquéfaction assistée par membranes, l'autre technique de captage qui ne consomme que de l'électricité, utilise 1 491 kJ et laisse 84 g. Cela fait 0,37 kWh/kg, le haut de la fourchette.

Les autres technologies demandent de la vapeur produite au gaz, ou brûlent plus de charbon, ce que ce levier ne compte pas. Les substituts du clinker, comme l'argile calcinée et le calcaire, réduisent aussi le CO₂ du ciment. Ils sont laissés de côté, car le captage sur chaque four retire déjà le CO₂ qu'ils réduiraient.

### Chimie

L'AIE nomme deux voies pour les produits chimiques de base : l'hydrogène électrolytique et le captage du carbone (CCUS). Dans sa feuille de route Net Zero, 93 % des produits chimiques de base sont faits avec des émissions quasi nulles en 2050 : 56 % de la production avec le CCUS et 28 % avec l'hydrogène électrolytique (AIE 2023, *Primary chemicals*, CC BY 4.0). À adoption complète, le CO₂ direct de la chimie baisse de 80 % (60–93 %). Le haut de la fourchette est le chiffre de 93 % de l'AIE. La médiane et le bas sont un jugement de Planetshift, non vérifié à une source.

- **L'hydrogène électrolytique**, avec du carbone capté comme matière première, consomme plus de 18,1 PWh d'électricité bas carbone pour réduire de 3,5 milliards de tonnes de CO₂e par an (Kätelhön et al. 2019), soit 5,2 kWh par kg évité. C'est le haut de la fourchette.
- **Le CCUS** est supposé consommer la même électricité que le captage en oxycombustion sur un four de cimenterie, 0,20 kWh par kg évité (Voldsund et al. 2019). Aucune source ouverte ne le donne pour les usines chimiques. C'est le bas de la fourchette.

La médiane, 1,9 kWh/kg, pondère les deux voies à deux contre un, comme les 56 % et 28 % de l'AIE.

### La formule

Pour l'acier, le ciment et la chimie, `cut` est la part du CO₂ direct de chacun qui disparaît à adoption complète, et `kwhPerKgCo2` l'électricité consommée par kilogramme évité. Le CO₂ qu'économise l'industrie propre est le CO₂ de l'industrie × la somme, sur l'acier, le ciment et la chimie, de part × réduction × (1 − kWh par kg × l'intensité du réseau).

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
- Industrie propre (`ci`) économise $a \times \text{CO}_2\text{ de l'industrie} \times \sum_{i} \text{part}_i \times \text{réduction}_i \times (1 - k_i\,g')$ sur $i$ dans l'acier, le ciment et la chimie, avec $k_i$ = `kwhPerKgCo2`.

Les variations de CO₂ sont convoluées avec la courbe d'AGTP du CO₂ (le réchauffement dû à un kilogramme de CO₂ au fil du temps). Ce qui les accompagne est traité comme pour les transports :

- le CO₂ de la production du combustible (pour l'acier, celui de ses fours à coke et de ses mines de charbon), le méthane et le N₂O, sous *combustibles fossiles et industrie* ;
- la pollution de l'air, monoxyde de carbone et composés organiques volatils compris, sous sa propre cause.

La fourchette probable associe l'AGTP à 95 % au haut de chaque réduction et au bas de chaque consommation d'électricité. Elle associe l'AGTP à 5 % aux extrémités opposées.

## Résultats

Le tableau donne le réchauffement évité en °C : la médiane, puis la fourchette probable entre parenthèses. Chaque levier est à 100 % de 2026 à 2035, sur les données réelles et SSP2-4.5 avec les options par défaut. Les chiffres comptent le CO₂ de l'approvisionnement, le méthane, le N₂O et la pollution de l'air qui accompagnent le combustible. Chaque case donne ensuite le chiffre du CO₂ seul.

| Leviers | 2050 | 2100 |
| --- | --- | --- |
| Chauffage propre | 0,013 (0,001–0,037) ; CO₂ seul 0,008 | 0,061 (0,036–0,112) ; CO₂ seul 0,046 |
| Industrie propre | 0,017 (−0,006 à 0,072) ; CO₂ seul 0,029 | 0,109 (0,055–0,225) ; CO₂ seul 0,108 |
| Électricité renouvelable seule | 0,100 (0,052–0,194) ; CO₂ seul 0,097 | 0,284 (0,182–0,451) ; CO₂ seul 0,240 |
| Chauffage propre avec électricité renouvelable | 0,120 (0,061–0,233) ; CO₂ seul 0,112 | 0,363 (0,233–0,577) ; CO₂ seul 0,301 |
| Industrie propre avec électricité renouvelable | 0,130 (0,064–0,268) ; CO₂ seul 0,137 | 0,419 (0,264–0,688) ; CO₂ seul 0,371 |

Le chauffage propre gagne aux co-émissions dès le départ. Le gaz qu'il ne brûle plus aurait laissé fuir du méthane, et brûler du gaz émet peu de SO₂.

L'industrie propre perd plus d'un tiers de son effet de 2050 aux co-émissions. Le SO₂ de leurs usines refroidit le climat, donc le supprimer réchauffe. Les filières hydrogène consomment aussi beaucoup d'électricité du réseau, dont elles ajoutent le CO₂ et le méthane. En 2100, son effet avec les co-émissions égale à peu près celui de son seul CO₂. Le CO₂ des fours à coke et le CO qu'émettent les fours sont comptés avec le charbon qui n'est plus brûlé, et ils compensent cette perte.

Avec l'électricité renouvelable en entier, le chauffage propre y ajoute 0,020 °C en 2050 et 0,079 °C en 2100. L'industrie propre y ajoute 0,030 et 0,135 °C. Sur un réseau propre, chaque levier économise plus que lorsqu'il agit seul.

Les effets sont petits en 2050, pour deux raisons. Le CO₂ évité s'accumule lentement. Et sur le réseau actuel, l'électricité que consomment les procédés propres annule une grande partie de ce qu'ils économisent.

## Autres industries

Certaines industries n'ont pas de levier. Soit les scénarios ne leur donnent pas de trajectoire et il n'existe pas d'année de base ouverte d'où partir, soit leurs émissions sont surtout de l'électricité, que le levier « Électricité renouvelable » couvre déjà :

- **L'aluminium** : 1,11 à 1,12 milliard de tonnes de CO₂e en 2022–2023, électricité comprise (JRC, fiche *Aluminium*, d'après l'International Aluminium Institute). L'essentiel est l'électricité des fonderies, que l'électricité renouvelable atteint déjà : un levier propre la compterait deux fois.
- **Les plastiques** : 1,8 milliard de tonnes de CO₂e sur leur cycle de vie en 2019 (OCDE, *Global Plastics Outlook*, 2022), réparties entre la chimie, l'électricité et les déchets. Les scénarios ne leur donnent pas de trajectoire, et il n'existe pas d'année de base ouverte pour eux ; leur fabrication est dans la part de la chimie.
- **Le textile et l'habillement** : 0,944 milliard de tonnes de CO₂e en 2023, dont 55 % pour la production des matières (Apparel Impact Institute, *Taking Stock* 2025). L'essentiel est l'électricité et la chaleur des filatures et des usines d'Asie. Les scénarios ne leur donnent pas de trajectoire, et il n'existe pas d'année de base ouverte pour eux.
- **La construction** : ses émissions intrinsèques sont surtout celles de l'acier et du ciment, que l'industrie propre couvre déjà.

## Hypothèses

- Le CO₂ direct des bâtiments suit la forme de son scénario, ramené aux 2,68 milliards de tonnes de CEDS en 2022. Celui de l'industrie suit la forme de son scénario, ramené aux 9,0 milliards de tonnes de l'AIE en 2023.
- L'acier, le ciment et la chimie (sans l'ammoniac) représentent 28,9 %, 28,7 % et 5,7 % du CO₂ direct de l'industrie, chaque année et dans chaque scénario.
- Une pompe à chaleur demande 1,49 kWh par kg de CO₂ de chaudière évité, chaque année. Pompes à chaleur et chaudières ne deviennent pas plus efficaces avec le temps.
- L'acier, le ciment et la chimie propres réduisent de 90 %, 90 % et 80 % leur CO₂ direct à adoption complète. Ils consomment 1,5, 0,20 et 1,9 kWh d'électricité par kg évité, sur le réseau qui reste après l'électricité renouvelable.
- La fabrication des équipements n'est pas comptée.
- Ce qui accompagne le combustible des bâtiments et de l'industrie (le CO₂ de sa production, le méthane, le N₂O et la pollution de l'air) suit les rapports de CEDS en 2022 par kg de leur CO₂ fossile, CO₂ de procédé compris pour l'industrie ; les usines chimiques prennent les rapports de l'industrie, que CEDS tire des usines de fer, d'acier, de ciment et de chaux. Ces rapports évoluent avec les facteurs d'émission du scénario. L'électricité consommée ajoute les co-émissions du réseau (voir [Énergie et transport](#method-sectors)).

## Sources

- Protocole RCMIP v5.1.0, émissions des SSP par secteur : [doi:10.5281/zenodo.4589756](https://doi.org/10.5281/zenodo.4589756). Licence : CC BY-SA 4.0.
- Community Emissions Data System (CEDS), v_2024_07_08 : [doi:10.5281/zenodo.12803197](https://doi.org/10.5281/zenodo.12803197). Licence : CC BY 4.0.
- Andrew, R. M. Global CO₂ emissions from cement production, la série du Global Carbon Budget, version 260830 : [doi:10.5281/zenodo.22178444](https://doi.org/10.5281/zenodo.22178444) ; méthode dans Andrew (2019), Earth System Science Data 11, 1675–1710. Licence : CC BY 4.0.
- AIE (2023). Tracking Clean Energy Progress 2023 : bâtiments, industrie, sidérurgie, ciment, chimie, [iea.org/reports/tracking-clean-energy-progress-2023](https://www.iea.org/reports/tracking-clean-energy-progress-2023). Licence : CC BY 4.0.
- AIE (2023). Net Zero Roadmap : Primary chemicals, [iea.org/reports/primary-chemicals](https://www.iea.org/reports/primary-chemicals). Licence : CC BY 4.0.
- Kätelhön, A., Meys, R., Deutz, S., Suh, S. et Bardow, A. (2019). Climate change mitigation potential of carbon capture and utilization in the chemical industry. PNAS 116, 11187–11194, [doi:10.1073/pnas.1821029116](https://doi.org/10.1073/pnas.1821029116).
- Apparel Impact Institute (2025). Taking Stock of Progress Against the Roadmap to Net Zero.
- JRC (2026). Fiche Aluminium (JRC144120), [publications.jrc.ec.europa.eu](https://publications.jrc.ec.europa.eu/repository/handle/JRC144120).
- AIE (2022). The Future of Heat Pumps, [iea.org/reports/the-future-of-heat-pumps](https://www.iea.org/reports/the-future-of-heat-pumps). Licence : CC BY 4.0.
- AIE (2020). Iron and Steel Technology Roadmap, [iea.org/reports/iron-and-steel-technology-roadmap](https://www.iea.org/reports/iron-and-steel-technology-roadmap) : CO₂ direct par tonne des principales filières (tableau p. 42), scénario de développement durable (p. 54), réduction par fusion avec captage et réduction à l'hydrogène (p. 92–93).
- GIEC (2006). Lignes directrices pour les inventaires nationaux de gaz à effet de serre, volume 2, chapitre 1, tableau 1.4 : facteurs d'émission de CO₂ par défaut pour la combustion.
- Vogl, V., Åhman, M. et Nilsson, L. J. (2018). Assessment of hydrogen direct reduction for fossil-free steelmaking. Journal of Cleaner Production 203, 736–745, [doi:10.1016/j.jclepro.2018.08.279](https://doi.org/10.1016/j.jclepro.2018.08.279).
- Voldsund, M., Gardarsdottir, S. O., De Lena, E. et al. (2019). Comparison of technologies for CO₂ capture from cement production, part 1: technical evaluation. Energies 12, 559, tableaux 14 et 15, [doi:10.3390/en12030559](https://doi.org/10.3390/en12030559). Licence : CC BY 4.0.
- worldsteel. Indicateurs de durabilité (CO₂ par tonne d'acier, électricité comprise).
