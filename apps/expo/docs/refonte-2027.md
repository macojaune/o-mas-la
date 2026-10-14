# Socle mobile de la refonte 2027

Travail local du 13 octobre 2026, dans la branche `refonte-2027`. Ces notes décrivent l’implémentation et ses limites de vérification, pas une validation de publication.

## Socle et compatibilité

Le socle Expo 51 / React Native 0.74 ne pouvait pas être présenté comme une cible de publication 2027 vérifiée. L’application passe sur Expo 57 (`~57.0.28`), React Native 0.86.3 et React 19.2.3, avec les modules Expo issus de `bundledNativeModules.json`. Metro utilise le support monorepo officiel ; les anciens composants NativeWind et l’identifiant anonyme servant d’identité de suivi sont retirés. La page d’accueil du site n’est pas reprise ni modifiée par ce lot.

Les dépendances natives utilisées par Expo Router sont déclarées explicitement dans l’app : `react-native-gesture-handler ~2.32.0`, `react-native-reanimated 4.5.1` et `react-native-worklets 0.10.1`, alignées sur `expo/bundledNativeModules.json`. La première tentative de compilation native a révélé que des peers installés automatiquement pouvaient conserver d’anciennes versions malgré un export JS réussi. Ces déclarations rendent les versions choisies explicites pour l’autolinking natif ; elles ne prouvent pas à elles seules la compilation, la signature ou le fonctionnement sur appareil.

La matrice SDK 57 annonce Node 22.13 minimum, iOS 16.4 minimum / Xcode 26.4 minimum et Android API 36. Les profils EAS emploient Node 22.22.0. Le SDK est récent : compatibilité native sur appareils et validation des stores restent à établir. Les versions de développement recommandées par `expo install --check` sont Babel ^7.29.0, les types React ~19.2.4 et TypeScript ~6.0.3.

Références officielles consultées le 13 octobre 2026 :

- [Matrice Expo SDK](https://docs.expo.dev/versions/latest/)
- [Migration de SDK](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [Monorepos](https://docs.expo.dev/guides/monorepos/)
- [Carte native](https://docs.expo.dev/versions/latest/sdk/map-view/)
- [Localisation](https://docs.expo.dev/versions/latest/sdk/location/)
- [Tâches en arrière-plan](https://docs.expo.dev/versions/latest/sdk/task-manager/)
- [Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)

## Parcours et données

La liste, la recherche sans accents, les fiches, la source et l’âge des positions sont publics. Aucun compte ni accès au GPS du spectateur n’est demandé pour consulter. Les repères suivent les seuils du serveur Convex ; en absence de configuration, aucune position n’est présentée comme actuelle. Le lien « Rejoindre » ouvre un itinéraire piéton externe vers le dernier point encore visible, daté, avec avertissement que le groupe peut se déplacer.

Le cache ne contient que le catalogue public déjà reçu. Il préserve l’heure du serveur et celle de la réception, puis continue de vieillir lors des reprises hors ligne. Il ne précharge ni annuaire inexistant ni fonds cartographiques. L’absence d’un cache reste explicite. Les mutations utilisent un client HTTP authentifié après vérification réseau ; elles ne rejoignent pas la file hors ligne du client React Convex. Une déclaration n’est jamais automatiquement soumise après reconnexion.

La carte native utilise Apple Maps sur iOS et Google Maps sur Android. Une clé Android restreinte pour le package et la signature du binaire est nécessaire dans `GOOGLE_MAPS_API_KEY`. Sans cette configuration, l’app affiche une indisponibilité explicite. L’aperçu web conserve les listes/fiches et un adaptateur qui indique que la carte se consulte dans l’app. Cet aperçu ne prouve donc pas le chargement des tuiles natives. Le produit mobile cible explicitement Expo / React Native sur iOS et Android.

Décision confirmée par Marvin le 13 octobre : déclarer un groupe hors live utilise la position actuelle du téléphone et l’heure du relevé fraîchement acquis. Le formulaire ne propose ni déplacement du point ni saisie d’heure. « Publier ma position actuelle » demande la permission au geste, puis acquiert un nouveau relevé ; la consultation publique conserve son absence de permission GPS. Un refus réversible permet de réessayer ; un refus définitif propose les réglages. Le retour des réglages ou de la connexion ne publie jamais automatiquement.

Le relevé doit dater du début de l’acquisition (tolérance d’arrondi de 1 seconde), avoir au plus 10 secondes lors de l’envoi et ne pas être dans le futur de plus de 5 secondes. L’acquisition expire après 25 secondes ; un résultat tardif n’entraîne aucun envoi. Ces limites techniques empêchent le réemploi d’un GPS ancien et ne remplacent pas les seuils de fraîcheur du catalogue ou la validation de l’heure côté serveur. Le timestamp d’acquisition est envoyé sans être remplacé par l’heure d’une reconnexion. Une perte de réseau, un passage en live, la sortie de l’écran ou un changement de compte avant l’envoi abandonnent le relevé.

Une tentative conserve uniquement son identifiant de requête pendant que l’écran reste ouvert. Si la réponse a été perdue, le geste « Réessayer » consulte le reçu authentifié avant d’acquérir un nouveau GPS. Si le reçu existe, il confirme l’enregistrement sans republier. Sinon, un nouveau relevé est acquis sous le même identifiant ; un éventuel conflit avec l’ancienne requête est résolu en relisant le reçu, sans doublon. Le reçu ne garantit pas qu’une observation ensuite retirée par la modération soit encore visible. Aucune photo, motif obligatoire ou processus de contestation du live n’est ajouté. Un groupe passé en live entre affichage et envoi est refusé côté serveur.

## Émetteur et interruptions

L’identité est une session native authentifiée. La consultation du rôle et les habilitations passent par les API serveur. Démarrage, arrêt, reprise sur le même téléphone et passation sont explicites. Une passation proposée laisse l’ancien référent actif jusqu’à acceptation ; l’ancienne génération est ensuite refusée. Aucune prise de contrôle automatique.

Le partage en arrière-plan demande les permissions au démarrage. Sur iOS, le refus « Toujours » ou un choix « Une seule fois » donne un parcours vers les Réglages. L’app n’affirme pas distinguer les choix que l’API iOS ne distingue pas. Une configuration development build est requise ; Expo Go ne constitue pas une preuve du GPS en arrière-plan.

La tâche native est enregistrée au chargement du module. Chaque point conserve son heure d’acquisition ; les lots non transmis sont abandonnés, jamais re-datés à la reconnexion. Le client vérifie session, appareil, génération et échéance avant tout envoi, le serveur vérifie l’autorité et les règles. Les transitions natives sont sérialisées : une réponse terminale d’une ancienne génération ne peut arrêter ou effacer la nouvelle.

L’arrêt manuel écrit d’abord une intention locale persistante puis arrête la tâche ciblée. Si le réseau manque, la confirmation serveur reste à réessayer explicitement. La déconnexion arrête le partage avant révocation du compte. Une session terminée côté serveur ou une habilitation retirée conduit à l’arrêt local après réception de cet état ou refus d’un point.

La vitesse est décidée côté serveur. L’avertissement retourne un identifiant temporel utilisé pour une notification locale dédupliquée, si permission accordée, avec message persistant et historique dans l’app. La fin confirmée pour sortie de zone déclenche également une notification locale, après arrêt de la tâche ciblée et revalidation de sa session, de son appareil et de sa génération. La réponse GPS et la réconciliation des sessions utilisent le même chemin dédupliqué, y compris si la réponse GPS est perdue. Une réponse ancienne ne notifie pas à la place du nouveau live. Le clic sur la notification revient à l’espace référent. Il n’y a aucun broadcast de jetons push ni dépendance à une notification push pour appliquer la règle.

L’échéance maximale est vérifiée dans chaque callback GPS et par un contrôle local quand JavaScript est actif. Un système qui suspend l’app ne garantit pas l’exécution ponctuelle d’un timer JavaScript : la coupure du capteur exactement à l’échéance hors réseau reste à vérifier sur appareils. Les nouveaux envois après expiration sont refusés même si l’OS reprend plus tard.

La cadence technique initiale (15 secondes / 10 mètres, haute précision) est provisoire. Elle ne remplace pas les seuils métier, configurés côté serveur, ni une mesure terrain de batterie et précision.

## Configuration et validation à finir

- `EXPO_PUBLIC_CONVEX_URL` : déploiement Convex exact visé. URL locale 3210 seulement pour le banc local isolé.
- `EXPO_PUBLIC_API_URL` : origine HTTPS des comptes ; HTTP accepté uniquement en développement explicite. Aucun `localhost` implicite sur un téléphone.
- `GOOGLE_MAPS_API_KEY` : clé de carte Android pour le binaire et sa signature.
- `GOOGLE_SERVICES_JSON` reste facultatif et n’est pas une preuve d’accès à Firebase ou aux stores.
- Les identifiants de bundle existants et le projet EAS existant sont conservés. `eas whoami` a répondu « Not logged in » le 13 octobre : propriété, accès, signatures, fiches et état des stores non vérifiés.

Contrôles automatisés utiles : `pnpm --filter @oyo/expo typecheck`, `lint`, `test`, `expo install --check`, et `expo export --platform all`. L’export génère des bundles JS/Hermes, pas des exécutables natifs signés. Le test cache utilise des fixtures explicitement fictives et couvre les frontières de fraîcheur, la corruption, l’absence de politique, la navigation et les interruptions de sessions. La course d’une réponse GPS tardive, la déduplication des notifications de vitesse et de zone, le refus de permission et la confirmation de fin par réconciliation sont également testés.

Les tests du nouveau parcours de déclaration couvrent la permission au geste et son refus, le GPS ancien/futur, l’expiration de l’acquisition, le vieillissement pendant l’authentification, la perte de réseau, le passage en live et le retour d’une requête précédente. L’APK compilé au commit `fd14356` précède ce changement : il ne valide pas ce formulaire. La permission native, la précision réelle et le retour des réglages de ce nouveau parcours restent à exercer sur iPhone et Android.

Les tickets de builds physiques, permissions iOS, suivi écran verrouillé, retour de connexion, carte Android signée, notifications refusées/accordées, veille/reprise, perte réseau, changement d’appareil et publication restent ouverts tant que ces scénarios n’ont pas été exercés sur de vrais iPhone et Android. Aucun téléversement de binaire ni soumission de store n’est réalisé par ce lot.
