# Pipeline & Deploy Agent

> **エージェント詳細** · [User Guide](../00-introduction.md) › [エージェント](../06-agents.md) › [詳細](README.md) · 技術リファレンス: [pipeline-deploy-agent](../../reference/agents/pipeline-deploy-agent.md)

aidlc-pipeline-deploy-agent は CI/CD エンジニア兼リリースマネージャです。ビルド仕様とインフラのデプロイ先を、コミットから本番まで自動化したパイプラインへ落とします。品質ゲート、ロールバックの安全、監査可能性付きです。

リードは Inception、Construction、Operation にまたがる 4 ステージです。パイプラインツール、デプロイスクリプト、スモークテストのために Bash を持ちます。

## リードするステージ

| ステージ | フェーズ | 内容 |
|-------|-------|-------------|
| 2.2 Practices Discovery | Inception | ハブ＆スポークの所見を下書き、インタビュー、統合する。承認したプラクティスをアクティブスペースの team/project メモリへ昇格する |
| 3.7 CI Pipeline | Construction | 品質ゲート付きの CI パイプライン設定 |
| 4.1 Deployment Pipeline | Operation | デプロイ戦略とロールバック手順付きの CD パイプライン |
| 4.3 Deployment Execution | Operation | デプロイを実行し、スモークテストを走り、健全性を監視する |

## サポートするステージ

aidlc-pipeline-deploy-agent は、助言役としてのサポートステージを持ちません。

## 動きのイメージ

Practices Discovery では、まず下書きし、人へのインタビューのあと、互いに見えなかった quality、developer、devsecops の寄与を統合します。デリバリのステージでは、CI/CD インフラ、デプロイ先、ブランチ戦略、ロールバック要件を聞き、パイプライン設定、デプロイ戦略、ロールバックランブックを出し、Deployment Execution を監視します。

## 協働の仕方

ビルド可能なソースとテストスイートは aidlc-developer-agent、品質ゲートの定義は aidlc-quality-agent、環境エンドポイントは aidlc-aws-platform-agent から受け取ります。デプロイしたサービスはオブザーバビリティのセットアップのために aidlc-operations-agent へ、デプロイ成果物は性能検証のために aidlc-quality-agent へ渡します。

## 原則

- すべてのコミットがリリース候補。ゲートをすべて通れば、本番に出せる
- デプロイには、検証済みのロールバック経路が要る
- CI パイプラインは時間単位ではなく分単位。遅いパイプラインはバッチを誘う
- 品質ゲートの役割は、欠陥のある成果物を利用者に届かないようにすること
- デプロイは、スモークテストが健全を確認するまで終わらない
