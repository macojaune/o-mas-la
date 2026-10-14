# Prototype local de navigation

La refonte visuelle commencée le 13 octobre 2026 se développe dans `refonte-2027`, uniquement en local. Sa consignation sur `develop` est en préparation à la demande de Marvin, sans push ni déploiement. La carte reste montée pendant la recherche et la sélection d’un groupe ; la fiche remplace le contenu du panneau. Le compte et la déclaration s’ouvrent au-dessus de cette scène. La version tablette utilise un panneau latéral.

## Démarrer Expo

Le backend Convex local et Next/Auth doivent déjà tourner selon `../../../docs/development.md`. Depuis la racine du worktree :

```sh
REACT_NATIVE_PACKAGER_HOSTNAME=localhost pnpm --filter @oyo/nextjs with-env pnpm --filter @oyo/expo dev --dev-client --localhost --port 3186 --max-workers 1
```

Sur ce Mac, `--localhost` écoute sur `::1` tandis qu’Expo produit par défaut une URL de bundle `127.0.0.1`. La variable ci-dessus maintient le manifeste et son bundle sur `localhost`. `http://localhost:3186/status` doit répondre `packager-status:running`.

L’app iOS de développement utilise `com.marvinl.omasla`. Après installation du dev-client, ouvrir l’URL suivante dans le simulateur choisi :

```sh
xcrun simctl openurl <UDID> 'exp+omasla-app://expo-development-client/?url=http%3A%2F%2Flocalhost%3A3186'
```

Le lanceur de développement installé accepte également ce démarrage direct, qui évite le dialogue iOS d’ouverture d’URL et désactive seulement son bouton flottant de développement :

```sh
xcrun simctl launch --terminate-running-process <UDID> com.marvinl.omasla --initialUrl 'http://localhost:3186?disableOnboarding=1&disableAutoLaunch=1&disableFab=1'
```

Les changements de JavaScript passent ensuite par Metro. Une nouvelle dépendance native exige une nouvelle compilation du dev-client. Un navigateur web ne valide pas la carte native.

## Scène fictive

Avec le watcher Convex local déjà actif :

```sh
node packages/convex/scripts/demo-local.mjs start
node packages/convex/scripts/demo-local.mjs status
node packages/convex/scripts/demo-local.mjs stop
```

Le script refuse les déploiements cloud et les surcharges de destination. Cinq groupes `· démo` couvrent live récent, observation récente, observation ancienne et absence de position. Le feed est borné à deux heures et peut être arrêté explicitement ; il utilise les horodatages réels du serveur. Les positions et les valeurs de politique sont purement illustratives. Le bandeau de l’app les identifie comme simulées. Les fixtures du smoke test restent séparées.

## Parcours de validation native

- Carte au démarrage, sélection d’un repère, source/heure et navigation externe vers le point daté.
- Recherche avec clavier, filtre live, aucun résultat et retour à la même liste après fermeture de fiche.
- Groupe sans position : aucune navigation inventée ; contribution disponible uniquement hors live et avec connexion.
- Compte et déclaration : fermeture ramenant au contexte de carte ; aucune permission GPS à la seule consultation.
- Localisation au geste, permission refusée et possibilité de réessayer.
- Thèmes clair/sombre, texte agrandi, iPhone et iPad.
- Lecture VoiceOver des lignes et boutons ; panneau ajustable avec libellés français.

Le compte Apple/Google et l’envoi réel d’e-mail restent à configurer. Les essais de ce prototype ne prouvent ni l’authentification réelle chez ces fournisseurs, ni la fiabilité du GPS en sortie, ni les performances sur un téléphone physique.

## Preuves et limites du 13 octobre 2026

Les captures, diagnostics et comparateurs historiques cités dans cette section et dans celle de composition A sont conservés sur le Mac, hors du lot versionné. Ils peuvent manquer dans un autre checkout. Les références retenues sont la maquette `mocks/comparison-20261013/a.png` et son sidecar `a.json`, puis `explorations/map-personality-20261014/02-bannieres.png` et son sidecar. Les preuves actuelles du moteur MapLibre sont recensées dans le rapport d’intégration en fin de document.

Le client Debug a été compilé, installé puis réellement affiché sur iPhone 17 et iPad Air 11 pouces M4, avec iOS 26.5. Les captures natives, sans retouche, sont conservées dans `../.impeccable/review/`. Les contrôles TypeScript, ESLint et les 37 tests mobiles de logique métier sont passés ; les dépendances Expo sont compatibles. Metro répond sur `localhost:3186`, Next/Auth sur `localhost:3185` et Convex sur `127.0.0.1:3210`.

La session macOS était verrouillée pendant cette passe. L’outil de contrôle ne pouvait pas accéder à la fenêtre Simulator (`cgWindowNotFound`). Les captures prouvent le rendu, sans valider les gestes, le clavier, VoiceOver, la sélection d’un groupe, les modales ni les permissions. Le détail n’a pas été capturé : le lien profond provoquait un dialogue système. Ces parcours doivent encore être exercés après déverrouillage.

Le premier client avait été construit avec la signature désactivée et n’embarquait pas les droits simulés injectés normalement par Xcode. Cela provoquait `ERR_NOTIFICATIONS_KEYCHAIN_ACCESS` dans Expo Notifications. La correction est vérifiée : le build Simulator standard, sans certificat Apple personnel ni surcharge des réglages de signature, a réussi ; les sections `__entitlements` et `__ents_der` sont présentes et la signature est valide. Trois relances iPhone et un lancement iPad n’affichent plus cette erreur ni LogBox. Les quatre captures finales ont été remplacées sans retouche. Ce contrôle ne valide pas la réception de notifications push.

La revue a conduit à adapter le cadrage à la hauteur du panneau et au texte agrandi, permettre aux filtres de passer sur deux lignes et retirer la commande d’agrandissement sans effet sur iPad. Le verdict et ses limites sont conservés dans `../.impeccable/review/finish-review.md` ; les gestes et les parcours restent à valider après déverrouillage du Mac.

Le renouvellement des fixtures a aussi été renforcé après un timeout local : la prochaine exécution est programmée indépendamment de la mutation des positions. Deux lectures espacées de plus de 30 secondes ont vérifié leur renouvellement, et les deux groupes de smoke test existants ont été préservés.


## Composition A — approbation et validation du 14 octobre 2026

Marvin a retenu **A — Recherche et fiche dans un seul panneau bas**. La référence approuvée est `../.impeccable/mocks/comparison-20261013/a.png`. La recherche est persistante dans le panneau, la liste devient la fiche sans quitter la carte et la fermeture retrouve la requête. Le haut de la scène conserve le nom discret et le compte. Les trois crans du téléphone deviennent une colonne latérale sur iPad. La fiche regroupe statut/source/âge, nomme le « Référent GPS » et propose « Rejoindre ce point » avec la limite du dernier point connu. Les règles de contribution restent celles du produit.

Le client iOS existant est utilisé avec Metro ; ces changements JavaScript n’ont pas nécessité une nouvelle compilation native. Les vérifications ci-dessous sont locales et utilisent cinq groupes fictifs explicitement identifiés. Aucun commit, push, merge ni déploiement n’est associé à cette passe.

| Contrôle | Preuve et limite |
| --- | --- |
| Recherche et retour | La saisie de « Tambour » via le champ natif filtre la liste ; la sélection ouvre la fiche et la fermeture conserve la requête. La recherche « zzz » affiche zéro résultat et « Voir tous les groupes » ramène au catalogue. Le clavier logiciel n’a pas été obtenu par le contrôle de Simulator ; sa géométrie reste à tester. |
| Panneau | Glissement physique du cran réduit au cran intermédiaire et actions accessibles de réduction/agrandissement exercés. Le cran est exposé dans l’arbre d’accessibilité ; aucune lecture parlée VoiceOver n’en est déduite. |
| Carte et fiche | Le cadrage attend le retour du panneau au cran intermédiaire et laisse le groupe visible dans les rues de Pointe-à-Pitre. Le suivi live masque la contribution. La fiche Horizon sans position n’affiche aucun bouton Rejoindre ; seule la contribution est proposée. |
| iPad | Catalogue, filtre live avec deux résultats et fiche du groupe exercés dans le panneau latéral. |
| Navigation externe | « Rejoindre ce point » ouvre Plans. La permission de localisation a été refusée ; le trajet complet, sa qualité et l’arrivée au groupe ne sont pas validés. |
| Thème et texte | Captures natives clair/sombre. Le passage à chaud de la taille normale au texte maximal a révélé une mesure ancienne des textes ; la clé `fontScale` de `Label` et du texte de `Button` renouvelle cette mesure. La capture corrigée et l’accès au bouton après défilement ont été contrôlés, puis le retour à la taille normale sans relance : plus de caractères coupés et requête conservée. |
| Contrôles code | TypeScript, ESLint et les 37 tests mobiles passent après la correction de mesure des textes. `git diff --check` passe également ; ces contrôles ne remplacent pas les essais de gestes. |

Les captures sans retouche sont dans `../.impeccable/review/composition-a/` : `phone-detail.png`, `phone-dark.png`, `phone-detail-after-drag.png`, `ipad-catalog.png`, `ipad-detail.png`, `phone-large-text-fixed.png`, `phone-large-text-action.png`, `phone-no-position.png` et `phone-catalog.png`. `phone-large-text.png` conserve le défaut observé avant correction ; les variantes de diagnostic ne doivent pas être prises pour le résultat final.

**Comparaison Impeccable.** Le passage automatique reste ouvert à la phase `hero`. Son score de 59,5 % repose sur des régions incorrectement découpées (recherche, source et note notamment) et sur une géographie générée comparée à une carte MapKit interactive. Il ne constitue ni une note de qualité de la composition ni un contrôle réussi. La capture native canonique `hero-repro.png` a été déposée, sans fermer le gate ; le rapport final `diff/final/report.json` manque encore. Les captures et la revue de composition restent les preuves utilisables.

**Revue de finition historique.** La revue locale `../.impeccable/review/composition-a/finish-review.md`, hors du lot versionné, rend un verdict `fix` : aucun défaut visuel matériel restant dans les captures examinées, mais la preuve du clavier logiciel et la clôture documentaire du comparateur restent ouvertes. Aucune reconstruction de la composition n’est demandée.

**À vérifier séparément.** Clavier logiciel, lecture parlée VoiceOver, parcours Android, authentification réelle Google/Apple/e-mail et GPS sur le terrain. La validation humaine finale de la refonte reste distincte de ces contrôles du prototype.


## Ville en relief + bannières — intégration native du 14 octobre 2026

Après le choix de la composition A, Marvin a retenu la direction **Ville en relief + bannières** et demandé son intégration locale. La scène des groupes utilise MapLibre React Native 11.5.0, les tuiles vectorielles Plan IGN et une palette jour/nuit. Les bâtiments proviennent de `bati_surf` avec une hauteur IGN strictement positive ; aucune hauteur inconnue n’est complétée. Le mode 2D met le pitch et les extrusions à zéro ; le mode 3D utilise le pitch 42° et les hauteurs disponibles.

Les bannières gardent un pied ancré au point GPS. La plaque complète affiche le nom, puis le statut et l’âge. Sous le zoom 16, les groupes non sélectionnés deviennent des drapeaux compacts sans plaque ; leurs informations restent accessibles et la sélection garde la plaque complète. Les emblèmes SVG sont réservés aux cinq groupes fictifs identifiés comme démo. Les autres groupes gardent des monogrammes stables. Le même emblème apparaît dans la liste et la fiche, sans changer les règles de contribution ou de fraîcheur.

Le build iOS a réussi et le client a été installé sur iPhone 17 et iPad Air 11 pouces M4. Le rendu natif, la recherche vers une fiche et la bascule 2D/3D ont été observés lors d’une première passe. TypeScript, ESLint, les 37 tests mobiles existants et les quatre variantes de style jour/nuit × plat/relief passent leurs contrôles.

La session Mac s’est reverrouillée vers 04 h 07, pendant les derniers ajustements des plaques, des drapeaux compacts et du cadrage. La revue visuelle indépendante rend un verdict `ship` limité aux captures finales de jour `phone-overview.png` et `tablet.png`. Les essais de gestes ont ensuite repris après déverrouillage, le 14 octobre vers 14 h.

Cette reprise a révélé une double activation d’une bannière : le `Pressable` et l’annotation déclenchaient chacun la sélection, puis l’événement natif remontait vers la carte et repliait le panneau. Sur iOS, `ViewAnnotation.onPress` possède désormais seul la sélection et appelle `stopPropagation()`. Sur Android, le `Pressable` conserve ce rôle, sans doublon dans `Marker` ; ce chemin Android n’a pas été exercé sur appareil. Après correction, l’activation native de la bannière Tambour déclenche une seule sélection et laisse la fiche au cran intermédiaire, avec son action visible. Le passage à plat supprime les volumes et conserve la fiche. Les captures sans retouche sont `qa-20261014/phone-selected.png` et `qa-20261014/phone-2d.png` dans le dossier du rapport.

Le retour 2D→3D rétablit le relief et le libellé « Passer à la carte à plat ». La saisie native de « Tambour » donne un résultat ; toucher sa ligne ouvre la fiche au cran intermédiaire, puis la fermeture retrouve la même requête et le même résultat dans le panneau agrandi. L’action accessible d’agrandissement a également été exercée. Le bouton d’attribution ouvre le dialogue nommant IGN, BD TOPO et Licence Ouverte 2.0 ; sa fermeture fonctionne. Ces contrôles ne valident ni le clavier logiciel ni un glissement physique du panneau.

Les 37 tests Expo et les 39 tests Convex passent lors de cette reprise. Le lint Convex conserve deux avertissements dans le code `_generated`, sans erreur. Metro sur 3186, Next/Auth sur 3185 et Convex sur 3210 ont été rétablis ; le feed local réutilise les mêmes cinq identifiants de groupes de démonstration et expire à 15 h 59, heure de Guadeloupe. Cette borne n’assure pas leur renouvellement après expiration.

Le [rapport d’intégration](../.impeccable/review/ville-bannieres/implementation.md) rassemble le build, les simulateurs, les choix de rendu et les preuves. Les captures sélectionnées de ce dossier concernent MapLibre ; les diagnostics `first-pass-` et `diagnostic-`, ainsi que les captures de composition A, restent des archives locales hors du lot versionné. La consignation sur `develop` est en préparation ; aucun push ni déploiement n’est effectué. Le glissement physique et le clavier logiciel n’ont pas été reconfirmés dans cette reprise. La lecture parlée VoiceOver, Android, le téléphone physique, l’authentification réelle et le GPS en sortie restent hors preuve.
