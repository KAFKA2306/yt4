# yt4 Total Audit System: 全方位監査システム

本プロジェクトの「Zero-Trust」生産パイプラインを支える多層的な監査システムの設計指針と構造を詳述します。
本システムは、機械的な静的解析から、実行時の音声品質検証、そして最終的な外部プラットフォーム（YouTube）との整合性証明までを網羅します。

---

## 1. 監査の 4 つの視点 (The Four Perspectives)

### A. 構造的整合性監査 (Coherence Audit / CoDD)
**対象**: 開発プロセス、ディレクトリ構造、ADR 遵守状況
- **ツール**: `src/validation/coherence.ts` (triggered by `task codd:verify`)
- **検証項目**:
  - **ADR Drift**: 実装コードの更新日時が、対応する ADR の更新日時より新しすぎないか（設計の形骸化チェック）。
  - **Zero-Fat**: コード内に `TODO` や `FIXME` が残っていないか。
  - **Crash-Driven**: `runtime/` 以下のビジネスロジックに禁忌である `try-catch` が含まれていないか。
  - **DAG Coverage**: すべての実装ファイルが要件（ADR）とリンクされているか。

### B. ゼロトラスト・コントラクト監査 (Zero-Trust Contract Audit)
**対象**: 特定のセッションで生成された全成果物
- **ツール**: `src/validation/contract.ts` (triggered by `task audit`)
- **検証項目**:
  - **Artifact Integrity**: 出力された音声、画像、スクリプトのハッシュ値が、コントラクト署名時と一致するか。
  - **Replay Protection**: 生成物がコントラクトの発行時間よりも古い「使い回し」ではないか。
  - **Evidence Binding**: 生成時のマシンログがコントラクトに含まれており、その中に当該 SessionID が記録されているか。

### C. 音響・意味論監査 (Acoustic & Semantic Audit)
**対象**: 生成された音声（WAV）の品質
- **ツール**: `src/validation/engine.ts`, `src/validation/judge.ts`
- **検証項目**:
  - **ASR Verification**: Whisper による書き起こしとスクリプトの CER (Character Error Rate) が閾値（0.85）を超えているか。
  - **Speaker Consistency**: 参照音声（reference.wav）と生成音声の声紋一致度。
  - **Prosody Analysis**: F0（基本周波数）やエネルギー分布、無音区間の割合が許容範囲内か。
  - **LLM Judge**: `judge.ts` が上記メトリクスを総合判断し、再生成（Repair）が必要な失敗（SPEAKER_DRIFT, REPETITION_LOOP 等）を特定する。

### D. リモート証跡監査 (Remote Proof Audit)
**対象**: YouTube API を介した公開状態の検証
- **ツール**: `src/runtime/publisher.ts`, `src/validation/audit_cli.ts --live`
- **検証項目**:
  - **Visibility Enforcement**: 公開設定が原則 `public` になっているか。
  - **Bounded Honesty**: ローカルのコントラクトに記録された `videoId` が、実際にプラットフォーム上で期待されるメタデータ（タイトル、公開設定）と一致するか。
  - **Discord Announcement**: 公開投稿の URL が `DISCORD_WEBHOOK_URL` 経由で Discord に通知されるか。

---

## 2. ワークフローとエラー処理

1.  **自動実行**: `Orchestrator` は各セッション終了時に `certifyContract` を呼び出し、証跡を `_CONTRACT.json` に封じ込めます。
2.  **ハードフォールト**: 監査のいずれかの段階で `QUALITY_FAIL` が検出された場合、システムは「クラッシュ駆動」原則に基づき、即座に実行を停止（Fatal Error）します。
3.  **修復（Repair）**: `engine.ts` の結果に基づき、`RepairEngine` がシード値の変更やプロンプトの調整を行います。これは **Bounded Retry Mechanics（有限再試行メカニズム）** として機能し、最大試行回数を制限することで無限ループを防止しつつ、自律的な品質回復を試みます。

## 3. 監査コマンド一覧

| コマンド | 用途 |
| :--- | :--- |
| `task audit` | 全セッションのコントラクト整合性と構造的一貫性を検証 |
| `task codd:verify` | ADR と実装の乖離、Zero-Fat 原則の遵守状況のみを高速検証 |
| `bun src/validation/audit_cli.ts --live` | YouTube API を叩き、実際の公開設定とコントラクトの整合性を検証 |

---

## 5. 理論的背景とガバナンスへの適合 (Theoretical Alignment)

本システムは、現代の自律型 AI ガバナンスにおける **ETCLOVG タクソノミー** の「V（検証と評価）」および「G（ガバナンスとセキュリティ）」層を具現化したものです。

- **EviBound (Evidence-Bound Autonomous Research)**: 証跡が存在しない限り成果物の進行を物理的にブロックする設計（Evidence Binding）を採用。
- **Self-Attestation から Telemetry へ**: 人間による事後承認（自己申告）に依存せず、機械的に収集された証跡（テレメトリ）のみを信頼の根拠とするパラダイムシフトを実現。
- **CapSeal 的アプローチ**: SessionID とタイムスタンプを用いた Replay Protection により、セッションに厳密に紐づいた実行（Bounded Execution）を強制。

本アーキテクチャは、自律型エージェントがいかにして人間や外部プラットフォームからの「Trust（信頼）」を自動的に獲得・維持するかという問いに対する、技術的な回答です。
