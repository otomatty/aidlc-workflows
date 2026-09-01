# aidlc-delivery-agent — 技術リファレンス

## 身元

| フィールド | 値 |
|-------|-------|
| Name | aidlc-delivery-agent |
| Tier | **templated** |
| Allowed Claude Code Tools | Read, Edit, Write, Glob, Grep, AskUserQuestion |
| Disallowed Claude Code Tools | Task |

---

## ステージ所有

### リードステージ

| ステージ | 名前 | このエージェントがすること |
|-------|------|----------------------|
| team-formation | Team Formation | 必要なスキル集合を見積もり、モブを編成し、コミュニケーション規範を決める |
| approval-handoff | Initiative Approval and Handoff | イニシアチブブリーフをまとめ、揃いを確かめ、ステークホルダ承認に出し、フェーズ引き渡しを実行する |
| delivery-planning | Delivery Planning | ボルト列を計画する（units-generation ステージの依存 DAG による経済順）、モブを割り当て、ボルトごとの Definition of Done と確信度の仮説を書く |

### サポートステージ

| ステージ | 名前 | このエージェントが寄与すること |
|-------|------|-----------------------------|
| scope-definition | Scope Definition and Prioritization | デリバリ可能性と使えるキャパシティに対してスコープを確かめる |
| units-generation | Units Generation | ユニット粒度を計画の必要とデリバリ順の要求に合わせる |

---

## 協働の型

### 受け取る相手

| 出所 | 成果物 |
|--------|-----------|
| aidlc-product-agent | スコープ、優先、イニシアチブの枠、優先バックログ |
| aidlc-architect-agent | ユニット、複雑さ見積もり、依存グラフ |

### 渡す相手

| 行き先 | 成果物 |
|--------|-----------|
| Construction の全エージェント | デリバリ計画、モブ割り当て、ボルト列 |
| オーケストレータ | フェーズゲート承認向けのイニシアチブブリーフ |

---

## ナレッジ源

### 方法論（Tier 1）

パス: `.claude/knowledge/aidlc-delivery-agent/`

| ファイル | 内容 |
|------|---------|
| mob-programming-guide.md | モブプログラミングの型、役割（ドライバ、ナビゲータ、リサーチャ）、チーム編成 |
| team-topologies.md | チーム編成の型とコミュニケーション構造 |
| workflow-planning-guide.md | デリバリ計画: 経済順対トポロジ順、WSJF、walking skeleton、ボルト DoD の型 |

### チーム（Tier 2）

パス: `aidlc/knowledge/aidlc-delivery-agent/`（スペース単位のナレッジディレクトリ。利用者が管理）

チームが中身があるときに作るスペース単位ディレクトリです（エンジンは `aidlc/knowledge/` を空で出荷します）。チームの慣例、ボルトサイズの好み、組織のキャパシティ拘束など、プロジェクト固有のデリバリ文脈をチームが埋めます。

---

## 相互参照

- [Agent Reference Overview](README.md)
- [Agent Guide: aidlc-delivery-agent](../../guide/agents/delivery-agent.md)
- [Stage Documentation](../04-stages/)
- 正本: [`dist/claude/.claude/agents/aidlc-delivery-agent.md`](../../../dist/claude/.claude/agents/aidlc-delivery-agent.md)
