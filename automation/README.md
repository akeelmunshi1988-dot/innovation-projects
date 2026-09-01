# Room Visualizer Agent

This macOS LaunchAgent watches `/Users/user/Downloads/GoogleDriveHarisPhotos`.
For every new or changed JPG, JPEG, PNG, or WebP file, it reads the image and
descriptive filename, creates structured catalog metadata, then generates one catalog
main image plus five high-quality room visualizations in:

`GoogleDriveHarisPhotos/RoomVisualizerOutputs/<source-file-name>/`

Each output folder contains `00-collection-main-transparent.png`, followed by five
numbered room scenes. The catalog image presents the rug upright and front-facing on
a genuine transparent background; filename details guide the material/style treatment
but are never drawn as text onto the image.

After all six images exist, complete metadata is sent automatically. When required
configuration is missing, native macOS dialogs ask for title, description, material,
weave type, sizes, a total price and delivery time for every size, currency, room tags,
and mood tags. The agent then uses the app's authenticated integration API to:

1. upload `00-collection-main-transparent.png` as the catalog cover;
2. create the catalog row with title, description, material, weave type, and per-size total prices and delivery times;
3. upload the five room visualizations as the ordered gallery.

Edit `catalog_defaults.json` to change material IDs, base prices, sizes, currency, or
lead time. Completed imports are recorded in `.processed.json`, preventing duplicates.
Jute is available in the material dialog. Set its `material_ids.jute` value in
`catalog_defaults.json`; while it is `null`, the dialog asks for the Jute material's
API ID when selected.

With `auto_create_when_complete` enabled, complete AI metadata and catalog defaults
skip the questionnaire and call the catalog API immediately. Every configured size
receives an area-scaled, deterministic randomized price using `price_randomization_pct`;
the same source image always receives the same prices on retry. If a required value is
missing—for example, Jute still has a `null` material ID—the macOS questionnaire opens.

After all six visualizations are generated and the catalog upload finishes successfully,
the original rug image is deleted from the watched root folder. Originals are retained
when generation fails, catalog sync fails, or the catalog questionnaire is cancelled.
Cancelling a questionnaire snoozes it so it does not repeatedly interrupt you. Run
`room_visualizer_ctl.sh catalog` to reopen all pending questionnaires, including
folders that already contained all six images before this feature was enabled.

To regenerate and replace only an existing catalog item's main image, run:

`room_visualizer_ctl.sh catalog-update <catalog-id>`

A file picker asks for the dropped original rug image, followed by a confirmation.
The agent generates a fresh, natural, source-faithful portrait cutout and updates only
the catalog `image_url`; gallery images, sizes, prices, inventory, and other fields are unchanged.
You may also pass the original image path as the final command argument.

The agent reads `OPENAI_API_KEY` from `backend/.env`. It fingerprints source files,
so unchanged images are not charged or processed twice. Failed jobs remain pending
and are retried on the next scan.

Useful commands:

```sh
# Start or resume pending work
/Applications/RugManufactureCustomApp/automation/room_visualizer_ctl.sh rerun

# Stop, inspect, or follow progress
/Applications/RugManufactureCustomApp/automation/room_visualizer_ctl.sh stop
/Applications/RugManufactureCustomApp/automation/room_visualizer_ctl.sh status
/Applications/RugManufactureCustomApp/automation/room_visualizer_ctl.sh logs

# Reopen pending catalog questionnaires
/Applications/RugManufactureCustomApp/automation/room_visualizer_ctl.sh catalog

# Run one scan manually
/Applications/RugManufactureCustomApp/backend/venv/bin/python \
  /Applications/RugManufactureCustomApp/automation/room_visualizer_agent.py \
  --watch-dir /Users/user/Downloads/GoogleDriveHarisPhotos \
  --env-file /Applications/RugManufactureCustomApp/backend/.env \
  --once
```
