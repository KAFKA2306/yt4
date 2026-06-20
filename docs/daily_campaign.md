# Daily Situation Voice Campaign

Run the current daily batch with:

```bash
YOUTUBE_PUBLISH_AUTO=true DISCORD_WEBHOOK_URL=... bun src/run_campaign.ts campaigns/daily_situation_voice_campaign.json
```

The manifest currently includes:
- `029_night_station_lounge`
- `030_library_lamp_care`
- `031_morning_kitchen_reset`

Each asset is rendered through the normal `Orchestrator`, so public upload checks and Discord URL notifications remain enforced.
