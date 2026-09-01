# aidlc-pipeline-deploy-agent — 技術リファレンス

## 身元

| フィールド | 値 |
|-------|-------|
| Name | aidlc-pipeline-deploy-agent |
| Tier | **templated** |
| Allowed Claude Code Tools | Read, Edit, Write, Glob, Grep, Bash, AskUserQuestion |
| Disallowed Claude Code Tools | Task |

---

## ステージ所有

### リードステージ

| ステージ | 名前 | このエージェントがすること |
|-------|------|----------------------|
| practices-discovery | Practices Discovery | ハブ＆スポークの下書き、人へのインタビュー、統合をリードする。承認後、アクティブスペースの team / project メモリへ内容を昇格する |
| ci-pipeline | CI Pipeline | 品質ゲート、成果物生成、セキュリティスキャン付きの CI パイプラインを設計し設定する |
| deployment-pipeline | Deployment Pipeline | 昇格ゲート、デプロイ戦略、フィーチャーフラグ統合付きの CD パイプラインを設計する |
| deployment-execution | Deployment Execution | デプロイを実行し、スモークテストを走らせ、健全指標を監視し、ロールバックを扱う |

### サポートステージ

このエージェントにサポート役はありません。触る 4 ステージはすべてリードです。

---

## 協働の型

### 受け取る相手

| 出所 | 成果物 |
|--------|-----------|
| aidlc-developer-agent | ビルドできるソース、テストスイート、ビルドスクリプト |
| aidlc-quality-agent | テスト要件、品質ゲート定義 |
| aidlc-aws-platform-agent | 環境エンドポイント、インフラ出力、秘密 |

### 渡す相手

| 行き先 | 成果物 |
|--------|-----------|
| aidlc-operations-agent | 可観測性セットアップと監視向けの、デプロイ済みサービス |
| aidlc-quality-agent | 性能検証向けのデプロイ成果物 |

---

## ナレッジ源

### 方法論（Tier 1）

パス: `.claude/knowledge/aidlc-pipeline-deploy-agent/`

| ファイル | 内容 |
|------|---------|
| cicd-patterns.md | CI/CD パイプラインの型、品質ゲート、成果物管理 |
| deployment-strategies.md | デプロイ戦略の型（ブルーグリーン、カナリア、ローリング、再作成） |
| branching-strategies.md | ブランチ戦略 5 つ（トランクベース、GitHub Flow、GitFlow、リリースブランチ、モノレポ）と AI-DLC worktree 対応。ボルトマージのディスパッチで調べる |

### チーム（Tier 2）

パス: `aidlc/knowledge/aidlc-pipeline-deploy-agent/`（スペース単位のナレッジディレクトリ。利用者が管理）

チームが中身があるときに作るスペース単位ディレクトリです（エンジンは `aidlc/knowledge/` を空で出荷します）。既存パイプライン設定、デプロイランブック、リリース承認の流れなど、プロジェクト固有のデプロイ文脈をチームが埋めます。

---

## 相互参照

- [Agent Reference Overview](README.md)
- [Agent Guide: aidlc-pipeline-deploy-agent](../../guide/agents/pipeline-deploy-agent.md)
- [Stage Documentation](../04-stages/)
- 正本: [`dist/claude/.claude/agents/aidlc-pipeline-deploy-agent.md`](../../../dist/claude/.claude/agents/aidlc-pipeline-deploy-agent.md)
