# Données : bilans alimentaires, pays et groupes

Cette page dit d'où vient l'image que Planetshift se fait de l'alimentation du monde. Tout ce qu'il sait de ce que chaque pays produit, échange et mange vient des bilans alimentaires de FAOSTAT, le service statistique de l'Organisation des Nations unies pour l'alimentation et l'agriculture (FAO). Le modèle part de l'année **2023** et couvre **188 pays** ; la page explique quels pays sont pris en compte, comment les aliments sont regroupés, ce qui est laissé de côté et comment télécharger les données.

## Les bilans alimentaires

Un bilan alimentaire (Food Balance Sheet, FBS) suit chaque produit alimentaire au long de l'année d'un pays. Il indique ce qui a été produit, importé et exporté. Il indique aussi ce que le produit est devenu : alimentation humaine, alimentation animale, semences, pertes, transformation en un autre produit, ou autres utilisations.

Les quantités sont en tonnes du produit tel que FAOSTAT le définit. C'est le plus souvent le produit primaire ou son équivalent : le riz en équivalent usiné, le lait en équivalent lait entier, la viande en poids de carcasse. Planetshift lit la série actuelle (à partir de 2010) telle que FAOSTAT la publie dans son téléchargement en masse.

La ligne de chaque produit est bouclée pour s'équilibrer exactement :

production + importations − exportations = alimentation humaine + alimentation animale + pertes + transformation + semences + autres

Le terme `other` (autres) regroupe les autres utilisations (non alimentaires) de FAOSTAT, la consommation des touristes, les résidus et les variations de stocks. Il peut être négatif quand les stocks ont été entamés.

### Les produits transformés

La transformation relie une culture à ce qu'on en fait : le soja trituré en huile, la canne en sucre, le lait en beurre. Les produits transformés (huiles, sucre, édulcorants, beurre, crème, vin, bière et autres boissons) sont des produits à part entière, avec leur propre production.

Chaque tonne doit être comptée une seule fois. Les émissions d'un produit primaire sont donc comptées sur sa production moins sa transformation. La part transformée est comptée sur les produits qui en sont tirés (voir [Émissions par tonne d'aliment](#method-emissions)).

## L'année de référence

L'année de référence est la dernière année dont les bilans couvrent au moins 95 % autant de pays que l'année la mieux couverte. Avec le téléchargement actuel, c'est **2023**, la dernière année publiée.

Les kcal et les protéines par tonne de chaque produit sont calculées pour l'année de référence. Ce sont l'apport alimentaire mondial en kcal et en protéines de ce produit selon FAOSTAT, divisé par son apport alimentaire mondial en tonnes.

## Pays

Le modèle compte **188 pays**. Ce sont les pays et territoires isolés de FAOSTAT qui ont un bilan alimentaire, moins quelques zones retirées pour que rien ne soit compté deux fois.

### Les zones gardées

FAOSTAT liste les pays et territoires isolés sous des codes de zone inférieurs à 5000. Il liste les groupes de pays (Monde, continents, régions, groupes économiques) à partir de 5000. Planetshift ne garde que les pays isolés. Il retire aussi explicitement les zones qui feraient compter quelque chose deux fois :

- « Chine » (code 351) est la somme de la Chine continentale (41), de Hong Kong (96), de Macao (128) et de Taïwan (214), que FAOSTAT liste aussi un par un. Planetshift garde les quatre parties et écarte la somme.
- Les zones qui n'existent plus sont écartées : l'URSS, la Yougoslavie, la Tchécoslovaquie, la Serbie-et-Monténégro, le Soudan d'avant 2011, la Belgique-Luxembourg, la RDP d'Éthiopie, les Antilles néerlandaises, le Territoire sous tutelle des îles du Pacifique. Leurs successeurs sont listés.

### Codes, régions, noms et population

- **Code.** Chaque pays reçoit un code ISO 3166 alpha-3 à partir de son code M49, par la table de Natural Earth. Quelques territoires que Natural Earth ne dessine pas au 1:50m sont ajoutés à la main : Guyane, Guadeloupe, Martinique, Mayotte, La Réunion, Gibraltar, Bonaire, Tokelau.
- **Région.** La région d'un pays est sa sous-région M49 (par exemple « Afrique de l'Ouest »), tirée de Natural Earth et orthographiée comme FAOSTAT l'orthographie. Ces régions servent pour la répartition de l'alimentation animale et pour les moyennes régionales.
- **Noms.** Les noms anglais et français sont ceux de FAOSTAT.
- **Revenu élevé.** L'indicateur de revenu élevé est la classification actuelle de la Banque mondiale (CLASS.xlsx, exercice 2027).
- **Population.** La population, de l'année de référence à 2100, est la population annuelle de FAOSTAT. Elle reprend les estimations des Perspectives de la population mondiale des Nations unies (WPP) et leur projection moyenne.

### Les pays au bilan plus ancien

Certains pays n'ont pas de bilan pour l'année de référence dans cette version. Plutôt que de les laisser vides, Planetshift prend leur dernier bilan. Il multiplie chaque quantité par la croissance de leur population depuis, ce qui garde leur alimentation par personne telle qu'elle était :

- dans la série actuelle : Cuba (2019) et la République populaire démocratique de Corée (2018) ;
- dans la série historique, qui s'arrête en 2013 : le Japon, le Soudan, le Mali, le Tchad, le Bénin, le Togo, la République centrafricaine, le Brunéi Darussalam, la Dominique et les Bermudes. Deux produits ont changé de code entre les séries (le riz, de 2805 à 2807, et les arachides, de 2556 à 2552) et sont renommés.

Les pays sans aucun bilan ne sont pas dans le modèle. Parmi eux figurent la Somalie, le Burundi, le Soudan du Sud, Singapour, la Palestine et l'Érythrée, ainsi que de petits territoires. Avec ces règles, le modèle compte **188 pays**.

## Groupes de produits

`pipeline/groups.csv` place chaque produit des bilans dans l'un des groupes que l'application affiche, et signale les produits animaux.

- **Végétaux :** céréales, riz (à part pour le méthane de ses rizières), légumineuses, oléagineux (graines, fruits et leurs huiles), légumes, fruits, racines et tubercules, plantes sucrières (canne, betterave, sucre et édulcorants), fruits à coque, café, cacao et thé, et autres végétaux (épices et boissons alcoolisées).
- **Produits animaux :** viande de ruminants (bovins, buffles, moutons, chèvres, et « autres viandes » : chameaux, lamas, chevaux, lapins, gibier), viande porcine, volaille, produits laitiers (lait, beurre, crème), œufs, et poissons et fruits de mer. Ces derniers comprennent les poissons d'eau douce, démersaux, pélagiques et autres poissons marins, les crustacés, les céphalopodes, les autres mollusques et les autres animaux aquatiques, en poids vif (voir [Poissons et fruits de mer](#method-seafood)).

Les abats comestibles vont avec la viande de ruminants, et les graisses animales crues avec la viande porcine, leur principale source respective.

### Ce qui est laissé de côté

Ces produits sont laissés hors du modèle, et de tous les totaux qu'il affiche :

- les plantes aquatiques (des algues, dont un tiers sert à des usages non alimentaires, presque sans protéines ni énergie), les mammifères aquatiques (aucun approvisionnement) et les huiles de poisson (faites de poissons déjà comptés dans les produits de la pêche) ;
- le miel, qui n'a pas d'émissions agricoles dans FAOSTAT et presque pas de protéines ;
- l'alcool non alimentaire, les aliments pour nourrissons (faits de produits déjà comptés) et le produit « divers ».

Un test vérifie que chaque produit des bilans dont la production mondiale dépasse 100 kt a une ligne dans `groups.csv`.

## Hypothèses

- Le bilan de l'année de référence représente le système alimentaire d'aujourd'hui ; le modèle du changement le fait évoluer avec la population.
- Les 188 pays du modèle comptent 8,02 milliards d'habitants en 2023 et 10,00 milliards en 2100 dans la population de FAOSTAT (Perspectives de la population mondiale). C'est 98 à 99 % des totaux mondiaux des WPP 2024 (8,09 et 10,18 milliards).
- Les pays absents de l'année de référence gardent l'alimentation par personne de leur dernier bilan, vieux de dix ans au plus, mise à l'échelle de leur population. Pour la série historique, la méthode diffère de celle de la série actuelle.
- `other` boucle le bilan de chaque produit. Les variations de stocks et les résidus statistiques sont donc gardés plutôt que répartis sur les autres utilisations.
- La sous-région M49 d'un pays est sa région pour les moyennes régionales.
- Les abats et les graisses animales appartiennent chacun à un seul groupe animal, bien qu'ils viennent de plusieurs espèces.

## Télécharger les données

La carte de la page Explorer a un bouton Télécharger. Le cadre des graphiques en a un pour le graphique affiché.

- **La carte en CSV** : chaque pays avec les valeurs de la couche aujourd'hui et une fois le changement complet, et la variation relative. Le fichier donne l'unité (tonnes de produit, kg d'un gaz ou de CO₂e, hectares, kg de CO₂ du défrichement). Pour la production et les émissions, il donne aussi le niveau et la source de l'intensité la moins précise utilisée. Licence CC BY 4.0.
- **Chaque graphique en CSV**, un fichier par onglet. Les fichiers contiennent la température mondiale de 1850 à 2100 (observée, sans et avec les leviers avec leurs fourchettes de 5 à 95 %, facteurs naturels seuls), le réchauffement évité chaque année jusqu'en 2100 avec sa fourchette, et le réchauffement par cause avec la température observée, puis le réchauffement de chaque gaz à effet de serre par cause. Ils dérivent de `climate.json` : licence CC BY-NC-SA 4.0.
- **Le scénario en JSON** : tous les réglages de la page, les mêmes que son adresse, avec les chiffres du résumé, la licence (CC BY-NC-SA 4.0) et la façon de citer.
- **Les fichiers de données source** : les fichiers JSON que lit la page, chacun selon les conditions de ses sources. `climate.json` et `sectors.json` sont sous CC BY-NC-SA 4.0 (pas d'usage commercial, partage dans les mêmes conditions), `industry.json` sous CC BY-SA 4.0, `population.json` sous CC BY 3.0 IGO et CC BY 4.0, et les autres sous CC BY 4.0. Tout ce qui dérive de `climate.json` ou de `sectors.json` garde leurs conditions.

Les fichiers CSV sont en UTF-8 avec une marque d'ordre des octets, et séparés par des virgules. Ils ont des noms de colonnes en anglais et des nombres bruts (un point pour les décimales, pas de séparateur de milliers), quelle que soit la langue de la page.

**Comment citer.** Citez Planetshift, avec l'adresse de la page (qui contient le scénario), et les sources d'origine listées ci-dessous et dans `meta.json`. Par exemple : « Planetshift (2026), *adresse de la page*. Données : FAOSTAT, HESTIA, PRIMAP-hist, FaIR, HadCRUT5, … ». La liste des téléchargements donne la ligne complète.

## Le code

Le code se trouve dans `pipeline/planetshift_pipeline/` (`supply.py`, `countries.py`, `groups.py`). La table de regroupement est `pipeline/groups.csv`.

## Sources

- FAOSTAT, Bilans alimentaires (2010–) : <https://www.fao.org/faostat/en/#data/FBS>, CC BY 4.0.
- FAOSTAT, Bilans alimentaires (–2013, ancienne méthodologie) : <https://www.fao.org/faostat/en/#data/FBSH>, CC BY 4.0.
- FAOSTAT, Population annuelle (Perspectives de la population mondiale des Nations unies) : <https://www.fao.org/faostat/en/#data/OA>, CC BY 4.0.
- UN DESA (2024). World Population Prospects 2024: Summary of Results. UN DESA/POP/2024/TR/NO. 9 ; les données des WPP 2024 : <https://population.un.org/wpp/>, CC BY 3.0 IGO.
- KC, S., Lutz, W. (2017). The human core of the shared socioeconomic pathways: population scenarios by age, sex and level of education for all countries to 2100. Global Environmental Change 42, 181–192 : <https://doi.org/10.1016/j.gloenvcha.2014.06.004>.
- KC, S. et al. (2024). Updating the Shared Socioeconomic Pathways (SSPs) global population and human capital projections. IIASA Working Paper WP-24-003.
- Our World in Data, Population (série de long terme tirée de HYDE 3.3, Gapminder v7 et des WPP 2024) : <https://ourworldindata.org/population-growth>, CC BY 4.0.
- Klein Goldewijk, K. et al. (2017). Anthropogenic land use estimates for the Holocene: HYDE 3.2. Earth System Science Data 9, 927–953 : <https://doi.org/10.5194/essd-9-927-2017>.
- Téléchargements en masse de FAOSTAT : <https://bulks-faostat.fao.org/production/datasets_E.json>.
- Natural Earth, Admin 0 countries, 1:50m, version 5.1.2 : <https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/>, domaine public.
- Banque mondiale, groupes de pays et de prêt : <https://datahelpdesk.worldbank.org/knowledgebase/articles/906519>, CC BY 4.0.
