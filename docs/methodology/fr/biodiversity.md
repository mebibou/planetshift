# Biodiversité : mammifères d'élevage et sauvages

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

- **Vaches laitières** : 85 % au lait et 15 % à la viande bovine, les vaches de réforme.
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

## Sources

- FAOSTAT, Émissions de l'élevage (GLE) : effectifs par espèce, [fao.org/faostat](https://www.fao.org/faostat/en/#data/GLE). Licence : CC BY 4.0.
- GIEC (2006), *2006 IPCC Guidelines for National Greenhouse Gas Inventories*, vol. 4, chap. 10, *Emissions from Livestock and Manure Management*, tableaux 10A-4 à 10A-9 et 10.10, [ipcc-nggip.iges.or.jp](https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol4.html). Valeurs citées.
- Greenspoon et al. (2023), *The global biomass of wild mammals*, PNAS 120, e2204892120, [doi:10.1073/pnas.2204892120](https://doi.org/10.1073/pnas.2204892120). Licence : CC BY-NC-ND 4.0, chiffres cités. Leur code et leurs données, avec les masses du bétail qu'ils ont utilisées : [gitlab.com/milo-lab-public/mammal_biomass](https://gitlab.com/milo-lab-public/mammal_biomass), licence MIT.
- Bar-On et al. (2018), *The biomass distribution on Earth*, PNAS 115, 6506–6511, [doi:10.1073/pnas.1711842115](https://doi.org/10.1073/pnas.1711842115). Licence : CC BY-NC-ND 4.0, chiffres cités.
