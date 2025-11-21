# 🎮 PeerToPeer - Pong 4 Joueurs

Jeu Pong multijoueur (jusqu'à 4 joueurs) avec communication P2P utilisant WebRTC, incluant chat et webcams en temps réel.

## 👥 Équipe

- **Rochetaing Kevin**
- **Quinveros Jordan**
- **Combal Nicolas**
- **Ledesma Jorgelina**

## 📋 Description

Application web de jeu Pong multijoueur permettant à 4 joueurs de jouer simultanément en peer-to-peer. Chaque joueur contrôle une raquette (gauche, droite, haut ou bas) et peut communiquer via webcam et chat textuel.

## ✨ Fonctionnalités

- 🎮 **Jeu Pong 4 joueurs** - Chaque joueur contrôle une raquette sur un côté différent
- 🌐 **Connexion P2P WebRTC** - Communication directe entre joueurs sans serveur
- 📹 **Webcams en direct** - Visualisation vidéo de tous les joueurs
- 💬 **Chat en temps réel** - Discussion instantanée pendant la partie
- 🔗 **Partage par lien** - Création et partage de parties via URL
- 🎯 **Physique de balle améliorée** - Accélération progressive et rebonds réalistes

## 🛠️ Technologies utilisées

- **HTML5** - Structure de l'application
- **CSS3** - Interface utilisateur moderne (dark mode)
- **JavaScript (Vanilla)** - Logique du jeu et coordination P2P
- **WebRTC** - Communication peer-to-peer
- **PeerJS** - Librairie simplifiée pour WebRTC
- **Canvas API** - Rendu graphique du jeu

## 🎯 Architecture du jeu

### Raquettes
- **🔴 Gauche** (Joueur 1) - Contrôles : W/S ou ↑/↓
- **🔵 Droite** (Joueur 2) - Contrôles : W/S ou ↑/↓
- **🟢 Haut** (Joueur 3) - Contrôles : A/D ou ←/→
- **🟡 Bas** (Joueur 4) - Contrôles : A/D ou ←/→

### Système de jeu
- L'hôte de la partie gère la physique de la balle
- Synchronisation en temps réel des positions des raquettes
- Vitesse de balle progressive (augmente à chaque rebond)
- Réinitialisation automatique quand la balle sort du terrain

## 🚀 Installation et utilisation

### Prérequis
- Navigateur web moderne supportant WebRTC
- Connexion Internet
- Webcam (optionnel)

### Lancement

🌐 **Accéder à l'application** : [https://pong-ynov.netlify.app/](https://pong-ynov.netlify.app/)

1. **Créer une partie**
   - Entrez votre pseudo
   - Autorisez l'accès à la webcam (optionnel)
   - Cliquez sur "🎮 Créer une partie"
   - Partagez le lien généré avec vos amis

2. **Rejoindre une partie**
   - Cliquez sur le lien partagé par l'hôte (exemple : `https://pong-ynov.netlify.app/?join=c4877f59-b031-4f64-b444-587135564d41`)
   - Entrez votre pseudo
   - Autorisez l'accès à la webcam (optionnel)
   - Attendez que l'hôte démarre la partie

3. **Jouer**
   - L'hôte clique sur "▶️ Démarrer la partie"
   - Utilisez les touches W/S/A/D ou les flèches pour contrôler votre raquette
   - Discutez via le chat pendant la partie

## 📁 Structure du projet

```
PeerToPeer/
├── index.html          # Interface principale
├── index.js            # Logique du jeu et WebRTC
├── index.css           # Styles (dark theme)
└── README.md           # Documentation
```

## 🎮 Contrôles

| Joueur | Position | Mouvement | Touches |
|--------|----------|-----------|---------|
| 1 | Gauche | Haut/Bas | W/S ou ↑/↓ |
| 2 | Droite | Haut/Bas | W/S ou ↑/↓ |
| 3 | Haut | Gauche/Droite | A/D ou ←/→ |
| 4 | Bas | Gauche/Droite | A/D ou ←/→ |

## 🔧 Fonctionnement technique

### Communication P2P
- Utilisation de **PeerJS** pour simplifier WebRTC
- Serveurs STUN/TURN pour traverser les NAT
- Synchronisation des états de jeu via messages JSON


## 📝 Notes de développement

- L'hôte est responsable de la physique de la balle
- Les clients reçoivent les positions de la balle et les affichent
- Chaque joueur gère sa propre raquette et broadcast sa position


## 🎓 Contexte

Projet réalisé dans le cadre du cours de **Web Services** à **Ynov**.


