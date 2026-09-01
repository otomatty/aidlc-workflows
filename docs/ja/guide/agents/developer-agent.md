# Developer Agent

> **エージェント詳細** · [User Guide](../00-introduction.md) › [エージェント](../06-agents.md) › [詳細](README.md) · 技術リファレンス: [developer-agent](../../reference/agents/developer-agent.md)

aidlc-developer-agent はシニアソフトウェア開発者です。アーキテクチャ設計とユニット仕様を、本番品質のコードへ落とします。リバースエンジニアリングでは深いコードスキャンを行い、aidlc-architect-agent がそれを合成します。

リードは Reverse Engineering のコードスキャンと Code Generation です。Inception の 2 つのアンサンブルではディスパッチされた協力者でもあります。Practices Discovery のハブ＆スポークではコードパターンの証拠を見、User Stories のモブでは実装可能性の声を出します。Code Generation は集中したサブエージェントとして走ります。ビルドツール、パッケージマネージャ、テストコマンドのために Bash を持ちます。

ワークスペース検出（0.2）は以前、aidlc-developer-agent がサブエージェントとしてリードしていました。いまは `aidlc-utility intent-create` の中で、ルールベースのスキャナとして決定論的に走ります。aidlc-developer-agent は Initialization にはもう関わりません。

## リードするステージ

| ステージ | フェーズ | 内容 |
|-------|-------|-------------|
| 2.1 Reverse Engineering（コードスキャン） | Inception | 深いコードスキャン。アーキテクトの合成向けに構造化した分析を出す |
| 3.5 Code Generation | Construction | 設計仕様から作業単位を実装する（ユニットごと） |

## サポートするステージ

| ステージ | フェーズ | 寄与 |
|-------|-------|-------------|
| 2.2 Practices Discovery | Inception | 互いに見えないコードパターンのスポーク。自分の寄与ファイルを書く |
| 2.4 User Stories | Inception | モブでの実装可能性の声。自分の寄与ファイルを書く |
| 3.1 Functional Design | Construction | API 契約とデータモデルの入力 |
| 4.3 Deployment Execution | Operation | データベースマイグレーション |

## 動きのイメージ

Code Generation ではサブエージェントとして走ります。直接は対話しません。進捗表示のあと、完了時に結果が見えます。オーケストレータが先にコード生成計画を出して承認を取り、そのあとサブエージェントが各ステップを実装します。

アプリケーションコードはワークスペースのルートへ直接書きます（インテントのレコードディレクトリではありません）。何を作り、何を変えたかは、インテントのレコードディレクトリの `code-summary.md` に残します。

## 協働の仕方

ユニット仕様と設計パターンは aidlc-architect-agent、テスト要件は aidlc-quality-agent から受け取ります。CDK/インフラの整合では aidlc-aws-platform-agent、セキュアコーディングでは aidlc-devsecops-agent と組みます。コードスキャン結果は合成のために aidlc-architect-agent へ、実装コードはテストのために aidlc-quality-agent へ渡します。

## 原則

- 動く、テスト済みの実装を出す。リファクタは次の反復で
- プロジェクト既存のパターンと慣習に従う
- 読みやすく、デバッグしやすいコード。賢い抽象は避ける
- 入力は早く検証し、意味のあるエラーを投げ、例外を飲み込まない
- 生成したユニットには、少なくともハッピーパスのテストを 1 つ付ける
- リバースエンジニアリングでは、スキャンの徹底さが合成の質を決める
