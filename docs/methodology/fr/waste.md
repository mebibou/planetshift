# Pertes et gaspillage alimentaires

Une partie des aliments que produisent les fermes n'est jamais mangée. En gaspiller moins, c'est moins à produire pour les mêmes repas, donc moins de terres utilisées et moins d'émissions. Cette page décrit les données derrière ce levier et la façon dont le modèle s'en sert : dans le monde, environ 84 kg d'aliments comestibles par personne sont gaspillés chaque année après leur arrivée dans les magasins, et le levier permet de réduire ce gaspillage, ainsi que les pertes avant les magasins, de la part que vous choisissez.

## Pertes et gaspillage

Les deux sont comptés à des endroits différents, et le levier peut agir sur chacun.

- **Les pertes** ont lieu dans la chaîne d'approvisionnement avant que les aliments arrivent dans les magasins : au stockage, au transport et à la transformation. Elles sont déjà dans les bilans alimentaires, comme les `losses` de chaque produit dans `supply.json` (voir [Données](#method-data)). Le modèle les tient pour une part fixe des disponibilités intérieures de chaque produit (voir [Comment un changement de régime devient un changement de production](#method-shift), étape 4). La FAO les estime à 13,3 % des aliments produits dans le monde en 2023, entre la récolte et la distribution (indicateur ODD 12.3.1(a), portail de données ODD de la FAO).
- **Le gaspillage** a lieu après l'arrivée des aliments dans les magasins : dans le commerce de détail, dans la restauration (restaurants, cantines, hôtels) et dans les foyers. Les bilans alimentaires ne le séparent pas. Il est compris dans l'alimentation humaine (`food`) de chaque produit, qui est la nourriture disponible pour les consommateurs, pas ce qu'ils mangent. `waste.json` le donne par pays, en kg par personne et par an, dans trois secteurs.

## Comment fonctionne le levier

Il y a deux réductions, chacune entre 0 et 1, qui peuvent être réglées séparément :

- r<sub>L</sub> pour les pertes avant les magasins ;
- r<sub>W</sub> pour le gaspillage après eux.

La référence est la cible 12.3 des ODD (les objectifs de développement durable des Nations unies) : réduire de moitié par habitant le gaspillage alimentaire au niveau de la distribution et des consommateurs d'ici 2030 (r<sub>W</sub> = 0,5), et réduire les pertes le long des chaînes de production et d'approvisionnement.

Gaspiller moins ne change pas ce que les gens mangent. Cela réduit les disponibilités alimentaires dont un pays a besoin pour les mêmes repas. Réduire les pertes réduit les disponibilités nécessaires pour amener les mêmes aliments jusqu'aux magasins. La baisse des disponibilités parcourt ensuite le modèle comme un changement de régime : elle change la production là où le produit est cultivé (étape 6 du [modèle](#method-shift)). Quand moins de viande, de lait ou d'œufs sont gaspillés, elle réduit aussi l'alimentation dont les animaux ont besoin (étape 5).

**Exemple.** Les disponibilités alimentaires d'un pays sont de 800 kg par personne, dont 100 kg gaspillés après les magasins (w = 0,125). Le pays divise son gaspillage par deux (r<sub>W</sub> = 0,5). Ses disponibilités alimentaires baissent de 0,5 × 0,125 = 6,25 %, à 750 kg, pour les mêmes 700 kg mangés. Supposons que les pertes du blé soient de 5 % de ses disponibilités et les semences de 3 %. Réduire aussi les pertes de moitié fait passer le multiplicateur du blé de 1 ÷ 0,92 à 1 ÷ 0,945, et économise 0,5 × 5 % ÷ 0,945 = 2,6 % de ses disponibilités.

### Le gaspillage après les magasins : la formule

Pour un pays, la part de ses disponibilités alimentaires qui est gaspillée est

w = min((retail + foodService + household) ÷ (disponibilités alimentaires par personne, kg), 0,4)

où les disponibilités alimentaires par personne sont la somme de `food` sur ses produits dans `supply.json` × 1000 ÷ sa population l'année de référence. La même part s'applique à chaque produit : aliments mangés = `food` × (1 − w), et aliments gaspillés = `food` × w. Avec une réduction r<sub>W</sub>, on mange autant et on gaspille moins :

nouvelle alimentation = mangés + (1 − r<sub>W</sub>) × gaspillés = `food` × (1 − r<sub>W</sub> × w)

Elle s'applique après le changement de régime, aux aliments dont le régime modifié a besoin. Un pays qui mange moins de viande et gaspille moins a donc besoin à la fois de moins de viande et de moins du reste. Dans les étapes du [modèle](#method-shift), elle multiplie l'usage alimentaire de chaque produit avant l'étape 4.

### Les pertes avant les magasins : la formule

La part des pertes de chaque produit dans ses disponibilités intérieures est ℓ = pertes ÷ disponibilités intérieures. Avec une réduction r<sub>L</sub>, elle devient (1 − r<sub>L</sub>) × ℓ.

Les disponibilités nécessaires pour un changement d'usage deviennent ce changement ÷ (1 − (1 − r<sub>L</sub>) × ℓ − part des semences). Les disponibilités de l'année de référence baissent de r<sub>L</sub> × pertes ÷ (1 − (1 − r<sub>L</sub>) × ℓ − part des semences). Ce calcul compte les pertes évitées, et aussi les pertes et semences que ces disponibilités ne portent plus, puisque les deux en restent des parts. Avec un quart des disponibilités perdu et la moitié des pertes évitée, c'est 14 % de plus que les seules pertes évitées.

## Ce que cela change

Moins de disponibilités alimentaires, c'est moins de production, par pays et par produit, là où les parts du commerce la placent. Cela fait moins de cultures et de prairies, et moins de chaque émission qui suit la production : méthane entérique, effluents, rizières, engrais. Les terres libérées peuvent absorber du carbone par la repousse naturelle (voir [Terres](#method-land)). Une baisse du gaspillage de produits animaux réduit aussi les aliments cultivés pour les animaux.

## Les données

Les données sont dans `waste.json`, produit par `pipeline/planetshift_pipeline/waste.py`.

### D'où viennent les estimations

Les estimations du gaspillage sont celles du *Food Waste Index Report 2024* du PNUE, pour l'année 2022 : l'indicateur ODD 12.3.1(b). Le pipeline les lit dans la base de données mondiale des ODD des Nations unies (série `AG_FOOD_WST_PC`). La base publie les estimations par pays du rapport secteur par secteur, avec le niveau de confiance que le rapport donne à chacune. Pour les 27 pays européens qui déclarent leurs données à Eurostat, la base garde les chiffres mesurés de 2022 d'Eurostat plutôt que ceux du rapport, et le pipeline prend ceux-là. Le rapport lui-même s'appuie sur les mêmes mesures pour ces pays.

Le rapport estime à 1,05 milliard de tonnes les aliments gaspillés en 2022, soit 132 kg par personne : 79 kg dans les foyers, 36 kg dans la restauration et 17 kg dans le commerce de détail. C'est un cinquième de la nourriture disponible pour les consommateurs. Le fichier du pipeline, pondéré par la population de l'année de référence et avec les parties non comestibles rajoutées, donne les mêmes moyennes mondiales (17, 36 et 79 kg).

### La confiance dans les estimations

La confiance varie selon le secteur. 160 pays ont leur propre estimation hors Eurostat. Parmi eux, le gaspillage des foyers est de confiance élevée ou moyenne dans 65 et de très faible confiance dans 19. La restauration et le commerce de détail sont de très faible confiance dans environ 135, parce qu'ils sont extrapolés à partir de quelques pays mesurés.

Tous les pays de `countries.json` sauf un ont leur propre estimation. Taïwan, que la base des Nations unies ne liste pas, prend la médiane de sa région (Asie de l'Est), secteur par secteur. Un pays qui manquerait dans une publication ultérieure serait complété de la même façon, à partir de sa sous-région M49 (`Country.region`). Quand sa région n'a pas d'estimation, il prend la médiane mondiale.

### Les parties comestibles seulement

L'Index compte les aliments et les parties non comestibles qui les accompagnent : os, épluchures, coquilles, noyaux. Seule la partie comestible peut être évitée : le pipeline ne garde donc que la partie comestible, avec ces parts :

| Secteur | Pays à revenu élevé | Autres pays |
| --- | --- | --- |
| Foyers | 0,75 | 0,50 |
| Restauration | 0,75 | 0,75 |
| Commerce de détail | 0,85 | 0,85 |

La part des foyers dans les pays à revenu élevé suit les mesures du Royaume-Uni, où « environ les trois quarts » du gaspillage alimentaire des foyers sont comestibles (WRAP, 2021/22 : environ 4,7 sur 6,4 millions de tonnes, 73 %). Dans les pays à revenu plus faible, une plus grande part des aliments est achetée brute et préparée à la maison. Une plus grande partie du gaspillage des foyers y est donc faite d'épluchures, de balles et d'os. La part de 0,5 est une hypothèse dans la fourchette des quelques études disponibles. Le gaspillage de la restauration et du commerce de détail est surtout de la nourriture invendue ou non servie, donc en grande partie comestible. Leurs parts sont des hypothèses, aucune mesure à l'échelle d'un pays n'ayant été trouvée.

Avec ces parts, le gaspillage comestible mondial après les magasins est d'environ 674 millions de tonnes, 84 kg par personne et par an : 43 kg dans les foyers, 27 kg dans la restauration et 14 kg dans le commerce de détail. Par pays, le gaspillage comestible des foyers va de 9 à 141 kg par personne, avec une médiane de 46 kg.

### Un plafond à 40 % des disponibilités alimentaires

Le gaspillage comestible est aussi plafonné à 40 % des disponibilités alimentaires du pays dans les bilans alimentaires (tous les produits gardés dans le modèle, kg par personne). Aucun pays n'atteint le plafond. La part va de 3 % (Espagne) à 35 % (Yémen), avec une médiane de 12 %, et neuf pays sur dix sont sous 19 %. Les parts les plus élevées sont dans des pays aux faibles disponibilités alimentaires par personne, où les estimations de l'Index sont extrapolées (Yémen, Syrie, Tchad, Afghanistan).

## Limites

- **Effet rebond.** La nourriture qui n'est pas gaspillée est de l'argent qui n'est pas dépensé. Les foyers et les entreprises le dépensent pour autre chose, entre autres plus de nourriture ou une meilleure. La baisse de la demande fait aussi baisser les prix alimentaires, ce qui augmente la consommation ailleurs. Hegwood et al. (2023) trouvent que cet effet rebond pourrait compenser de 53 à 71 % des émissions évitées en gaspillant moins. Le modèle ne le compte pas : l'effet du levier est donc une borne haute.
- **Estimations incertaines.** Les chiffres de la restauration et du commerce de détail de la plupart des pays, et beaucoup de ceux des foyers, sont des extrapolations de très faible confiance. Les méthodes de mesure diffèrent, par exemple des carnets, qui manquent une partie du gaspillage, contre l'analyse de la composition des déchets. Les chiffres d'Eurostat de certains pays, comme la France, laissent de côté le gaspillage alimentaire des foyers composté à domicile ou collecté séparément.
- **Parts comestibles.** Les parts sont des valeurs arrondies tirées de peu de mesures. La part réelle varie selon le pays, le régime alimentaire et la façon d'acheter les aliments.
- **La même part pour chaque produit.** Le gaspillage est réparti entre les produits en proportion de leurs disponibilités alimentaires. En réalité, les fruits, les légumes et les produits de boulangerie sont plus gaspillés, en poids, que la viande ou les produits laitiers. Les émissions viennent surtout des produits animaux : l'effet du levier sur les émissions est donc probablement surestimé.
- **Poids.** L'Index pèse les aliments tels qu'ils sont jetés (pain, plats cuisinés), alors que les bilans alimentaires comptent des équivalents primaires (grain, poids de carcasse). La part gaspillée w mélange les deux, ce qui la fausse légèrement.
- **Éviter le gaspillage n'est pas gratuit.** Diviser le gaspillage par deux est une cible, pas une mesure au coût ou au rythme d'adoption connus.

## Hypothèses

- Le gaspillage après les magasins vient du Food Waste Index Report 2024 (2022), avec les chiffres 2022 d'Eurostat pour les pays européens tels que publiés dans la base de données mondiale des ODD des Nations unies.
- Un pays sans estimation prend la médiane de sa sous-région M49, secteur par secteur, ou la médiane mondiale quand sa sous-région n'en a pas.
- Le fichier ne contient que la partie comestible, avec les parts ci-dessus par secteur et par groupe de revenu.
- Le gaspillage comestible après les magasins est au plus de 40 % des disponibilités alimentaires par personne du pays.
- La part gaspillée est la même pour chaque produit d'un pays, et s'applique à l'usage alimentaire après le changement de régime.
- Les pertes avant les magasins sont celles des bilans alimentaires, et une réduction baisse proportionnellement la part des pertes de chaque produit.
- Pas d'effet rebond.

## Sources

- Programme des Nations unies pour l'environnement (2024). Food Waste Index Report 2024. Think Eat Save: Tracking Progress to Halve Global Food Waste. Nairobi : <https://wedocs.unep.org/20.500.11822/45230>. Reproduction autorisée à des fins éducatives ou non lucratives, avec mention de la source.
- Division de statistique des Nations unies, SDG Global Database, indicateur 12.3.1(b), série AG_FOOD_WST_PC (gaspillage alimentaire par habitant, par secteur) : <https://unstats.un.org/sdgs/dataportal>. Réutilisation libre avec mention de la source.
- Eurostat, Food waste and food waste prevention by NACE Rev. 2 activity (env_wasfw), les chiffres européens déclarés à la base de données des ODD : <https://ec.europa.eu/eurostat/web/waste/food-waste>.
- WRAP (2023). Household Food and Drink Waste in the United Kingdom 2021/22 (part comestible du gaspillage alimentaire des foyers) : <https://wrap.ngo/resources/report/household-food-and-drink-waste-united-kingdom-202122>.
- FAO, indicateur ODD 12.3.1(a), pourcentage de pertes alimentaires : 13,3 % en 2023, portail de données des indicateurs ODD de la FAO : <https://www.fao.org/sustainable-development-goals-data-portal/data/indicator/1231a-global-food-loss-index/en>.
- FAO (2019). The State of Food and Agriculture 2019. Moving forward on food loss and waste reduction (indice des pertes alimentaires, indicateur ODD 12.3.1(a)) : <https://www.fao.org/publications/sofa>.
- Nations unies, cible 12.3 des objectifs de développement durable : <https://sdgs.un.org/goals/goal12>.
- Hegwood, M., Burgess, M. G., Costigliolo, E. M., Smith, P., Bajželj, B., Saunders, H., Davis, S. J. (2023). Rebound effects could offset more than half of avoided food loss and waste. Nature Food : <https://doi.org/10.1038/s43016-023-00792-z>.
