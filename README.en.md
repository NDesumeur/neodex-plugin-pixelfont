# PixelFont

Draw your pixel art font, letter by letter, and install it in Windows like any other font.

*Version française : [README.md](README.md)*

![PixelFont](screenshots/1.jpg)

## Kerning and WOFF (new in 1.1.0)

Bring two specific letters closer (AV, To…), export the font as .woff for a website, and ready-made test sentences.

## Drawing

- 125 characters: ASCII, French accents (à, é, ç, œ…), €, « » quotes, ’ apostrophe, ellipsis…
- Grid up to 16 × 16. **Left click** to draw, **right click** to erase, by dragging. Keyboard **arrows**: next or previous letter, **Ctrl+Z**: undo.
- Each letter has its own **width** (blue line): ◀ ▶ or **Fit** to the last drawn column. The **baseline** is pink.
- Tools: clear, invert, mirror, shift in 4 directions, copy-paste a letter, undo.

## Settings

Font name, grid width and height, rows below the baseline (for g, p, q, y), letter spacing. **Start from a font** fills every letter from a system font (monospace, sans-serif or serif): a good starting point to touch up.

## Preview and export

- A preview text drawn in pixels, and an area to write with **the real .ttf font**, built and loaded on every change: if the browser accepts it, it shows in green.
- **Export .ttf**: a TrueType font. Double-click the file to install it in Windows, then use it in your software.
- **PNG sheet + JSON**: every letter on one image (16 per row) with their positions and widths, for a game.

## Kerning, WOFF and test sentences (1.1.0)

In the settings, the **Kerning** row brings two specific letters closer (negative number) or further apart, for example AV: type the pair, the offset in pixels, then **+**. Each pair shows with ✕ to remove it; the preview and the .ttf font use it. **Export .woff** saves the compressed font for a website. Above the preview text, **Test sentences…** offers sentences with every letter, the alphabet and digits, or pairs to kern.

## Data

The letters, the settings and the preview text are kept in the plugin folder. Permission: `storage` only.


