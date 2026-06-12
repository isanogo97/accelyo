# Modèle — Contrat de sous-traitance (DPA) — Article 28 RGPD

> **À FAIRE RELIRE PAR UN AVOCAT AVANT USAGE.** Modèle de travail, non un avis juridique. Les champs entre
> crochets `[…]` sont à compléter. Annexé au contrat de prestation Accelyo.

---

ENTRE :
**[Établissement]**, [forme juridique], [adresse], représenté par [nom, qualité], ci-après le
**« Responsable de traitement »**,

ET :
**Accelyo**, [forme juridique et immatriculation], [adresse], représenté par [nom, qualité], ci-après le
**« Sous-traitant »**,

Ci-après ensemble les « Parties ».

## 1. Objet
Le présent contrat encadre le traitement de données à caractère personnel par le Sous-traitant pour le
compte du Responsable, dans le cadre de la fourniture de la solution Accelyo (carte étudiante
dématérialisée, app étudiante, gestion d'accès), conformément à l'article 28 du RGPD (UE 2016/679).

## 2. Durée
Le présent contrat s'applique pendant toute la durée du contrat de prestation et tant que le Sous-traitant
traite des données pour le compte du Responsable.

## 3. Description du traitement (Annexe 1)
La nature, la finalité, les types de données et les catégories de personnes concernées sont définis en
**Annexe 1**.

## 4. Obligations du Sous-traitant
Le Sous-traitant s'engage à :
1. **Ne traiter les données que sur instruction documentée** du Responsable (y compris pour les
   transferts), sauf obligation légale ; il informe alors le Responsable avant traitement, sauf
   interdiction légale.
2. Garantir la **confidentialité** : les personnes autorisées à traiter les données sont soumises à une
   obligation de confidentialité.
3. Mettre en œuvre les **mesures techniques et organisationnelles** appropriées (article 32) décrites en
   **Annexe 2**, et les maintenir à l'état de l'art.
4. Respecter les conditions de recours à un **sous-traitant ultérieur** (article 5 ci-dessous).
5. **Assister le Responsable** : (a) pour répondre aux demandes d'exercice des droits des personnes
   (accès, rectification, effacement, limitation, opposition, portabilité) ; (b) pour la sécurité, les
   notifications de violation, les analyses d'impact (AIPD) et la consultation préalable de l'autorité.
6. **Notifier toute violation** de données au Responsable **sans délai injustifié** après en avoir pris
   connaissance (objectif : **48 heures**), avec les informations utiles, pour permettre au Responsable de
   notifier l'autorité (CNIL) sous 72 h le cas échéant.
7. Au choix du Responsable, **supprimer ou restituer** toutes les données à la fin de la prestation et
   détruire les copies existantes, sauf obligation de conservation légale.
8. Mettre à disposition du Responsable les informations nécessaires pour démontrer le respect de
   l'article 28 et permettre la réalisation d'**audits** (y compris inspections), dans des conditions
   raisonnables (préavis, confidentialité, fréquence convenue).
9. Tenir un **registre** des catégories d'activités de traitement effectuées pour le compte du Responsable
   (article 30.2).

## 5. Sous-traitants ultérieurs
Le Responsable autorise le recours aux sous-traitants ultérieurs listés en **Annexe 3**. Le Sous-traitant
informe le Responsable de tout ajout ou remplacement **avec un préavis de [30] jours**, période durant
laquelle le Responsable peut s'**opposer** pour des motifs légitimes. Le Sous-traitant impose au
sous-traitant ultérieur les mêmes obligations de protection des données par contrat.

## 6. Transferts hors UE
Les données sont **hébergées dans l'EEE (France)**. Tout transfert hors EEE requiert l'accord préalable du
Responsable et la mise en place de garanties appropriées (clauses contractuelles types, etc.).

## 7. Sécurité
Le Sous-traitant met en œuvre les mesures de l'**Annexe 2** (chiffrement, contrôle d'accès, cloisonnement,
journalisation, sauvegardes, etc.) et garantit un niveau de sécurité adapté au risque.

## 8. Responsabilité
Chaque Partie répond des dommages causés par un manquement aux obligations du RGPD qui lui incombent, dans
les conditions de l'article 82 du RGPD et du contrat de prestation.

Fait à [lieu], le [date], en deux exemplaires.
**Le Responsable** [signature] — **Le Sous-traitant (Accelyo)** [signature]

---

## ANNEXE 1 — Description du traitement
- **Finalités** : émission et gestion d'une carte étudiante dématérialisée ; authentification de
  l'étudiant ; affichage de la carte (incl. photo) ; contrôle/justificatif d'accès ; le cas échéant
  modules planning/infos/bibliothèque/bons plans ; e-mails transactionnels.
- **Nature des opérations** : collecte, enregistrement, organisation, stockage (chiffré), consultation,
  transmission (à l'étudiant lui-même / aux lecteurs autorisés), suppression.
- **Catégories de données** : identité (nom, prénom, n° étudiant, e-mail, filière, année) ; **photo**
  d'identité ; identifiants de carte (`card_uid`, carte signée, UID de carte physique) ; préférences
  (consentement marketing) ; données de comptes administrateurs ; journaux techniques (audit, IP).
- **Catégories de personnes** : étudiants/usagers de l'établissement ; personnels administrateurs.
- **Catégories particulières (art. 9)** : **aucune** (la photo n'est pas traitée par reconnaissance
  faciale).

## ANNEXE 2 — Mesures techniques et organisationnelles (art. 32)
- Chiffrement au repos des données sensibles (**AES-256-GCM**) ; recherche par HMAC-SHA-256.
- Mots de passe **bcrypt** (12 tours) ; **MFA** (TOTP) disponible ; secrets chiffrés.
- Carte signée **RSA** + anti-rejeu **HMAC**.
- **Photos** accessibles uniquement par **URL présignée courte durée, authentifiée** ; jamais publiques ;
  jamais transmises à un wallet.
- **Cloisonnement multi-locataire** (un admin ne voit que ses étudiants).
- **TLS/HTTPS** ; **pare-feu** (22/80/443) ; **limitation de débit** ; **journal d'audit**.
- **Sauvegardes** chiffrées quotidiennes, rotation ; **révocation/suspension immédiate**.
- Hébergement **OVH France (EEE)**.

## ANNEXE 3 — Sous-traitants ultérieurs autorisés
| Sous-traitant | Finalité | Localisation |
|---|---|---|
| OVH | Hébergement (VPS, sauvegardes) | France |
| OVH (Zimbra) | E-mails transactionnels | France |
| Google Wallet | Passe carte (si opt-in de l'étudiant) | UE/hors-UE (Google) |
| Apple Wallet | Passe carte (si opt-in de l'étudiant) | UE/hors-UE (Apple) |

> Tenir cette annexe à jour ; tout ajout est soumis à la procédure de l'article 5.
