# Ville en relief et bannières — prototype natif local

## Direction confirmée

Marvin retient **Ville en relief + bannières**, puis demande son intégration dans l’application pour juger le rendu. La composition A — carte persistante, recherche et fiche dans le même panneau — reste la base. La [maquette](../../explorations/map-personality-20261014/02-bannieres.png) définit une direction ; elle ne promet ni façades détaillées ni reconstruction des toitures. Le prototype utilise la géographie IGN et des volumes issus des hauteurs disponibles, sans compléter les données inconnues.

## Implémentation actuelle

- Expo 57, React Native 0.86.3 et MapLibre React Native 11.5.0, avec le plugin Expo. La scène des groupes utilise MapLibre à la place de son ancien rendu `react-native-maps`.
- Fond vectoriel Plan IGN, décliné en jour et nuit, avec 18 couches. Les rues, eaux et communes restent nommées ; les noms de quartiers ont été retirés pour réduire la densité.
- Bâtiments issus de `bati_surf`, à partir du zoom 14. Le filtre conserve uniquement les valeurs `hauteur` strictement positives. En 3D, ces valeurs fournissent la hauteur en mètres et le pitch vaut 42°. En 2D, la hauteur d’extrusion et le pitch valent 0. Aucune hauteur de remplacement n’est créée.
- Bannières complètes de 172 × 96, ou 190 × 96 pour le groupe sélectionné. La plaque présente le nom puis le statut et l’âge. Sous le zoom 16, les autres groupes deviennent des drapeaux de 44 × 64 sans plaque. Le pied GPS garde l’ancrage `bottom-left` et le décalage `[-10, 6]` dans les deux variantes.
- Couleur et emblème identifient le groupe ; la pastille et le texte décrivent son statut. Les cinq emblèmes SVG sont réservés aux fixtures marquées `· démo`. Les autres groupes utilisent un monogramme et une couleur stables. Cette identité est reprise dans la liste et la fiche.
- Le nom, le statut et l’âge restent dans le libellé accessible même quand la plaque est masquée. Sur iOS, `ViewAnnotation` reçoit ce libellé dans son titre natif ; cela ne constitue pas une validation parlée VoiceOver.
- L’activation a un seul propriétaire : `ViewAnnotation.onPress` sur iOS, le `Pressable` de la bannière sur Android. Le gestionnaire arrête la propagation de l’événement pour empêcher qu’une sélection ne soit aussi traitée comme un appui sur la carte, qui replierait le panneau.
- La caméra répond aux demandes de cadrage et aux sélections, sans reprendre la vue à chaque nouveau point GPS. La vue d’ensemble garde une réserve droite de 104, augmentée de la zone sûre, sans ajouter une largeur de plaque complète.
- L’attribution IGN est accessible depuis la carte. Consulter les groupes ne demande pas la localisation personnelle.

L’échantillon de tuile étudié avant intégration comportait 613 polygones : 576 hauteurs positives, 4 hauteurs nulles et 33 absentes. Cette observation locale ne prouve pas une couverture uniforme de Pointe-à-Pitre ou de la Guadeloupe. Le GeoJSON WFS préparatoire n’est pas importé dans l’application ; le fond utilise les tuiles vectorielles.

## Vérifications réalisées

| Contrôle | Résultat et portée |
| --- | --- |
| TypeScript et ESLint | Passés sur l’implémentation locale. |
| Tests mobiles | 37 tests existants réussis ; ils ne prouvent pas les gestes natifs. |
| Tests backend | 39 tests Convex réussis à la reprise du 14 octobre ; le lint conserve deux avertissements dans `_generated`, sans erreur. |
| Styles cartographiques | Les quatre variantes jour/nuit × plat/relief passent le validateur MapLibre. |
| Build iOS | Réussi : `BUILD SUCCEEDED` dans `/tmp/omasla-local-20261014/xcode-maplibre.log`. |
| Installation | Client installé sur iPhone 17 et iPad Air 11 pouces M4, sous iOS 26.5. |
| Premier parcours natif | Rendu MapLibre confirmé ; recherche vers une fiche et bascule 2D/3D exercées avant les derniers ajustements. |
| Reprise native du 14 octobre vers 14 h | Après déverrouillage, l’activation de la bannière Tambour ouvre la fiche au cran intermédiaire, avec le bouton « Rejoindre ce point » visible. Après correction de la propagation, une seule sélection est reçue et aucun appui de carte ne replie le panneau. |
| Passage à plat après correction | Le rendu 2D supprime les volumes et conserve la fiche ouverte. Capture native `qa-20261014/phone-2d.png`. |
| Retour au relief | La bascule 2D→3D rétablit les volumes et le libellé « Passer à la carte à plat », sans fermer la fiche. |
| Recherche et retour | La saisie native de « Tambour » donne un résultat. La ligne ouvre la fiche au cran intermédiaire ; sa fermeture conserve la requête et le résultat dans le panneau agrandi. |
| Panneau accessible | L’action d’agrandissement fonctionne et le cran « Agrandi » est exposé dans l’arbre d’accessibilité. Le glissement physique n’a pas été reconfirmé. |
| Sources | Le bouton d’attribution ouvre le dialogue nommant IGN, BD TOPO et Licence Ouverte 2.0 ; sa fermeture a été exercée. Le lien externe n’a pas été ouvert dans ce contrôle. |

Le verrouillage du Mac vers 04 h 07 avait interrompu les gestes, qui ont repris le même jour vers 14 h après déverrouillage. Cette reprise a révélé une double sélection des bannières, suivie d’un appui de carte indésirable ; la correction décrite ci-dessus a été vérifiée dans le simulateur iPhone. L’instrumentation temporaire a été retirée après le contrôle.

La [revue de finition indépendante](finish-review.md) rend un verdict `ship` pour les deux vues finales de jour `phone-overview.png` et `tablet.png`. Ce verdict visuel ne valide pas les gestes et ne s’étend pas aux captures de reprise sans nouvelle revue. Les captures `qa-20261014/phone-selected.png` et `qa-20261014/phone-2d.png` documentent le rendu iPhone après correction. Toutes ces captures sont natives et sans retouche.

Les fichiers préfixés `first-pass-` et `diagnostic-`, les anciennes captures de composition A et les sorties de comparateur sont conservés localement hors du lot versionné. Ils ne représentent pas le résultat actuel et peuvent manquer dans un autre checkout. La sélection documentaire conserve les références approuvées `mocks/comparison-20261013/a.png` avec `a.json`, puis `explorations/map-personality-20261014/02-bannieres.png` avec `02-bannieres.json`, ainsi que `building-data-evidence.md` et `pointe-a-pitre-building-data.json` dans ce dernier dossier. Le GeoJSON WFS préparatoire inutilisé reste hors du code livré.

## Environnement et livraison

Worktree : `/Users/marvinl/Documents/DEV/oyo-webapp/.worktree/refonte-2027`, branche `refonte-2027`. Les modifications préexistantes sont conservées. Cibles locales : Expo sur `localhost:3186`, Next/Auth sur `localhost:3185`, Convex sur `127.0.0.1:3210`. Leur disponibilité doit être vérifiée au moment d’une reprise.

Simulateurs installés :

- iPhone 17 : `D9CBB86D-D069-4416-8240-3BE127882370`.
- iPad Air 11 pouces M4 : `CE224E84-2B51-40F5-81FD-39627165E705`.

Les groupes de démonstration sont fictifs. Lors de la reprise vers 14 h, Metro 3186, Next/Auth 3185 et Convex 3210 ont été rétablis. Le feed local réutilise les mêmes cinq identifiants de groupes et expire à 15 h 59, heure de Guadeloupe ; son fonctionnement après expiration n’est pas implicite. Marvin a autorisé la consignation sur `develop`, en préparation à cet état du rapport. Aucun push ni déploiement distant, aucun changement Linear.

## Limites restantes

Le glissement physique du panneau et le clavier logiciel n’ont pas été reconfirmés pendant la reprise de 14 h. La lecture parlée VoiceOver, Android, le comportement sur téléphone physique, le GPS terrain, la réception de notifications et l’authentification réelle ne sont pas validés par cette passe. Le verdict visuel actuel couvre seulement les deux vues de jour indiquées plus haut ; il ne couvre pas les variantes sombre ou texte agrandi. Une image native ne prouve ni les performances ni la disponibilité future du tuilage.

## Historique de reprise sous verrouillage

À 08 h 14–15 UTC, Metro 3186, Auth 3185 et Convex 3210 répondent HTTP 200 ; un abonnement WebSocket réel reçoit les sept groupes, dont cinq de démonstration. Aucun service n’a été redémarré ni aucune donnée reseedée. Un timeout ponctuel du catalogue à 04 h 13 est suivi de réponses réussies. Le simulateur iPhone a été relancé après un dialogue de lien profond ; les captures sous verrouillage ne permettent pas de valider son état interactif final. Les apparences des deux simulateurs ont été rétablies en clair.

Lors de cette passe matinale, la lecture du document YellowBrain via Google Drive a expiré (`Errno 60`, Operation timed out). Aucune écriture aveugle n’a été tentée ; les décisions et preuves de cette intégration sont conservées ici et dans DESIGN.md.
