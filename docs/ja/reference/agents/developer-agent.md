# aidlc-developer-agent — 技術リファレンス

## 身元

| フィールド | 値 |
|-------|-------|
| Name | aidlc-developer-agent |
| Tier | **judgment** |
| Allowed Claude Code Tools | Read, Edit, Write, Glob, Grep, Bash, AskUserQuestion |
| Disallowed Claude Code Tools | Task |

---

## ステージ所有

### リードステージ

| ステージ | 名前 | このエージェントがすること |
|-------|------|----------------------|
| reverse-engineering | Reverse Engineering（コードスキャン手順） | 深いコードスキャンで依存グラフ、API エンドポイント、データベースモデル、技術的負債の兆候を取り出す |
| code-generation | Code Generation | アーキテクチャ仕様から作業ユニットを本番品質のコードとして実装する |

### サポートステージ

| ステージ | 名前 | このエージェントが寄与すること |
|-------|------|-----------------------------|
| practices-discovery | Practices Discovery（Inception） | 互いに見えないコードパターンのスポーク。命名、層の分離、エラー処理、ファイル編成を自分の寄与ファイルに書く |
| user-stories | User Stories | モブ編成での実装可能性の声（委譲された協力者。自分の寄与ファイルを書く） |
| functional-design | Functional Design | API 契約設計とデータモデル仕様 |
| deployment-execution | Deployment Execution | データベースマイグレーションの実行と検証 |

---

## 協働の型

### 受け取る相手

| 出所 | 成果物 |
|--------|-----------|
| aidlc-architect-agent | 作業ユニット仕様、設計パターン、API 仕様 |
| aidlc-quality-agent | テスト要件、バグ報告、欠陥仕様 |

### 渡す相手

| 行き先 | 成果物 |
|--------|-----------|
| aidlc-quality-agent | テスト向けの実装コード、テスト基盤 |
| aidlc-architect-agent | リバースエンジニアリング合成向けのコードスキャン結果 |

---

## ナレッジ源

### 方法論（Tier 1）

パス: `.claude/knowledge/aidlc-developer-agent/`

| ファイル | 内容 |
|------|---------|
| api-design-guide.md | API 契約設計（REST、GraphQL、gRPC）の方法論 |
| code-analysis-guide.md | コードベース分析とリバースエンジニアリングの技法 |
| code-generation-guide.md | コード生成の方法論と実装パターン |
| code-generation-patterns.md | 言語固有のコード生成パターンとテンプレート |
| data-modelling-patterns.md | データモデル設計パターン（リレーショナルと NoSQL） |
| re-artifacts.md | リバースエンジニアリング成果物の仕様 |

### チーム（Tier 2）

パス: `aidlc/knowledge/aidlc-developer-agent/`（スペース単位のナレッジディレクトリ。利用者が管理）

チームが中身があるときに作るスペース単位ディレクトリです（エンジンは `aidlc/knowledge/` を空で出荷します）。コーディング標準、フレームワーク慣例、既存 API パターン、マイグレーション戦略など、プロジェクト固有の開発文脈をチームが埋めます。

---

## 相互参照

- [Agent Reference Overview](README.md)
- [Agent Guide: aidlc-developer-agent](../../guide/agents/developer-agent.md)
- [Stage Documentation](../04-stages/)
- 正本: [`dist/claude/.claude/agents/aidlc-developer-agent.md`](../../../dist/claude/.claude/agents/aidlc-developer-agent.md)
