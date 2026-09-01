# aidlc-architect-agent — 技術リファレンス

## 身元

| フィールド | 値 |
|-------|-------|
| Name | aidlc-architect-agent |
| Tier | **judgment** |
| Allowed Claude Code Tools | Read, Edit, Write, Glob, Grep, AskUserQuestion |
| Disallowed Claude Code Tools | Task |

aidlc-architect-agent は中核の設計権威です。ライフサイクルの 3 フェーズにまたがる、いちばんアーキテクチャが重い推論を持ちます。`judgment` ティアは、判断が重いほか 7 体と並びます。`templated` の 3 体（delivery、pipeline-deploy、operations）は、型が主の計画、CI/CD、ランブック出力です。

---

## ステージ所有

### リードステージ

| ステージ | 名前 | このエージェントがすること |
|-------|------|----------------------|
| feasibility | Feasibility and Constraint Analysis | 技術的な実現可能性を見、統合拘束を拾い、拘束レジスタとリスク評価を出す |
| domain-design | Domain Design | システムアーキテクチャを設計する。境界づけられたコンテキスト、コンポーネントインタフェース、アーキテクチャスタイルの選択、ADR |
| units-generation | Units Generation | ドメイン設計を実装できる作業ユニットへ分解する。境界と依存 DAG 付き。経済順（何を先に出すか、なぜか）は delivery-planning ステージの判断 |
| functional-design | Functional Design | 詳細ドメインモデル、シーケンス図、API 仕様、データモデル、状態遷移を作る |
| nfr-requirements | NFR Requirements | 性能、セキュリティ、スケーラビリティ、信頼性、可観測性の、測れる目標付き非機能要件を列挙する |
| nfr-design | NFR Design | NFR の技術アプローチを設計する。キャッシュ、サーキットブレーカ、耐障害、セキュリティアーキテクチャ、可観測性 |

### サポートステージ

| ステージ | 名前 | このエージェントが寄与すること |
|-------|------|-----------------------------|
| intent-capture | Intent Capture and Framing | 取ったインテントに技術文脈と実現可能性の視点を足す |
| reverse-engineering | Reverse Engineering（委譲パイプラインの最後のリンク） | aidlc-developer-agent のコードスキャン結果を受け、一貫したアーキテクチャモデルへ合成する |
| delivery-planning | Delivery Planning | アーキテクチャ依存とコンポーネント結合に対してビルド順を確かめる |

---

## 協働の型

### 受け取る相手

| 出所 | 成果物 |
|--------|-----------|
| aidlc-product-agent | 要件、ユーザーストーリー、インテントバックログ |
| aidlc-developer-agent | リバースエンジニアリング合成向けのコードスキャン結果 |

### 渡す相手

| 行き先 | 成果物 |
|--------|-----------|
| aidlc-developer-agent | 作業ユニット仕様、API 契約、設計パターン |
| aidlc-quality-agent | テスト境界、検証向けの NFR 目標 |
| aidlc-aws-platform-agent | ドメイン設計から導いたインフラ要件 |

---

## ナレッジ源

### 方法論（Tier 1）

パス: `.claude/knowledge/aidlc-architect-agent/`

| ファイル | 内容 |
|------|---------|
| adr-template.md | Architecture Decision Record のテンプレートと例 |
| architecture-guide.md | アーキテクチャの方法論と設計過程 |
| architecture-patterns.md | アーキテクチャスタイルのパターン（マイクロサービス、モジュラーモノリス、イベント駆動、サーバレス） |
| ddd-patterns.md | ドメイン駆動設計のパターン（境界づけられたコンテキスト、集約、エンティティ、値オブジェクト） |
| nfr-design-guide.md | 非機能要件設計の方法論 |
| nfr-design-patterns.md | NFR 実装の技術パターン（キャッシュ、サーキットブレーカ、耐障害） |

### チーム（Tier 2）

パス: `aidlc/knowledge/aidlc-architect-agent/`（スペース単位のナレッジディレクトリ。利用者が管理）

チームが中身があるときに作るスペース単位ディレクトリです（エンジンは `aidlc/knowledge/` を空で出荷します）。既存アーキテクチャ図、テクノロジレーダー、承認済みパターン、拘束レジスタなど、プロジェクト固有のアーキテクチャ文脈をチームが埋めます。

---

## 相互参照

- [Agent Reference Overview](README.md)
- [Agent Guide: aidlc-architect-agent](../../guide/agents/architect-agent.md)
- [Stage Documentation](../04-stages/)
- 正本: [`dist/claude/.claude/agents/aidlc-architect-agent.md`](../../../dist/claude/.claude/agents/aidlc-architect-agent.md)
