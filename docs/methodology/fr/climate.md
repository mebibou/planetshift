# Des émissions à la température

Planetshift traduit une variation des émissions en variation de la température mondiale. Il suit séparément le dioxyde de carbone, le méthane et le protoxyde d'azote avec FaIR, un modèle climatique simple utilisé par le GIEC, au lieu de les additionner en « équivalent CO₂ ». Selon la médiane de FaIR pour le scénario intermédiaire, avant tout levier, le monde est 1,90 °C au-dessus de 1850–1900 en 2050 et 2,63 °C en 2100. L'application mesure l'effet des leviers par rapport à une référence de ce type.

Cette page explique aussi la bande d'incertitude, la courbe des facteurs naturels seuls, pourquoi 2023 et 2024 ont été si chaudes, l'option du pergélisol et les quelques endroits où Planetshift s'écarte de FaIR.

## Pourquoi les gaz sont séparés

L'agriculture émet trois gaz à effet de serre : le dioxyde de carbone (CO₂), le méthane (CH₄) et le protoxyde d'azote (N₂O). Ils ne réchauffent pas la planète de la même façon.

- **Le CO₂** s'accumule. Une grande partie de chaque tonne reste dans l'air pendant des siècles : le réchauffement qu'il cause ne s'estompe presque pas.
- **Le méthane** a une courte durée de vie. Pendant ses vingt premières années, chaque tonne réchauffe environ 80 fois plus qu'une tonne de CO₂. Mais elle a en grande partie disparu en quelques décennies. Des émissions de méthane stables maintiennent la température à un niveau à peu près constant. Des émissions en baisse la laissent redescendre en quelques décennies.
- **Le N₂O** est entre les deux. Il dure environ un siècle.

Le raccourci habituel additionne les gaz en « équivalent CO₂ », avec le potentiel de réchauffement global à 100 ans (GWP100). Il multiplie ensuite le total par le réchauffement par tonne de CO₂ (le TCRE, la réponse transitoire du climat aux émissions cumulées). Cela revient à traiter une tonne de méthane comme si elle restait dans l'air comme le CO₂. Ce raccourci, par conséquent :

- surestime le réchauffement durable dû à un méthane stable ;
- sous-estime le refroidissement rapide quand le méthane baisse ;
- se trompe de calendrier pour un changement d'alimentation qui agit en une ou deux décennies.

Planetshift garde donc chaque gaz séparé, des facteurs d'émission jusqu'à la température. Il n'affiche l'équivalent CO₂ que comme un chiffre familier.

## La réponse de la température à un kilogramme

Pour chaque gaz, le pipeline calcule le potentiel absolu de changement de température mondiale (AGTP). C'est l'écart de température du monde, année après année, après l'émission d'un kilogramme du gaz l'année 0. La courbe couvre de 0 à 200 ans après l'émission. Les gaz sont le CO₂, le méthane, le N₂O et le HFC-134a, qui représente les réfrigérants de la chaîne du froid alimentaire (voir [Émissions](#method-emissions), *Après la ferme*). L'impulsion de HFC-134a dans FaIR est de 10 kt.

Les courbes viennent de FaIR, un modèle climatique simple utilisé dans le sixième rapport d'évaluation du GIEC (AR6). FaIR tourne avec 841 jeux de paramètres, chacun compatible avec le climat observé jusqu'ici. L'application garde, pour chaque année après l'émission, la médiane des 841 et leurs 5e et 95e centiles.

### Ce que montrent les courbes

Le tableau donne la médiane de FaIR, avec sa fourchette de 5 à 95 %, en °C par kg. À côté figurent les valeurs de l'AR6 pour les mêmes horizons. Celles à 50 et 100 ans viennent de son tableau 7.SM.7. Ce tableau ne donne pas de valeur à 20 ans : celles à 20 ans sont donc calculées ici avec les expressions de l'AR6.

| Gaz | FaIR, 20 ans | FaIR, 100 ans | AR6, 20 / 50 / 100 ans | Forme (FaIR) |
| --- | --- | --- | --- | --- |
| CO₂ | 3,7 × 10⁻¹⁶ (2,7–5,1) | 3,5 × 10⁻¹⁶ (2,1–5,3) | 4,95 × 10⁻¹⁶ / 4,28 × 10⁻¹⁶ / 3,95 × 10⁻¹⁶ | monte pendant environ 11 ans, puis reste presque plate |
| CH₄ | 3,3 × 10⁻¹⁴ (2,2–4,9) | 4,1 × 10⁻¹⁵ (1,5–10,4) | 2,59 × 10⁻¹⁴ / 4,73 × 10⁻¹⁵ / 2,12 × 10⁻¹⁵ | culmine après 6 ans, un dixième du pic à 100 ans |
| N₂O | 1,7 × 10⁻¹³ (1,1–2,4) | 1,0 × 10⁻¹³ (0,7–1,8) | 1,47 × 10⁻¹³ / 1,24 × 10⁻¹³ / 9,19 × 10⁻¹⁴ | culmine après 12 ans, décroît sur un siècle |

À 100 ans, la courbe du CO₂ de FaIR est 11 % sous celle de l'AR6, et celle du N₂O 9 % au-dessus. Celle du méthane vaut environ le double de celle de l'AR6, proche de la valeur de l'AR6 à 50 ans. « L'alternative AR6 », plus bas, explique pourquoi.

### Comment l'application utilise les courbes

Les leviers modifient les émissions de chaque gaz, année après année. L'application additionne le réchauffement dû à la variation de chaque année : la variation d'un gaz une année donnée, multipliée par l'AGTP de ce gaz pour le nombre d'années écoulées depuis. En symboles, avec $\Delta E_{\text{gaz}}(\tau)$ la variation des émissions d'un gaz l'année $\tau$ :

$$
\Delta T(t) = \sum_{\text{gaz}} \sum_{\tau \le t} \Delta E_{\text{gaz}}(\tau) \cdot \mathrm{AGTP}_{\text{gaz}}(t - \tau)
$$

Cette somme est exacte pour un modèle dont la réponse est proportionnelle à ce qu'il reçoit. Elle est proche pour FaIR tant que la variation due aux leviers reste petite par rapport aux émissions mondiales (voir [Limites](#method-limitations) pour les leviers d'énergie au maximum).

Chaque valeur d'AGTP est la variation de la température moyenne d'une année civile due à une année d'émission répartie uniformément sur cette année. AGTP(0) est donc l'effet dans l'année même.

La construction vérifie cette somme par rapport à FaIR lui-même. Additionner ainsi les émissions historiques de l'agriculture avec les courbes donne le réchauffement dû à l'agriculture en 2010–2019 à environ 6 % près de ce que donne FaIR lancé avec et sans ces émissions.

### Comment les courbes sont calculées

L'ensemble est l'ensemble calibré et contraint publié pour FaIR (fair-calibrate v1.4.1). Chacun de ses 841 jeux de paramètres est compatible avec le réchauffement observé, l'absorption de chaleur par l'océan et les concentrations de CO₂, ainsi qu'avec les fourchettes évaluées par l'AR6 pour la sensibilité climatique et le forçage des aérosols.

Chaque membre est lancé deux fois sur le scénario SSP2-4.5, l'avenir intermédiaire, avec des émissions pour chaque gaz et chaque aérosol. Une simulation est celle publiée. L'autre ajoute une impulsion supplémentaire d'un gaz émise en 2035. La différence de température, divisée par la masse de l'impulsion, est l'AGTP de ce membre.

Les impulsions sont de 1 milliard de tonnes de CO₂, 1 million de tonnes de méthane et 0,1 million de tonnes de N₂O. Chacune représente moins de 3 % des émissions annuelles du gaz, pour que la réponse reste proportionnelle. Chacune reste aussi bien au-dessus des erreurs d'arrondi.

La construction fait ces vérifications :

- **Proportionnalité** : une impulsion dix fois plus grande donne un AGTP à 0,2 % près de celui de la petite, pour chaque gaz.
- **Stabilité dans le temps** : des impulsions en 2025, 2035 et 2045 donnent des courbes à 4 % (CO₂), 7 % (CH₄) et 2 % (N₂O) près les unes des autres. La courbe de 2035 est gardée, parce que 2035 est au milieu des années que couvre le changement d'alimentation de l'application.
- **Le méthane est biogénique.** Le méthane fossile ajoute du CO₂ en se décomposant. Celui des bovins, des effluents et du riz non, car les plantes ont prélevé son carbone dans l'air quelques mois plus tôt. FaIR ne transforme pas le méthane en CO₂, ce qu'un test confirme : quand l'effet du réchauffement sur l'absorption du carbone est désactivé, une impulsion de méthane laisse la concentration de CO₂ exactement inchangée. Quand cet effet est activé, comme dans les courbes, le réchauffement dû à une impulsion de méthane ralentit l'absorption du CO₂ déjà présent dans l'air. C'est une véritable rétroaction climat-carbone, que l'AR6 inclut aussi dans ses métriques.
- **Les effets indirects du méthane sont activés** : l'ozone et la vapeur d'eau stratosphérique supplémentaires que produit le méthane, et la variation de sa durée de vie avec sa propre concentration, la température et les autres gaz.
- Les impulsions de CO₂ sont du CO₂ fossile (le « CO₂ FFI » de FaIR), et non du CO₂ d'usage des terres, qui dans FaIR modifie aussi l'albédo de surface.

### L'alternative AR6

Dans *Autres options*, on peut remplacer les courbes par les expressions analytiques du chapitre 7 de l'AR6, tirées de son matériel supplémentaire, section 7.SM.5. Elles combinent :

- une réponse impulsionnelle fixe du CO₂ ;
- une réponse climatique à deux échelles de temps ;
- l'efficacité radiative de chaque gaz aux concentrations de 2019, avec ses ajustements rapides ;
- l'ozone et la vapeur d'eau dus au méthane, et l'effet du N₂O sur le méthane ;
- une rétroaction climat-carbone.

Chaque constante est celle que le code de l'AR6 a utilisée pour son tableau 7.SM.7. Le pipeline reproduit l'AGTP de ce tableau à 50 et 100 ans à 0,2 % près pour les trois gaz. L'AR6 donne une seule courbe : sa médiane et ses 5e et 95e centiles sont donc identiques. Ses courbes pour une impulsion instantanée sont moyennées comme celles de FaIR : une émission répartie sur l'année 0, puis la moyenne sur chaque année civile.

Les deux concordent en ordre de grandeur. À 20 ans, la médiane de FaIR vaut 0,75 fois celle de l'AR6 pour le CO₂, 1,3 fois pour le méthane et 1,1 fois pour le N₂O. Elles s'écartent davantage aux horizons lointains : à 50 et 100 ans, la courbe du méthane de FaIR fait environ le double de celle de l'AR6. Cette queue ne vient pas du cycle du carbone de FaIR, puisqu'elle reste quand la rétroaction climat-carbone est désactivée. Elle vient de la partie lente de la réponse climatique de FaIR, plus grande dans l'ensemble calibré que dans l'ajustement à deux échelles de temps de l'AR6. Pour un changement d'alimentation jusqu'en 2050, ce sont les premières décennies qui comptent le plus, et là les deux sont proches.

## La bande d'incertitude

La bande autour de l'effet du changement est la fourchette de 5 à 95 % de l'AGTP sur les 841 membres. Elle couvre l'incertitude sur la réponse du climat : sensibilité climatique, absorption de chaleur par l'océan, cycle du carbone, chimie du méthane et forçage.

Elle ne couvre pas l'incertitude sur les émissions par tonne d'aliment, sur les régimes ou sur l'alimentation animale, qui est sans doute plus grande. La fourchette réelle est donc plus large que celle affichée. L'option AR6 n'a pas de bande.

## Facteurs naturels seuls

Le graphique de température peut montrer le réchauffement dû aux seuls facteurs naturels. C'est la température que donne FaIR quand toutes les émissions humaines restent à leur niveau de 1750 : seuls le soleil et les volcans font alors varier le climat.

Sur 2010–2019, cela donne +0,06 °C (de −0,04 à +0,17). L'AR6 du GIEC (résumé à l'intention des décideurs du GT1, A.1.3, figure SPM.2) évalue la variation due aux facteurs naturels entre 1850–1900 et 2010–2019 entre −0,1 et +0,1 °C. Un test vérifie que la médiane se trouve dans cette fourchette.

La courbe plonge après les grandes éruptions, comme celle du Krakatoa en 1883, et reste proche de zéro après 2050. Sa fourchette comprend la variabilité interne de l'ensemble : c'est pourquoi une année isolée peut s'écarter de plus d'un dixième de degré.

Elle s'appelle « facteurs naturels seuls » et non « un monde sans humains ». La couverture des terres et tout ce qui précède 1750 restent tels quels, et l'homme avait déjà légèrement réchauffé la référence de 1850–1900. Le forçage solaire et volcanique futur est une valeur provisoire. Une grande éruption refroidirait le monde de quelques dixièmes de degré pendant un à trois ans, et personne ne peut la prévoir.

### Comment la courbe est calculée

`climate.json` contient cette courbe sous `naturalOnly`. Elle utilise le même ensemble et le même forçage naturel que toutes les autres simulations, de 1850 à 2100, par rapport à 1850–1900, en médiane et fourchette de 5 à 95 %. Chaque gaz émis est fixé aux émissions préindustrielles de la calibration, qui laissent sa concentration à sa valeur de 1750, et les émissions de CO₂ sont mises à zéro.

Le forçage est la variation de l'énergie que la Terre retient, qui la réchauffe. Le forçage naturel vient de fair-calibrate v1.4.1. C'est le fichier que l'exemple de FaIR publie à côté de la calibration, la moyenne de chaque année étant stockée à la fin de l'année.

- **Les volcans.** Le forçage volcanique est la série des Indicators of Global Climate Change 2022. Elle donne l'épaisseur optique des aérosols stratosphériques jusqu'à fin 2022, avec le sulfate et la vapeur d'eau de l'éruption du Hunga Tonga en 2022. Elle est maintenue à sa valeur de 2022 pour 2023, puis ramenée linéairement à sa moyenne de long terme, zéro, d'ici 2032.
- **Le soleil.** Le forçage solaire est le jeu de données solaires de CMIP6 (SOLARIS-HEPPA 3.2) : observé jusqu'en 2014, puis sa projection. Dans la projection, le cycle solaire 25 culmine en 2024 à +0,09 W/m². C'est ce que Forster et al. (2025) ont trouvé à partir des observations pour 2024 : +0,09 W/m², contre −0,02 W/m² au minimum de 2019. Le cycle observé a culminé en octobre 2024, avec un nombre de taches solaires lissé de 161, contre 116 pour le cycle 24. Le forçage a donc été laissé tel quel (voir « Pourquoi 2023 et 2024 ont été si chaudes » plus bas).

## Les températures des scénarios

Pour chaque avenir, la courbe de température totale vient des 841 membres de FaIR lancés sur l'une de trois trajectoires socio-économiques partagées (SSP), historique compris :

- SSP1-2.6 : atténuation forte ;
- SSP2-4.5 : voie intermédiaire, par défaut ;
- SSP3-7.0 : rivalité régionale, émissions élevées.

L'application montre la médiane et la fourchette de 5 à 95 % par rapport à 1850–1900. Le tableau donne les valeurs de FaIR lui-même. La référence de l'application y ajoute le forçage de la règle de 2020 sur le transport maritime, 0,04 °C aujourd'hui (voir « Pourquoi 2023 et 2024 ont été si chaudes »).

| Scénario | 2015–2024 | 2050 | 2100 |
| --- | --- | --- | --- |
| SSP1-2.6 | 1,20 °C (0,98–1,37) | 1,77 °C (1,35–2,30) | 1,76 °C (1,23–2,54) |
| SSP2-4.5 | 1,19 °C (0,97–1,37) | 1,90 °C (1,51–2,34) | 2,63 °C (1,94–3,63) |
| SSP3-7.0 | 1,17 °C (0,92–1,36) | 1,90 °C (1,51–2,32) | 3,54 °C (2,74–4,52) |

Le réchauffement observé sur 2015–2024 est de 1,27 °C dans HadCRUT5 et de 1,33 °C dans Berkeley Earth, tous deux ramenés ici à leur propre moyenne de 1850–1900. La médiane de FaIR est 0,08 °C sous HadCRUT5, dans sa fourchette, ce qu'un test vérifie. Les valeurs de 2100 sont proches des meilleures estimations de l'AR6 pour 2081–2100 : 1,8, 2,7 et 3,6 °C (tableau SPM.1).

### D'où viennent ces simulations et les courbes observées

Les émissions des scénarios sont celles de RCMIP v5.1.0. Chaque année civile est la moyenne des valeurs de FaIR à son début et à sa fin.

Les courbes observées sont l'analyse HadCRUT5 du Met Office (série annuelle mondiale, années complètes seulement) et Berkeley Earth Land + Ocean (annuelle, température de l'air au-dessus de la banquise). Chacune est décalée pour que sa moyenne de 1850–1900 soit nulle.

### Pour comparer : réchauffement récent, objectifs et budgets carbone

- **Le réchauffement d'origine humaine.** Forster et al. (2026) l'estiment à 1,37 °C en 2025, en hausse d'environ 0,27 °C par décennie.
- **Les années isolées.** L'OMM a placé 2024 à 1,55 ± 0,13 °C au-dessus de 1850–1900, la première année civile au-delà de 1,5 °C, et 2025 à 1,44 ± 0,13 °C. Au sens du GIEC, un niveau de réchauffement est une moyenne sur 20 ans : « la survenue d'années isolées où la variation de la température à la surface du globe dépasse un certain niveau ne signifie pas que ce niveau de réchauffement planétaire a été atteint » (rapport de synthèse de l'AR6, résumé à l'intention des décideurs, note 28).
- **L'Accord de Paris.** Son objectif (article 2.1 a) est de contenir le réchauffement « nettement en dessous de 2 °C par rapport aux niveaux préindustriels » et de poursuivre l'action menée pour le limiter à 1,5 °C.
- **Où mènent les politiques actuelles.** Elles mènent à environ 2,6 à 2,8 °C en 2100 : 2,7 °C selon le Climate Action Tracker (novembre 2026) et 2,8 °C selon le rapport 2026 du PNUE sur l'écart entre les besoins et les perspectives. C'est proche des 2,63 °C de SSP2-4.5 ici. Si tous les engagements sont tenus, neutralité carbone comprise, le réchauffement atteint environ 2,1 °C.
- **Les budgets carbone restants.** Pour une chance sur deux de rester sous 1,5, 1,7 et 2 °C, les budgets de CO₂ restants sont de 130, 500 et 1 050 Gt à partir du début de 2026 (Forster et al. 2026). Le Global Carbon Budget 2025 donne 170, 525 et 1 055 Gt au 1er janvier 2026. Ces budgets supposent une trajectoire pour les autres gaz : on ne peut donc pas les comparer un pour un avec des leviers qui réduisent surtout le méthane.

## Pourquoi 2023 et 2024 ont été si chaudes

HadCRUT5 place 2023 à 1,48 °C et 2024 à 1,55 °C au-dessus de 1850–1900 (Berkeley Earth : 1,54 et 1,62 °C). La médiane de FaIR sur SSP2-4.5 donne 1,29 et 1,30 °C, avec des fourchettes de 5 à 95 % de 1,03–1,51 et 1,05–1,55 °C. Les deux années se situent 0,19 et 0,25 °C au-dessus de la médiane, en haut de sa fourchette.

Plusieurs facteurs expliquent ensemble cet écart. FaIR en inclut certains et pas d'autres. Une fois ajoutés l'effet du transport maritime, El Niño et les changements des nuages, les températures observées des deux années sont celles qu'attend la littérature. Aucun facteur ne rend compte à lui seul de tout 2023.

### La tendance : dans le modèle

Les gaz à effet de serre, avant tout le CO₂ fossile, et le lent recul de la pollution de l'air sont dans les émissions de FaIR. Ils font monter la médiane d'environ 0,25 °C par décennie. C'est la partie qu'un choix de leviers peut changer.

### El Niño et La Niña : lissés

El Niño et La Niña sont des oscillations du Pacifique tropical. Elles déplacent la température mondiale d'une année donnée d'un ou deux dixièmes de degré, quelques mois après le pic dans le Pacifique. La médiane de FaIR les lisse.

2023 a commencé en La Niña, après trois hivers de La Niña, et s'est terminée en El Niño fort. 2024 est une année El Niño. Raghuraman et al. (2024) ont mesuré une hausse de 0,29 ± 0,04 °C de 2022 à 2023. Dans 64 modèles climatiques sans aucun changement de forçage, ils ont trouvé qu'un saut de plus de 0,25 °C se produit 1,6 % des années, et 10,3 % quand une longue La Niña laisse place à El Niño. Ils concluent que le pic lui-même n'a pas besoin de cause humaine, alors que le réchauffement de fond est humain. Forster et al. (2025) donnent jusqu'à 0,25 °C pour une telle bascule l'année de la transition.

Le graphique de température marque les années El Niño et La Niña sur la courbe observée (voir « Les années El Niño et La Niña » plus bas).

### Le soleil : dans le modèle

Le cycle solaire 25 est dans le forçage (voir « Facteurs naturels seuls » plus haut). Par rapport à un soleil maintenu à son minimum de 2019, il ajoute 0,02 °C à 2023, 0,025 °C à 2024 et 0,03 °C à 2025 dans la médiane de FaIR. C'est proche des 0,03 °C (0,01–0,05) et 0,04 °C (0,02–0,07) de Forster et al. (2025).

### L'éruption du Hunga Tonga : un léger refroidissement

L'éruption de janvier 2022 a injecté environ 0,5 Tg de dioxyde de soufre et quelque 146 Tg de vapeur d'eau dans la stratosphère. La vapeur d'eau réchauffe et le sulfate refroidit.

- L'évaluation de l'APARC (2025) trouve le forçage du sulfate environ dix fois plus fort que celui de la vapeur d'eau les deux premières années : −0,4 ± 0,1 W/m² net sur ces années. Elle trouve un refroidissement d'environ 0,05 °C, trop faible pour se distinguer de la variabilité naturelle.
- Une étude multimodèle donne −0,19 ± 0,06 W/m² pour 2022–2023 (Quaglia et al. 2026).
- Forster et al. (2025) estiment −0,02 °C avec FaIR.

Le forçage volcanique utilisé ici baisse de 0,10 W/m² en 2022 et y reste en 2023. Dans FaIR, cela refroidit 2023–2025 de 0,01 à 0,015 °C par rapport au forçage de 2021 maintenu jusqu'en 2024. L'éruption n'a pas causé la chaleur. La courbe des facteurs naturels seuls reste à 0,05–0,06 °C sur 2020–2025 : la hausse solaire est en partie compensée par l'éruption et par le retour du forçage volcanique à sa moyenne.

### La limite de 2020 sur le soufre du carburant des navires : absente des scénarios

Au 1er janvier 2020, l'Organisation maritime internationale a abaissé la teneur en soufre autorisée dans le carburant des navires de 3,5 % à 0,5 %. Le dioxyde de soufre du transport maritime est passé de 10,4 Mt en 2019 à 2,0 Mt en 2020, soit −81 % (CEDS, dans Forster et al. 2025). Le soufre des navires rend les nuages plus brillants, ce qui refroidit. En émettre moins réchauffe.

Les scénarios n'ont pas cette marche. RCMIP donne au transport maritime international de SSP2-4.5 une valeur tous les cinq ans : 9,2 Mt en 2015, 4,2 Mt en 2020 et 2,5 Mt en 2030. La baisse est donc étalée à partir de 2015 (5,2 Mt en 2019, 3,7 Mt en 2023). SSP1-2.6 a 4,5 Mt en 2020, et SSP3-7.0 9,2 Mt, sans aucune baisse.

À lui seul, FaIR réagit à peine à la règle. Avec le transport maritime maintenu à 9,2 Mt jusqu'en 2019 puis réduit de 80 % à partir de 2020, FaIR ne réchauffe 2023–2025 que de 0,002 à 0,003 °C (0,001–0,005) de plus. Il y a deux raisons :

- FaIR contient déjà la moitié de la baisse.
- Sa réponse aux aérosols dépend du dioxyde de soufre mondial total, environ 80 Mt, sans tenir compte du lieu d'émission. Or, par tonne, le soufre des navires éclaircit bien plus les nuages au-dessus de l'air pur de l'océan.

Les estimations publiées du forçage sont plus grandes :

- 0,12 W/m², avec environ 0,04 °C réalisés en 2023 dans FaIR (Gettelman et al. 2024) ;
- 0,139 ± 0,019 W/m² et 0,046 ± 0,010 °C en moyenne sur 2020–2029 dans UKESM1 (Jordan et Henry 2024) ;
- 0,14 ± 0,07 W/m² et 0,08 ± 0,03 °C après environ trois ans dans CESM2 (Quaglia et Visioni 2024) ;
- 0,2 ± 0,11 W/m² au-dessus des océans et environ 0,16 °C après quelque sept ans (Yuan et al. 2024).

Forster et al. (2025) les passent en revue à 0,08–0,14 W/m², soit environ 0,03 °C en 2023 et 0,04 °C en 2024 avec FaIR. Hansen et al. (2025) défendent environ 0,5 W/m² et une sensibilité climatique proche de 4,5 °C, une valeur isolée dans cette revue.

### Une planète plus sombre : hors de la médiane

Goessling, Rackow et Jung (2025) trouvent que le réchauffement humain et le début d'El Niño laissent environ 0,2 °C de la température de 2023 inexpliqués. Un albédo planétaire au plus bas explique cet écart. La Terre a renvoyé moins de lumière solaire, surtout parce qu'il y avait moins de nuages bas aux moyennes latitudes nord et sous les tropiques. Ils laissent ouverte la question de savoir s'il s'agit de variabilité interne, d'un air plus propre (celui des navires compris) ou d'une rétroaction des nuages bas qui apparaît avec le réchauffement. Schmidt (2024), dans un commentaire de Nature, a fait le même constat : environ 0,2 °C de 2023 restait inexpliqué par les facteurs connus, qui même ensemble n'en rendaient pas compte.

FaIR n'a pas de nuages propres. La rétroaction des nuages est comprise dans la sensibilité climatique de chaque membre, et un changement des nuages dû à la variabilité interne n'est pas dans sa médiane.

### La règle sur le transport maritime, ajoutée hors de FaIR

Retrouver le forçage publié demande d'ajouter un terme de forçage hors de l'ensemble calibré de FaIR, dont l'intensité des aérosols a été contrainte sur le réchauffement observé sans lui. Planetshift ajoute ce terme comme un écart à FaIR. Une copie peut le désactiver (`shippingSulphur2020`, voir « Où Planetshift s'écarte de FaIR » plus bas).

Ce qu'il ajoute, et son effet :

- **Le forçage.** À partir de 2020, il ajoute un forçage radiatif effectif de 0,12 W/m². C'est l'estimation de Gettelman et al. (2024), celle faite avec FaIR. Sa fourchette probable est de 0,08–0,14 W/m², celle que donnent Forster et al. (2025) dans leur revue des estimations ci-dessus. Les 0,2 W/m² de Yuan et al., au-dessus des océans seulement, et les 0,5 de Hansen et al. restent en dehors.
- **Dans le temps.** Chaque année, le forçage suit le CO₂ du transport maritime international du scénario par rapport à 2020, car le soufre qui n'est plus émis est proportionnel au carburant brûlé.
- **En température.** Il est traduit en température avec la réponse de FaIR à une année de forçage (voir [Énergie et transports](#method-sectors)). Le bas de la fourchette est associé à la réponse à 5 % et le haut à celle à 95 %. Le résultat est ajouté à la température de référence, donc à celle du scénario.
- **L'effet.** Sur SSP2-4.5, il réchauffe 2023 de 0,034 °C (0,014–0,056), 2024 de 0,037 °C (0,015–0,062) et 2030 de 0,047 °C (0,018–0,083). C'est proche des 0,03 et 0,04 °C de Forster et al. pour 2023 et 2024, et des 0,046 °C de Jordan et Henry sur 2020–2029. En 2050 et en 2100, il ajoute 0,054 et 0,067 °C sur SSP2-4.5, 0,043 et 0,030 sur SSP1-2.6, dont les navires brûlent moins de carburant, et 0,058 et 0,052 sur SSP3-7.0.
- **Ce qu'il ne change pas.** Il laisse inchangé le réchauffement évité par les leviers. Les simulations de FaIR elles-mêmes restent telles quelles : les températures des scénarios du tableau ci-dessus, les courbes d'AGTP et les causes du réchauffement ne l'incluent pas.

Quand il est désactivé, les scénarios gardent le SO₂ de leurs propres navires, réduit dès 2015, et la réponse de FaIR à celui-ci.

### Les années El Niño et La Niña

Les points sur la courbe observée viennent de l'Oceanic Niño Index (ONI) de la NOAA. Cet indice est une moyenne glissante sur trois mois de l'anomalie de température de surface de la mer dans la région Niño 3.4 du Pacifique tropical (5°N–5°S, 120°–170°O). Il est tiré de l'analyse ERSSTv6, par rapport à des périodes de référence de 30 ans centrées. La NOAA parle d'épisode El Niño ou La Niña quand l'indice reste à +0,5 ou −0,5 °C ou au-delà pendant cinq saisons consécutives qui se chevauchent.

Planetshift a besoin d'une étiquette par année civile. La valeur d'une année est la moyenne des douze saisons centrées d'octobre de l'année précédente à septembre (de SON de l'année précédente à ASO), car la température mondiale suit le Pacifique avec environ trois mois de retard. L'année est une année El Niño à +0,5 °C ou plus, une année La Niña à −0,5 °C ou moins, et neutre sinon.

Cette règle a été préférée à deux autres :

- la seule saison d'hiver (DJF), qui ferait de 2023 une année La Niña (−0,55 °C) alors qu'El Niño a réchauffé son second semestre ;
- la moyenne de l'année civile, qui ignore le décalage.

Elle donne 13 années El Niño et 16 années La Niña depuis 1951, la première année précédée de son automne. 1998, 2015, 2016, 2019 et 2024 sont des années El Niño, 2021 et 2022 des années La Niña, et 2023 (+0,14 °C) est neutre.

Depuis février 2026, l'indice officiel de la NOAA est l'ONI relatif, qui retranche le réchauffement de l'ensemble des tropiques. L'ONI est conservé pour sa longue série, et parce que c'est l'indice qu'utilisent les études citées plus haut.

## Pergélisol

Le sol de l'Arctique et des hautes montagnes contient environ deux fois plus de carbone que l'atmosphère. Ce carbone est gelé dans une terre qui n'a pas dégelé depuis des milliers d'années. À mesure que le monde se réchauffe, une plus grande partie dégèle, et des microbes décomposent la matière organique. Le carbone s'échappe sous forme de CO₂ et, là où le sol est gorgé d'eau, de méthane. Plus de réchauffement signifie plus de rejets, donc plus de réchauffement : c'est une rétroaction.

Planetshift propose cette rétroaction en option, activée par défaut. Quand elle est activée, l'avenir est plus chaud sans aucun levier, et le réchauffement évité par les leviers est un peu plus grand, car moins de réchauffement signifie moins de dégel.

### Les chiffres de l'AR6

L'AR6 du GIEC (groupe de travail I, chapitre 5, encadré 5.1, section 5.4.3 et figure 5.29) évalue ce qui est libéré d'ici 2100 par °C de réchauffement mondial :

- sous forme de CO₂ : 18 PgC (milliards de tonnes de carbone) par °C, de 3,1 à 41 (fourchette de 5 à 95 %) ;
- sous forme de méthane : une rétroaction de 2,8 PgCeq par °C, de 0,7 à 7,3.

Le PgCeq n'est pas le carbone du méthane. C'est le carbone de CO₂ qui aurait le même effet, l'unité qu'utilise l'AR6 pour comparer les rétroactions autres que le CO₂ au cycle du carbone. Au potentiel de réchauffement global à 100 ans (27 pour le méthane), un kilogramme de carbone émis sous forme de méthane (1,34 kg de CH₄) compte pour environ 9,8 kg de carbone sous forme de CO₂. Le méthane libéré est donc d'environ 0,28 PgC par °C (de 0,07 à 0,74).

`climate.json` donne les deux ensemble sous `permafrost` :

- 18,3 × 10¹² kg de carbone par °C (de 3,2 à 41,7 × 10¹²), en additionnant les extrémités des deux fourchettes ;
- dont 1,6 % libérés sous forme de méthane (`ch4Share`, 0,28 ÷ 18,3) ;
- `releaseYears`, 20 : la durée sur laquelle est étalé ce que libère un degré.

Les 2,8 ne sont pas le carbone du méthane. Lus ainsi, le méthane serait dix fois trop grand (13,5 % du carbone), et le réchauffement dû au pergélisol dans la référence en 2050 serait d'environ 0,10 °C au lieu d'environ 0,02 °C sur SSP2-4.5. Le méthane représente moins de 2 % du carbone, mais encore environ deux cinquièmes du réchauffement de la rétroaction en 2050 (0,009 sur 0,024 °C), parce que chaque kilogramme réchauffe beaucoup plus dans ses premières décennies.

### Comment le modèle l'utilise

La rétroaction est l'option *Pergélisol* de *Autres options*, activée par défaut (`pf=off` dans l'adresse la désactive). Quand elle est activée, le modèle (`app/src/levers/permafrost/`, un module de levier appelé par `run.ts`) la calcule deux fois : une fois sur la température de référence du scénario, et une fois sur la température avec les leviers.

1. Chaque année, la hausse de température depuis l'année précédente engage `kgCPerDegree` × cette hausse de carbone. Ce carbone est libéré uniformément sur les `releaseYears` années suivantes. La somme sur le passé donne ce qui est libéré chaque année. Une baisse de température ne restitue rien, car le carbone dégelé ne regèle pas. Seul ce qui est libéré à partir de l'année en cours est compté, mais cela comprend ce qu'engage le réchauffement des 20 années précédentes. Ce qui a été libéré avant aujourd'hui figure dans les observations sur lesquelles FaIR est contraint.
2. De ce qui est libéré chaque année, la part `ch4Share` est du méthane (kg C × 16/12 kg CH₄) et le reste du CO₂ (kg C × 44/12 kg CO₂).
3. Ce que libère la référence elle-même est convolué avec les courbes d'AGTP et ajouté à la température de référence : activer la rétroaction réchauffe donc l'avenir sans aucun levier. Ce que libère le scénario moins ce que libère la référence est une variation des émissions de CO₂ et de méthane comme une autre. Elle est convoluée avec les courbes d'AGTP du CO₂ et du CH₄ et ajoutée à la variation du réchauffement. Le réchauffement évité par les leviers signifie moins de dégel : la rétroaction rend donc le réchauffement évité un peu plus grand.
4. La fourchette associe la valeur basse de `kgCPerDegree` aux courbes de température et d'AGTP à 5 %, et la valeur haute à celles à 95 %. La bande de la référence s'élargit donc vers le haut.
5. Dans la répartition par levier du résumé, la variation de ce qui est libéré est répartie en proportion de la taille du réchauffement évité par chaque groupe de leviers, quel qu'en soit le signe (voir la page Leviers).

La température de référence est la température du scénario selon FaIR (`scenarioTemperature`, chaque bande avec la sienne), avec l'ajustement de la référence population et l'électricité supplémentaire des centres de données. La variation due aux leviers est le résultat du modèle lui-même. La rétroaction est donc calculée à partir de la température qu'elle modifie ensuite. Un seul passage suffit : la rétroaction de la rétroaction représente quelques pour cent d'un terme déjà petit.

### Quand le carbone est libéré

Étaler sur 20 ans ce que libère un degré revient à ce que le carbone libéré une année donnée corresponde à peu près à ce qu'engage le réchauffement d'une décennie plus tôt. Pour un monde qui se réchauffe régulièrement, ce qui est libéré d'ici 2100 est donc proche du chiffre par degré de l'AR6 appliqué au réchauffement de 2090 environ.

Ce décalage d'environ une décennie est une simplification. En réalité, le dégel se poursuit pendant des siècles après le réchauffement, et l'AR6 note qu'une grande partie de ce qu'engage ce siècle sera libérée après 2100.

Avec l'étalement sur 20 ans, ce qui est libéré de 2026 à 2100 sur SSP2-4.5 est d'environ 27 PgC. C'est proche des 18 PgC par °C de l'AR6 multipliés par le réchauffement encore à venir (environ 1,4 °C). Étaler sur 50 ou 100 ans change l'effet en 2050 de moins de 0,01 °C, parce qu'un étalement plus long fait aussi entrer un réchauffement plus ancien. La règle avance peut-être un peu ce qui est libéré : les bilans fondés sur les observations placent aujourd'hui la région du pergélisol près de l'équilibre.

### Pourquoi il ajoute peu d'ici 2100

La rétroaction ajoute environ 0,02 °C à la référence en 2050 et 0,05 °C en 2100 sur SSP2-4.5 (médianes). En 2100, elle ajoute 0,03 °C sur SSP1-2.6 et 0,07 °C sur SSP3-7.0, où le réchauffement qui fait dégeler le sol est plus grand. La fourchette est large : en 2100 sur SSP2-4.5, elle va de moins de 0,01 °C à 0,25 °C, car son haut associe la plus forte libération par degré de l'AR6 à la réponse du climat la plus chaude.

La médiane est faible pour quatre raisons :

- L'essentiel est libéré après 2100. Le carbone du pergélisol dégèle et se décompose sur des siècles, et le modèle s'arrête en 2100. La rétroaction continue de croître ensuite, même si les émissions s'arrêtent.
- Seul le réchauffement encore à venir compte, car ce qui a été libéré avant aujourd'hui est dans les observations. Cela donne les 27 PgC ci-dessus, environ 100 Gt de CO₂, soit deux ans et demi des émissions fossiles de CO₂ actuelles.
- Le dégel brutal (effondrement du sol, lacs thermokarstiques) manque à la plupart des modèles derrière le chiffre de l'AR6, et donc au modèle aussi. Il pourrait ajouter beaucoup à ce qui est libéré.
- La rétroaction est calculée en un seul passage : le dégel supplémentaire que causerait son propre réchauffement est laissé de côté. Il ajouterait quelques pour cent.

### Pourquoi c'est une option

- Le cycle du carbone de FaIR affaiblit déjà les puits terrestres et océaniques à mesure que le monde se réchauffe. Il est calibré sur des modèles du système Terre dont la plupart laissent le pergélisol de côté. Ajouter le pergélisol par-dessus est donc surtout nouveau. Mais la contrainte de la calibration sur le CO₂ observé en a peut-être absorbé un peu : une petite partie pourrait être comptée deux fois.
- La plupart des modèles du système Terre derrière les projections de l'AR6 laissent le pergélisol de côté. C'est aussi le cas des simulations d'émulateur calibrées sur eux, des températures des scénarios et des courbes d'AGTP utilisées ici. L'activer éloigne les résultats de Planetshift de ces chiffres publiés.
- La fourchette est large : un facteur dix entre ses extrémités. Le calendrier des rejets, leur part de méthane et leur réaction à une température qui baisse de nouveau sont mal connus. Le dégel brutal (effondrement du sol, lacs thermokarstiques) pourrait ajouter beaucoup aux rejets, et il manque dans la plupart des modèles derrière ce chiffre.

## Où Planetshift s'écarte de FaIR

Tout ce qui est sur cette page et sur celles des leviers est le calcul de FaIR avec son ensemble calibré, sauf en quelques endroits. Là, Planetshift ajoute ce que FaIR laisse de côté, ou remplace l'un de ses coefficients par celui de la littérature.

Chaque écart est un interrupteur nommé de `planetshift.config.json`, le fichier que règle une copie (fork) de Planetshift (voir `docs/app.md`). Le site utilise les valeurs ci-dessous, et une copie peut remettre chacun à FaIR tel quel. Les visiteurs ne voient pas ces interrupteurs.

| Écart | Sur ce site | FaIR tel quel | Expliqué dans |
| --- | --- | --- | --- |
| Où les NOx sont émis (`noxMethane`) | le méthane par kg de NOx des modèles de chimie eux-mêmes, sur terre et en mer (Hoor et al. 2009), porté par l'évolution de FaIR avec le scénario ; une copie peut aussi partager le coefficient de FaIR entre terre et mer selon leur rapport, son total mondial conservé (`hoor`) | un seul coefficient pour toutes les sources | [Énergie et transports](#method-sectors), [Limites](#method-limitations) |
| Les effets de l'aviation hors CO₂ (`aviationNonCo2`) | le forçage de Lee et al. (2021), traînées comprises, réduit par moins d'avion | les NOx, le SO₂ et la suie propres à l'aviation par les coefficients de FaIR ; FaIR n'a pas de traînées | [Énergie et transports](#method-sectors) |
| Pergélisol (`permafrost`) | proposé comme option, activée par défaut | l'option et son module retirés | Pergélisol, plus haut |
| La règle de 2020 sur le soufre des navires (`shippingSulphur2020`) | son forçage publié, 0,12 (0,08–0,14) W/m² à partir de 2020, ajouté à la référence | le SO₂ des navires des scénarios, par la réponse mondiale des aérosols de FaIR | Pourquoi 2023 et 2024 ont été si chaudes, plus haut |

### Ce qui change avec FaIR tel quel

Avec chaque interrupteur sur FaIR tel quel, sur SSP2-4.5 :

- moins d'avion à fond évite 0,007 °C en 2050 et 0,045 °C en 2100, au lieu de 0,054 et 0,122, car l'essentiel de son effet vient des traînées et FaIR n'en a pas ;
- les voitures électriques évitent 0,027 et 0,091 °C au lieu de 0,045 et 0,106, et dans SSP3-7.0 ajoutent 0,018 °C d'ici 2100 au lieu d'en éviter 0,054 ;
- les six leviers d'énergie ensemble évitent 0,164 et 0,532 °C au lieu de 0,263 et 0,646.

Sans la règle sur le transport maritime, la référence est plus fraîche de 0,037 °C en 2024 et de 0,067 °C en 2100. Les leviers agricoles ne bougent pas.

## Hypothèses

- Les courbes d'AGTP viennent d'impulsions sur SSP2-4.5 en 2035 et servent pour tous les scénarios et toutes les années. Les courbes de 2025 et 2045 sont à 7 % près.
- L'ensemble calibré est utilisé tel que publié, avec ses 841 membres, y compris sa variabilité interne stochastique (avec une graine fixe : identique dans les simulations appariées, elle s'annule dans les différences).
- Le méthane agricole est traité comme biogénique : pas de CO₂ issu de son oxydation.
- Le CO₂ agricole (urée et chaulage) est traité comme du CO₂ fossile dans FaIR.
- La réponse est traitée comme proportionnelle à la variation des émissions, ce que confirme le test de l'impulsion dix fois plus grande.
- Les émissions d'une année sont réparties uniformément sur l'année. La température d'une année civile est la moyenne des valeurs de FaIR à ses deux extrémités.
- Les séries observées sont ramenées à leur propre moyenne de 1850–1900. L'année en cours de HadCRUT5 est laissée de côté tant qu'elle n'est pas complète.
- Le forçage naturel et les émissions d'aérosols des scénarios sont utilisés tels que publiés. La règle de 2020 sur le transport maritime ajoute 0,12 (0,08–0,14) W/m² à partir de 2020 hors de l'ensemble de FaIR, en suivant le carburant des navires de chaque scénario, à la référence comme au scénario (voir « Pourquoi 2023 et 2024 ont été si chaudes »).
- Le pergélisol libère 18,3 (3,2–41,7) PgC par °C de réchauffement, dont 1,6 % sous forme de méthane, ce que libère chaque degré étant étalé sur 20 ans, sans rien restituer quand la température baisse. La rétroaction est activée sauf si l'option est désactivée.

## Sources

- FaIR, le modèle climatique Finite-amplitude Impulse Response, v2.2.5 : [github.com/OMS-NetZero/FAIR](https://github.com/OMS-NetZero/FAIR), [documentation](https://docs.fairmodel.net). Licence : Apache 2.0. Les fichiers de calibration sont lus dans ses données d'exemple à l'étiquette v2.2.5.
- fair-calibrate v1.4.1, le jeu de paramètres calibré et contraint : [doi:10.5281/zenodo.10566813](https://doi.org/10.5281/zenodo.10566813). Licence : CC BY 4.0.
- Protocole RCMIP v5.1.0, émissions des SSP avec leur historique : [rcmip.org](https://www.rcmip.org), [doi:10.5281/zenodo.4589756](https://doi.org/10.5281/zenodo.4589756), décrit dans [doi:10.5194/gmd-13-5175-2020](https://doi.org/10.5194/gmd-13-5175-2020). Licence : CC BY-SA 4.0.
- GIEC AR6 GT1, chapitre 7, *The Earth's Energy Budget, Climate Feedbacks and Climate Sensitivity*, et son matériel supplémentaire (7.SM.5, tableau 7.SM.7) : [doi:10.1017/9781009157896.009](https://doi.org/10.1017/9781009157896.009). Le code du chapitre : [github.com/IPCC-WG1/Chapter-7](https://github.com/IPCC-WG1/Chapter-7), licence MIT.
- Les sources que cite l'AR6 pour ses constantes : la réponse impulsionnelle du CO₂, [doi:10.5194/acp-13-2793-2013](https://doi.org/10.5194/acp-13-2793-2013) ; les ajustements du forçage des gaz à effet de serre, [doi:10.5194/gmd-13-3571-2020](https://doi.org/10.5194/gmd-13-3571-2020) ; la rétroaction climat-carbone dans les métriques d'émission, [doi:10.5194/esd-8-235-2017](https://doi.org/10.5194/esd-8-235-2017).
- GIEC AR6 GT1, chapitre 5, *Global Carbon and other Biogeochemical Cycles and Feedbacks*, encadré 5.1, section 5.4.3 et figure 5.29 (rétroaction du carbone du pergélisol) : [doi:10.1017/9781009157896.007](https://doi.org/10.1017/9781009157896.007).
- HadCRUT5 v5.2.0.0, Met Office Hadley Centre et Climatic Research Unit : [metoffice.gov.uk/hadobs/hadcrut5](https://www.metoffice.gov.uk/hadobs/hadcrut5/). Licence : Open Government Licence v3.
- Berkeley Earth Land + Ocean, résumé annuel mondial : [berkeleyearth.org/data](https://berkeleyearth.org/data/), décrit dans [doi:10.5194/essd-12-3469-2020](https://doi.org/10.5194/essd-12-3469-2020). Licence : CC BY-NC 4.0, usage non commercial seulement.
- GIEC AR6 GT1, résumé à l'intention des décideurs, A.1.3 et figure SPM.2 (facteurs naturels de −0,1 à +0,1 °C sur 2010–2019) : [doi:10.1017/9781009157896.001](https://doi.org/10.1017/9781009157896.001).
- GIEC (2023). *Climate Change 2023: Synthesis Report*, résumé à l'intention des décideurs, note 28 (niveaux de réchauffement en moyennes sur 20 ans) : [doi:10.59327/IPCC/AR6-9789291691647.001](https://doi.org/10.59327/IPCC/AR6-9789291691647.001).
- Forster, P. M. et al. (2026). Indicators of Global Climate Change 2025. *Earth System Science Data* 18, 3889 (réchauffement d'origine humaine en 2025, budgets carbone restants) : [doi:10.5194/essd-18-3889-2026](https://doi.org/10.5194/essd-18-3889-2026).
- Forster, P. M. et al. (2025). Indicators of Global Climate Change 2024. *Earth System Science Data* 17, 2641–2680 : [doi:10.5194/essd-17-2641-2025](https://doi.org/10.5194/essd-17-2641-2025).
- Organisation météorologique mondiale, communiqués sur la température mondiale de 2024 (janvier 2025) et de 2025 (14 janvier 2026) : [wmo.int](https://wmo.int).
- Nations unies (2015). Accord de Paris, article 2.1 a : [unfccc.int](https://unfccc.int/process-and-meetings/the-paris-agreement).
- PNUE (2026). *Emissions Gap Report 2026* : [unep.org/emissions-gap-report-2026](https://www.unep.org/emissions-gap-report-2026).
- Climate Action Tracker (2026). Mise à jour mondiale, 12 novembre 2026 : [climateactiontracker.org](https://climateactiontracker.org).
- Friedlingstein, P. et al. Global Carbon Budget 2025. *Earth System Science Data* 18, 3211 (2026) ; Global Carbon Budget 2026, prépublication, [doi:10.5194/essd-2026-895](https://doi.org/10.5194/essd-2026-895).
- NOAA Climate Prediction Center, Oceanic Niño Index (ERSSTv6) : [cpc.ncep.noaa.gov](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/oni/v6/), le tableau lu dans [oni.ascii.txt](https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt). Domaine public (œuvre du gouvernement des États-Unis) ; la NOAA ne cautionne pas cet usage.
- Smith, C. et al. (2024). fair-calibrate v1.4.1: calibration, constraining, and validation of the FaIR simple climate model for reliable future climate projections. *Geoscientific Model Development* 17, 8569–8592 (le forçage solaire et volcanique) : [doi:10.5194/gmd-17-8569-2024](https://doi.org/10.5194/gmd-17-8569-2024).
- Forster, P. M. et al. (2023). Indicators of Global Climate Change 2022: annual update of large-scale indicators of the state of the climate system and human influence. *Earth System Science Data* 15, 2295–2327 (le forçage volcanique) : [doi:10.5194/essd-15-2295-2023](https://doi.org/10.5194/essd-15-2295-2023).
- Matthes, K. et al. (2017). Solar forcing for CMIP6 (v3.2). *Geoscientific Model Development* 10, 2247–2302 : [doi:10.5194/gmd-10-2247-2017](https://doi.org/10.5194/gmd-10-2247-2017).
- SILSO, Observatoire royal de Belgique : le cycle solaire 25 a atteint son maximum en octobre 2024 : [sidc.be](https://sidc.be/article/solar-cycle-25-reached-its-maximum-october-2024).
- Raghuraman, S. P. et al. (2024). The 2023 global warming spike was driven by the El Niño–Southern Oscillation. *Atmospheric Chemistry and Physics* 24, 11275–11283 : [doi:10.5194/acp-24-11275-2024](https://doi.org/10.5194/acp-24-11275-2024).
- Goessling, H. F., Rackow, T. et Jung, T. (2025). Recent global temperature surge intensified by record-low planetary albedo. *Science* 387, 68–73 : [doi:10.1126/science.adq7280](https://doi.org/10.1126/science.adq7280).
- Schmidt, G. (2024). Climate models can't explain 2023's huge heat anomaly — we could be in uncharted territory. *Nature* 627, 467 : [doi:10.1038/d41586-024-00816-z](https://doi.org/10.1038/d41586-024-00816-z).
- Hansen, J. E. et al. (2025). Global warming has accelerated: are the United Nations and the public well-informed? *Environment: Science and Policy for Sustainable Development* 67(1) : [doi:10.1080/00139157.2025.2434494](https://doi.org/10.1080/00139157.2025.2434494).
- Gettelman, A. et al. (2024). Has reducing ship emissions brought forward global warming? *Geophysical Research Letters* 51, e2024GL109077 : [doi:10.1029/2024GL109077](https://doi.org/10.1029/2024GL109077).
- Jordan, G. et Henry, M. (2024). IMO2020 regulations accelerate global warming by up to 3 years in UKESM1. *Earth's Future* 12, e2024EF005011 : [doi:10.1029/2024EF005011](https://doi.org/10.1029/2024EF005011).
- Quaglia, I. et Visioni, D. (2024). Modeling 2020 regulatory changes in international shipping emissions helps explain anomalous 2023 warming. *Earth System Dynamics* 15, 1527–1541 : [doi:10.5194/esd-15-1527-2024](https://doi.org/10.5194/esd-15-1527-2024).
- Yuan, T. et al. (2024). Abrupt reduction in shipping emission as an inadvertent geoengineering termination shock produces substantial radiative warming. *Communications Earth & Environment* 5, 281 : [doi:10.1038/s43247-024-01442-3](https://doi.org/10.1038/s43247-024-01442-3).
- APARC (2025). *The Hunga Volcanic Eruption Atmospheric Impacts Report*, APARC Report No. 11, WCRP-10/2025, chapitre 7 (effets sur le climat) : [doi:10.34734/FZJ-2025-05244](https://doi.org/10.34734/FZJ-2025-05244).
- Quaglia, I. et al. (2026). Multi-model analysis of the impact of water vapor on the radiative forcing of volcanic aerosols after the 2022 Hunga Eruption. *Atmospheric Chemistry and Physics* 26, 7677–7704 : [doi:10.5194/acp-26-7677-2026](https://doi.org/10.5194/acp-26-7677-2026).
- Jenkins, S., Smith, C., Allen, M. et Grainger, R. (2023). Tonga eruption increases chance of temporary surface temperature anomaly above 1.5 °C. *Nature Climate Change* 13, 127–129 : [doi:10.1038/s41558-022-01568-2](https://doi.org/10.1038/s41558-022-01568-2).
