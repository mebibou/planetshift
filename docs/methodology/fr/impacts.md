# Ce que signifie le réchauffement

Explorer donne le réchauffement que chaque avenir atteint, sans les leviers et avec eux. La carte *Ce que signifie le réchauffement* montre ce que le GIEC a évalué à ces deux niveaux de réchauffement. Cela couvre combien plus souvent reviennent les chaleurs extrêmes, les fortes pluies et les sécheresses, combien d'espèces sont menacées, et ce qu'il advient des récifs coralliens, de la glace de mer arctique et de la pêche. La carte donne aussi une étude sur les vagues de chaleur et la population. Ses valeurs viennent de `impacts.json`.

## Le réchauffement lu

Chaque avenir est lu à l'horizon (2050 ou 2100), à la moyenne sur 20 ans de son réchauffement médian centrée sur cette année. Le GIEC définit ainsi un niveau de réchauffement planétaire, et le graphique des températures utilise la même moyenne pour trouver l'année où un niveau de l'accord de Paris est franchi. En 2100 la moyenne est plus courte, car le calcul s'arrête là. Elle couvre 2090 à 2100. La carte donne le réchauffement des deux avenirs à côté de son titre, et de nouveau au-dessus des colonnes du tableau.

La fourchette du réchauffement donnée par le modèle climatique (5–95 %) n'est pas utilisée. Lire les impacts aux bords de cette fourchette mélangerait deux incertitudes différentes : celle du modèle climatique et celle des études d'impact. Le (i) de chaque ligne donne la fourchette propre à la source, au réchauffement de chaque avenir. Elle n'est jamais fondue avec celle du réchauffement.

## La lecture entre les niveaux

Chaque source a évalué ses impacts à quelques niveaux de réchauffement seulement. Entre deux niveaux, la carte interpole linéairement. Une sécheresse d'une fois en 10 ans revient 2,04 fois plus souvent à 1,5 °C et 2,38 fois à 2 °C. À 1,8 °C, à 60 % du chemin d'un niveau à l'autre, la carte donne 2,24 fois.

Quand une source donne une valeur et une fourchette, la carte interpole chacune séparément. Une fourchette ne s'élargit pas toujours quand le réchauffement augmente. Dans la figure SPM.6, le 95ᵉ centile de la fréquence des sécheresses vaut 7,68 à 3 °C et 7,21 à 4 °C, si bien que la fourchette se resserre entre les deux. Interpoler chaque borne séparément conserve ce resserrement.

La carte ne donne aucune valeur au-dessus du plus haut niveau ni en dessous du plus bas niveau qu'une source a évalué. Pour un avenir au-dessus, la carte indique *non évalué au-dessus de* ce niveau, et pour un avenir en dessous, *non évalué en dessous de*. Deux des sources (SR1.5 et l'étude sur les vagues de chaleur) s'arrêtent à 2 °C. Leurs impacts ne font que croître avec le réchauffement : récifs coralliens perdus, étés sans glace, aires perdues, prises perdues, personnes exposées. Pour un avenir au-dessus de 2 °C, la carte montre donc au moins la valeur à 2 °C, par exemple *≥ 99 %* des récifs coralliens, et le (i) de la ligne le dit. L'autre avenir, s'il est à 2 °C ou en dessous, est lu normalement. Avec tous les leviers en entier, un avenir à 1,7 °C peut alors être comparé à un avenir à 2,8 °C.

## Les sources

La carte montre d'abord six impacts, les mêmes à chaque horizon : les espèces terrestres, les récifs coralliens, l'Arctique sans glace, l'exposition aux vagues de chaleur, les chaleurs extrêmes d'une fois en 50 ans et les sécheresses. Là où un avenir est en dessous de ce qu'une source a évalué, la carte indique *non évalué en dessous de* ce niveau au lieu d'un chiffre, après les impacts qu'elle peut donner. Tous les impacts sont aussi dans un tableau replié en dessous. Ses lignes sont groupées par source, et chaque source donne les niveaux auxquels elle a été évaluée.

| Groupe | Lignes | Niveaux | Valeurs |
| --- | --- | --- | --- |
| GIEC AR6, groupe I, figure SPM.6 (panneaux a à d) | Chaleurs extrêmes sur les terres d'une fois en 10 et en 50 ans en 1850–1900 ; forte pluie sur un jour sur les terres d'une fois en 10 ans ; sécheresse agricole et écologique d'une fois en 10 ans, dans les régions qui s'assèchent | 1 ; 1,5 ; 2 ; 3 et 4 °C | Combien de fois plus souvent, la médiane des modèles CMIP6, avec leur fourchette 5–95 % |
| GIEC AR6, groupe II, RID B.4.1 (p. 14) | Espèces terrestres à très haut risque d'extinction | 1,5 ; 2 ; 3 ; 4 et 5 °C | Une fourchette : 3–14 %, 3–18 %, 3–29 %, 3–39 % et 3–48 % |
| GIEC SR1.5, RID B.3.1, B.4.1, B.4.2 (p. 8) et B.4.4 (p. 9) | Récifs coralliens perdus ; étés à Arctique sans glace ; insectes, plantes et vertébrés perdant plus de la moitié de leur aire ; prises de pêche en mer perdues | 1,5 et 2 °C | Récifs coralliens : un déclin supplémentaire de 70–90 % et de plus de 99 % ; un été sans glace par siècle et au moins un par décennie ; insectes 6 % et 18 %, plantes 8 % et 16 %, vertébrés 4 % et 8 % ; environ 1,5 et plus de 3 millions de tonnes par an |
| Dosio et al. (2018), section 3.4 (p. 6) | Personnes exposées à de fortes vagues de chaleur au moins une fois tous les 5 ans | 1,5 et 2 °C | 13,8 % (9,4–18,2 %) et 36,9 % (32,1–45,0 %) de la population mondiale |

Les valeurs de la figure SPM.6 viennent de ses données dans l'archive CEDA (doi:10.5285/93d1b84fbb144901809eaf67b35eb5c4, version v20210809, CC BY 4.0), les fichiers de fréquence de chaque panneau. La figure trace la médiane et la fourchette 5–95 % des modèles, et la carte montre la même chose. La ligne des sécheresses porte sur l'humidité des sols dans les régions qui s'assèchent.

Les autres valeurs sont écrites dans `pipeline/impacts.csv`, chacune avec son paragraphe et sa page. Quand le GIEC donne une borne inférieure, la carte prend cette borne comme valeur. Plus de 99 % des récifs coralliens est montré comme 99–100 %, au moins un été sans glace par décennie comme 10 sur 100, et plus de 3 millions de tonnes comme 3 millions. Le (i) de chaque ligne le dit. Les étés sans glace sont comptés en étés sur 100, pour qu'un par siècle et un par décennie puissent être interpolés sur la même ligne.

La ligne des vagues de chaleur n'est pas une conclusion du GIEC. Elle vient d'une étude, Dosio et al. (2018), citée par le World Resources Institute parmi les différences entre 1,5 °C et 2 °C. Elle garde la même population, celle de SSP3, aux deux niveaux : ses parts ne suivent donc pas la population du scénario de Planetshift. Sa fourchette est l'écart entre les sept modèles de l'étude.

## Ce qui est laissé de côté

Les dommages économiques sont laissés de côté : leurs estimations dépendent de choix sur la croissance, l'adaptation et l'actualisation que la carte ne pourrait pas montrer. Le niveau de la mer et l'acidité des océans changent lentement après le réchauffement et demandent leurs propres résultats, pas une ligne lue à un niveau de réchauffement. Le résumé en a un pour le niveau de la mer, la hausse que les leviers évitent (voir [la page sur la température](#method-climate)). Le pH de l'océan a son propre graphique (voir [la page sur la température](#method-climate)).

Les impacts sont mondiaux. Ils ne disent pas où tombent la chaleur, la pluie ou la sécheresse, ni qui les subit.

Les valeurs du GIEC sont citées telles que publiées, avec leur paragraphe et leur page. Le texte des rapports n'est pas repris.
