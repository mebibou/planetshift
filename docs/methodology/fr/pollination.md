# Pollinisateurs

La plupart des cultures sont pollinisées par des animaux, surtout des insectes, et beaucoup donnent plus quand elles le sont. L'IPBES (2016) a constaté que plus des trois quarts des principaux types de cultures alimentaires profitent de la pollinisation animale. Elle a aussi constaté que 5 à 8 % de la production agricole mondiale est directement attribuable à la pollinisation animale. Les pollinisateurs sauvages ont décliné en de nombreux endroits. Smith et al. (2022) ont estimé qu'une pollinisation insuffisante réduit déjà de 3 à 5 % la production mondiale de fruits, de légumes et de fruits à coque. Ils y ont associé environ 427 000 décès en excès par an, dus aux aliments sains qui ne sont pas consommés.

Planetshift montre quelle part de la production végétale de chaque pays dépend des pollinisateurs, aujourd'hui et une fois les leviers pleinement en place. Avec un régime riche en végétaux, on cultive plus de fruits, de légumes et de fruits à coque, et beaucoup ont besoin des pollinisateurs. On cultive moins d'aliments pour le bétail : le maïs, qui n'en a pas besoin, et le soja, qui en a besoin en partie. On ne sait pas d'avance si le total monte ou baisse. Le résumé donne le chiffre mondial, *Production végétale issue de cultures dépendant des pollinisateurs*. La couche *Pollinisateurs* de la carte donne la part de chaque pays.

Ces chiffres montrent ce qui dépend des pollinisateurs dans la production. Ce n'est pas une mesure de perte : aucun scénario ici ne retire les pollinisateurs. Ils ne changent pas le réchauffement.

Les chiffres sont dans `pollination.json`. Le code est `pipeline/planetshift_pipeline/pollination.py`, avec les classes des cultures dans `pipeline/pollination_classes.csv`, et `app/src/model/pollination.ts`.

## Deux parts

Klein et al. (2007) classent chaque culture dans l'une de cinq classes selon la baisse de son rendement sans pollinisateurs animaux : aucune, faible (plus de 0 % et jusqu'à 10 %), modeste (10 à 40 %), forte (40 à 90 %) et essentielle (plus de 90 %). Aizen et al. (2009) ont fait de chaque classe un ratio, le milieu de son intervalle : 0, 0,05, 0,25, 0,65 et 0,95. Planetshift donne deux parts de la production végétale, chacune en poids et en calories :

- **Issue de cultures dépendant des pollinisateurs** : la production des cultures dont la classe est au-dessus d'aucune, quel que soit leur ratio. C'est la mesure de Klein et al. Le colza compte en entier, bien que les pollinisateurs ne donnent qu'un quart de son rendement.
- **Due à la pollinisation** : la production de chaque culture multipliée par son ratio, la part du rendement qui serait perdue sans pollinisateurs. C'est la mesure derrière les 5 à 8 % de l'IPBES.

La carte et le chiffre principal du résumé donnent la première part, en poids. L'infobulle et le détail du résumé donnent les trois autres.

## Les classes des cultures

Les classes sont celles d'Aizen et al. (2019, annexe S1), qui donne une classe pour 114 cultures de FAOSTAT. La plupart viennent de Klein et al. (2007). Aizen et al. ont classé eux-mêmes onze cultures d'après d'autres études (noix d'arec, ricin, groseilles à maquereau, noisettes, jojoba, pistaches, graines de pavot, coings, noix, yautia, et anis avec coriandre et fenouil). Planetshift reprend l'annexe S1 sous sa licence, CC BY 4.0. Il associe chacune de ses cultures, par son nom, au code actuel de FAOSTAT (`pollination_classes.csv`). Il donne aux plantains la classe des bananes, car Aizen et al. rangent l'espèce du plantain sous les bananes.

Ces cultures de FAOSTAT n'ont pas de classe : les cultures « n.c.a. » (autres légumes, autres fruits, autres agrumes, autres légumineuses), le thé, les champignons, les artichauts, les clous de girofle, le gingembre et quelques autres.

## Des cultures aux produits des bilans alimentaires

Le modèle compte la production par produit des bilans alimentaires (FBS). Chaque produit couvre une ou plusieurs cultures de FAOSTAT (`qcl_items.csv`, comme pour les terres et les émissions). Pour chaque produit et chaque pays, Planetshift pondère ses cultures classées par la production du pays pour chacune, additionnée sur les trois années jusqu'à l'année de base (*Cultures et produits animaux* de FAOSTAT). Il donne deux nombres par produit :

$$
r_{i,c} = \frac{\sum_k t_{k,c}\, r_k}{\sum_k t_{k,c}}, \qquad d_{i,c} = \frac{\sum_k t_{k,c}\, [r_k > 0]}{\sum_k t_{k,c}}
$$

avec $t_{k,c}$ les tonnes de la culture $k$ du produit $i$ dans le pays $c$ et $r_k$ son ratio. Une culture sans classe est exclue des deux sommes : elle prend la moyenne des cultures classées de son produit. *Légumes, autres*, par exemple, prend la moyenne des concombres, des courges, des choux, des carottes et des autres légumes qui ont une classe.

Un produit transformé prend les cultures de ses produits primaires, d'après la même table d'extraction que les émissions (`proxies.csv`) : l'huile de soja prend le soja, l'huile de palme le fruit du palmier à huile, le vin le raisin, et le sucre la canne et la betterave. L'huile de son de riz prend le riz, et l'huile de germe de maïs le maïs. Un pays qui ne produit aucune des cultures classées d'un produit prend les valeurs du monde, les mêmes sommes sur tous les pays. Le fichier garde les valeurs du monde pour chaque produit, et celles d'un pays seulement là où elles diffèrent de celles du monde.

Les produits animaux sont exclus des deux parts : aucune classe ne les couvre. Les cultures qui nourrissent les animaux comptent là où elles sont cultivées, comme cultures.

## Les parts d'un pays

La production végétale d'un pays est la production de chaque produit qui a un ratio, moins la part transformée en un autre produit. Cet autre produit compte cette part, comme pour les émissions. Ses tonnes issues de cultures dépendant des pollinisateurs sont les tonnes de chaque produit multipliées par $d_{i,c}$, et ses tonnes dues à la pollinisation les tonnes de chaque produit multipliées par $r_{i,c}$. En calories, les tonnes de chaque produit sont multipliées par ses kcal par tonne. Chaque part est divisée par la production végétale du pays dans la même unité.

Les ratios ne changent avec aucun levier. Les parts suivent ce qui est cultivé : le changement de régime, le gaspillage et les autres leviers qui changent la production. Le modèle les recalcule à chaque exécution, d'après la variation de production de l'exécution, sans coût mesurable.

## Les chiffres du monde

Les produits qui ont un ratio font 99,4 % de la production végétale mondiale en poids, 7,9 Gt par an l'année de base.

| | Aujourd'hui | Changement de régime complet |
|---|---|---|
| Issue de cultures dépendant des pollinisateurs, en poids | 23,1 % | 23,4 % |
| Issue de cultures dépendant des pollinisateurs, en calories | 26,2 % | 26,4 % |
| Due à la pollinisation, en poids | 7,4 % | 7,4 % |
| Due à la pollinisation, en calories | 5,7 % | 5,6 % |

La pollinisation représente 7,4 % de la production végétale mondiale en poids, dans les 5 à 8 % de l'IPBES, et 5,7 % de ses calories. Klein et al. (2007) ont trouvé 35 % de la production mondiale en volume issus de cultures qui dépendent des pollinisateurs, 60 % de cultures qui n'en dépendent pas, et 5 % non évalués. Leur total est la production des principales cultures qu'ils ont étudiées. Les 23,1 % ici comptent chaque produit FBS qui a un ratio l'année de base, chaque produit transformé tel qu'il est produit.

Avec les ratios du monde, les autres légumes donnent environ 493 Mt des 1,82 Gt issues de cultures dépendantes, les autres fruits (melons, pastèques, mangues, poires, pêches) 249 Mt, les tomates 189 Mt et le soja 179 Mt. Classés par les tonnes dues à la pollinisation, les autres légumes viennent encore en tête (206 Mt), puis les autres fruits (181 Mt) et les pommes (56 Mt).

Parmi les pays qui cultivent plus de 5 Mt de cultures qui ont un ratio, la part de la Malaisie est la plus haute, 82 %, à cause du palmier à huile, que les pollinisateurs aident un peu. La Tunisie, le Portugal, l'Indonésie et la Grèce sont près de la moitié. La Chine est à 32 %, l'Inde à 22 %, les États-Unis à 17 % et la France à 8 %. La part est la plus basse en Europe du Nord et dans les pays qui cultivent surtout des céréales, des racines et du riz : 3 % en Suède et au Danemark, 2 % au Cambodge.

## Ce que fait un changement de régime complet

Un changement de régime complet fait à peine bouger les parts du monde. La production végétale baisse de 7,88 à 7,81 Gt par an, car on cultive moins d'aliments pour le bétail. Les tonnes issues de cultures dépendantes montent un peu (de 1,821 à 1,824 Gt) : plus de fruits, de légumes et de légumineuses, moins de soja pour le bétail. Les tonnes dues à la pollinisation baissent un peu (de 585 à 580 Mt). La part issue de cultures dépendantes passe de 23,1 % à 23,4 % en poids, et la part due à la pollinisation reste à 7,4 %. En calories, la part due à la pollinisation baisse de 5,7 % à 5,6 % : une tonne du soja qui n'est plus cultivé pour le bétail apporte plus de calories qu'une tonne des fruits et légumes qui le remplacent.

Les parts des pays changent davantage. Les États-Unis passent de 17 % à 23 % et l'Argentine de 18 % à 23 %, car ils cultivent moins de maïs pour le bétail, que les pollinisateurs n'aident pas. L'Indonésie passe de 49 % à 45 % et l'Inde de 22 % à 19 %.

## Limites

- Les classes de Klein et al. valent pour le rendement de la culture en général, pas pour une variété ou un lieu. Le gain dû aux pollinisateurs change selon la variété et la région pour beaucoup de cultures.
- Les ratios ne changent ni avec le nombre de pollinisateurs ni avec les pratiques agricoles.
- Une culture sans classe prend la moyenne des cultures classées de son produit, qui ne lui convient pas forcément. Les produits sans aucune culture classée (thé, autres agrumes, clous de girofle) sont exclus.
- Siopa et al. (2024) donnent une liste plus récente de 141 cultures sous CC BY-NC 4.0. Les fichiers de données sont sous CC BY 4.0, qui ne peut pas l'inclure : elle n'est pas utilisée, pas même pour comparer.
- La production de semences n'est pas comptée. Beaucoup de légumes ont besoin des pollinisateurs pour leurs graines, pas pour la partie consommée. Klein et al. les classent selon la partie consommée.

## Sources

- Aizen M.A. et al. (2019), *Global agricultural productivity is threatened by increasing pollinator dependence without a parallel increase in crop diversification*, Global Change Biology 25, 3516–3527, [doi:10.1111/gcb.14736](https://doi.org/10.1111/gcb.14736), annexe S1. Licence : CC BY 4.0.
- Aizen M.A. et al. (2009), *How much does agriculture depend on pollinators? Lessons from long-term trends in crop production*, Annals of Botany 103, 1579–1588, [doi:10.1093/aob/mcp076](https://doi.org/10.1093/aob/mcp076) : le ratio de chaque classe.
- Klein A.-M. et al. (2007), *Importance of pollinators in changing landscapes for world crops*, Proceedings of the Royal Society B 274, 303–313, [doi:10.1098/rspb.2006.3721](https://doi.org/10.1098/rspb.2006.3721) : les classes.
- IPBES (2016), *The assessment report of the Intergovernmental Science-Policy Platform on Biodiversity and Ecosystem Services on pollinators, pollination and food production*, [doi:10.5281/zenodo.3402856](https://doi.org/10.5281/zenodo.3402856).
- Smith M.R. et al. (2022), *Pollinator deficits, food consumption, and consequences for human health: a modeling study*, Environmental Health Perspectives 130, 127003, [doi:10.1289/EHP10947](https://doi.org/10.1289/EHP10947).
- FAOSTAT, Cultures et produits animaux (QCL) : production par culture, [fao.org/faostat](https://www.fao.org/faostat/fr/#data/QCL). Licence : CC BY 4.0.
