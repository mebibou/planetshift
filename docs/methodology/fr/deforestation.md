# Déforestation

Défricher la forêt pour faire place à des pâturages et à des cultures libère le carbone contenu dans les arbres, leurs racines et le sol en dessous. Pour les aliments du modèle, cela représente environ 2 Gt (milliards de tonnes) de CO₂ par an, dont la moitié est liée à la viande bovine. On voit ci-dessous d'où vient ce chiffre, sur quels aliments et quels pays il porte, et comment le changement de régime et le levier de la déforestation le réduisent. La même page traite de la tourbe drainée pour l'agriculture, et du levier qui la remouille.

## Ce qu'émet le défrichement

La déforestation est la plus grande source de CO₂ du système alimentaire après les combustibles fossiles. Elle représentait environ 2 Gt de CO₂ par an au début des années 2020. Les émissions agricoles de chaque aliment dans `intensities.json` (voir [Émissions](#method-emissions)) ne comprennent pas la déforestation, et Planetshift la compte donc à part. Son CO₂ est donné par pays producteur et par produit des bilans alimentaires, le tableau de FAOSTAT de ce que chaque pays produit, échange et mange (voir [Données](#method-data)). Le modèle peut alors la compter et la réduire par un levier.

Sur 2019–2023, les produits alimentaires du modèle portent 1,99 Gt de CO₂ par an.

- **Par aliment** : la viande bovine en porte la moitié, 1,04 Gt. Viennent ensuite le manioc (0,14), le maïs (0,11), le riz (0,11), le soja (0,07) et le palmier à huile (0,06).
- **Par pays** : le Brésil arrive en tête, avec 0,75 Gt, dont 94 % dus aux pâturages. Viennent ensuite la République démocratique du Congo (0,24 Gt, dus aux défrichements des petits exploitants pour le manioc, le riz, le maïs et d'autres cultures vivrières), la Bolivie (0,10), la Colombie (0,09), l'Indonésie (0,09), le Pérou (0,06), l'Inde (0,06), le Mexique (0,04), la Côte d'Ivoire (0,04) et le Nigeria (0,04).

Les émissions sont comptées dans le pays de production, là où la forêt est défrichée. Un changement de régime en Europe agit pourtant sur la déforestation du Brésil, par le commerce. Dans le modèle, les fermes de chaque pays changent en proportion de leur part de la production mondiale. Une baisse de la demande mondiale de bœuf ou de soja fait donc baisser la production des pays qui défrichent la forêt pour les produire.

## Comment le modèle la réduit

Les données donnent la référence : les tonnes de CO₂ émises chaque année par le défrichement, pour chaque pays et chaque produit, à la production actuelle. Le modèle utilise cette référence de deux façons à la fois.

**La déforestation suit la production.** Le CO₂ d'un produit dans un pays varie en proportion de la variation de sa production. La déforestation est ainsi traitée comme entraînée par la production du produit de base. Un régime avec moitié moins de bœuf divise alors par deux la déforestation due aux pâturages, et un régime avec plus de soja augmente les défrichements dus au soja. Les empreintes de déforestation fondées sur la consommation reposent sur la même hypothèse.

D'un côté, cette hypothèse favorise les changements de régime. Ce qui entraîne le défrichement est la croissance de la production plutôt que son niveau, et le prix des terres, les routes et l'application de la loi comptent autant que la demande. De l'autre, elle sous-estime leur effet. Si la demande de bœuf baisse, le front de déforestation peut cesser complètement d'avancer, et pas seulement ralentir en proportion.

**La déforestation est réduite directement.** Le levier de la déforestation fixe la part de la déforestation arrêtée, quel que soit le régime. Il représente les chaînes d'approvisionnement zéro déforestation et la protection des forêts. Le CO₂ évité est cette part du total, par produit ou pour tous les produits. Avec à la fois un changement de régime et ce levier, le levier s'applique à ce qui reste après le changement. Les deux effets se multiplient au lieu de s'additionner.

**Un exemple chiffré.** La viande bovine porte 1,04 Gt de CO₂ par an. Si la production mondiale de bœuf était divisée par deux, et que le bœuf de chaque pays baissait de la même part, la déforestation due au bœuf tomberait à 0,52 Gt. Avec le levier à 50 %, la moitié de ce qui reste est arrêtée, et il reste 0,26 Gt. Le levier évite alors 0,26 Gt, et non la moitié des 1,04 Gt de départ.

### Comment le CO₂ évité entre dans la température

Dans les deux cas, le CO₂ évité est une émission de CO₂ qui n'a pas lieu, année après année. Il entre dans le modèle climatique comme tout autre CO₂. Le carbone libéré par le défrichement est du CO₂ d'usage des terres, que le modèle climatique traite comme du CO₂ fossile (voir [Des émissions à la température](#method-climate)). La différence entre les deux est le changement d'albédo de surface (la part de la lumière du soleil que le sol renvoie). Ce changement est petit par rapport à l'incertitude sur les émissions.

La repousse de la forêt sur les terres agricoles libérées par un changement de régime est un effet distinct, compté sur la page [Terres](#method-land). Elle ne doit pas s'ajouter à la déforestation évitée sur le même hectare.

## Les données en détail

Les données sont dans `deforestation.json`. Le code est `pipeline/planetshift_pipeline/deforestation.py`, et sa table est `pipeline/deforestation_items.csv`.

### DeDuCE

La source est DeDuCE (Deforestation Driven Carbon Emissions), version 2.1, de Singh, Persson, Croft, Kastner et West, publiée sur Zenodo sous licence CC BY 4.0. DeDuCE croise deux sortes de données. Des cartes satellitaires montrent où la forêt a été perdue et ce qui l'a remplacée. Les statistiques de FAOSTAT donnent les surfaces de cultures, de pâturages et de plantations. À partir de ces données, DeDuCE attribue la déforestation de chaque pays de 2001 à 2023 à l'extension des pâturages, d'environ 180 cultures et des plantations forestières.

Là où les cartes montrent ce qui pousse sur la terre défrichée, la terre est attribuée directement à cette culture. Ailleurs, un bilan des terres l'attribue aux cultures et aux pâturages qui se sont étendus dans le pays cette année-là. Au Brésil, ce bilan est fait pour chaque municipalité. Les émissions sont la perte nette de carbone de la biomasse aérienne, de la biomasse souterraine et du sol, moins le carbone que contient l'usage des terres qui remplace la forêt.

### Quelle série et quelles années

DeDuCE donne deux séries :

- La série **non amortie** met toutes les émissions d'un hectare l'année de son défrichement.
- La série **amortie** les répartit sur les cinq années qui suivent le défrichement. Elle mesure la déforestation « incorporée » dans la récolte de chaque année.

Planetshift utilise la série amortie, parce que le modèle fait varier les émissions avec la production. Il fait la moyenne des années 2019 à 2023, les cinq dernières, pour qu'une année sèche ou un changement de politique ne domine pas.

La carte montre plutôt la surface de forêt défrichée : l'attribution non amortie de DeDuCE, en hectares, en moyenne sur les mêmes années et répartie entre les aliments comme le CO₂. Elle totalise environ 4,2 millions d'hectares par an pour les aliments du modèle, dont 1,5 million au Brésil. Le modèle la fait varier avec la production de chaque aliment et avec le levier, de la même façon que le CO₂. L'infobulle de la carte donne les deux.

### Sols organiques drainés

Drainer les tourbières et autres sols organiques pour l'agriculture expose leur carbone à l'air. Ses émissions viennent de terres déjà défrichées et continuent que l'on coupe ou non davantage de forêt : le levier déforestation ne les arrête donc pas. Elles relèvent des terres que l'alimentation occupe, et suivent la production de chaque aliment. Remouiller les terres les arrête, ce que fait le levier de remouillage des tourbières (voir *Remouiller la tourbe drainée* plus bas).

Les *Emissions from Drained organic soils* de FAOSTAT (CC BY 4.0) donnent la surface drainée et le CO₂ de chaque pays sur les terres cultivées et sur les prairies. Pour 2024, environ 24,6 millions d'hectares sont drainés pour l'agriculture. Les pays du modèle émettent 0,81 Gt de CO₂ par an : 0,65 Gt sur les terres cultivées et 0,16 Gt sur les prairies. L'Indonésie vient en tête avec 0,24 Gt, puis la Russie, les États-Unis, la Biélorussie et le Canada.

- Le CO₂ des terres cultivées va aux cultures selon le drainage des tourbières de DeDuCE par produit, là où DeDuCE a ces données pour le pays : celui de l'Indonésie va donc surtout au palmier à huile (0,18 Gt). Ailleurs, il va aux cultures selon leur surface récoltée.
- Le CO₂ des prairies va aux produits des ruminants (bœuf, viande ovine et caprine, autres viandes, lait) en proportion de leur méthane.

Le CO₂ suit la production de chaque aliment, comme le défrichement, et compte dans la cause Usage des terres. Quand le changement de régime libère des terres drainées, le modèle les suppose remises en eau, si bien que leur CO₂ s'arrête. Des terres restées drainées continueraient d'émettre : c'est donc le plus que le changement pourrait éviter. Le changement complet en évite 0,27 Gt par an. Le N₂O des sols drainés, 0,35 Mt par an, est laissé de côté. Le drainage des tourbières de DeDuCE (environ 0,23 Gt) ne sert pas d'émission, seulement à répartir le CO₂ des terres cultivées entre les cultures.

Une tourbe remise en eau redevient une zone humide, et les zones humides émettent du méthane. Le supplément 2013 du GIEC sur les zones humides (tableau 3.3) donne le méthane des sols organiques remis en eau, en kg de CH₄-C par hectare et par an : 216 (0–856) en zone tempérée là où le sol est riche en nutriments, comme l'est d'ordinaire la tourbe cultivée, et 41 (7–134) sous les tropiques. Cela fait 288 et 55 kg de CH₄. La zone boréale a ses propres facteurs, mais les chiffres de FAOSTAT ne la distinguent pas de la zone tempérée. La plupart de la tourbe agricole drainée de Russie, du Canada et des pays nordiques se trouve dans leur sud tempéré froid, si bien que chaque hectare drainé hors des tropiques prend le facteur tempéré, ce qui peut surestimer le méthane dans le Grand Nord. La part tropicale des terres de chaque pays se lit dans le CO₂ par hectare de FAOSTAT lui-même, qui correspond au facteur tempéré du GIEC, son facteur tropical ou un mélange des deux. Environ un tiers de la surface est tropicale. Remis en eau, les sols drainés des pays du modèle émettraient 5,0 Mt de méthane par an. La Russie, la Biélorussie, le Canada, le Royaume-Uni, l'Indonésie, l'Allemagne et les États-Unis en donnent chacun environ 0,3 à 0,55 Mt. Le méthane est réparti entre les aliments comme le CO₂.

Les terres que le changement libère émettent donc du méthane à la place de leur CO₂. Le changement complet libère des terres qui émettraient 2,9 Mt de méthane par an une fois remises en eau, contre les 0,27 Gt de CO₂ qu'il arrête. Le méthane compte dans la cause Usage des terres, sous la famille de l'étape qui a libéré les terres. Il retire 0,0025 °C au réchauffement évité par le changement complet en 2050 (0,141 °C au lieu de 0,144 °C) et 0,005 °C en 2100 (0,360 °C au lieu de 0,365 °C), sur SSP2-4.5. Là où le changement fait monter la production sur des terres drainées, le modèle compte plus de CO₂ et pas de méthane.

### Remouiller la tourbe drainée

Le levier de remouillage des tourbières fixe la part des sols organiques drainés sous l'agriculture qui est remise en eau : 0 % les laisse drainés, 100 % les remouille tous. La nappe d'eau remonte jusqu'à la surface. L'agriculture s'y arrête, ou passe à des cultures qui poussent dans l'eau, comme les roseaux, la sphaigne ou le sagoutier, une pratique appelée paludiculture. Le levier agit sur les terres que le changement de régime et la réduction du gaspillage laissent drainées, comme le levier déforestation agit sur le défrichement qu'ils laissent. Comme tous les leviers, il monte en puissance jusqu'à l'année où le changement est complet.

La part remise en eau arrête aussitôt son CO₂ et émet du méthane à la place, aux facteurs ci-dessus. Le modèle ignore les années qu'une tourbe remise en eau met à se stabiliser, et le CO₂ qu'elle peut absorber de nouveau quand la tourbe recommence à se former. À fond, le levier arrête 0,81 Gt de CO₂ par an et ajoute 5,0 Mt de méthane, soit 0,68 Gt CO₂e par an en net sur 100 ans. Le méthane réchauffe fortement au début, si bien que le réchauffement évité croît lentement : sur SSP2-4.5, le levier à fond évite 0,0013 °C en 2050 et 0,011 °C en 2100. Sans son méthane, il éviterait 0,0055 et 0,020 °C. Le GIEC estime le potentiel de la restauration des tourbières à 0,4 (0,2–0,6) Gt CO₂e par an pour un coût inférieur à 100 $ la tonne, et son potentiel technique à 0,79 Gt. Les deux chiffres portent sur toutes les tourbières, pas seulement les tourbières cultivées (AR6 GT3, tableau 7.3).

La couche CO₂ de l'usage des terres de la carte donne le CO₂ des sols drainés de chaque pays, aujourd'hui et avec les leviers, et le méthane des sols que les leviers remouillent.

### Des produits de base aux aliments

Les produits de base de DeDuCE sont les produits de la production de FAOSTAT. La plupart sont donc mis en correspondance avec la même table que les émissions agricoles (`qcl_items.csv`) : le soja au soja (2555), les fruits du palmier à huile aux fruits du palmier à huile des bilans alimentaires (2562, que le modèle transforme en huile de palme et en huile de palmiste), les fèves de cacao au 2633, le café au 2630, le maïs au 2514, le manioc au 2532, et ainsi de suite. `deforestation_items.csv` ajoute les noms que DeDuCE écrit autrement et les produits de base qui ne sont pas des cultures :

- **Les pâturages** sont attribués par DeDuCE à la viande bovine et au cuir. La viande bovine va à la viande de bovins (2731). Rien ne va au lait. DeDuCE n'attribue aucun pâturage aux produits laitiers, et les bovins des fronts de déforestation de l'Amazonie, du Cerrado et du Chaco sont des troupeaux à viande. Le cuir, un coproduit non alimentaire, est laissé de côté (environ 55 Mt de CO₂ par an).
- **Le coton graine** garde la répartition des émissions agricoles : 15 % vont à la graine de coton (2559). Les 85 % que représente la fibre sont laissés de côté (environ 11 Mt).
- **Le caoutchouc, le tabac, le jute et les autres fibres** ne sont pas des aliments et sont laissés de côté. Le caoutchouc est net négatif dans DeDuCE (−13 Mt), parce que la plantation peut contenir plus de carbone que la forêt dégradée qu'elle a remplacée.
- **Les plantations forestières** (pâte à papier, bois d'œuvre) sont laissées de côté (environ 9 Mt).

Une culture qui remplace la forêt peut contenir plus de carbone que le défrichement n'en a retiré. DeDuCE donne alors une émission nette négative. Une fois les produits de base de chaque pays et de chaque produit additionnés, les cases qui restent négatives (23 Mt en tout, surtout des cultures arborées) sont laissées de côté plutôt que comptées comme des absorptions, car la déforestation n'est pas une façon de stocker du carbone. Les pays hors du modèle (Soudan du Sud, Guinée équatoriale, Burundi et quelques autres, environ 1 Mt à eux tous) disparaissent.

### Comparaison avec les estimations publiées

Les produits alimentaires du modèle portent 1,99 Gt de CO₂ par an sur 2019–2023, sur 2,04 Gt pour l'ensemble des produits de base de DeDuCE (sans le drainage des tourbières). C'est dans la fourchette publiée :

- Pendrill et al. (2019) ont trouvé environ 2,6 Gt par an pour 2010–2014 dues à l'extension de l'agriculture et des plantations d'arbres dans les forêts tropicales, dont plus de la moitié pour les bovins et les oléagineux.
- Singh et Persson (2026) donnent 1,9 ± 0,3 Gt par an sur 2001–2022, dont 52 % pour les pâturages, plus le drainage des tourbières.

Des totaux plus larges comptent davantage :

- La FAO estime la déforestation à 2,8 Gt d'équivalent CO₂ en 2023 (FAOSTAT Analytical Brief 115). L'équivalent CO₂ (CO₂e) additionne différents gaz en un seul chiffre (voir [Des émissions à la température](#method-climate)).
- Le Global Carbon Budget 2025 situe l'ensemble des émissions nettes d'usage des terres à 5,0 ± 2,6 Gt de CO₂ par an sur 2015–2024, dont environ 7,0 de déforestation brute, sylviculture et autres causes comprises.
- L'Évaluation des ressources forestières mondiales 2025 de la FAO fait état d'environ 10,9 millions d'hectares de forêt perdus par an sur 2015–2025. Our World in Data présente la déforestation de la FAO par demi-décennie, 8,5 millions d'hectares par an autour de 2020 ([graphique](https://ourworldindata.org/grapher/annual-deforestation)). Les deux comptent toute la forêt perdue, là où Planetshift compte le défrichement que DeDuCE attribue aux aliments du modèle.

## Hypothèses

- Les émissions de chaque année sont celles, amorties, de DeDuCE, moyennées sur 2019–2023 : les émissions du défrichement réparties sur les cinq années de récolte qui le suivent.
- Le drainage des tourbières n'est pas de la déforestation. Les sols organiques drainés sont comptés à part, à partir de FAOSTAT, et supposés remis en eau quand le changement de régime les libère.
- Les sols organiques remis en eau émettent le méthane par défaut du GIEC : le facteur tempéré des sols riches en nutriments hors des tropiques, terres boréales comprises, et le facteur tropical sous les tropiques. Ils n'émettent ni CO₂ ni N₂O, et n'en absorbent pas.
- La déforestation due aux pâturages va entièrement à la viande bovine. Le cuir, les produits laitiers et les autres animaux qui pâturent n'en reçoivent aucune part.
- Les produits de base non alimentaires (cuir, caoutchouc, fibres, tabac, la part de fibre du coton) et les plantations forestières sont laissés de côté.
- Les cases nettes négatives (une culture arborée qui contient plus de carbone que la forêt qu'elle a remplacée) sont abandonnées, et non comptées comme des absorptions.
- Les émissions sont comptées là où la forêt est défrichée, et non là où l'aliment est mangé.

## Sources

- Singh, C., Persson, U. M., Croft, S., Kastner, T. et West, C. D. (2026). Commodity-driven deforestation, associated carbon emissions and trade 2001–2023 (version 2.1). Zenodo, doi:10.5281/zenodo.18953516. CC BY 4.0.
- Singh, C. et Persson, U. M. (2026). Global patterns of commodity-driven deforestation and associated carbon emissions. Nature Food 7, 138–151, doi:10.1038/s43016-026-01305-4.
- Pendrill, F., Persson, U. M., Godar, J., Kastner, T., Moran, D., Schmidt, S. et Wood, R. (2019). Agricultural and forestry trade drives large share of tropical deforestation emissions. Global Environmental Change 56, 1–10, doi:10.1016/j.gloenvcha.2019.03.002.
- FAO (2025). Greenhouse gas emissions from agrifood systems: global, regional and country trends, 2001–2023. FAOSTAT Analytical Brief 115, doi:10.4060/cd7300en.
- Friedlingstein, P. et al. Global Carbon Budget 2025. Earth System Science Data 18, 3211 (2026) (émissions d'usage des terres 2015–2024).
- FAO (2025). Évaluation des ressources forestières mondiales 2025 (déforestation 2015–2025).
- FAOSTAT. Emissions from Drained organic soils (surface et CO₂ des sols organiques drainés sous les terres cultivées et les prairies, 2024). CC BY 4.0.
- GIEC (2014). 2013 Supplement to the 2006 IPCC Guidelines for National Greenhouse Gas Inventories: Wetlands, chapitre 2 (tableau 2.1, CO₂ des sols organiques drainés) et chapitre 3 (tableau 3.3, CH₄ des sols organiques remis en eau).
- Nabuurs, G.-J. et al. (2022). Agriculture, Forestry and Other Land Uses (AFOLU). Dans Climate Change 2022: Mitigation of Climate Change, GIEC AR6 GT3, chapitre 7 (tableau 7.3, restauration des tourbières), doi:10.1017/9781009157926.009.
