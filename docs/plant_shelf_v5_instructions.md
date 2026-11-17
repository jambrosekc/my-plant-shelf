# Plant Shelf v5: build instructions

Version 5 is v4 plus a layout switch, string lights, and personal touches. Live prototype: https://claude.ai/artifact/GggAhsD7i4k5L1EHxVemiN

Everything below applies to both layouts. Section 10 covers the shelf layout (same as v4), section 11 the board layout, and sections 12 and 13 what is new in v5.

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

## 10. Shelf layout (same as v4)
- Each row is a CSS grid with `n = clamp(floor((width - 20) / 108), 2, 6)` columns. Plants stand on a 14px pale-ash plank with a 1px outline and two thin line brackets. Hanging paper tags show the name and species or seller. Every fifth plant, a small decor item stands on the shelf (mug, books, candle, picture frame).

## 11. Board layout (new)
- A tab row at the top switches between "Shelf" and "Board". The selected tab is italic moss on a card background with a hairline border. The choice is remembered in `localStorage` (key `plantshelf.layout`, wrapped in try/catch).
- The board is a masonry (CSS columns, `column-width: 150px`, `column-gap: 14px`).
- Each card: hairline border, 14px radius. A thin top bar with three small hollow dots and the tag code (or genus name) in small caps on the right. An art panel with a soft tinted background (sand, blush, sage or card-2, chosen by a hash of the tag so it stays stable) and a varied height so the columns feel like a pinned board. The plant stands on a thin wood strip at the bottom of the panel. A caption with the name in serif and a muted line for species or variegation and seller.
- A group of several plants gets a stacked-paper edge and the count badge. Single-plant groups open the plant directly.
- Same drill-down, search, sort, and plant page as the shelf. Decor items are not shown on the board.

## 12. String lights (new)
- An inline SVG strand across the top of the page: a thin curved line with 10 small bulbs in warm white, pale sage and blush.
- Each bulb has a soft halo (radial gradient `#ffe7a0`) that twinkles: opacity 0.25 to 1 over 3.6 seconds, with each bulb delayed by an extra 0.55 seconds.
- The whole strand sways slowly by plus or minus 0.35 degrees over 9 seconds.
- With `prefers-reduced-motion`, the animation stops and the halos stay at a steady glow.

## 13. Personal touches (new)
- Title: "Jess's Plant Shelf".
- Greeting under the title, by local hour: before 5 "Burning the midnight oil", before 12 "Good morning", before 17 "Good afternoon", otherwise "Good evening". Then the plant and genus counts, for example "Good evening, Jess. 147 plants, 12 genera, all home."
- "Today's pick": a pill under the greeting. It picks one plant per day (a hash of the date string modulo the plant count) and opens its page when tapped.
- Plant page: a line under the name says how long the plant has been with her, from the purchase date: "Joined your shelf today", "With you for 1 day", "With you for N days" (under 60 days), otherwise "With you for about N months". Plants with no date say "Part of your shelf".
- Empty conditions say "Not logged yet".
