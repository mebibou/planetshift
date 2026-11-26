# Réduction des HFC

Les hydrofluorocarbures (HFC) sont les gaz des réfrigérateurs, des congélateurs, des climatiseurs et des pompes à chaleur, et de certaines mousses, aérosols et extincteurs. Ils ont remplacé les gaz qui abîmaient la couche d'ozone, mais la plupart retiennent des milliers de fois plus de chaleur que le CO₂ par kg. Le HFC-23 est à part : c'est un sous-produit de la fabrication d'un autre produit chimique, le HCFC-22. En 2024, les HFC des scénarios atteignent 1,26 milliard de tonnes de CO₂e par an. Planetshift propose un levier pour les réduire. À 100 % de 2026 à 2035, il évite 0,023 °C de réchauffement en 2050 et 0,055 °C en 2100 (médiane, SSP2-4.5).

L'amendement de Kigali au protocole de Montréal (2016) les réduit déjà. D'ici la fin des années 2040, il réduit l'usage de chaque pays d'environ 80 à 85 %. Le GIEC estime le potentiel de l'ensemble des gaz fluorés à 1,24 milliard de tonnes de CO₂e par an en 2030, dont 0,94 milliard à moins de 20 $ la tonne (AR6 GTIII, tableau 12.SM.1.2).

## Les HFC de chaque scénario

FaIR fait tourner onze HFC : les HFC-125, -134a, -143a, -152a, -227ea, -23, -236fa, -245fa, -32, -365mfc et -43-10mee. Leurs émissions sont celles que fait tourner le FaIR de l'application : l'historique de la calibration de FaIR jusqu'en 2022, puis celles de chaque scénario (RCMIP v5.1.0). En milliards de tonnes de CO₂e par an, avec le PRG100 de l'AR6 (2024 / 2035 / 2050 / 2100) :

| Scénario | 2024 | 2035 | 2050 | 2100 |
| --- | --- | --- | --- | --- |
| SSP1-2.6 | 1,17 | 0,72 | 0,15 | 0,18 |
| SSP2-4.5 | 1,26 | 1,60 | 1,39 | 1,54 |
| SSP3-7.0 | 1,25 | 1,70 | 2,06 | 2,81 |

L'essentiel vient des HFC-125, HFC-134a et HFC-143a, les gaz des mélanges réfrigérants. Dans SSP2-4.5 en 2050, ils atteignent 190, 136 et 72 milliers de tonnes.

Les scénarios ont été faits avant l'amendement de Kigali, mais chacun réduit déjà les HFC. Velders et al. (2022) projettent des émissions de HFC en 2050, hors HFC-23, de 4,0 à 5,3 milliards de tonnes de CO₂e par an sans aucun contrôle. Avec l'amendement de Kigali, ils en projettent 0,9 à 1,0. Les deux utilisent les PRG de l'OMM de 2018, environ 10 % sous ceux de l'AR6. La part de cet écart que fait chaque scénario en 2050 :

- SSP1-2.6 va au-delà de l'amendement de Kigali (122 % du chemin entre l'absence de contrôle et Kigali) ;
- SSP2-4.5 en est proche (92 %), mais ses HFC repartent à la hausse après 2050 ;
- SSP3-7.0 en fait environ les trois quarts (75 %).

Le levier ajoute donc le plus dans SSP3-7.0 et le moins dans SSP1-2.6. Le graphique Causes du réchauffement montre le réchauffement des HFC dans chaque scénario. Dans SSP2-4.5, il est de 0,043 °C en 2050 et de 0,069 °C en 2100.

## Le levier

- **Réduction des HFC** (`hfc`) : des HFC remplacés par des gaz qui réchauffent bien moins (ammoniac, CO₂, hydrocarbures, HFO), moins de fuites, des réfrigérants récupérés en fin de vie des appareils, et le HFC-23 détruit là où il est produit. À 100 %, les émissions de chaque HFC baissent de 90 %, chaque année une fois la montée terminée. C'est la baisse la plus forte d'En-ROADS. L'amendement de Kigali réduit lui-même l'usage d'environ 80 à 85 % d'ici la fin des années 2040, et les émissions des gaz déjà dans les appareils baissent plus tard que leur usage.

Comme chaque levier, il monte de l'année en cours jusqu'à l'année choisie dans *Tous les leviers en place en*.

## Onze gaz comme un seul

Le reste du modèle n'a qu'un HFC : le HFC-134a. C'est le réfrigérant de la chaîne du froid (voir [Émissions](#method-emissions)), et le FaIR de l'application ne change que lui. La durée de vie des HFC va de 1,6 an (HFC-152a) à 228 ans (HFC-23), avec 5,4 ans pour le HFC-32. Les compter comme du HFC-134a selon leur PRG100 donnerait le bon CO₂e, mais un réchauffement faux dans le temps. La baisse d'un gaz de courte durée compterait comme si elle durait 14 ans, et celle du HFC-23 cesserait de compter des décennies trop tôt.

Le levier transforme plutôt sa baisse en flux de HFC-134a de même forçage, année après année. Dans FaIR, chaque HFC est une seule boîte de durée de vie fixe, et son forçage est sa concentration multipliée par son efficacité radiative, avec une même échelle pour tous. Pour chaque HFC $i$, le forçage de sa baisse à la fin de l'année $y$, en kg de HFC-134a, est donc

$$B_i(y) = d_i\,B_i(y-1) + r_i\,\Delta E_i(y)$$

avec $\Delta E_i$ sa baisse en kg, $d_i$ la part de sa charge qui reste après un an, et $r_i$ le forçage qu'ajoute un kg émis à la fin de l'année, rapporté à celui du HFC-134a. Les deux viennent de la calibration de FaIR (`cycles` dans `hfc.json`). Le flux de HFC-134a de même forçage est alors

$$S(y) = \frac{\sum_i B_i(y) - d_{134a} \sum_i B_i(y-1)}{r_{134a}}$$

C'est exact dans FaIR : un test fait tourner les cycles des gaz de FaIR sur les deux et trouve le même forçage. C'est exact aussi pour les réponses aux impulsions de l'AR6, qui sont linéaires. Il ne faut aucun passage de FaIR de plus, car FaIR change déjà le HFC-134a. Une baisse du HFC-23 devient un flux qui croît pendant des décennies, comme son forçage.

FaIR ne laisse pas les émissions d'un gaz passer sous zéro. Le flux de HFC-134a n'a pas cette limite : il tient lieu de tous les HFC, et peut donc passer sous les émissions propres du HFC-134a.

Le CO₂e est la seule chose que le flux ne donne pas. Les émissions évitées comptent chaque HFC à son propre PRG100, pas à celui du flux.

## Les réfrigérants de la chaîne du froid

Les leviers alimentaires réduisent déjà les réfrigérants de la chaîne du froid, comptés comme du HFC-134a (voir [Émissions](#method-emissions)). Ils font partie des HFC du scénario. Le levier réduit donc sa part de ce que laissent les leviers alimentaires : les HFC du scénario, moins les réfrigérants que le changement d'alimentation et la baisse du gaspillage ont déjà retirés. Ensemble, les leviers alimentaires et la réduction des HFC évitent moins que la somme de chacun seul. Le recouvrement n'est compté qu'une fois.

Dans la répartition par groupe de leviers, la réduction des HFC est un groupe agricole, comme les décharges et eaux usées, car elle agit sur ce que laissent l'alimentation et la baisse du gaspillage. Le recouvrement est partagé entre les groupes selon leur valeur de Shapley (voir [Leviers](#method-levers)). Avec le changement d'alimentation en entier, la part de la réduction des HFC en 2100 passe de 0,055 °C seule à 0,046 °C.

## Dans l'application

Dans la section Leviers, le volet **Réduction des HFC** porte le curseur. Il se trouve sous *Autres émissions humaines*, la cause où le réchauffement des HFC est compté. Dans la répartition par levier, son effet compte comme *Réduction des HFC*. Ses HFC sont dans les émissions évitées, en CO₂e. Les scénarios ne donnent les HFC que pour le monde entier : le levier n'a pas de couche sur la carte.

`hfc.json` contient les données. Le code est `pipeline/planetshift_pipeline/hfc.py`, et le module du levier est `app/src/levers/hfc/`.

## Résultats

Le réchauffement évité en °C, en médiane avec la fourchette probable entre parenthèses. Le levier est à 100 % de 2026 à 2035, sur les données réelles avec les options par défaut.

| Scénario | 2050 | 2100 |
| --- | --- | --- |
| SSP2-4.5 | 0,023 (0,017–0,031) | 0,055 (0,038–0,086) |
| SSP1-2.6 | 0,007 | 0,008 |
| SSP3-7.0 | 0,027 | 0,085 |

En 2035, il évite 1,44 milliard de tonnes de CO₂e par an dans SSP2-4.5. Dans SSP1-2.6, les HFC du scénario ont presque disparu en 2050 : il reste peu à réduire.

## Hypothèses

- Les HFC sont ceux de chaque scénario, tels que FaIR les fait tourner, chaque année.
- À adoption complète, 90 % des émissions de chaque HFC disparaissent, chaque année et dans chaque scénario.
- Le levier réduit les réfrigérants de la chaîne du froid de la même part que les autres HFC.

Le HFC-23 des scénarios est faible : 1,7 millier de tonnes en 2024, presque plus rien en 2050. Les mesures atmosphériques en montrent environ 16 milliers de tonnes en 2018 (Stanley et al. 2020). Le levier manque donc sans doute une partie de ce qu'éviterait la destruction du HFC-23.

## Sources

- Protocole RCMIP v5.1.0, émissions des SSP : [doi:10.5281/zenodo.4589756](https://doi.org/10.5281/zenodo.4589756). Licence : CC BY-SA 4.0.
- FaIR v2.2.5 et sa calibration v1.4.1 : [doi:10.5281/zenodo.10566813](https://doi.org/10.5281/zenodo.10566813). Licence : Apache 2.0 (modèle), CC BY 4.0 (calibration).
- Velders, G. J. M., Daniel, J. S., Montzka, S. A., et al. (2022). Projections of hydrofluorocarbon (HFC) emissions and the resulting global warming based on recent trends in observed abundances and current policies. Atmospheric Chemistry and Physics 22, 6087–6101, [doi:10.5194/acp-22-6087-2022](https://doi.org/10.5194/acp-22-6087-2022).
- Stanley, K. M., Say, D., Mühle, J., et al. (2020). Increase in global emissions of HFC-23 despite near-total expected reductions. Nature Communications 11, 397, [doi:10.1038/s41467-019-13899-4](https://doi.org/10.1038/s41467-019-13899-4).
- GIEC (2021). Climate Change 2021: The Physical Science Basis, Groupe de travail I, matériel supplémentaire du chapitre 7, tableau 7.SM.7 (PRG100).
- GIEC (2022). Climate Change 2022: Mitigation of Climate Change, Groupe de travail III, matériel supplémentaire du chapitre 12, tableau 12.SM.1.2.
