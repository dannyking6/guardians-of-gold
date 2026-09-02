# Guardians of Gold — Version locale (hors-ligne)

Jeu téléchargé depuis GameSnacks (Google) et rendu **100% jouable en local, sans
aucune dépendance externe bloquante**.

- **Moteur** : Construct 3 (Scirra) — runtime 100% web (JS/WebGL), ni Unity ni Godot
- **Taille** : ~8.5 MB (runtime JS, spritesheets, 23 sons .webm, 3 polices, 2 squelettes Spine .scon)
- **Dépendances externes restantes** : AUCUNE (prouvé par pare-feu applicatif)

## Lancer le jeu

Un serveur HTTP est nécessaire (le runtime Construct refuse `file://`) :

```bash
./serve.sh            # port 8777 par défaut
# puis ouvrir http://localhost:8777
```

## Patches appliqués pour le mode hors-ligne

| Fichier | Patch |
|---|---|
| `index.html` | SDK GameSnacks CDN (`sdks.gamesnacks.com`) remplacé par `gamesnacks-sdk-stub.js` ; retraits des scripts 404 (`offlineclient.js`, `register-sw.js`) |
| `gamesnacks-sdk-stub.js` | **NOUVEAU** — stub du SDK : pubs simulées (interstitial + rewarded auto-gratifié), audio activé, sauvegarde via localStorage (`gs_local_*`) |
| `scripts/c3main.js` | Sitelock neutralisé (2 fonctions obfusquées `Sitelock_Event3/7_Act9` remplacées par `AllOk=true`) |
| `icons/loading-logo.png` | 404 Google remplacée par l'icône officielle 512×512 du jeu |

## Preuves de test (Playwright + pare-feu applicatif)

- **0 requête externe** (toute URL non-localhost bloquée par route-interceptor)
- 23/23 sons chargés depuis `media/` local
- Flux complet joué par un bot :
  - Splash → menu → jeu (`playbtn` cliqué)
  - Pub rewarded simulée → `gratifyUser` → récompense accordée
  - Tutoriel complété (`tapOnStudent=1` sauvegardé)
  - ~100 taps CV (vision par ordinateur) sur le voleur en mouvement
  - Fin de manche : `gameOver fired` → score sauvegardé (`setItem`)
- 0 erreur fatale pendant les 5 minutes de session

## Structure

```
index.html, data.json, appmanifest.json, style.css
scripts/         runtime Construct (c3main.js, main.js, workers)
images/          spritesheets
media/           23 sons .webm
fonts/           3 polices .ttf
*.scon           squelettes d'animation Spine
redblackset.js, pathfind.js   modules additionnels du jeu
```

*Projet de test à but éducatif — jeu © ses auteurs respectifs (Pass/Kbreindeergames, distribué via GameSnacks).*
