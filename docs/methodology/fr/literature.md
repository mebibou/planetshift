# Intensités d'émission tirées d'ACV publiées

Quand HESTIA n'a pas de données pour un aliment, Planetshift peut prendre ses émissions dans une méta-analyse publiée d'analyses de cycle de vie : Poore & Nemecek (2018), la plus vaste étude de ce type, qui couvre environ 38 700 fermes dans 119 pays. L'étude donne une moyenne mondiale par aliment. Avec FAOSTAT, elle fournit les émissions de la viande, du lait et des œufs, que HESTIA ne couvre pas encore.

## Ce qu'apporte l'étude

Une analyse de cycle de vie (ACV) compte les émissions d'un produit à chaque étape, de la fabrication des intrants jusqu'au magasin. Une intensité d'émission est la quantité de chaque gaz à effet de serre émise pour produire une tonne d'un aliment. Planetshift prend chaque intensité dans la meilleure source disponible, en six étapes appelées niveaux (voir [Émissions](#method-emissions)). Poore & Nemecek forment le niveau 4. Ils servent quand HESTIA (niveaux 1 et 2) et FAOSTAT (niveau 3) n'ont pas de valeur.

Leurs valeurs sont des moyennes mondiales : chaque ligne a donc la zone `World`. Planetshift n'utilise que les émissions de la ferme. Il répartit le chiffre unique en équivalent CO₂ de l'étude entre les trois gaz, parce que le modèle climatique a besoin de chaque gaz séparément. Il convertit aussi quelques unités de l'étude vers celles des bilans alimentaires actuels.

Le code est `pipeline/planetshift_pipeline/sources/literature.py`. La table des produits est `pipeline/literature_terms.csv`.

## Les données

Poore & Nemecek publient les émissions de gaz à effet de serre de chaque produit dans les Data S2 de leurs documents supplémentaires (feuille « Results - Global Totals »). Les valeurs sont données par étape de la chaîne d'approvisionnement. Elles sont exprimées par kg de l'unité du produit dans les bilans alimentaires (FBS), sans le gaspillage des consommateurs. Les étapes sont le changement d'usage des terres, l'alimentation animale, la ferme, la transformation, le transport, l'emballage et la distribution.

Leurs documents supplémentaires définissent l'étape agricole ainsi :

- pour les cultures, « la production des intrants, les émissions au champ, le séchage et le calibrage » ;
- pour les animaux, l'étape d'élevage : « l'irrigation et la fertilisation des pâturages, la gestion des effluents, les émissions de l'aquaculture, la fermentation entérique et l'énergie utilisée ».

L'alimentation animale est une étape à part.

Pour chaque produit des bilans, `literature_terms.csv` contient :

- les produits de Poore & Nemecek qui le représentent ;
- leurs émissions de l'étape agricole (`farm_kg_co2e_per_kg`, recopiées de cette feuille) ;
- leur alimentation et leur gaspillage en 2009–11 (`weight_kt`, de la même feuille) ;
- une conversion vers la quantité des bilans actuels ;
- le profil de gaz qui sert à les répartir.

Les valeurs sont celles d'une publication figée de 2018, dans un format de tableur que le pipeline ne lit pas. Elles sont donc gardées dans la table plutôt que téléchargées. Chaque valeur a été vérifiée une fois sur le tableur, lors de sa transcription.

## Les émissions utilisées

Seule l'étape agricole est utilisée :

- Le changement d'usage des terres est laissé de côté, comme dans les lignes HESTIA.
- L'alimentation animale est laissée de côté, parce que Planetshift la compte par les cultures qu'elle réduit.
- La transformation, le transport, l'emballage et la distribution ont lieu après la sortie de ferme (le moment où le produit quitte la ferme) : ils sont aussi laissés de côté.

Planetshift a deux périmètres, choisis dans *Autres options* (voir [Émissions](#method-emissions)). Le périmètre à la ferme compte ce qui se passe sur la ferme. Le périmètre du berceau à la sortie de ferme compte aussi la fabrication des intrants de la ferme, comme les engrais. L'étape agricole de l'étude donne les deux périmètres ainsi :

- `cradleToFarmGate` = l'étape agricole. Pour les cultures, elle comprend déjà la production des intrants autres que l'alimentation animale.
- `farmGate` = l'étape agricole × la part des émissions à la ferme dans les émissions du berceau à la sortie de ferme de HESTIA pour le même produit (en CO₂e, avec les facteurs ci-dessous). Pour les cultures, la répartition de HESTIA entre émissions à la ferme et émissions de la production des intrants est la seule disponible. Poore & Nemecek ne la publient pas.
- Pour les produits animaux, l'étape d'élevage se passe presque entièrement à la ferme (fermentation entérique et effluents) : les deux périmètres prennent donc toute l'étape agricole. Les émissions de la fertilisation des pâturages et de l'énergie utilisée sur la ferme sont gardées dans les deux.

## Répartir le CO₂e entre les gaz

Poore & Nemecek donnent des équivalents CO₂ (CO₂e). Un chiffre en CO₂e additionne les gaz après avoir pondéré chacun par ce qu'il réchauffe sur 100 ans par rapport au CO₂. L'étude utilise les facteurs du cinquième rapport d'évaluation du GIEC (AR5) qui incluent les rétroactions climat-carbone : 34 pour le CH₄ et 298 pour le N₂O (leur tableau S2).

Planetshift a besoin de chaque gaz séparément. L'étape agricole de chaque produit est répartie selon les proportions d'un profil de gaz, un mélange typique des gaz pour ce genre de produit. Le CO₂e de chaque gaz est ensuite divisé par son facteur :

$$
\text{kg de gaz} = \text{CO}_2\text{e agricole} \times \frac{\text{CO}_2\text{e du gaz dans le profil}}{\text{CO}_2\text{e total du profil}} \div \text{GWP du gaz}
$$

En remultipliant chaque gaz par 34 et 298, on retrouve exactement la valeur de Poore & Nemecek.

**Exemple.** La viande bovine a une valeur de l'étape agricole de 29 040 kg CO₂e par tonne (tableau ci-dessous). Après la répartition, elle porte 703 kg de CH₄ et 17,3 kg de N₂O par tonne. Remultipliés, 703 × 34 ≈ 23 900 et 17,3 × 298 ≈ 5 160. Ensemble, ils font les 29 040 kg CO₂e de l'étude, aux arrondis du tableau près.

Les profils viennent de deux sources :

- **Cultures.** Le profil est celui des intensités HESTIA du même produit des bilans (`hestia:<code>`), tiré de son agrégation Monde s'il y en a une, sinon de la moyenne de ses pays. Quand HESTIA n'a pas le produit, on utilise à la place le profil d'un produit proche :
  - l'huile de palme prend celui du fruit du palmier à huile ;
  - l'huile de soja prend celui du soja ;
  - le thé prend celui du café ;
  - les bananes plantain prennent celui des bananes ;
  - les ananas et les dattes prennent celui des autres fruits ;
  - les pamplemousses et les autres agrumes prennent celui des oranges.
- **Produits animaux.** HESTIA n'a pas encore d'agrégation animale. Le profil est donc celui des émissions à la ferme de l'espèce selon FAOSTAT pour la dernière année mondiale disponible (Emissions from livestock) : le CH₄ de la fermentation entérique et de la gestion des effluents, et le N₂O de la gestion des effluents et des effluents laissés au pâturage (`faostat:<espèce>`). Les effluents épandus sur les sols sont exclus du profil, puisqu'ils fertilisent des cultures. Les espèces sont associées ainsi :
  - la viande bovine du troupeau allaitant prend le profil des bovins non laitiers ;
  - la viande bovine du troupeau laitier, et le lait, prennent celui des vaches laitières ;
  - la viande de mouton et de chèvre prend celui des moutons et des chèvres ;
  - la viande porcine prend celui des porcs ;
  - la volaille prend celui des poulets de chair ;
  - les œufs prennent celui des poules pondeuses.

Les émissions de l'élevage selon FAOSTAT ne contiennent pas de CO₂ : les lignes animales n'en portent donc pas. La part de l'énergie et de la fertilisation des pâturages dans l'étape d'élevage est comptée comme du CH₄ et du N₂O, dans les proportions de l'espèce. Cette part est petite pour les ruminants et plus grande pour les porcs et les volailles.

## Unités

Les unités de Poore & Nemecek sont celles des anciens bilans alimentaires de FAOSTAT (avant 2010). Elles diffèrent des actuelles pour deux produits, le riz et les arachides. `kg_product_per_kg_item` convertit ces unités et les autres ci-dessous :

- **Riz** : leur unité est le riz usiné. Les bilans actuels comptent le paddy, dont le riz usiné représente 66,7 %, d'où 0,667.
- **Arachides** : leur unité est l'arachide décortiquée. Les bilans actuels les comptent en coque, dont les graines représentent 70 %, d'où 0,7.
- **Canne à sucre et betterave sucrière** : leur unité est le sucre brut. Un kg de canne donne 0,11 kg de sucre brut, et un kg de betterave 0,15. Le produit des bilans « Sucre (équivalent brut) » prend directement les valeurs du sucre.
- **Tous les autres produits** : 1. La viande est par kg de poids de carcasse, le lait par kg de lait, les œufs par kg avec coquille, le café par kg de café vert, le cacao par kg de fèves, les huiles par kg d'huile, et les fruits à coque par kg en coque.

Les chiffres au poids de vente souvent cités à partir de l'étude, comme 99 kg CO₂e par kg de bœuf, sont une autre mesure. Ils sont par kg de viande désossée et comprennent toutes les étapes.

Quand plusieurs produits partagent un produit des bilans, ils sont moyennés avec leur alimentation et leur gaspillage de 2009–11 comme poids :

- la viande bovine regroupe le troupeau allaitant (40,6 Mt), le troupeau laitier (31,4 Mt) et le buffle (6,6 Mt) ;
- « Autres légumes » regroupe les autres légumes, les choux et les légumes-racines.

## Couverture

46 produits des bilans ont une ligne tirée de la littérature dans les deux périmètres.

- **19 n'ont aucune ligne HESTIA** : viande bovine, viande de mouton et de chèvre, viande porcine, volaille, lait, œufs, les cinq huiles végétales et les autres huiles (2571, 2573, 2574, 2577, 2580, 2586), sucre (équivalent brut), pamplemousses, autres agrumes, bananes plantain, ananas, dattes et thé.
- **19 autres ont des lignes HESTIA pour certains pays mais pas d'agrégation Monde** : la ligne tirée de la littérature est donc leur seule valeur mondiale. Ce sont le riz, l'avoine, le seigle, les autres céréales, le manioc, les haricots, les pois, les autres légumineuses, les fruits à coque, les autres oléagineux, les tomates, les oignons, les autres légumes, les oranges, les citrons, les pommes, les autres fruits, le café et le cacao.
- **Certains produits n'en ont pas** : l'orge, le millet, le sorgho, les patates douces, les ignames, le soja, les graines de tournesol, le colza, le sésame, les palmistes et les olives. Poore & Nemecek ne donnent l'orge que sous forme de bière, et le soja que sous forme de tofu, de boisson au soja et d'huile.

Valeurs à la ferme de quelques produits, en kg par tonne du produit des bilans :

| Produit | CO₂ | CH₄ | N₂O | CO₂e (AR5) |
| --- | --- | --- | --- | --- |
| Viande bovine | 0 | 703 | 17,3 | 29 040 |
| Mouton et chèvre | 0 | 387 | 21,3 | 19 510 |
| Viande porcine | 0 | 39,6 | 1,16 | 1 694 |
| Volaille | 0 | 4,2 | 1,78 | 672 |
| Lait | 0 | 37,1 | 0,66 | 1 458 |
| Œufs | 0 | 12,1 | 3,04 | 1 317 |
| Riz (paddy) | 186 | 50,2 | 0,63 | 2 078 |
| Blé | 153 | 0,44 | 1,21 | 530 |

## Hypothèses

- L'étape agricole de Poore & Nemecek équivaut au périmètre du berceau à la sortie de ferme, sans l'alimentation animale ni le changement d'usage des terres.
- La part des émissions à la ferme dans le CO₂e du berceau à la sortie de ferme de HESTIA pour un produit s'applique à l'étape agricole de Poore & Nemecek pour le même produit.
- Le profil de gaz d'un produit est celui de HESTIA pour ce produit (ou pour le produit proche nommé), ou celui des émissions de l'élevage à la ferme selon FAOSTAT pour les produits animaux. Le profil est une moyenne mondiale.
- Les produits animaux ne portent pas de CO₂, et les deux périmètres sont égaux pour eux.
- Les facteurs GWP100 (les pondérations à 100 ans qui convertissent chaque gaz en CO₂e) sont ceux de l'AR5 avec rétroactions climat-carbone : 34 pour le CH₄ et 298 pour le N₂O, pour le CH₄ fossile comme biogénique.
- Les conversions vers la quantité des bilans actuels sont celles listées ci-dessus. Les taux d'extraction du sucre de 11 % (canne) et 15 % (betterave) sont des valeurs typiques, qui ne viennent pas de l'étude.
- Les produits qui partagent un produit des bilans sont pondérés par leur alimentation et leur gaspillage de 2009–11.
- Les estimations de Poore & Nemecek pour les produits des bilans qu'ils n'ont pas étudiés (« Cereals & Oilcrops Misc. », « Oils Misc. », « Stimulants & Spices Misc. ») sont utilisées pour les autres céréales, les autres oléagineux, les autres huiles et le thé.
- Aucune deuxième source de la littérature n'est utilisée :
  - Clune et al. (2017) compile pour l'essentiel les mêmes études, dans un article payant dont la licence des données n'a pas pu être confirmée.
  - Agribalyse ne décrit que la production française.
  - Les produits que Poore & Nemecek n'ont pas (l'orge en grain, le soja, les graines de tournesol, le colza, le sésame, les olives, les patates douces, les ignames, le millet, le sorgho) sont pour l'essentiel couverts par les pays de HESTIA. Les autres prennent leurs valeurs dans les niveaux des substituts et des médianes de groupe.

## Sources

- Poore, J., & Nemecek, T. (2018). Reducing food's environmental impacts through producers and consumers. Science, 360(6392), 987–992. [doi:10.1126/science.aaq0216](https://doi.org/10.1126/science.aaq0216). Les Data S2 et les documents supplémentaires sont sur le [site du premier auteur](https://josephpoore.com/). HESTIA liste le jeu de données sous licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) sur sa page [Data Sources and Licences](https://www.hestia.earth/guide/guide-accessing-data-data-sources).
- Our World in Data, [Food: greenhouse gas emissions across the supply chain](https://ourworldindata.org/grapher/food-emissions-supply-chain) : les mêmes étapes par kg au poids de vente, un miroir public de l'étude.
- FAOSTAT, [Emissions from livestock](https://www.fao.org/faostat/en/#data/GLE) (CC BY 4.0) : profils de gaz des produits animaux.
- Agrégations HESTIA : profils de gaz des cultures, voir la [page HESTIA](#method-hestia).
