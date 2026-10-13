# Identité Auth.js et autorisation Convex

Date : 13 octobre 2026. Tickets : MAR-413, MAR-414, MAR-367.
Statut : décision technique implémentée localement ; intégration fournisseur, infrastructure et téléphones physiques à valider avant livraison.

## Décision

Conserver Auth.js, son adaptateur Drizzle/libSQL et ses identifiants de comptes. Auth.js gère la connexion et les sessions ; Convex gère les habilitations et les sessions de suivi des groupes. La consultation publique n'exige aucune connexion. Le contrat d’identité des API reste indépendant des fournisseurs de connexion.

Décision utilisateur du 13 octobre : le public se connecte avec Google, Apple ou un lien magique par email, sans mot de passe. Discord est retiré des fournisseurs actifs et de l’interface ; ses comptes et identifiants existants restent conservés en base. L’envoi des liens est préparé via l’API transactionnelle Brevo avec `fetch`, sans nouvelle dépendance npm. Aucun compte fournisseur ni expéditeur réel n’a été créé ou activé par ce lot. Aucun `users` anonyme Convex, téléphone, push token ou champ `owner` transmis par le client ne confère de droits.

Les routes Auth.js et le pont natif utilisent le runtime Node.js du serveur existant : libSQL/SQLite local doit pouvoir ouvrir la base. Le précédent marquage Edge est retiré explicitement plutôt que de prétendre que ce pilote SQLite fonctionne dans un isolate Edge. Les helpers cryptographiques utilisent les API Web Crypto.

## Contrat API

`POST /api/auth/convex-token` reçoit soit un Bearer contenant la session native, soit le cookie HttpOnly Auth.js avec une requête JSON de même origine. Le serveur consulte la session en base et vérifie son expiration avant de signer un JWT RS256 de 60 secondes au maximum. Le JWT contient éventuellement le nom affiché du compte, utilisé dans la console de modération. Il ne contient ni e-mail ni rôle.

Claims :

- `sub` : identifiant du compte Auth.js, conservé dans le temps ;
- `iss` : `AUTH_ISSUER_URL`, origine exacte sans slash final ;
- `aud` : `omasla-convex`, vérifié par Convex ;
- `sid` : SHA-256 du secret de session, jamais le secret lui-même ;
- `sessionExpiresAt` : échéance de la session Auth.js en millisecondes ;
- `iat` et `exp` : émission et expiration du JWT en secondes.

`GET /api/auth/jwks` expose uniquement la partie publique de la clé RSA (`n`, `e`, `kid`, `alg`, `use`, `kty`). `AUTH_JWT_PRIVATE_KEY` reste côté serveur. La configuration Convex utilise `customJwt`, RS256 et cette JWKS. Le principal métier utilise l'identité vérifiée par `ctx.auth`, puis des habilitations stockées côté serveur.

Les clients web utilisent `@oyo/auth/convex-client` sous le `SessionProvider` Auth.js. Les clients Expo utilisent `NativeAuthProvider` et `ConvexProviderWithAuth`. Les tâches GPS demandent un JWT avec `fetchConvexAccessToken()` ; les requêtes privées ne déduisent jamais une identité depuis la position ou l'identifiant du téléphone.

## Retour de connexion native

1. Le téléphone génère un vérificateur PKCE et un état aléatoires. Il conserve le vérificateur, l’état, l’origine et une expiration de quinze minutes dans SecureStore. Aucun de ces secrets n’est enregistré dans AsyncStorage.
2. Le navigateur ouvre `/api/auth/signin` avec le challenge SHA-256, l'état et la destination exacte `omasla://login`.
3. Le serveur crée un `NativeAuthGrant` opaque de quinze minutes et un cookie HttpOnly limité à `/api/auth` ; Secure/SameSite=None en HTTPS pour le callback POST d’Apple, SameSite=Lax en HTTP localhost de développement. Les protections CSRF, state et PKCE propres au fournisseur Auth.js restent activées.
4. Après réussite du fournisseur, la route ne renvoie qu'un code opaque et l'état dans le deep link. La session longue n'apparaît plus dans l'URL. Les erreurs, destinations différentes, cookies altérés et grants expirés échouent.
5. Le téléphone vérifie l'état et échange le code avec son vérificateur en POST. Un `DELETE ... RETURNING` conditionnel consomme le grant atomiquement, même en cas de requêtes concurrentes. Le code devient inutilisable après 90 secondes ou après son premier échange réussi.
6. La session est conservée dans SecureStore. Le JWT court reste en mémoire. L'ancien paramètre `expo-redirect` est explicitement refusé.

Le code natif et la session du navigateur se réfèrent à la même session Auth.js. La déconnexion de cette session révoque les deux usages. Le provider natif traite les retours WebBrowser et les liens Linking, à chaud ou après redémarrage. L’échange concurrent de deux notifications du même retour est dédupliqué ; un code reçu sans le vérificateur original, depuis une autre origine, expiré ou après déconnexion n’est pas accepté. Les intentions de connexion sont sérialisées et leur génération est capturée avant toute attente, y compris la génération cryptographique.

## Déconnexion, expiration et concurrence

La suppression d'une session valide appelle d'abord `authSessions.revokeCurrentSession` avec une identité vérifiée. Convex crée une révocation même si cette session n'avait encore jamais servi à une action métier, termine les suivis associés et contrôle cette révocation pour chaque écriture privée. Un JWT encore valide pendant quelques secondes ne permet donc pas de reprendre le suivi. La révocation n'est jamais annulée par une reconnexion de la même session.

Si Convex est indisponible, la déconnexion ne prétend pas avoir réussi côté serveur. Le téléphone arrête sa tâche GPS et inscrit un marqueur persistant de déconnexion en attente avant la requête ; ce marqueur interdit d'obtenir de nouveaux JWT, y compris après redémarrage hors ligne. La session reste dans SecureStore uniquement pour réessayer sa révocation. Une réponse d'authentification arrivée après la déconnexion est ignorée. Une fois la révocation confirmée, le secret et le marqueur sont supprimés.

Le handler Auth.js standard absorbe les erreurs de suppression de session puis efface son cookie. Le POST web de déconnexion vérifie donc d’abord l’origine et le jeton CSRF signé, effectue la révocation, et n’appelle le handler Auth.js qu’après réussite. Une panne renvoie 503 sans effacer le cookie. Le helper client `safeSignOut` vérifie ce résultat avant toute navigation ; les server actions sont également enveloppées par cette pré-révocation.

La session native est restaurée au lancement, au retour du réseau et au retour au premier plan. Les reprises ne contournent jamais le marqueur de déconnexion en attente.

Une session Auth.js expirée est refusée même si sa ligne reste en base. L'expiration du JWT ne constitue pas une nouvelle session : le renouvellement vérifie à nouveau la session Auth.js. Les règles métier vérifient également `sessionExpiresAt`. Un administrateur peut arrêter les écritures d'un live ; arrêter immédiatement le capteur d'un téléphone déconnecté ne peut pas être garanti.

## Connexion email et origine du service

La page `/login` présente uniquement les fournisseurs effectivement configurés. Un état explicite indique l’absence de configuration. Aucun email réel n’est envoyé par les tests : ils simulent seulement le transport HTTP Brevo et exercent les vrais handlers Auth.js, la base SQLite et le retour natif.

Auth.js génère un jeton aléatoire et en conserve uniquement le hash, avec une durée de quinze minutes. La table `verification_token` est consommée par `DELETE ... RETURNING` : un lien expiré, rejoué ou utilisé simultanément ne crée pas plusieurs sessions. Le `nativeGrantId` éventuel est lié au token au moment de son émission via un contexte de requête Node, puis récupéré à sa consommation. Le lien peut donc être ouvert dans un autre navigateur sur le même téléphone sans relâcher PKCE ni dépendre d’un cookie absent du navigateur email.

Le quota est contrôlé atomiquement avant l’émission ET avant la création du token : une demande par fenêtre de 60 secondes et trois par fenêtre de quinze minutes pour une adresse, plus 300 demandes globales par fenêtre de quinze minutes. Ces fenêtres sont fixes, donc deux fenêtres adjacentes peuvent permettre des demandes rapprochées. La table conserve des clés HMAC dérivées de l’adresse et du secret serveur ; aucun en-tête `X-Forwarded-For` non authentifié n’est utilisé comme identité. Les lignes expirées sont nettoyées opportunément. Ces limites techniques initiales doivent être ajustées selon la charge réelle avant lancement public.

`AUTH_URL` doit être strictement égale à `AUTH_ISSUER_URL`, sans chemin ni slash final. Auth.js utilise `AUTH_URL` pour construire les routes HTTP et server actions, même si Host ou X-Forwarded-Host sont falsifiés. Une connexion configurée exige HTTPS, sauf localhost en mode development. Apple exige toujours HTTPS. Les identifiants de chaque fournisseur sont optionnels mais doivent être configurés par paire.

Google et Apple exigent une adresse déclarée vérifiée dans le profil OIDC. `allowDangerousEmailAccountLinking` n’est jamais activé. Un compte OAuth existant conserve son ID ; un autre fournisseur portant la même adresse est refusé tant que le rapprochement sûr n’est pas réalisé. L’accès par lien email vérifie la possession de cette adresse avant d’ouvrir le compte correspondant.

La migration `0002_email_auth` ajoute `verification_token`, `auth_email_limit` et un index unique sur `lower(user.email)`. Elle ne supprime aucun compte et ne fusionne aucun ID : si des doublons existent, l’index échoue et la migration réelle doit être précédée d’un audit/résolution explicite. Le comportement de suppression complète d’un compte reste hors de cette migration.

## Données et reprise

La migration ajoute `native_auth_grant` et conserve les identifiants Auth.js existants. Les grants expirés sont inopérants et nettoyés au prochain démarrage de connexion ; ce nettoyage est opportuniste, pas une garantie de suppression à la milliseconde d'expiration. La conservation des comptes, observations et historiques, ainsi que la suppression d'un compte, restent à préciser dans MAR-352 puis à implémenter sans attribuer les anciens utilisateurs anonymes à un compte par supposition.

Les écritures historiques non authentifiées doivent être fermées lors de la bascule. L'installation du schéma Drizzle, la configuration de l'émetteur/JWKS et la mise à jour Convex doivent être vérifiées ensemble sur l'environnement de test avant d'activer le nouveau client. Aucune clé ni configuration de production n'a été créée par cette décision.

## Validation et limites

Les tests locaux utilisent SQLite temporaire, les routes Next réelles et des signatures RSA éphémères. Ils couvrent destination autorisée/refusée, ancien pont fermé, cookie absent/altéré, erreur fournisseur, PKCE erroné/rejoué/concurrent/expiré, refus des sessions absentes ou expirées, signature/audience/expiration des JWT, absence de clé privée dans la JWKS et ordre révocation/suppression. Le fournisseur OAuth est simulé uniquement à sa frontière : ces tests ne prouvent pas une connexion Google ou Apple réelle. Un test couvre explicitement le callback POST d’Apple au niveau du bridge ; state/nonce et signature OIDC restent vérifiés par Auth.js.

Les tests du client natif simulent SecureStore et le transport pour vérifier restauration, renouvellements concurrents, réponse tardive après déconnexion, suppression d'une session rejetée et refus d'une tâche après redémarrage pendant une déconnexion hors ligne. Ils ne remplacent pas les essais iPhone/Android ni les tests d'intégration du moteur JWT de Convex. Ces preuves restent des conditions de livraison de MAR-414/MAR-418.

## Sources primaires consultées

- [Convex : Custom JWT Provider](https://docs.convex.dev/auth/advanced/custom-jwt) — contrat de claims, JWKS, audience et algorithmes.
- [Auth.js : session strategies](https://authjs.dev/concepts/session-strategies) — conservation des sessions côté base.
- [Auth.js : adaptateurs](https://authjs.dev/reference/nextjs/adapters) — contrat et expiration des sessions.
- [Expo Crypto](https://docs.expo.dev/versions/latest/sdk/crypto/) — aléa natif et SHA-256 pour PKCE.

- [Auth.js : Google](https://authjs.dev/getting-started/providers/google) — callback et email vérifié.
- [Auth.js : Apple](https://authjs.dev/getting-started/providers/apple) — Services ID, callback HTTPS et secret JWT.
- [Auth.js : email / magic links](https://authjs.dev/getting-started/providers/nodemailer) — token de vérification et adaptateur persistant ; transport HTTP personnalisé ici.
- [Brevo : envoi transactionnel](https://developers.brevo.com/reference/send-transac-email) — API utilisée par le transport.
- [Configuration et limites du lot fournisseurs](../auth-providers.md).
