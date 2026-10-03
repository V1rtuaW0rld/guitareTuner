# 🎸 GuitareTuner - Accordeur Pro & Sismographe Audio (avec Capodastre)

> **"Ce projet est né car je ne trouvais pas d'accordeur qui gérait l'utilisation de capodastre."**

**GuitareTuner** est une application d'accordage de guitare haute précision, multiplateforme (Web, Android, Windows Desktop), intégrant une détection de pitch en temps réel via l'algorithme YIN, une visualisation sismographique élégante et une gestion complète des transpositions de capodastre.

---

## 🌟 Fonctionnalités Clés

* 🎯 **Gestion Intelligente du Capodastre (-12 à +12)** : 
  - Ajustement automatique de la fréquence cible et des notes selon le positionnement du capodastre.
  - Prise en charge des accordages alternatifs et exotiques (Drop D, Open D, etc.).
  - Sélecteur de capodastre sur-mesure, ergonomique et responsive.

* ⚡ **Détection de Pitch Ultra-Précise (Algorithme YIN)** :
  - Analyse spectrale et autocorrélation en temps réel du signal audio.
  - Détection précise au *cent* près avec filtrage dynamique des octaves.

* 📈 **Visualisation Sismographique Temps Réel** :
  - Traceur sismographique sous forme de volutes fluides pour suivre la stabilité de la note pincée.
  - Oscilloscope et moniteur d'égaliseur FFT intégrés.

* 🍃 **Mode Éco (30 FPS) & ⚡ Mode Turbo (120 FPS) à la volée** :
  - **Mode Éco** : Économie drastique de batterie et de processeur (30 FPS, pause automatique du moteur YIN lors des silences).
  - **Mode Turbo** : Rafraîchissement débridé (60Hz / 120Hz) pour une réactivité maximale.

* 🩺 **Diagnostic "Debug Doctor"** :
  - Tableau de bord complet d'analyse de la chaîne audio (périphérique micro, état `AudioContext`, signal PCM RMS / Peak, moteur YIN, terminal de logs).

* 🌐📱💻 **Multiplateforme Native** :
  - **Web** : WebApp HTML5/ES6 pure.
  - **Android** : Application APK.
  - **Windows Desktop** : Application autonome Electron avec serveur HTTP embarqué pour compatibilité directe avec les Reverse Proxies (Caddy, Nginx, etc.).

---

## 📥 Téléchargements

* 📱 **Application Android (.apk)** : [📥 Télécharger l'APK Android (Google Drive)](LIEN_GOOGLE_DRIVE_APK_ICI) *(Insérer votre lien Google Drive ici)*
* 💻 **Application Windows (.exe / .zip)** : [📥 Télécharger l'application Windows (.exe / .zip)](LIEN_TELECHARGEMENT_EXE_ICI) *(Insérer votre lien de téléchargement ici)*

---

## 🚀 Utilisation & Déploiement

### 🌐 1. Version Web (Local ou Reverse Proxy)
L'application web s'exécute avec n'importe quel serveur HTTP statique.

```bash
# Lancement local avec Python
python -m http.server 4492 --directory webapp
```

#### Configuration Reverse Proxy Caddy (HTTPS)
Pour accéder à l'accordeur à distance en HTTPS (nécessaire pour l'accès au microphone par le navigateur) :

```caddyfile
accordeur.virtuaworld.org {
    reverse_proxy 127.0.0.1:4492
}
```

### 💻 2. Version Windows Desktop (Electron)
L'application bureau embarque le serveur HTTP local sur le port `4492`.

```bash
cd desktop
npm install
npm run build
```

### 📱 3. Version Android (APK)
Le projet Android Studio se trouve dans le répertoire `APK/`.

```bash
cd APK
./gradlew assembleDebug
```

---

## 🛠️ Architecture du Projet

```text
.
├── webapp/                 # Application Web (HTML5/CSS3/ES6)
│   ├── core-audio/         # Moteur audio (YIN, note converter, tunings, providers)
│   ├── css/                # Styles et thèmes responsives
│   └── js/                 # Graphiques Canvas (Gauge, Sismographe, Visualizer)
├── desktop/                # Application Windows Desktop (Electron + HTTP Server)
├── APK/                    # Projet Android Studio (Kotlin Multiplatform / WebView)
└── README.md
```

---

## 👤 Auteur

**Thinking by VirtuaWorld**  
Dépôt officiel : [GitHub - guitareTuner](https://github.com/V1rtuaW0rld/guitareTuner.git)
