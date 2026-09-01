# aidlc-design-agent — 技術リファレンス

## 身元

| フィールド | 値 |
|-------|-------|
| Name | aidlc-design-agent |
| Tier | **judgment** |
| Allowed Claude Code Tools | Read, Edit, Write, Glob, Grep, WebSearch, AskUserQuestion |
| Disallowed Claude Code Tools | Task |

---

## ステージ所有

### リードステージ

| ステージ | 名前 | このエージェントがすること |
|-------|------|----------------------|
| rough-mockups | Rough Mockups and Concept Visualization | Ideation で低忠実度のワイヤーフレーム、コンセプトスケッチ、初期情報アーキテクチャを作る |
| refined-mockups | Refined Mockups and UX Design | ワイヤーフレームを中〜高忠実度のモックへ育てる。インタラクション仕様、レスポンシブ、アクセシビリティ注記付き |

### サポートステージ

| ステージ | 名前 | このエージェントが寄与すること |
|-------|------|-----------------------------|
| user-stories | User Stories | インタラクション詳細と UX 受け入れ基準でストーリーを豊かにする |
| domain-design | Domain Design | UI コンポーネント仕様とデザインシステム対応を寄与する |

---

## 協働の型

### 受け取る相手

| 出所 | 成果物 |
|--------|-----------|
| aidlc-product-agent | ユーザーストーリー、ペルソナ、インテント、ユーザージャーニーの文脈 |
| aidlc-architect-agent | コンポーネント設計の拘束、UI に効く技術の限界 |

### 渡す相手

| 行き先 | 成果物 |
|--------|-----------|
| aidlc-developer-agent | 実装向けのインタラクション仕様、コンポーネント仕様 |
| aidlc-quality-agent | テスト向けの UX 受け入れ基準、アクセシビリティ要件 |

---

## ナレッジ源

### 方法論（Tier 1）

パス: `.claude/knowledge/aidlc-design-agent/`

| ファイル | 内容 |
|------|---------|
| accessibility-wcag.md | WCAG 2.1 AA 指針と実装パターン |
| component-spec-template.md | コンポーネント仕様の文書テンプレート（状態、props、振る舞い） |
| interaction-design-patterns.md | ナビ、フォーム、フィードバック、状態遷移のインタラクションパターン |
| ux-guide.md | UX 設計の方法論と原則 |
| wireframing-guide.md | 低忠実度と高忠実度のワイヤーフレーム技法 |

### チーム（Tier 2）

パス: `aidlc/knowledge/aidlc-design-agent/`（スペース単位のナレッジディレクトリ。利用者が管理）

チームが中身があるときに作るスペース単位ディレクトリです（エンジンは `aidlc/knowledge/` を空で出荷します）。既存デザインシステム、ブランド指針、タイポグラフィ規則、コンポーネントライブラリなど、プロジェクト固有のデザイン資産をチームが埋めます。

---

## 相互参照

- [Agent Reference Overview](README.md)
- [Agent Guide: aidlc-design-agent](../../guide/agents/design-agent.md)
- [Stage Documentation](../04-stages/)
- 正本: [`dist/claude/.claude/agents/aidlc-design-agent.md`](../../../dist/claude/.claude/agents/aidlc-design-agent.md)
