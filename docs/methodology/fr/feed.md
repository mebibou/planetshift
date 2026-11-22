# Alimentation animale : quels animaux mangent quelles cultures

Quand on mange moins de produits animaux, on élève moins d'animaux, et les cultures qui servaient à les nourrir ne sont plus nécessaires. Les bilans alimentaires disent quelle quantité de chaque produit sert à l'alimentation animale dans chaque pays, mais pas pour quels animaux. Planetshift répartit l'usage fourrager de chaque produit entre les six groupes animaux, par région, de deux façons ; le lecteur peut passer de l'une à l'autre dans les Options. Le code est `pipeline/planetshift_pipeline/feed.py` et les tables sont `pipeline/feed_*.csv`.

## Ce qui est réparti

Tous les produits qui servent quelque part dans le monde à l'alimentation animale : céréales, riz, légumineuses, graines oléagineuses, racines et tubercules, plantes sucrières, quelques fruits et légumes (bananes, feuilles de manioc), le lait (donné aux veaux et aux porcelets), le poisson transformé en farine (les bilans l'enregistrent comme usage fourrager des produits de la pêche) et quelques autres. L'herbe, le foin, les résidus de culture et les tourteaux ne sont pas des produits des bilans alimentaires, ils ne sont donc pas dans la répartition ; l'herbe et les résidus sont l'essentiel de ce que mangent les ruminants.

Les parts sont écrites pour le monde et pour chaque sous-région M49 (comme dans la table des pays). Pour chaque méthode, région et produit, les parts font 1 au total sur les groupes animaux.

## Méthode 1, par espèce (par défaut)

Une seule répartition publiée des aliments concentrés du monde entre les espèces, appliquée à chaque produit : viande de ruminants 11 %, produits laitiers 16 %, viande porcine 28 %, volaille 28 %, œufs 17 % (`feed_species.csv`). Cette répartition est arrondie à partir de l'évaluation GLEAM de la FAO sur la consommation d'aliments par le bétail (Mottet et al., 2017) et de l'enquête annuelle de la filière sur les aliments composés par espèce (Alltech Agri-Food Outlook), qui s'accordent pour dire que les porcs et les volailles mangent un peu plus de la moitié des concentrés.

La répartition d'une région suit ce qu'elle produit : la part mondiale de chaque groupe est divisée par sa production mondiale et multipliée par la production de la région. Une région qui élève surtout des bovins donne l'essentiel de ses aliments aux bovins.

## Méthode 2, rations régionales de type GLEAM

Chaque groupe a besoin d'une quantité d'aliments concentrés par tonne de produit (`feed_gleam_intake.csv`), plus élevée dans les pays à revenu élevé, où les systèmes intensifs donnent plus de grain, qu'ailleurs : par exemple 3,0 t par tonne de bœuf dans les pays à revenu élevé et 0,8 t ailleurs, 0,35 t et 0,12 t par tonne de lait, 3,3 t et 2,5 t par tonne de viande porcine, 2,6 t et 2,3 t par tonne de volaille, 2,2 t et 2,0 t par tonne d'œufs. Les concentrés de chaque groupe se composent de classes d'aliments en proportions fixes (`feed_gleam_rations.csv`) : grain, graines oléagineuses, légumineuses, racines (avec fruits et légumes), plantes sucrières et lait. Les volailles mangent plus d'oléagineux, les porcs plus de racines, et seuls les bovins et les porcs reçoivent du lait.

Pour chaque région, la demande d'une classe d'aliments par un groupe est la somme, sur les pays de la région, de la production × les concentrés par tonne (le niveau de revenu du pays décide de la valeur) × la part de la classe dans la ration. Un produit va ensuite aux groupes en proportion de la demande pour sa classe. Les produits dont aucune ration ne contient la classe (fruits à coque, épices, viande, par exemple) suivent la répartition par espèce.

Les totaux mondiaux que donnent ces valeurs, environ 1,2 milliard de tonnes d'aliments concentrés, sont du même ordre de grandeur que la production mondiale d'aliments composés, et leur répartition entre espèces est proche de celle de la méthode 1.

## Poissons et fruits de mer

Les poissons et crevettes d'élevage mangent des aliments aquacoles faits de grain, d'oléagineux et de farine de poisson, que l'usage fourrager des bilans comprend déjà. La production des produits de la mer dans la répartition est l'aquaculture d'espèces nourries de chaque pays d'après FishStat de la FAO, et non leur production dans les bilans, en grande partie sauvage ou non nourrie. Dans la méthode 1, les produits de la mer prennent 5,5 % des aliments concentrés du monde et les cinq autres groupes gardent leurs proportions dans les 94,5 % restants (11 % devient 10,4 % pour la viande de ruminants, et ainsi de suite) ; dans la méthode 2, les poissons d'élevage ont besoin de 1,6 t d'aliments par tonne dans les pays à revenu élevé et de 0,87 t ailleurs, à 30 % de grain, 40 % d'oléagineux, 5 % de légumineuses et 25 % de poisson. Le poisson donné aux animaux va à environ 70 % à l'aquaculture, 23 % aux porcs et 7 % aux volailles. Pour tous les autres produits fourragers, les cinq groupes d'élevage gardent entre eux les mêmes parts qu'avant l'ajout des produits de la mer. La page [Poissons et fruits de mer](#method-seafood) donne les sources.

## Hypothèses

- La répartition est la même pour chaque produit dans la méthode 1, sauf les produits de la pêche, qui ont leur propre répartition : le maïs et le soja se partagent entre les espèces de la même façon.
- Les concentrés par tonne et les parts des rations sont des valeurs arrondies dans l'esprit des résultats régionaux de GLEAM 2.0, et non une copie de ses tables, qui ne sont pas publiées sous cette forme ; ce sont un point de départ à revoir.
- Deux niveaux de revenu représentent les nombreux systèmes de production que GLEAM distingue.
- Les régions sans production animale (aucune pour l'instant) prennent les parts mondiales.
- L'herbe, les résidus de culture et les tourteaux sont hors des bilans : ils ne sont donc pas répartis ici. Les surfaces des oléagineux triturés pour le tourteau, et des prairies temporaires, suivent les animaux dans [Terres](#method-land) ; les prairies permanentes suivent les ruminants.

## Sources

- FAOSTAT, Bilans alimentaires (2010–), usage fourrager par produit et par pays : <https://www.fao.org/faostat/en/#data/FBS>.
- FAO, Global Livestock Environmental Assessment Model (GLEAM) : <https://www.fao.org/gleam/en/>.
- Mottet, A., de Haan, C., Falcucci, A., Tempio, G., Opio, C., Gerber, P. (2017). Livestock: on our plates or eating at our table? A new analysis of the feed/food debate. Global Food Security 14, 1–8 : <https://doi.org/10.1016/j.gfs.2017.01.001>.
- Alltech Agri-Food Outlook (production mondiale d'aliments composés par espèce) : <https://www.alltech.com/agri-food-outlook>.
- Tacon, A. G. J. et al. (2025), production d'aliments aquacoles composés en 2023 (69,4 Mt) : <https://doi.org/10.1080/23308249.2025.2568830>.
- Tacon, A. G. J. (2020). Trends in global aquaculture and aquafeed production: 2000–2017. Reviews in Fisheries Science & Aquaculture 28, 43–56 : <https://doi.org/10.1080/23308249.2019.1649634>.
- FAO FishStat, Global production by production source : <https://www.fao.org/fishery/en/collection/global_production>.
