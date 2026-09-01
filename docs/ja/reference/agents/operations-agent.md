# aidlc-operations-agent — 技術リファレンス

## 身元

| フィールド | 値 |
|-------|-------|
| Name | aidlc-operations-agent |
| Tier | **templated** |
| Allowed Claude Code Tools | Read, Edit, Write, Glob, Grep, Bash, AskUserQuestion |
| Disallowed Claude Code Tools | Task |

---

## ステージ所有

### リードステージ

| ステージ | 名前 | このエージェントがすること |
|-------|------|----------------------|
| observability-setup | Observability Setup | CloudWatch ダッシュボード、アラーム、X-Ray トレース、構造化ログ、カスタムメトリクスを設定する |
| incident-response | Incident Response | SSM ランブックを書き、重大度を決め、オンコール構造を立て、カオス実験を設計する |
| feedback-optimization | Feedback and Optimization | 本番指標を分析し、洞察を Ideation へ戻し、インフラとアーキテクチャの改善を勧める |

### サポートステージ

なし。ステージグラフは performance-validation（4.6）の `support_agents: []` を記録します。そのステージのリードは aidlc-quality-agent です。このエージェントが observability-setup（4.4）で立てる運用テレメトリとベースラインは、非公式に性能検証へ流れますが、operations は 4.6 の正式なサポートエージェントではありません。

---

## 協働の型

### 受け取る相手

| 出所 | 成果物 |
|--------|-----------|
| aidlc-aws-platform-agent | プロビジョン済みインフラ、CloudWatch 名前空間、スケール方針 |
| aidlc-pipeline-deploy-agent | デプロイ済みサービス、デプロイメタデータ |

### 渡す相手

| 行き先 | 成果物 |
|--------|-----------|
| aidlc-product-agent | 次の Ideation 周期向けの運用フィードバック（ライフサイクルを閉じる） |
| aidlc-architect-agent | 本番観察に基づくアーキテクチャ改善の推奨 |
| オーケストレータ | 反復計画向けのフィードバック報告 |

---

## ナレッジ源

### 方法論（Tier 1）

パス: `.claude/knowledge/aidlc-operations-agent/`

| ファイル | 内容 |
|------|---------|
| incident-response-guide.md | インシデント対応の方法論、重大度、ポストモーテムテンプレート |
| nfr-performance-guide.md | 性能監視と最適化の方法論 |
| observability-patterns.md | 可観測性の型（ダッシュボード、アラーム、トレース、ログ） |
| slo-sli-patterns.md | SLO / SLI 定義の型、エラーバジェット方針 |

### チーム（Tier 2）

パス: `aidlc/knowledge/aidlc-operations-agent/`（スペース単位のナレッジディレクトリ。利用者が管理）

チームが中身があるときに作るスペース単位ディレクトリです（エンジンは `aidlc/knowledge/` を空で出荷します）。既存ランブック、オンコール予定、SLO 目標、監視ダッシュボードなど、プロジェクト固有の運用文脈をチームが埋めます。

---

## 相互参照

- [Agent Reference Overview](README.md)
- [Agent Guide: aidlc-operations-agent](../../guide/agents/operations-agent.md)
- [Stage Documentation](../04-stages/)
- 正本: [`dist/claude/.claude/agents/aidlc-operations-agent.md`](../../../dist/claude/.claude/agents/aidlc-operations-agent.md)
