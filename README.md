# PixelFont

Dessine ta police pixel art, lettre par lettre, et installe-la dans Windows comme n'importe quelle police.

*English version: [README.en.md](README.en.md)*

![PixelFont](screenshots/1.jpg)

## Crénage et WOFF (nouveau en 1.1.0)

Rapprocher deux lettres précises (AV, To…), exporter la police en .woff pour un site, et des phrases-test toutes prêtes.

## Dessiner

- 125 caractères : ASCII, accents français (à, é, ç, œ…), €, guillemets « », apostrophe ’, points de suspension…
- Grille jusqu'à 16 × 16. **Clic gauche** pour dessiner, **clic droit** pour effacer, en glissant. **Flèches** du clavier : lettre suivante ou précédente, **Ctrl+Z** : annuler.
- Chaque lettre a sa **largeur** (trait bleu) : ◀ ▶ ou **Ajuster** à la dernière colonne dessinée. La **ligne de base** est en rose.
- Outils : effacer, inverser, miroir, décaler dans les 4 sens, copier-coller une lettre, annuler.

## Réglages

Nom de la police, largeur et hauteur de la grille, nombre de lignes sous la ligne de base (pour g, p, q, y), espace entre les lettres. **Repartir d'une police** remplit toutes les lettres d'après une police du système (chasse fixe, sans ou avec empattement) : un bon point de départ à retoucher.

## Aperçu et export

- Un texte d'aperçu dessiné en pixels, et une zone où écrire avec **la vraie police .ttf**, fabriquée et chargée à chaque changement : si le navigateur l'accepte, c'est affiché en vert.
- **Exporter .ttf** : une police TrueType. Double-clique sur le fichier pour l'installer dans Windows, puis utilise-la dans tes logiciels.
- **Planche PNG + JSON** : toutes les lettres sur une image (16 par ligne) et leurs positions et largeurs, pour un jeu.

## Crénage, WOFF et phrases-test (1.1.0)

Dans les réglages, la ligne **Crénage** rapproche (nombre négatif) ou écarte deux lettres précises, par exemple AV : écris la paire, le décalage en pixels, puis **+**. Chaque paire s’affiche avec ✕ pour la retirer ; l’aperçu et la police .ttf en tiennent compte. **Exporter .woff** enregistre la police compressée pour un site web. Au-dessus du texte d’aperçu, **Phrases-test…** propose des phrases avec toutes les lettres, l’alphabet et les chiffres, ou les paires à créner.

## Données

Les lettres, les réglages et le texte d'aperçu sont gardés dans le dossier du plugin. Autorisation : `storage` seulement.


