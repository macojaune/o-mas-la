# Bâtiments à Pointe-à-Pitre — vérification du 14 octobre 2026

Vérification en lecture seule sur le WFS officiel de l’IGN. La disponibilité des données ne prouve ni leur rendu dans Expo ni la performance sur téléphone.

- Couche : `BDTOPO_V3:batiment` ; édition annoncée par GetCapabilities : `2026-06-15`.
- Réponse : `2026-10-14T07:08:52.241Z`.
- Emprise interrogée : longitude −61.538 à −61.530 ; latitude 16.233 à 16.241.
- 3 295 objets bâtiment trouvés et retournés ; prélèvement complet dans cette emprise.
- 3 154 hauteurs strictement positives (95,7 %) ; 141 absentes ; aucune égale à zéro.
- Hauteurs renseignées : minimum 2 m, médiane 8,1 m, maximum 43,9 m.
- Géométries MultiPolygon avec coordonnées Z ; les exemples examinés comportent notamment les méthodes altimétriques Photogrammétrie et Interpolation bâti BDTopo.

Conclusion : des volumes simples peuvent être produits à partir des emprises et hauteurs locales. La couverture de toute la Guadeloupe, l’exactitude terrain de chaque objet, le rendu MapKit/Google par défaut et l’intégration mobile ne sont pas validés par ce prélèvement. La ville détaillée de la maquette générée n’est pas un résultat technique. Pour les hauteurs absentes, conserver une empreinte plane ou un traitement explicitement schématique, sans inventer une hauteur réelle.

Sources reproductibles :

- [Requête WFS exacte](https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=BDTOPO_V3%3Abatiment&BBOX=16.233%2C-61.538%2C16.241%2C-61.530%2Curn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A4326&SRSNAME=EPSG%3A4326&OUTPUTFORMAT=application%2Fjson&COUNT=5000)
- [Documentation officielle WFS](https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/diffusion/wfs/)
- [Tutoriel IGN : extrusion du bâti à partir des hauteurs](https://github.com/IGNF/TP_iTowns/blob/main/TP.md)
- [Définition BD TOPO 3.3, page 66](https://geoservices.ign.fr/sites/default/files/2024-02/DC_BDTOPO_3-3_0.pdf) — document de définition antérieur à l’édition diffusée.

Le [rapport JSON](pointe-a-pitre-building-data.json) conserve les comptes, l’URL et des exemples. La réponse GeoJSON et le schéma XML complets sont conservés temporairement sous `/tmp/omasla-relief-check/` ; la requête ci-dessus permet de reproduire le prélèvement. Aucune donnée n’a été importée dans le backend.
