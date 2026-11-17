# My Plant Shelf

Track every plant: what you have, what is labeled, what is still shipping, what needs repotting, and what you are selling.

- `plant-shelf/index.html` is the app (plain HTML, no build step). Netlify publishes the `plant-shelf` folder.
- `plant-shelf/plant_shelf_v5.html` is the illustrated shelf prototype.
- `supabase/schema.sql` sets up the database. Paste it into Supabase > SQL Editor and run it once.
- Each person signs up with an email and sees only their own plants (row level security).
- Excel import uses the columns in `plant_import_template.xlsx` (download it from the Import tab).

The Supabase URL and publishable key at the top of `index.html` are meant to be public. Never put the secret or service_role key in this repo.
