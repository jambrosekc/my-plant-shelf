# Plant Shelf v4: build instructions

Version 4 is the "organic, thin-line" shelf. It is the look chosen after v1 (card board), v2 (literal shelf), v3 (shelf with decor). Live prototype: https://claude.ai/artifact/3VMyJJumnad3hCnrtG1QAq

## 1. What this is
A cozy "virtual plant shelf" web app for a houseplant collection. Each plant has a QR-code tag (printed with a Niimbot label printer). Scanning the tag opens that plant's page: name, picture, and the conditions it is kept in. While the real app is being built, everything runs as one static HTML page with the data embedded as JSON, so nothing has to be hosted.

Source data: `niimbot_plant_labels_v22.xlsx` (Master tab), 147 plants. Fields come straight from its columns.

## 2. Look and feel
- Organic and calm. Not Halloween-organic, not cartoonish. Thin botanical line art, soft fills, no thick outlines, no hard drop shadows, no wobble filter.
- Palette (light): linen wall `#ecebe2`, card `#f7f6f0`, card-2 `#e5e6d9`, ink `#2f3b33`, muted `#697466`, moss accent `#4f6b57`, sage `#cdd8c6`, lichen `#cfd0aa`, ash wood `#d6c8aa` / `#e6dbc2`, line `rgba(47,59,51,.55)`.
- Palette (dark, via `prefers-color-scheme` and `data-theme="dark"`): wall `#1e2520`, card `#29322b`, ink `#e6eadf`, accent `#8fb59a`, wood `#6f6a55`.
- All colors are CSS variables so a "skin" can be swapped in later without touching layout.
- Type: Cormorant Garamond (display, italic for the title and section headings) and DM Sans (body). Both from Google Fonts.
- Lines: 1px borders in `--line`; plant strokes 1 to 1.3px at about 70% opacity.
- Soft warm glow in the top-right and bottom-left corners of the wall.
- Respect `prefers-reduced-motion`. Keyboard focus is a visible 2px moss outline.

## 3. Data model (one object per plant)
```json
{
  "tag": "AL-NS-BM-1",
  "genus": "Alocasia", "species": "Reginula", "cultivar": "Ninja", "variant": "Splash",
  "name": "Al. Ninja Splash GC",
  "stage": "Starter", "seller": "BlueMoonTropicals", "date": "11/03/26",
  "temp": null, "humidity": 100, "soil": "Semi-hydro 50/50 stratum/perlite",
  "light": "", "water": "", "notes": "", "photo": "(data URL, optional)"
}
```
- `tag` is the unique ID and what the QR code points at. Format: TYPE-INITIALS-SELLER-# (UN = unknown). Never change a tag that is already printed.
- Humidity is stored as a whole percent (the sheet stores a fraction). Temperature is in degrees F.
- Missing values show "Not logged yet". They are never invented.

## 4. Browsing and drill-down
Hierarchy: Genus, then Cultivar (shows species underneath), then individual plants.
- Level 0 shows one item per genus with a "x N" count badge.
- Level 1 shows one item per cultivar in that genus. A cultivar with a single plant opens that plant directly.
- Level 2 shows every individual plant of that cultivar (for example all 20 Black Velvets).
- Breadcrumb buttons ("All plants > Alocasia > Black Velvet") move back up.
- "Every plant" view lists all plants flat. Search matches name, genus, species, cultivar, variant, seller and tag, and overrides the current level.
- Sort: name, most first, newest (by purchase date).
- Blank genus is grouped as "Unknown"; blank cultivar as "Unspecified".

## 5. Plant page (opens as a sheet over the shelf)
- Picture (uploaded photo, otherwise the drawn plant on a small shelf), name, chips for genus / species / cultivar / variegation, tag code.
- Conditions grid: Humidity, Temperature, Soil, Light, Watering.
- Seller, purchase date, notes.
- QR code (qrcodejs 1.0.0 from cdnjs, 128px, black on white) for the link `<page url>#p-<TAG>`. "Copy link" button.
- "View JSON" shows that plant's data. A header button "Data (JSON)" shows and copies all plants.
- "Update conditions & photo" opens the same form used for adding, limited to photo and conditions.
- Routing is hash only: `#p-AL-NS-BM-1` opens that plant on load and on `hashchange`. Closing clears the hash. Only letters, digits and hyphens are used in the hash.

## 6. Add a plant (controlled form)
Fields: photo, plant name, genus (select), species (suggestions from existing data), cultivar (suggestions), variegation (Standard, Variegated, Albo, Aurea, Pink, Mint, Gold, Marble, Other), description (max 200 characters), then conditions: humidity slider (20 to 100 by 5), temperature number, light (Low, Medium, Bright indirect, Direct sun), soil (list of the mixes used in the collection), watering (list).
- Auto-recognition: as the name is typed, the longest known cultivar found in the name fills genus, species and cultivar (built from the existing plants plus a few built-ins such as Black Velvet, Ninja, Pink Princess, Frydek, Maculata). "Al." means Alocasia, "Phil." Philodendron, "Anth." Anthurium. Words like Pink, Mint, Albo, Aurea, Gold, Marble, Variegated set the variegation. A green "Recognized: ..." note shows what it found. Anything the person edits by hand is never overwritten.
- New tag: genus code (AL, PH, AN, MO, BE, SY, PO, RH, FI, CE, CA, otherwise first two letters) + name initials + `ME` + a number that keeps it unique.
- Photos are resized in the browser to 600px, JPEG quality .72.
- Name and genus are required; everything else is optional.

## 7. Drawing the plants (stand-ins until real photos are used)
- Inline SVG, viewBox `-12 0 124 130`, 3 to 5 leaves per plant. Placement is deterministic from a hash of the tag, so each plant always looks the same.
- Leaf shape by genus: Alocasia narrow arrowhead, Philodendron and Anthurium hearts, Monstera rounded, Begonia asymmetric, others a plain oval.
- Leaf color by genus (muted greens). Velvet, Dark Phoenix, Ace of Spades, Warocqueanum get a deep green with strong light veins. Lime, Neon, Aurea get a yellow-green.
- Variegation: half the leaves get a two-tone gradient. Pink `#e6b8bd`, Aurea/Gold `#d5cf8a`, Mint `#bfe0cc`, Albo/Variegated/Marble/Snow/Tricolor/Splash/Ghost/Galaxy `#f3f1e4`.
- Pot: clear glass with clay pebbles when the soil says semi-hydro (or the stage is TC); otherwise one of three pots (stone clay, cream with a band, sage stoneware). Pothos and Ceropegia get trailing vines over the pot.

## 8. Storage and known limits
- Data is embedded in the page. Plants added in the page and photos are saved in the browser's `localStorage` (key `plantshelf.v1`) in try/catch, so they live only in that browser on that device. A real backend is the next step.
- Most plants have no temperature, light or watering logged yet. Soil is filled for about 88 of 147. Fill these in before relying on the page for care.
- Drawn plants are illustrations, not likenesses. Real photos should become the main image.

## 9. Suggested next steps
1. Add a photo to each plant (photos appear as a propped polaroid on the shelf).
2. Fill in conditions for the rest of the collection.
3. Give the QR codes a stable, permanent link (a small hosted page or JSON file) so printed tags never break.
4. Move storage off `localStorage` so plants and photos sync across devices.
5. Optional skins (colors only) using the CSS variables.

## 10. Layout specific to v4 (shelf only)
- Header: a thin hanging sprig line across the top, the title "Plant Shelf" in large italic Cormorant moss green, a line with the plant and genus counts.
- Buttons: "Data (JSON)" and "+ Add a plant". Then a search field, a "By group / Every plant" toggle and a sort select.
- The shelf: each row is a CSS grid with `n` columns where `n = clamp(floor((width - 20) / 108), 2, 6)`. Plants stand on a 14px pale-ash plank with 1px outline. Two thin line brackets sit under each plank at 9% from each end.
- Under each plant hangs a small paper tag (hairline border, a short string up to the plank) with the name in serif and a smaller line for species or seller. Tags tilt slightly, alternating left and right.
- Every fifth plant, a small decor item (mug with steam, stack of books, candle, leaning picture frame) stands on the shelf. Decor is not clickable.
- Count badge: a small round pill at the top-right of a group plant.
- A plant with a photo shows it as a small white polaroid propped against the pot.

## 11. Wanted addition: twinkle lights
The v4 prototype page only has the thin sprig line at the top. Jess wants the twinkle lights too (they exist in v5). To add them to v4: replace the sprig with an inline SVG strand of 10 small bulbs in warm white, pale sage and blush. Each bulb has a soft halo (radial gradient `#ffe7a0`) that twinkles from 0.25 to 1 opacity over 3.6 seconds, each delayed 0.55 seconds after the last. The whole strand sways plus or minus 0.35 degrees over 9 seconds. With `prefers-reduced-motion`, stop the animation and keep a steady glow. Full spec: section 12 of `plant_shelf_v5_instructions.md`.
