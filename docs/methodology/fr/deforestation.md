# Déforestation

Défricher la forêt pour des pâturages et des cultures libère le carbone contenu dans les arbres, leurs racines et le sol en dessous. C'est la plus grande source de CO₂ du système alimentaire après les combustibles fossiles, environ 2 Gt de CO₂ par an au début des années 2020, et les émissions agricoles de `intensities.json` la laissent de côté. `deforestation.json` la donne, par pays producteur et par produit des bilans alimentaires, pour que le modèle puisse la compter et agir sur elle comme un levier. Le code est `pipeline/planetshift_pipeline/deforestation.py` ; sa table est `pipeline/deforestation_items.csv`.

## Les données

La source est DeDuCE (Deforestation Driven Carbon Emissions), version 2.1, de Singh, Persson, Croft, Kastner et West, publiée sur Zenodo sous licence CC BY 4.0. DeDuCE croise des cartes satellitaires de la perte de forêt et de ce qui a remplacé la forêt avec les statistiques de FAOSTAT sur les terres cultivées, les pâturages et les plantations, et attribue la déforestation de chaque pays à l'extension des pâturages, de quelque 180 cultures et des plantations forestières, de 2001 à 2023. Là où les cartes montrent ce qui pousse sur la terre défrichée, la terre est attribuée directement à cette culture ; ailleurs, un bilan des terres l'attribue aux cultures et aux pâturages qui se sont étendus dans le pays cette année-là (au Brésil, dans chaque municipalité). Les émissions sont la perte nette de carbone de la biomasse aérienne, de la biomasse souterraine et du sol, moins le carbone que contient l'usage des terres qui remplace la forêt.

DeDuCE donne deux séries. La série non amortie met toutes les émissions d'un hectare l'année de son défrichement. La série amortie les répartit sur les cinq années qui suivent le défrichement, ce qui mesure la déforestation « incorporée » dans la récolte de chaque année ; Planetshift utilise celle-ci, parce que le modèle fait varier les émissions avec la production. Les années moyennées sont 2019 à 2023, les cinq dernières, pour qu'une année sèche ou un revirement politique ne domine pas.

DeDuCE donne aussi le CO₂ du drainage des tourbières cultivées (surtout le palmier à huile en Indonésie et en Malaisie), environ 0,23 Gt par an. Il est laissé de côté : c'est une émission de terres déjà défrichées, qui continue que l'on coupe ou non davantage de forêt ; elle relève donc des terres que l'alimentation occupe plutôt que de la déforestation.

## Des produits de base aux aliments

Les produits de base de DeDuCE sont les produits de la production de FAOSTAT : la plupart sont donc mis en correspondance avec la même table que les émissions agricoles (`qcl_items.csv`) : le soja au soja (2555), les fruits du palmier à huile aux fruits du palmier à huile des bilans alimentaires (2562, que le modèle transforme en huile de palme et en huile de palmiste), les fèves de cacao au 2633, le café au 2630, le maïs au 2514, le manioc au 2532, et ainsi de suite. `deforestation_items.csv` ajoute les noms que DeDuCE écrit autrement et les produits de base qui ne sont pas des cultures :

- **Les pâturages** sont attribués par DeDuCE à la viande bovine et au cuir. La viande bovine va à la viande de bovins (2731). Rien ne va au lait : DeDuCE n'attribue aucun pâturage aux produits laitiers, et les bovins des fronts de déforestation de l'Amazonie, du Cerrado et du Chaco sont des troupeaux à viande. Le cuir, un coproduit non alimentaire, est laissé de côté (environ 55 Mt de CO₂ par an).
- **Le coton graine** garde la répartition des émissions agricoles : 15 % vont à la graine de coton (2559), les 85 % que représente la fibre sont laissés de côté (environ 11 Mt).
- **Le caoutchouc, le tabac, le jute et les autres fibres** ne sont pas des aliments et sont laissés de côté (le caoutchouc est net négatif dans DeDuCE, −13 Mt, parce que la plantation peut contenir plus de carbone que la forêt dégradée qu'elle a remplacée).
- **Les plantations forestières** (pâte à papier, bois d'œuvre) sont laissées de côté (environ 9 Mt).

Une culture qui remplace la forêt peut contenir plus de carbone qu'elle n'en a retiré ; DeDuCE donne alors une émission nette négative. Après la somme des produits de base de chaque pays et de chaque produit, les cases qui restent négatives (23 Mt en tout, surtout des cultures arborées) sont laissées de côté plutôt que comptées comme des absorptions, car la déforestation n'est pas une façon de stocker du carbone. Les pays hors du modèle (Soudan du Sud, Guinée équatoriale, Burundi et quelques autres, environ 1 Mt à eux tous) disparaissent.

## Les chiffres

Sur 2019–2023, les produits alimentaires du modèle portent 1,99 Gt de CO₂ par an, sur 2,04 Gt pour l'ensemble des produits de base de DeDuCE (sans le drainage des tourbières). C'est dans la fourchette publiée : Pendrill et al. (2019) ont trouvé environ 2,6 Gt par an pour 2010–2014 dues à l'extension de l'agriculture et des plantations d'arbres dans les forêts tropicales, dont plus de la moitié pour les bovins et les oléagineux. Singh et Persson (2026) donnent 1,9 ± 0,3 Gt par an sur 2001–2022, dont 52 % pour les pâturages, plus le drainage des tourbières. Des totaux plus larges comptent davantage : la FAO estime la déforestation à 2,8 Gt d'équivalent CO₂ en 2023 (FAOSTAT Analytical Brief 115), et le Global Carbon Budget 2025 situe l'ensemble des émissions nettes d'usage des terres à 5,0 ± 2,6 Gt de CO₂ par an sur 2015–2024, dont environ 7,0 de déforestation brute, sylviculture et autres causes comprises. L'Évaluation des ressources forestières mondiales 2025 de la FAO fait état d'environ 10,9 millions d'hectares de forêt perdus par an sur 2015–2025. Dans le modèle, la viande bovine porte la moitié des 1,99 Gt, 1,04 Gt, suivie du manioc (0,14), du maïs (0,11), du riz (0,11), du soja (0,07) et du palmier à huile (0,06). Les pays où elle a lieu sont le Brésil (0,75 Gt, dont 94 % dus aux pâturages), la République démocratique du Congo (0,24 Gt, dus aux défrichements des petits exploitants pour le manioc, le riz, le maïs et d'autres cultures vivrières), la Bolivie (0,10), la Colombie (0,09), l'Indonésie (0,09), le Pérou (0,06), l'Inde (0,06), le Mexique (0,04), la Côte d'Ivoire (0,04) et le Nigeria (0,04).

Les émissions sont comptées dans le pays de production. Un changement de régime en Europe agit sur la déforestation du Brésil par le commerce : la règle du modèle selon laquelle les fermes de chaque pays changent en proportion de sa part de la production mondiale reporte une baisse de la demande mondiale de bœuf ou de soja sur les pays qui défrichent la forêt pour les produire.

## La déforestation dans le modèle

Le fichier donne la référence : les tonnes de CO₂ émises chaque année par le défrichement pour chaque pays et chaque produit à la production actuelle. Le modèle peut l'utiliser de deux façons, que l'interface peut proposer côte à côte.

**La déforestation suit la production.** Le CO₂ d'un produit dans un pays varie en proportion de la variation de sa production, comme si la déforestation était entraînée par la production du produit de base. Un régime avec moitié moins de bœuf divise alors par deux la déforestation due aux pâturages, et un régime avec plus de soja augmente les défrichements dus au soja. C'est la lecture qui sous-tend les empreintes de déforestation fondées sur la consommation. Elle est généreuse envers les changements de régime d'un côté, puisque ce qui entraîne le défrichement est la croissance de la production plutôt que son niveau, et que le prix des terres, les routes et l'application de la loi comptent autant que la demande. Elle est prudente de l'autre : si la demande de bœuf baisse, le front peut cesser complètement d'avancer, et pas seulement ralentir en proportion.

**La déforestation est réduite directement.** Un levier fixe la part de la déforestation arrêtée (chaînes d'approvisionnement zéro déforestation, protection des forêts), quel que soit le régime. Le CO₂ évité est cette part du total du fichier, par produit ou pour tous. Avec à la fois un changement de régime et ce levier, le levier s'applique à ce qui reste après le changement : les deux se multiplient, ils ne s'additionnent pas.

Dans les deux cas, le CO₂ évité est une émission de CO₂ qui n'a pas lieu chaque année, entrée dans le modèle climatique comme tout autre CO₂. Le carbone libéré par le défrichement est du CO₂ d'usage des terres, que la réponse du climat traite comme du CO₂ fossile (voir la page sur la température) ; la différence, le changement d'albédo de surface, est petite à côté de l'incertitude sur les émissions. La repousse de la forêt sur les terres agricoles libérées par un changement est un effet distinct, compté sur la page des terres ; elle ne doit pas s'ajouter à la déforestation évitée sur le même hectare.

## Hypothèses

- Les émissions de chaque année sont celles, amorties, de DeDuCE, moyennées sur 2019–2023 : les émissions du défrichement réparties sur les cinq années de récolte qui le suivent.
- Le drainage des tourbières n'est pas de la déforestation et est laissé de côté.
- La déforestation due aux pâturages va entièrement à la viande bovine ; le cuir, les produits laitiers et les autres animaux qui pâturent n'en prennent aucune.
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
