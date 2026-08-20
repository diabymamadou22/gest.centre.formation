# Documentation du Système de Gestion - Nafissatou Tounkara

Ce document fournit une explication complète sur l'utilisation et la conception technique de l'application de gestion de centre de formation.

## 1. Guide d'Utilisation

### Authentification
- **Connexion** : L'accès est protégé. Utilisez le bouton "Se connecter avec Google". 
- **Restriction** : Seuls les emails administrateurs autorisés (comme le vôtre) ont accès aux fonctions de modification.

### Tableau de Bord (Dashboard)
- Affiche un résumé statistique : nombre total d'élèves, de cours, d'inscriptions actives et le revenu total encaissé.
- Offre une vue rapide sur les derniers élèves inscrits.

### Gestion des Élèves
- **Liste** : Visualisez tous les élèves inscrits avec leur statut (Actif/Inactif).
- **Ajout** : Cliquez sur le bouton d'ajout pour entrer les informations personnelles (Nom, Prénom, Téléphone, Photo, etc.).
- **Actions** : Vous pouvez modifier les informations d'un élève ou le supprimer.

### Gestion des Cours
- Définissez les programmes de formation.
- Chaque cours possède un nom, une description, un enseignant, un planning et un prix.

### Inscriptions
- Permet de lier un élève à un cours spécifique.
- C'est ici que vous gérez qui suit quelle formation.

### Paiements
- Enregistrez les frais de scolarité versés par les élèves.
- Suivez le montant, la date, la méthode de paiement et associez-le à un cours.

### Paramètres
- Personnalisez le nom du centre, l'adresse, le téléphone.
- Modifiez le logo du centre qui apparaîtra sur l'interface.

---

## 2. Guide de Création Technique

### Pile Technologique (Stack)
- **Frontend** : React 18 avec TypeScript pour une interface robuste et rapide.
- **Styling** : Tailwind CSS pour un design moderne, épuré et réactif (adapté aux mobiles).
- **Animations** : Framer Motion pour des transitions fluides entre les pages.
- **Base de Données** : Firebase Firestore (NoSQL) pour un stockage permanent et en temps réel dans le cloud.
- **Authentification** : Firebase Auth (Google Login).

### Architecture du Code
- `/src/pages` : Contient les différents écrans de l'application.
- `/src/components` : Composants UI réutilisables (Sidebar, Layout, Cartes).
- `/src/lib/api.ts` : Couche de service qui communique avec Firestore.
- `/src/lib/firebase.ts` : Configuration initiale de la connexion Firebase.

### Base de Données (Collections Firestore)
1. **students** : Documents contenant les profils des élèves.
2. **courses** : Catalogue des formations disponibles.
3. **enrollments** : Lien entre élèves et cours (ID étudiant + ID cours).
4. **payments** : Historique financier.
5. **settings** : Configuration globale (document unique `general`).

---

## 3. Sécurité et Maintenance

### Règles de Sécurité Firestore
L'application utilise des règles strictes (`firestore.rules`) :
- Lecture autorisée pour les utilisateurs connectés.
- Écriture (Ajout/Modification/Suppression) réservée exclusivement à l'administrateur définit dans le code.
- Validation des données : chaque document est vérifié avant d'être enregistré (format des noms, prix positifs, etc.).

### Comment passer en production ?
Le code est prêt pour Vercel ou Netlify.
1. Importez le dossier sur GitHub.
2. Liez votre compte GitHub à Vercel.
3. Configurez les variables d'environnement si nécessaire (bien que la config soit déjà dans `firebase-applet-config.json`).
