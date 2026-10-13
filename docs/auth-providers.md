# Google, Apple et lien email — configuration O Mas La

Décision utilisateur du 13 octobre 2026. Le code est préparé ; aucune configuration réelle n’a été activée et aucun email réel n’a été envoyé par les tests.

## Origine commune

Configurer `AUTH_URL` et `AUTH_ISSUER_URL` avec exactement la même origine HTTPS sans slash final, par exemple l’origine de l’environnement réellement déployé. Les callbacks sont servis par Next.js sous `/api/auth`. La consultation fonctionne sans fournisseur ; la page `/login` indique alors que la connexion n’est pas configurée.

Conserver un `AUTH_SECRET` propre à l’environnement, les variables RSA/JWKS Convex existantes et la bonne base Drizzle. Ne copier aucun secret de production dans les fixtures locales.

## Fournisseurs

| Mode            | Variables serveur                       | Callback à autoriser                                    |
| --------------- | --------------------------------------- | ------------------------------------------------------- |
| Google          | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`  | `https://<origine>/api/auth/callback/google`            |
| Apple           | `AUTH_APPLE_ID`, `AUTH_APPLE_SECRET`    | `https://<origine>/api/auth/callback/apple`             |
| Email via Brevo | `AUTH_BREVO_API_KEY`, `AUTH_EMAIL_FROM` | Lien généré par Auth.js sous `/api/auth/callback/email` |

Pour Google, créer/configurer le client web et son écran de consentement sur l’environnement exact. Pour Apple, utiliser un Services ID rattaché au domaine vérifié ; `AUTH_APPLE_SECRET` est le JWT client signé avec les éléments Apple. Prévoir sa rotation avant expiration, au maximum six mois. Le callback Apple est un POST ; le reverse proxy doit laisser cette méthode atteindre Auth.js. Ne pas activer un redirect proxy Auth.js pour Apple.

Pour Brevo, utiliser une clé transactionnelle et une adresse d’expéditeur autorisée, avec le domaine et sa délivrabilité configurés. Le connecteur Brevo était accessible en lecture le 13 octobre ; la recherche des expéditeurs sur `omasla.fr` n’en a retourné aucun. Cela n’établit pas qu’une autre adresse d’envoi soit déjà choisie ou autorisée. L’intégration ne crée ni contact marketing ni abonnement ; vérifier la configuration de suivi des liens du compte avant activation pour les emails d’authentification.

## Schéma et limites

Appliquer les migrations Drizzle sur la base exacte après point de retour et répétition. `0002_email_auth` ajoute les jetons email, les quotas et l’unicité insensible à la casse des adresses. Identifier les doublons éventuels avant la migration : aucun rapprochement automatique n’est effectué.

Le lien expire après quinze minutes et est à usage unique. Quotas persistants : une demande par fenêtre fixe de 60 secondes, trois par quinze minutes par adresse, et 300 par quinze minutes au total. Les identifiants des quotas utilisent un HMAC de l’adresse, pas l’adresse brute. Le quota est vérifié avant de créer un token ; un refus ne remplit donc pas la table de vérification. Un échec Brevo est présenté comme un échec d’envoi, sans afficher de réponse fournisseur ni de secret.

Le natif commence sur le formulaire web hébergé. Les tokens email conservent une liaison à la tentative PKCE ; le retour `omasla://login?code=…&state=…` fonctionne aussi via Linking après redémarrage, sur le téléphone qui possède le vérificateur SecureStore. Le code de retour expire après 90 secondes. Une déconnexion annule les retours tardifs et les préparations de connexion encore en cours.

## Vérification

Les tests automatisés utilisent de vraies routes Auth.js/Next et SQLite temporaire, avec Brevo explicitement simulé. Ils couvrent hash/expiration/replay/concurrence, refus CSRF/origine, quotas avant création, panne transport, origine production canonique, callback Apple POST du bridge, reprise native sans cookie et courses PKCE/déconnexion.

Restent non vérifiés : consentement Google réel, Sign in with Apple réel, réception et délivrabilité Brevo, retour email/OAuth sur iPhone et Android physiques. Une compilation ou une suite locale verte ne valide pas ces parcours. Aucun mode de connexion n’est activé par défaut sans les variables correspondantes.

Références : [Google Auth.js](https://authjs.dev/getting-started/providers/google), [Apple Auth.js](https://authjs.dev/getting-started/providers/apple), [email Auth.js](https://authjs.dev/getting-started/providers/nodemailer), [Brevo API](https://developers.brevo.com/reference/send-transac-email).
