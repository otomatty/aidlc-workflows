# Changelog

このファイルには、プロジェクトに対するすべての重要な変更が記録されています。

## [0.1.8] - 2026-04-20

### バグ修正

- #172のマージで失われたPRヘッドブランチ検出を復元 (#173)
- tag-on-mergeワークフローのタグ作成プロセスを修正 (#174)
- CodeBuildアクションのバージョンを更新しトリガーを追加 (#175)
- フォークはCodeBuildをスキップ (#178)
- 拡張機能のオプトインプロンプトをユーザーの会話言語で表示 (#177)
- READMEのマイナーアップデート (#192)

### CI/CD

- markdownlintインフラを追加 (#159)

### 機能追加

- トレンドレポートのエグゼクティブサマリーをPRコメントとして投稿 (#172)
- セキュリティスキャナーワークフローを追加 (#161)
- エージェント主導のセットアップ — 手動ステップを廃止 (#109)

### その他

- /scripts/aidlc-evaluator の cryptography をバンプ (#179)
- /scripts/aidlc-evaluator の pytest をバンプ (#184)
- /scripts/aidlc-evaluator の pillow をバンプ (#183)
- ワークフロー内のCodeQLアクションバージョンを修正 (#191)
- /scripts/aidlc-evaluator の python-multipart をバンプ (#186)

## [0.1.7] - 2026-04-02

### バグ修正

- 必要な環境変数GitHubトークンを追加 (#137)
- セキュリティ拡張機能の免責事項を追加 (#134)
- リリースワークフローのエラー処理とPR作成をリファクタリング (#140)
- リリースワークフローのPR #140レビューフィードバックに対応 (#141)
- CodeBuildワークフローアーティファクトからretention-days制限を削除 (#149)
- 読み取り専用GITHUB_TOKENを持つフォークPRのPRコメントステップをスキップ (#154)
- label-reminderコメント削除のGitHub APIパスを修正 (#157)
- report-bundle CodeBuildセカンダリアーティファクトを削除し--local-run-dirサポートを追加 (#162)
- マージrefの代わりにPRヘッドブランチをrules-refとして使用 (#168)
- CodeBuildをトリガーするためリリースPRにaidlc-rules/VERSIONを書き込み (#169)

### ドキュメント

- CodeBuildをローカルで実行するための開発者ガイドを追加 (#94)
- working-with-aidlcインタラクションガイドとwriting-inputsドキュメントを追加 (#121)
- 包括的なドキュメントレビューと修正 (#113)

### 機能追加

- コードオーナーを追加 (#112)
- ドラフトリリースへのビルドアーティファクト付きchangelog-firstリリースフローを追加 (#125)
- AIDLC評価・レポートフレームワークを追加 (#115)
- プルリクエストリントの条件を更新 (#131)
- リリース間クロストレンドレポートパッケージを追加 (#136)
- 現在の評価CLIに合わせてCodeBuildワークフローを整合し、トレンドレポートパイプラインを追加 (#147)
- 'codebuild'ラベル + aidlc-rulesパスでCodeBuildをゲート (#150)
- aidlc-rules/に触れるPRにcodebuildラベルを自動付与 (#158)

### その他

- /scripts/aidlc-evaluator の pyjwt をバンプ (#129)
- /scripts/aidlc-evaluator の pillow をバンプ (#130)
- /scripts/aidlc-evaluator の requests をバンプ (#146)
- /scripts/aidlc-evaluator の cryptography をバンプ (#148)
- /scripts/aidlc-evaluator の pygments をバンプ (#151)
- /scripts/aidlc-evaluator の aiohttp をバンプ (#163)

## [0.1.6] - 2026-03-05

### バグ修正

- CodeBuildのキャッシュとダウンロードの修正 (#93)
- error-handling.md のコピー&ペーストミスを修正 (#96)

### 機能追加

- CodeBuildワークフローを追加 (#92)

### その他

- GitHubイシューのテンプレートを追加 (#97)

## [0.1.4] - 2026-02-24

### バグ修正

- GitHub CopilotのインストラクションとKiro CLIのrule-detailsパス解決を修正 (#82, #84) (#87)

## [0.1.3] - 2026-02-11

### バグ修正

- 監査タイムスタンプに実際のシステム時刻を要求 (#56)

### ドキュメント

- ZIPダウンロード場所を明確化し、注意事項を統合 (#70)

## [0.1.2] - 2026-02-08

### バグ修正

- core-workflow.md のタイポを修正
- ルールをリネームしてCritical Rulesセクションの末尾に移動

### ドキュメント

- READMEを更新してユーザーをGitHub Releasesへ誘導 (#61)
- Windows CMDのセットアップ手順とZIPに関する注意を追加 (#68)

### 機能追加

- テスト自動化に適したコード生成ルールを追加
- Construction(実装)フェーズにフロントエンドデザインのカバレッジを追加

## [0.1.1] - 2026-01-22

### 機能追加

- Claude、OpenCodeなどのIDEと連携するためのAIDLCスキルを追加
- addin
- leoファイルを追加

### その他

- 不要なファイルを削除
- 不要なファイルを削除

## [0.1.0] - 2026-01-22

### 機能追加

- Kiro CLIサポートとマルチプラットフォームアーキテクチャを追加
