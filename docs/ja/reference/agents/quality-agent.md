# aidlc-quality-agent — 技術リファレンス

## 身元

| フィールド | 値 |
|-------|-------|
| Name | aidlc-quality-agent |
| Tier | **judgment** |
| Allowed Claude Code Tools | Read, Edit, Write, Glob, Grep, Bash, AskUserQuestion |
| Disallowed Claude Code Tools | Task |

---

## ステージ所有

### リードステージ

| ステージ | 名前 | このエージェントがすること |
|-------|------|----------------------|
| build-and-test | Build and Test | テスト戦略を決め、テストスイートを作り、受け入れ基準に対するカバレッジを確かめ、品質ゲートを強制する |
| performance-validation | Performance Validation and Load Testing | 負荷テストを設計して実行し、NFR 目標を確かめ、ボトルネックを拾い、キャパシティ計画の推奨を出す |

### サポートステージ

| ステージ | 名前 | このエージェントが寄与すること |
|-------|------|-----------------------------|
| practices-discovery | Practices Discovery | 互いに見えないスポーク。テスト姿勢、カバレッジ下限、CI の止めるか警告するかを自分の寄与ファイルに残す |
| user-stories | User Stories | モブ編成でのテスト可能性と受け入れ基準の声。自分の寄与ファイルを書く |
| nfr-requirements | NFR Requirements | 試せる品質属性シナリオと、測れる NFR 目標を定義する |

---

## 協働の型

### 受け取る相手

| 出所 | 成果物 |
|--------|-----------|
| aidlc-product-agent | テストケース導出向けの、受け入れ基準付きユーザーストーリー |
| aidlc-architect-agent | NFR 目標、設計のテスト可能性評価、テスト境界 |
| aidlc-developer-agent | テスト向けの実装コード |

### 渡す相手

| 行き先 | 成果物 |
|--------|-----------|
| aidlc-pipeline-deploy-agent | CI/CD へのテストスイート統合、品質ゲート定義 |
| aidlc-operations-agent | 本番監視向けの性能ベースライン |

---

## ナレッジ源

### 方法論（Tier 1）

パス: `.claude/knowledge/aidlc-quality-agent/`

| ファイル | 内容 |
|------|---------|
| nfr-reliability-guide.md | 信頼性テストの方法論と耐障害検証 |
| nfr-validation-methods.md | NFR 検証の技法（負荷テスト、性能プロファイリング） |
| test-strategy-patterns.md | テストピラミッドの型、テストデータ戦略、品質ゲート設計 |
| testing-guide.md | テストの方法論とテストケース設計の原則 |

### チーム（Tier 2）

パス: `aidlc/knowledge/aidlc-quality-agent/`（スペース単位のナレッジディレクトリ。利用者が管理）

チームが中身があるときに作るスペース単位ディレクトリです（エンジンは `aidlc/knowledge/` を空で出荷します）。既存テストフレームワーク、カバレッジ目標、性能ベースライン、品質ゲート閾値など、プロジェクト固有の QA 文脈をチームが埋めます。

---

## 相互参照

- [Agent Reference Overview](README.md)
- [Agent Guide: aidlc-quality-agent](../../guide/agents/quality-agent.md)
- [Stage Documentation](../04-stages/)
- 正本: [`dist/claude/.claude/agents/aidlc-quality-agent.md`](../../../dist/claude/.claude/agents/aidlc-quality-agent.md)
