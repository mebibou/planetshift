# Alimentation animale : quels animaux mangent quelles cultures

Quand on mange moins de produits animaux, on élève moins d'animaux, et les cultures qui servaient à les nourrir ne sont plus nécessaires. Pour savoir quelles cultures ne sont plus nécessaires, Planetshift doit savoir quels animaux les mangent. Par défaut, les aliments concentrés du monde (le grain, les oléagineux, les légumineuses, les racines et les autres cultures données aux animaux, par opposition à l'herbe, au foin et aux résidus de culture) sont répartis entre les groupes animaux dans les proportions que donnent les enquêtes publiées sur l'alimentation par espèce. La part de chaque région suit ce qu'elle produit.

Les bilans alimentaires disent quelle quantité de chaque produit sert à l'alimentation animale dans chaque pays, mais pas pour quels animaux. Planetshift répartit l'usage fourrager de chaque produit entre les six groupes animaux, par région, de deux façons. On peut passer de l'une à l'autre dans *Autres options*.

## Ce qui est réparti

Tous les produits qui servent quelque part dans le monde à l'alimentation animale sont répartis :

- céréales, riz, légumineuses, graines oléagineuses, racines et tubercules, et plantes sucrières ;
- quelques fruits et légumes (bananes, feuilles de manioc) ;
- le lait, donné aux veaux et aux porcelets ;
- le poisson transformé en farine (les bilans l'enregistrent comme usage fourrager des produits de la pêche) ;
- quelques autres.

L'herbe, le foin, les résidus de culture et les tourteaux ne sont pas des produits des bilans alimentaires, ils ne sont donc pas dans la répartition. L'herbe et les résidus sont l'essentiel de ce que mangent les ruminants.

Les parts sont écrites pour le monde et pour chaque sous-région M49. Les sous-régions M49 sont le regroupement des pays en régions de l'ONU, comme « Afrique de l'Ouest », que reprend la table des pays (voir [Données](#method-data)). Pour chaque méthode, région et produit, les parts font 1 au total sur les groupes animaux.

## Méthode 1, par espèce (par défaut)

Une seule répartition publiée des aliments concentrés du monde entre les espèces est appliquée à chaque produit :

| Groupe | Part des aliments concentrés |
| --- | --- |
| Viande de ruminants | 11 % |
| Produits laitiers | 16 % |
| Viande porcine | 28 % |
| Volaille | 28 % |
| Œufs | 17 % |

Cette répartition (`feed_species.csv`) est arrondie à partir de deux sources : l'évaluation GLEAM de la FAO sur la consommation d'aliments par le bétail (Mottet et al., 2017), et l'enquête annuelle de la filière sur les aliments composés par espèce (Alltech Agri-Food Outlook). Elles s'accordent pour dire que les porcs et les volailles mangent un peu plus de la moitié des concentrés.

La répartition d'une région suit ce qu'elle produit. La part mondiale de chaque groupe est divisée par sa production mondiale et multipliée par la production de la région. Une région qui élève surtout des bovins donne donc l'essentiel de ses aliments aux bovins.

## Méthode 2, rations régionales de type GLEAM

Chaque groupe a besoin d'une quantité d'aliments concentrés par tonne de produit (`feed_gleam_intake.csv`). Elle est plus élevée dans les pays à revenu élevé, où les systèmes intensifs donnent plus de grain, qu'ailleurs :

| Produit | Pays à revenu élevé (t d'aliments par t) | Ailleurs (t d'aliments par t) |
| --- | --- | --- |
| Bœuf | 3,0 | 0,8 |
| Lait | 0,35 | 0,12 |
| Viande porcine | 3,3 | 2,5 |
| Volaille | 2,6 | 2,3 |
| Œufs | 2,2 | 2,0 |

Les concentrés de chaque groupe se composent de classes d'aliments en proportions fixes (`feed_gleam_rations.csv`) : grain, graines oléagineuses, légumineuses, racines (avec fruits et légumes), plantes sucrières et lait. Les volailles mangent plus d'oléagineux, les porcs plus de racines, et seuls les bovins et les porcs reçoivent du lait.

Pour chaque région, la demande d'une classe d'aliments par un groupe est la somme, sur les pays de la région, de :

production × concentrés par tonne × part de la classe dans la ration

La valeur des concentrés par tonne dépend du niveau de revenu du pays. Un produit va ensuite aux groupes en proportion de la demande pour sa classe. Les produits d'une classe qu'aucune ration ne contient (fruits à coque, épices et viande, par exemple) suivent la répartition par espèce.

Ces valeurs donnent des totaux mondiaux d'environ 1,2 milliard de tonnes d'aliments concentrés. C'est le même ordre de grandeur que la production mondiale d'aliments composés. Leur répartition entre espèces est proche de celle de la méthode 1.

## Poissons et fruits de mer

Les poissons et crevettes d'élevage mangent des aliments aquacoles faits de grain, d'oléagineux et de farine de poisson. L'usage fourrager des bilans les comprend déjà. Pour les produits de la mer, la répartition prend l'aquaculture d'espèces nourries de chaque pays, d'après FishStat de la FAO. Elle ne prend pas leur production dans les bilans, qui est en grande partie sauvage ou non nourrie.

- Dans la méthode 1, les produits de la mer prennent 5,5 % des aliments concentrés du monde. Les cinq autres groupes gardent leurs proportions dans les 94,5 % restants : 11 % devient 10,4 % pour la viande de ruminants, et ainsi de suite.
- Dans la méthode 2, les poissons d'élevage ont besoin de 1,6 t d'aliments par tonne dans les pays à revenu élevé et de 0,87 t ailleurs. La ration est à 30 % de grain, 40 % d'oléagineux, 5 % de légumineuses et 25 % de poisson.

Du poisson donné aux animaux, environ 70 % va à l'aquaculture, 23 % aux porcs et 7 % aux volailles. Pour tous les autres produits fourragers, les cinq groupes d'élevage gardent entre eux les mêmes parts qu'avant l'ajout des produits de la mer. La page [Poissons et fruits de mer](#method-seafood) donne les sources.

## Hypothèses

- La répartition est la même pour chaque produit dans la méthode 1, sauf les produits de la pêche, qui ont leur propre répartition. Le maïs et le soja se partagent donc entre les espèces de la même façon.
- Les concentrés par tonne et les parts des rations sont des valeurs arrondies calquées sur les résultats régionaux de GLEAM 2.0. Ce ne sont pas une copie de ses tables, qui ne sont pas publiées sous cette forme. C'est un point de départ, à revoir.
- Deux niveaux de revenu représentent les nombreux systèmes de production que GLEAM distingue.
- Les régions sans production animale (aucune pour l'instant) prennent les parts mondiales.
- L'herbe, les résidus de culture et les tourteaux sont hors des bilans : ils ne sont donc pas répartis ici. Les surfaces des oléagineux triturés pour le tourteau, et des prairies temporaires, suivent les animaux dans [Terres](#method-land). Les émissions du tourteau les suivent aussi ([Émissions](#method-emissions)). Les prairies permanentes suivent les ruminants.

## Où se trouve le code

Le code est `pipeline/planetshift_pipeline/feed.py` et les tables sont `pipeline/feed_*.csv`.

## Sources

- FAOSTAT, Bilans alimentaires (2010–), usage fourrager par produit et par pays : <https://www.fao.org/faostat/en/#data/FBS>.
- FAO, Global Livestock Environmental Assessment Model (GLEAM) : <https://www.fao.org/gleam/en/>.
- Mottet, A., de Haan, C., Falcucci, A., Tempio, G., Opio, C., Gerber, P. (2017). Livestock: on our plates or eating at our table? A new analysis of the feed/food debate. Global Food Security 14, 1–8 : <https://doi.org/10.1016/j.gfs.2017.01.001>.
- Alltech Agri-Food Outlook (production mondiale d'aliments composés par espèce) : <https://www.alltech.com/agri-food-outlook>.
- Tacon, A. G. J. et al. (2025), production d'aliments aquacoles composés en 2023 (69,4 Mt) : <https://doi.org/10.1080/23308249.2025.2568830>.
- Tacon, A. G. J. (2020). Trends in global aquaculture and aquafeed production: 2000–2017. Reviews in Fisheries Science & Aquaculture 28, 43–56 : <https://doi.org/10.1080/23308249.2019.1649634>.
- FAO FishStat, Global production by production source : <https://www.fao.org/fishery/en/collection/global_production>.
