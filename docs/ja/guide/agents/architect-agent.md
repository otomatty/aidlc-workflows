# Architect Agent

> **エージェント詳細** · [User Guide](../00-introduction.md) › [エージェント](../06-agents.md) › [詳細](README.md) · 技術リファレンス: [architect-agent](../../reference/agents/architect-agent.md)

aidlc-architect-agent はソリューションアーキテクトです。要件を堅牢なシステムアーキテクチャに落とし、Architecture Decision Records（ADR）を書き、ドメインモデルを設計し、プロジェクトを実装できる作業単位へ分解します。パターンとトレードオフで考え、開発者がそのまま実装できる設計を出します。

ライフサイクルで一体がリードするステージ数がいちばん多いエージェントです。Ideation、Inception、Construction にまたがる 7 ステージです。設計の中心であり、高判断エージェント 7 体と同じく `judgment` ティアを持つので、固定のモデルではなくセッションのモデルと effort を継ぎます。`templated` ティアなのは delivery、pipeline-deploy、operations だけです（Claude Code、Codex、opencode では中規模モデル・低 effort。Kiro、Cursor、Copilot では全ティアがセッションのモデルと effort を継ぐ）。出力の大半が型にはまったものだからです。

## リードするステージ

| ステージ | フェーズ | 内容 |
|-------|-------|-------------|
| 1.3 Feasibility & Constraints | Ideation | 技術的な実現性と制約の分析 |
| 2.6 Domain Design | Inception | コンポーネントカタログ、ドメインモデリング、ADR |
| 2.7 Units Generation | Inception | 設計を実装できる作業単位へ分解 |
| 2.8 Contract Design | Inception | ユニット間境界と公開/外部 API の契約 |
| 3.1 Functional Design | Construction | 詳細なドメインモデルとビジネスロジック（ユニットごと） |
| 3.2 NFR Requirements | Construction | 測定可能な目標付きの非機能要件（ユニットごと） |
| 3.3 NFR Design | Construction | キャッシュ、レジリエンス、セキュリティ、オブザーバビリティの技術方針（ユニットごと） |

ステージ 2.1（Reverse Engineering）の合成ステップもリードします。aidlc-developer-agent のコードスキャン結果を受け取り、アーキテクチャ成果物 9 点を出します。

## サポートするステージ

| ステージ | フェーズ | 寄与 |
|-------|-------|-------------|
| 1.1 Intent Capture | Ideation | 技術的な文脈を足す |
| 2.1 Reverse Engineering（パイプライン最終リンクとしてディスパッチ） | Inception | コードスキャン結果を一貫したアーキテクチャモデルへ合成する |
| 2.9 Delivery Planning | Inception | ビルド順がアーキテクチャの依存と合うかを検証する |

## 動きのイメージ

動いているときは、境界、パターン、トレードオフに集中します。既存システムの制約、技術の好み、スケール要件、運用上の懸念を聞きます。出すのは、判断根拠が明示された設計文書、Markdown で書いたコンポーネント図、重要な選択ごとの ADR です。

## 協働の仕方

要件は aidlc-product-agent、コードスキャン結果は aidlc-developer-agent から受け取ります。AWS サービスの対応づけでは aidlc-aws-platform-agent、セキュア設計では aidlc-devsecops-agent、規制の拘束では aidlc-compliance-agent と組みます。出力（ユニット仕様、API 契約、NFR 目標）は aidlc-developer-agent、aidlc-quality-agent、aidlc-aws-platform-agent が使います。

## 原則

- 設計成果物はすべて、根拠が明示された判断にたどれること
- コンポーネント内部より、境界を正しく切ることのほうが大事
- コンポーネント間の依存は、徹底して小さくする
- 再利用より変更しやすさ。改修しやすさに最適化する
- 隠れた前提を表に出す。データフロー、所有、障害モードを見せる
- 戻せる判断を選ぶ。戻せないものは、余計に吟味する
