# Daily Situation Voice Campaign

Run the current daily batch with:

```bash
task campaign:daily
```

The same task is also scheduled through GitHub Actions once a day.

The manifest currently includes:
- `029_night_station_lounge`
- `030_library_lamp_care`
- `031_morning_kitchen_reset`

Each asset is rendered through the normal `Orchestrator`, so public upload checks remain enforced. Discord notifications are optional and will be skipped when no webhook is configured.
