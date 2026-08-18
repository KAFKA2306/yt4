# yt4

TypeScript / Bunで動く音声・動画production pipelineです。asset directoryの設定を入力に、scriptまたはintentから音声を生成し、品質検証と監査を行い、video compositionとpublish処理へつなぎます。

現行orchestratorが扱う主な処理:

- intentからscript生成、または既存script読込
- TTSによる音声生成
- ASR validation
- prosody validation
- reference audioがある場合のspeaker verification
- quality judgmentとrepair queue
- video composition
- audit log
- publisher / optional YouTube publish flow

実行入口は `Taskfile.yml` です。

```bash
task run -- <asset_dir_name>
task validate:audio
task audit
task campaign:daily
```

`task campaign:daily` はtrend-driven situation voice campaignを実行し、設定された環境ではYouTube自動公開を有効にします。

正準実装は `src/runtime/orchestrator.ts`、品質検証は `src/validation/`、assetごとの入力設定は `assets/<asset_dir>/0000_config.json` です。
