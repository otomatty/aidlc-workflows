# aidlc-product-agent — 技術リファレンス

## 身元

| フィールド | 値 |
|-------|-------|
| Name | aidlc-product-agent |
| Tier | **judgment** |
| Allowed Claude Code Tools | Read, Edit, Write, Glob, Grep, WebSearch, AskUserQuestion |
| Disallowed Claude Code Tools | Task |

---

## ステージ所有

### リードステージ

| ステージ | 名前 | このエージェントがすること |
|-------|------|----------------------|
| intent-capture | Intent Capture and Framing | ステークホルダ入力から、事業インテント、問題文、成功指標、初期拘束を取る |
| market-research | Market Research and Competitive Analysis | 競争環境、市場動向、作るか買うかのトレードオフ、差別化の機会を調べる |
| scope-definition | Scope Definition and Prioritization | スコープ境界（中 / 外）を決め、優先フレームワークを当て、Intent Backlog を作る |
| requirements-analysis | Requirements Analysis | Ideation 成果物から要件を構造化し、追える・試せる仕様にする |
| user-stories | User Stories | 要件を INVEST に合うユーザーストーリーへ変える。ペルソナ、受け入れ基準、依存の対応付き |

### サポートステージ

| ステージ | 名前 | このエージェントが寄与すること |
|-------|------|-----------------------------|
| rough-mockups | Rough Mockups and Concept Visualization | 取ったインテントと利用者の必要に対してワイヤーフレームを確かめる |
| approval-handoff | Initiative Approval and Handoff | フェーズ遷移の前に、イニシアチブブリーフの揃いを確かめる |
| refined-mockups | Refined Mockups and UX Design | ユーザーストーリーと受け入れ基準に対して洗練デザインを確かめる |

---

## 協働の型

### 受け取る相手

| 出所 | 成果物 |
|--------|-----------|
| 利用者 / ステークホルダ入力 | 生の事業必要、領域知識、プロジェクト説明 |
| 既存文書 | 先行成果物、レガシーシステムの文書 |
| aidlc-operations-agent | 本番からの運用フィードバック。次の Ideation 周期へ（ライフサイクルを閉じる） |

### 渡す相手

| 行き先 | 成果物 |
|--------|-----------|
| aidlc-architect-agent | システム設計と分解向けの、確めた要件 |
| aidlc-developer-agent | コード生成向けのストーリー仕様 |
| aidlc-quality-agent | テストケース設計向けの受け入れ基準 |
| aidlc-delivery-agent | デリバリ計画向けの優先バックログ |

---

## ナレッジ源

### 方法論（Tier 1）

パス: `.claude/knowledge/aidlc-product-agent/`

| ファイル | 内容 |
|------|---------|
| functional-design-guide.md | 機能設計の方法論 |
| market-research-methods.md | 市場調査の技法とテンプレート |
| prioritization-frameworks.md | MoSCoW、WSJF、RICE、Kano |
| product-guide.md | プロダクトマネジメントの方法論 |
| requirements-elicitation.md | 要件収集の技法 |
| requirements-guide.md | 要件分析の方法論 |
| user-story-patterns.md | INVEST 基準、ストーリーパターン、受け入れ基準テンプレート |

### チーム（Tier 2）

パス: `aidlc/knowledge/aidlc-product-agent/`（スペース単位のナレッジディレクトリ。利用者が管理）

チームが中身があるときに作るスペース単位ディレクトリです（エンジンは `aidlc/knowledge/` を空で出荷します）。既存ペルソナ、市場調査、領域用語集、ステークホルダへの伝え方など、プロジェクト固有のプロダクトナレッジをチームが埋めます。

---

## 相互参照

- [Agent Reference Overview](README.md)
- [Agent Guide: aidlc-product-agent](../../guide/agents/product-agent.md)
- [Stage Documentation](../04-stages/)
- 正本: [`dist/claude/.claude/agents/aidlc-product-agent.md`](../../../dist/claude/.claude/agents/aidlc-product-agent.md)
