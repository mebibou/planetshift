# Biodiversité : espèces, mammifères et poissons

L'alimentation et l'agriculture causent plus de perte de biodiversité sur terre que toute autre cause, et la pêche en cause le plus dans l'océan. Planetshift donne trois mesures, chacune pour aujourd'hui et pour une fois les leviers en place : les espèces que les terres agricoles condamnent à l'extinction, les mammifères d'élevage comparés aux sauvages, et les poissons que vise la pêche comparés à un océan sans pêche. Les trois sont tenues à part du réchauffement, comme l'explique la dernière section.

Les animaux d'élevage forment aujourd'hui l'essentiel des mammifères du monde en poids. Planetshift pèse les mammifères d'élevage de chaque pays, aujourd'hui et une fois les leviers en place, et compare le total mondial aux mammifères sauvages. Le résumé donne le chiffre mondial, *Mammifères d'élevage pour un sauvage, en poids*. La couche *Mammifères d'élevage* de la carte donne les mammifères d'élevage de chaque pays par km² de terres.

Les chiffres sont dans `mammals.json`. Le code est dans `pipeline/planetshift_pipeline/mammals.py`, avec les poids vifs dans `pipeline/mammals_live_weights.csv`, et dans `app/src/model/mammals.ts`.

## Les mammifères d'élevage aujourd'hui

Les mammifères d'élevage d'un pays pèsent ses têtes de chaque animal multipliées par le poids vif type de cet animal dans sa région :

$$
B_c = \sum_s N_{c,s} \, m_{r(c),s}
$$

avec $N_{c,s}$ les têtes de l'animal $s$ dans le pays $c$ et $m_{r,s}$ le poids vif d'un animal $s$ dans la région $r$.

- **Têtes** : les effectifs du domaine *Émissions de l'élevage* de FAOSTAT (CC BY 4.0), l'année de base (2024). Ce domaine sépare les vaches laitières des autres bovins et les truies et verrats des porcs à l'engrais, dont les poids diffèrent beaucoup. Les animaux sont les vaches laitières, les autres bovins, les buffles, les moutons, les chèvres, les porcs à l'engrais et reproducteurs, les chameaux, les lamas, les chevaux, les ânes, et les mulets et bardots.
- **Poids vif** : la masse animale type des Lignes directrices 2006 du GIEC pour les inventaires nationaux de gaz à effet de serre (vol. 4, chap. 10, tableaux 10A-4 à 10A-9), par région : Amérique du Nord, Europe de l'Ouest, Europe de l'Est, Océanie, Amérique latine, Afrique, Moyen-Orient, Asie et sous-continent indien. Les moutons, les chèvres et les chevaux ont une masse pour les pays développés (Amérique du Nord, Europe et Océanie) et une pour les autres. Le GIEC ne donne pas de masse pour les lamas : ils prennent les 65 kg de l'alpaga (tableau 10.10), ce qui les compte bas. Chaque valeur et sa raison sont dans `mammals_live_weights.csv`.
- **Régions** : chaque pays prend la région du GIEC de sa sous-région de l'ONU, regroupées comme l'ont fait Greenspoon et al. (2023). L'Arménie, l'Azerbaïdjan et la Géorgie sont en Asie, l'Iran et le Pakistan au Moyen-Orient, et l'Inde, le Bangladesh et le Bhoutan forment le sous-continent indien.

Ce sont les masses et la méthode que Greenspoon et al. (2023) ont utilisées pour leur propre compte du bétail, si bien que les deux se comparent. Le tableau 10.10 du même chapitre donne des poids plus élevés pour les chameaux (570 kg contre 217), les chevaux (550 contre 377 et 238) et les mulets et ânes (245 contre 130). Ils sont écartés pour cette raison. Le GIEC donne ses masses à ±10 % pour les vaches laitières, ±20 % pour les porcs, ±25 % pour les autres bovins et ±30 % pour les moutons, les chèvres, les chameaux, les chevaux, les mulets et les ânes.

Sont laissés de côté :

- les volailles, qui sont des oiseaux ;
- les lapins, les lièvres et les rongeurs d'élevage, que FAOSTAT compte dans un autre domaine : environ 0,5 Mt chez Greenspoon et al. ;
- les chiens et les chats, qui ne sont pas élevés pour la ferme : environ 24 Mt ;
- les cerfs et les rennes, que FAOSTAT ne compte pas par tête.

En 2024, les mammifères d'élevage des 182 pays du modèle qui ont des effectifs pèsent 642 Mt. Les bovins pèsent 427 Mt, les buffles 71 Mt, les moutons 42 Mt, les porcs 36 Mt et les chèvres 35 Mt. Les chevaux, les chameaux, les ânes, les mulets et les lamas pèsent 32 Mt ensemble. Greenspoon et al. trouvent environ 630 Mt pour 2018 avec les mêmes espèces et les lapins : bovins 416 Mt, buffles 68 Mt, moutons 39 Mt, porcs 38 Mt et chèvres 32 Mt. Le tableau qu'ils ont utilisé donne 50 kg aux vaches laitières d'Océanie, là où le GIEC donne 500 kg. Planetshift prend la valeur du GIEC.

## Les mammifères sauvages

Greenspoon et al. (2023) estiment les mammifères sauvages terrestres du monde à environ 22 Mt (environ 20 Mt dans leur résumé, intervalle à 95 % de 13 à 38 Mt) et ses mammifères marins sauvages à environ 39 Mt (intervalle à 95 % de 20 à 80 Mt). Planetshift prend 61 Mt. Ils ne donnent qu'un total mondial, si bien que la carte n'a pas de couche des mammifères sauvages. Aucun levier ne le change, et les terres agricoles libérées n'y ajoutent ici aucun mammifère sauvage.

Les deux côtés sont comptés en poids vif, ou humide. Greenspoon et al. passent au carbone en prenant un tiers pour le poids sec et la moitié de celui-ci pour le carbone, si bien que le rapport est le même en carbone.

## Le chiffre

Le résumé divise les mammifères d'élevage du monde par ses mammifères sauvages, aujourd'hui et une fois les leviers en place. Aujourd'hui, les mammifères d'élevage pèsent 10,5 fois les sauvages, et 29 fois les mammifères sauvages terrestres. Les chiffres de Greenspoon et al., environ 630 Mt de bétail contre environ 60 Mt de mammifères sauvages, donnent environ 10 pour 1, et ils écrivent que les mammifères domestiques pèsent « 30 pour 1 » face aux mammifères sauvages terrestres. Bar-On et al. (2018) donnent 0,1 Gt C de bétail contre 0,007 Gt C de mammifères sauvages, environ 14 pour 1. Le « quinze pour un » souvent cité ne vient que de cette estimation plus ancienne.

## Avec les leviers

Un troupeau croît ou décroît avec la production de l'aliment qu'il donne, dans son pays. Planetshift donne déjà, pour chaque pays, la variation de la production de chaque groupe animal une fois les leviers en place (la même variation relative qui fait varier ses aliments du bétail et ses tourteaux). Les troupeaux la suivent :

$$
\Delta B_c = \sum_g B_{c,g} \, \frac{\Delta P_{c,g}}{P_{c,g}}
$$

avec $B_{c,g}$ les mammifères d'élevage du pays $c$ qui suivent le groupe $g$ et $P_{c,g}$ la production de ce groupe dans le pays. Un groupe qui disparaît emporte ses troupeaux avec lui.

Chaque troupeau est partagé entre les groupes comme ses émissions (voir [Émissions](#method-emissions)) :

- **Vaches laitières** : 88 % au lait et 12 % à la viande bovine, les vaches de réforme.
- **Autres bovins** : la viande bovine.
- **Buffles, moutons, chèvres et chameaux** : le lait et la viande, selon les protéines que produit le troupeau de chaque pays. S'il ne produit ni l'un ni l'autre, la viande.
- **Porcs** : la viande de porc.
- **Lamas** : le poste « autres viandes », dans le groupe des viandes de ruminants.
- **Animaux non élevés pour l'alimentation** : les chevaux, les ânes et les mulets, et la part des bovins et des buffles trouvée non élevée pour l'alimentation (voir [Émissions](#method-emissions)). Ils ne suivent aucun aliment et restent tels quels. Ils pèsent 42 Mt.

Avec tout le régime déplacé, seuls ces 42 Mt restent : 0,7 pour 1 face aux mammifères sauvages. La moitié du déplacement laisse 342 Mt, 5,6 pour 1. Le chiffre est celui une fois les leviers en place, comme les terres agricoles libérées.

## La couche de la carte

La couche *Mammifères d'élevage* donne les mammifères d'élevage de chaque pays avec les leviers, en tonnes de poids vif par km² de sa superficie des terres (celle de FAOSTAT, comme pour la couche *Usage des terres*). Ses classes sont fixes (1 ; 2,5 ; 5 ; 10 ; 20 et 40 t/km²), si bien qu'un déplacement se voit à des couleurs plus claires. L'infobulle et le tableau donnent la densité aujourd'hui et avec les leviers, et le poids vif en tonnes.

Aujourd'hui, les Pays-Bas ont 75 t/km², l'Irlande 47, l'Inde 25, la Nouvelle-Zélande 19, la France 16, le Brésil 9,4, la Chine 6,0, les États-Unis 4,7 et l'Australie 1,9.

## Ce qui est laissé de côté

- Un troupeau suit la production à production par tête fixe. Des rendements laitiers plus élevés ou des carcasses plus lourdes demanderaient moins d'animaux pour la même production, et les leviers ne les changent pas ici.
- Les effectifs sont le troupeau présent un jour de l'année, comme Greenspoon et al. le comptent aussi.
- Les troupeaux sont comptés là où ils sont élevés, pas là où leurs produits sont consommés.
- Les mammifères sauvages sont un total mondial à large fourchette. Les terres libérées ne sont pas modélisées pour les faire revenir.

## Les espèces condamnées à l'extinction

Les terres agricoles prennent la place de l'habitat dont les espèces ont besoin. Planetshift compte les espèces de plantes, mammifères, oiseaux, reptiles et amphibiens que les cultures et les prairies de chaque pays condamnent à l'extinction dans le monde. Le résumé donne le chiffre mondial, *Espèces condamnées à l'extinction par les terres agricoles*. La couche *Perte d'espèces* de la carte donne celui de chaque pays, en nombre ou par Mha de ses terres agricoles. Par Mha, les terres agricoles de la France condamnent environ 22 espèces, celles de Madagascar environ 69 et celles de l'Australie environ 5.

C'est une perte engagée dans le temps, si la terre reste cultivée. Elle compte les espèces qui disparaîtraient à terme, parce que l'habitat qui leur reste est trop petit pour les maintenir. Ce n'est pas le nombre d'espèces perdues à une date donnée, et cela ne dit pas lesquelles.

Les facteurs sont dans `species.json`. Le code est `pipeline/planetshift_pipeline/species.py`, `app/src/model/species.ts` et `app/src/app/species.ts`.

### Les facteurs

Scherer et al. (2023) donnent, pour chaque pays, type d'usage des terres et intensité, la part des espèces de chaque groupe qu'un m² d'usage condamne à l'extinction mondiale. Leur modèle tient compte de la perte d'habitat et de la fragmentation de ce qui reste. Il tient compte aussi de la menace qui pèse sur chaque espèce et de l'étendue de son aire (sa probabilité d'extinction mondiale). LC-IMPACT v2 (2026) reprend ces facteurs pour l'usage des terres. Planetshift lit leur fichier par pays, `CF_country.csv` (CC BY 4.0), et prend :

- **Cultures** : l'usage léger pour les plantes. Pour les animaux, l'usage léger et l'usage intensif, que le modèle fusionne.
- **Prairies** : selon la densité du pâturage (voir plus bas).
- **Les terres agricoles d'aujourd'hui** : le facteur moyen, la part de la perte déjà causée qui revient à la terre.
- **Les terres nouvellement cultivées** : le facteur marginal, la perte due à l'hectare suivant. Il est plus élevé, car chaque hectare pris fait perdre plus d'espèces quand il reste moins d'habitat.

Le facteur de chaque groupe est multiplié par ses espèces décrites (Liste rouge de l'UICN 2025-1, tableau 1a : 6 736 mammifères, 11 195 oiseaux, 12 386 reptiles, 8 863 amphibiens et 381 913 plantes vasculaires, 421 093 en tout), et les cinq groupes sont additionnés. Les espèces condamnées aujourd'hui par un pays sont :

$$
E_c = A_{c,\text{cult}} \, f_{c,\text{cult}} + A_{c,\text{prairie}} \, f_{c,\text{prairie}}
$$

avec $A$ les terres agricoles du modèle (cultures récoltées et prairies permanentes, ha) et $f$ les espèces par ha. Les Bermudes, Hong Kong, Macao, la Nouvelle-Calédonie, la Polynésie française et Taïwan n'ont pas de facteurs et sont laissés de côté.

L'intensité compte, surtout pour les plantes des prairies, où le facteur de l'usage minimal est environ 30 fois plus faible que celui de l'usage léger. Les prairies permanentes de FAOSTAT comprennent de vastes parcours pâturés à quelques têtes par km². L'Australie en compte 332 Mha, 43 % de ses terres. L'intensité des prairies de chaque pays vient des unités de bétail de ses ruminants par hectare de prairie (structure du cheptel et effectifs de FAOSTAT). À 0,15 ou moins, la prairie est en usage minimal. À 0,6 ou plus, elle est en usage léger. Entre les deux, c'est un mélange linéaire des deux. L'Arabie saoudite (0,03), le Kazakhstan, la Mongolie, Madagascar et l'Australie (0,11) sont en usage minimal. Les États-Unis (0,33) et la Chine (0,37) se partagent à peu près également entre usage minimal et usage léger. Le Brésil (0,98), la France (1,5) et les Pays-Bas (4,4) sont en usage léger. Les seuils sont un choix de Planetshift : avec toutes les prairies en usage léger, le total mondial serait d'environ 56 000, et avec toutes en usage minimal d'environ 33 000. Les cultures sont en usage léger partout, car le modèle n'a pas d'intensité pour elles.

### Aujourd'hui

Les terres agricoles du monde condamnent environ 42 000 espèces à l'extinction, 10,0 % des 421 093 décrites. Les prairies en représentent 47 %. Le Brésil arrive en premier, avec environ 6 000. Suivent Madagascar (2 900), l'Indonésie (2 800), le Mexique (2 500), la Colombie (2 200), la Chine (2 000) et l'Australie (1 900). Les terres agricoles de la France en condamnent environ 550, et celles des États-Unis environ 1 200.

### Avec les leviers

Les terres agricoles de chaque pays changent avec les leviers comme le décrit [Terres](#method-land). Les terres nouvellement cultivées condamnent des espèces au facteur marginal. Les terres libérées regagnent leurs espèces à mesure que la végétation repousse. Le chiffre dépend donc de l'option *Terres libérées*, comme le CO₂ de la repousse :

- **Laissées en l'état** (par défaut) : les terres libérées ne regagnent aucune espèce. Le chiffre ne peut que croître, par les terres nouvellement cultivées. Avec tout le régime changé, il atteint environ 44 000.
- **Végétation spontanée** : les terres libérées regagnent leurs espèces au facteur moyen, une fois la végétation revenue. Avec tout le régime changé, le chiffre tombe à environ 22 000, 5,3 % des espèces décrites. La moitié du changement donne environ 32 000.

Le chiffre vaut une fois les leviers en place et la végétation revenue sur les terres libérées. Les espèces reviennent plus lentement que la végétation, souvent en plusieurs décennies.

### Comparé à HESTIA

Les agrégations v1.3 de HESTIA calculent les dommages de l'usage des terres avec Chaudhary & Brooks (2018) (`damageToTerrestrialEcosystemsLandOccupation`). Pour le blé en Espagne et en France, le maïs aux États-Unis et au Brésil, et le blé en Inde, leur facteur par m² de culture vaut 50 à 140 fois celui de Scherer et al. Le rapport varie d'un pays à l'autre, si bien que les deux diffèrent aussi par endroits. L'essentiel de l'écart vient de l'échelle. Chaudhary & Brooks pondèrent les espèces par un score de vulnérabilité qui n'est pas rapporté aux espèces du monde, si bien que leurs facteurs mondiaux ne s'additionnent pas en un nombre d'espèces. La probabilité d'extinction mondiale qu'utilisent Scherer et al. est mise à l'échelle pour qu'un groupe ne puisse pas perdre plus que toutes ses espèces (LC-IMPACT v2, chapitre 2). Le tableau par pays de LC-IMPACT v2 lui-même (`EQ_LandUse_gloPDF_Country_Aggregated`) a le même défaut : multiplié par les terres agricoles du monde, il donne plus que le nombre total d'espèces. Planetshift lit donc le fichier de Scherer et al.

### Ce qui est laissé de côté

- L'intensité des cultures, et les cultures de chaque pays : un hectare de blé et un de palmier à huile comptent pareil.
- Les espèces d'eau douce, les insectes et les champignons, que les facteurs ne couvrent pas.
- Le défrichement de la forêt pour l'agriculture : seules les terres agricoles qu'elle devient sont comptées.
- Le temps que mettent les espèces à revenir, et celles perdues pour de bon avant que la terre ne soit libérée.

## Les poissons et la pêche

La pêche a réduit les poissons qu'elle vise à environ un tiers de leur biomasse sans pêche. Bianchi et al. (2021) modélisent les poissons que visent les pêcheries, de 10 g à 100 kg : 3,3 Gt (±0,5) sans pêche, et 1,1 Gt (±0,2) au pic mondial des captures de la fin des années 1990. Planetshift utilise le chiffre du pic des captures pour aujourd'hui. Les captures ont un peu baissé depuis, si bien que ce chiffre peut sous-estimer légèrement les poissons d'aujourd'hui. Le résumé donne *Poissons visés par la pêche, par rapport à un océan sans pêche* : 33 % aujourd'hui.

Avec les leviers, la pêche change de la même part que la production mondiale de poissons et fruits de mer du modèle. Planetshift suppose que la biomasse que retire la pêche suit les captures :

$$
B = B_0 - (B_0 - B_1) \, \frac{C'}{C}
$$

avec $B_0$ la biomasse sans pêche, $B_1$ celle d'aujourd'hui, $C$ les captures d'aujourd'hui et $C'$ les captures avec les leviers. La moitié du changement de régime divise la pêche par deux et porte les poissons à 67 % de leur biomasse sans pêche. Le changement entier arrête la pêche et les ramène à 100 %.

C'est une mesure grossière. Les stocks ne se reconstituent pas aussi vite que les captures baissent, et il leur faut des années. Les captures suivent aussi les poissons d'élevage, et pas seulement les sauvages, car le modèle ne sépare pas les fruits de mer par système. L'article de Bianchi et al. est sous licence CC BY-NC 4.0, et Planetshift n'en cite que deux chiffres.

## Tenue à part du réchauffement

Planetshift n'ajoute pas la perte de biodiversité au réchauffement et ne la convertit pas en réchauffement. Dans les agrégations v1.3 de HESTIA, les dommages aux écosystèmes terrestres dus au changement climatique sont environ 600 fois plus faibles que ceux de l'usage des terres pour le soja brésilien, et environ 1 250 fois pour le blé en Espagne. Le réchauffement évité par chaque scénario figure dans les chiffres du climat. Ses effets sur les espèces font partie des impacts qu'évalue le GIEC (voir [Ce que signifie le réchauffement](#method-impacts)).

## Sources

- FAOSTAT, Émissions de l'élevage (GLE) : effectifs par espèce, [fao.org/faostat](https://www.fao.org/faostat/en/#data/GLE). Licence : CC BY 4.0.
- GIEC (2006), *2006 IPCC Guidelines for National Greenhouse Gas Inventories*, vol. 4, chap. 10, *Emissions from Livestock and Manure Management*, tableaux 10A-4 à 10A-9 et 10.10, [ipcc-nggip.iges.or.jp](https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol4.html). Valeurs citées.
- Greenspoon et al. (2023), *The global biomass of wild mammals*, PNAS 120, e2204892120, [doi:10.1073/pnas.2204892120](https://doi.org/10.1073/pnas.2204892120). Licence : CC BY-NC-ND 4.0, chiffres cités. Leur code et leurs données, avec les masses du bétail qu'ils ont utilisées : [gitlab.com/milo-lab-public/mammal_biomass](https://gitlab.com/milo-lab-public/mammal_biomass), licence MIT.
- Bar-On et al. (2018), *The biomass distribution on Earth*, PNAS 115, 6506–6511, [doi:10.1073/pnas.1711842115](https://doi.org/10.1073/pnas.1711842115). Licence : CC BY-NC-ND 4.0, chiffres cités.
- Scherer et al. (2023), *Biodiversity impact assessment considering land use intensities and fragmentation*, Environmental Science & Technology 57, 19612–19623. Facteurs : [zenodo.org/records/10114493](https://zenodo.org/records/10114493). Licence : CC BY 4.0.
- LC-IMPACT v2 (2026), [zenodo.org/records/18670560](https://zenodo.org/records/18670560). Licence : CC BY 4.0. Son chapitre sur l'usage des terres et celui sur les probabilités d'extinction mondiale.
- UICN (2025), *Liste rouge des espèces menacées*, version 2025-1, tableau 1a, [iucnredlist.org](https://www.iucnredlist.org/resources/summary-statistics). Chiffres cités.
- Chaudhary & Brooks (2018), *Land use intensity-specific global characterization factors to assess product biodiversity footprints*, Environmental Science & Technology 52, 5094–5104, [doi:10.1021/acs.est.7b05570](https://doi.org/10.1021/acs.est.7b05570), tels que HESTIA les applique ([hestia.earth/guide](https://www.hestia.earth/guide/damageToTerrestrialEcosystemsLandOccupation)).
- Bianchi et al. (2021), *Estimating global biomass and biogeochemical cycling of marine fish with and without fishing*, Science Advances 7, eabd7554, [doi:10.1126/sciadv.abd7554](https://doi.org/10.1126/sciadv.abd7554). Licence : CC BY-NC 4.0, chiffres cités.
