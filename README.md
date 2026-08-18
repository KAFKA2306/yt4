# yt4

音声・動画制作を、**入力 → 生成 → 品質確認 → 動画化 → 公開**まで同じasset directoryの状態を引き継いで進めるためのproduction pipelineです。

単発の生成結果を増やすことより、途中成果を失わず、どこまで検証済みかを区別し、失敗した工程から再実行できることを重視します。

## できること

現在のorchestratorは次を扱います。

- intentからscriptを生成する、または既存scriptを読む
- TTSで音声を生成する
- ASR validationを実行する
- prosody validationを実行する
- reference audioがある場合にspeaker verificationを実行する
- quality judgmentとrepair queueを扱う
- video compositionを実行する
- audit logを残す
- publisherを呼び出し、設定されている場合はYouTube公開へ進む

正準実装は [`src/runtime/orchestrator.ts`](src/runtime/orchestrator.ts)、品質検証は [`src/validation/`](src/validation/)、assetごとの入力設定は `assets/<asset_dir>/0000_config.json` です。

## 制作の流れ

```text
asset / campaign input
  → script
  → TTS audio
  → ASR / prosody / optional speaker verification
  → quality judgment / repair
  → video composition
  → audit
  → publisher
```

生成物が存在することと、品質確認済みであること、外部公開が成功していることは同じ状態として扱いません。

## 主な入口

実行入口は [`Taskfile.yml`](Taskfile.yml) です。

```bash
# asset directoryを指定して通常のproduction loopを実行
task run -- <asset_dir_name>

# 音声を単独で検証
task validate:audio

# 現在のartifactを監査
task audit

# daily situation voice campaignを実行
task campaign:daily
```

`task campaign:daily` は [`campaigns/daily_situation_voice_campaign.json`](campaigns/daily_situation_voice_campaign.json) を使います。現在このcampaignには次の3 asset directoryが登録されています。

- `029_night_station_lounge`
- `030_library_lamp_care`
- `031_morning_kitchen_reset`

## 公開について

GitHub Actionsの [`Daily Situation Voice Campaign`](.github/workflows/daily_campaign.yml) は `YOUTUBE_PUBLISH_AUTO=true` で実行されます。

workflowは生成を始める前に、次のpublication credentialsが空でないことを確認します。

- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REFRESH_TOKEN`
- `YOUTUBE_PROJECT_ID`
- `YOUTUBE_EXPECTED_CHANNEL_TITLE`
- `DISCORD_WEBHOOK_URL`

不足している場合はworkflowを失敗させ、local-only生成へ自動的に切り替えません。GitHub Actionsでは未設定のsecret参照は空文字列になるため、このpreflightをpublication readinessの判定に使っています。

workflowが成功したことだけでは、動画内容の品質やYouTube上の公開状態をこのREADMEでは保証しません。外部公開を成果として扱う場合は、publisherの結果と公開先を別途確認してください。

## 検証と再実行

制作途中で問題が出た場合は、最初から全工程をやり直す前に、該当asset directoryの入力・生成物・audit結果を確認します。

```bash
task validate:audio
task audit
```

コード品質用の既存commandは次です。

```bash
task lint
```

これは現在 `Biome` と `tsc --noEmit` を実行します。workflowやtoolの存在自体を動画品質の証拠とは扱いません。

## Repository map

```text
assets/       assetごとの入力設定・制作状態
campaigns/    複数assetをまとめるcampaign設定
config/       実行時設定
src/runtime/  production orchestration
src/validation/  ASR・prosody・audit等の検証
Taskfile.yml  人が使う主要command
```

agent向けの追加ルールは [`AGENTS.md`](AGENTS.md) と [`GEMINI.md`](GEMINI.md) にあります。制作内容や公開状態については、agent向け文書より現在の実装・artifact・workflow結果を優先して確認してください。
