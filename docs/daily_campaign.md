# Daily Situation Voice Campaign

Run the current daily batch with:

```bash
while IFS='=' read -r key value; do
  case "$key" in
    ''|'#'*) continue ;;
  esac
  export "$key=$value"
done < config/.env.yawa
export YOUTUBE_PUBLISH_AUTO=true
bun src/run_campaign.ts campaigns/daily_situation_voice_campaign.json
```

The manifest currently includes:
- `029_night_station_lounge`
- `030_library_lamp_care`
- `031_morning_kitchen_reset`

Each asset is rendered through the normal `Orchestrator`, so public upload checks remain enforced. Discord notifications are optional and will be skipped when no webhook is configured.
