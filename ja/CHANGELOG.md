# 変更履歴

このプロジェクトに関する注目すべき変更はすべてこのファイルに記録されます。

## [0.1.8] - 2026-04-20

### バグ修正

- #172のマージで失われたPRのheadブランチ検出を復元 (#173)
- tag-on-mergeワークフローのタグ作成プロセスを変更 (#174)
- CodeBuildアクションのバージョンを更新しトリガーを追加 (#175)
- フォークではCodeBuildをスキップ (#178)
- 拡張機能のオプトインプロンプトをユーザーの会話言語で表示 (#177)
- READMEのマイナーな更新 (#192)

### CI/CD

- markdownlintインフラを追加 (#159)

### 機能追加

- トレンドレポートのエグゼクティブサマリーをPRコメントとして投稿 (#172)
- セキュリティスキャナーワークフローを追加 (#161)
- エージェント主導のセットアップ — 手動ステップを廃止 (#109)

### その他

- /scripts/aidlc-evaluatorのcryptographyをバンプ (#179)
- /scripts/aidlc-evaluatorのpytestをバンプ (#184)
- /scripts/aidlc-evaluatorのpillowをバンプ (#183)
- ワークフロー内のCodeQLアクションバージョンを修正 (#191)
- /scripts/aidlc-evaluatorのpython-multipartをバンプ (#186)

## [0.1.7] - 2026-04-02

### バグ修正

- 必要な環境変数GITHUB_TOKENを追加 (#137)
- セキュリティ拡張機能の免責事項を追加 (#134)
- リリースワークフローのエラーハンドリングとPR作成をリファクタリング (#140)
- PR #140のレビューフィードバックをリリースワークフローに反映 (#141)
- CodeBuildワークフローのアーティファクトからretention-daysの上限を削除 (#149)
- 読み取り専用GITHUB_TOKENを持つフォークPRでのPRコメントステップをスキップ (#154)
- ラベルリマインダーコメント削除のためのGitHub APIパスを修正 (#157)
- report-bundleのCodeBuildセカンダリアーティファクトを削除し--local-run-dirサポートを追加 (#162)
- rules-refにマージrefではなくPRのheadブランチを使用 (#168)
- CodeBuildをトリガーするためにリリースPRにaidlc-rules/VERSIONを書き込む (#169)

### ドキュメント

- CodeBuildをローカルで実行するための開発者ガイドを追加 (#94)
- working-with-aidlcのインタラクションガイドとwriting-inputsドキュメントを追加 (#121)
- 包括的なドキュメントのレビューと修正 (#113)

### 機能追加

- コードオーナーを追加 (#112)
- ドラフトリリースにビルドアーティファクトを含むchangelog-firstリリースフローを実装 (#125)
- AIDLC評価・レポートフレームワークを追加 (#115)
- プルリクエストのリント条件を更新 (#131)
- リリース間トレンドレポートパッケージを追加 (#136)
- 現在の評価者CLIに合わせてCodeBuildワークフローを整合し、トレンドレポートパイプラインを追加 (#147)
- 「codebuild」ラベルとaidlc-rulesパスにCodeBuildをゲーティング (#150)
- aidlc-rules/に触れるPRにcodebuildラベルを自動付与 (#158)

### その他

- /scripts/aidlc-evaluatorのpyjwtをバンプ (#129)
- /scripts/aidlc-evaluatorのpillowをバンプ (#130)
- /scripts/aidlc-evaluatorのrequestsをバンプ (#146)
- /scripts/aidlc-evaluatorのcryptographyをバンプ (#148)
- /scripts/aidlc-evaluatorのpygmentsをバンプ (#151)
- /scripts/aidlc-evaluatorのaiohttpをバンプ (#163)

## [0.1.6] - 2026-03-05

### バグ修正

- CodeBuildのキャッシュとダウンロードの修正 (#93)
- error-handling.mdのコピー＆ペーストエラーを修正 (#96)

### 機能追加

- CodeBuildワークフローを追加 (#92)

### その他

- GitHubのIssueテンプレートを追加 (#97)

## [0.1.4] - 2026-02-24

### バグ修正

- GitHub Copilotの手順とKiro CLIのrule-detailsパス解決を修正 (#82, #84) (#87)

## [0.1.3] - 2026-02-11

### バグ修正

- 監査タイムスタンプに実際のシステム時刻を要求するよう修正 (#56)

### ドキュメント

- ZIPのダウンロード場所を明確化し、注記を統合 (#70)

## [0.1.2] - 2026-02-08

### バグ修正

- core-workflow.mdのタイポを修正
- ルールの名前変更とCritical Rulesセクションの末尾への移動

### ドキュメント

- ユーザーをGitHub Releasesに誘導するようREADMEを更新 (#61)
- Windows CMDのセットアップ手順とZIPに関する注記を追加 (#68)

### 機能追加

- テスト自動化に対応したコード生成ルールを追加
- Construction(設計・実装)フェーズにフロントエンドデザインのカバレッジを追加

## [0.1.1] - 2026-01-22

### 機能追加

- Claude、OpenCodeなどのIDEで動作するAIDLCスキルを追加
- addin
- leoファイルを追加

### その他

- 誤ったファイルを削除
- 誤ったファイルを削除

## [0.1.0] - 2026-01-22

### 機能追加

- Kiro CLIのサポートとマルチプラットフォームアーキテクチャを追加
