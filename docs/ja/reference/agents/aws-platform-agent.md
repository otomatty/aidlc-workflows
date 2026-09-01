# aidlc-aws-platform-agent — 技術リファレンス

## 身元

| フィールド | 値 |
|-------|-------|
| Name | aidlc-aws-platform-agent |
| Tier | **judgment** |
| Allowed Claude Code Tools | Read, Edit, Write, Glob, Grep, Bash, AskUserQuestion |
| Disallowed Claude Code Tools | Task |

---

## ステージ所有

### リードステージ

| ステージ | 名前 | このエージェントがすること |
|-------|------|----------------------|
| infrastructure-design | Infrastructure Design | アプリケーションアーキテクチャを AWS サービス選択、CDK / CloudFormation テンプレート、VPC 設計、IAM ポリシー、コスト見積もりへ写す |
| environment-provisioning | Environment Provisioning | IaC 定義から dev / staging / production 環境をプロビジョンする。ドリフト検出と環境の揃え付き |

### サポートステージ

| ステージ | 名前 | このエージェントが寄与すること |
|-------|------|-----------------------------|
| feasibility | Feasibility and Constraint Analysis | AWS サービスの可用性、リージョン拘束、クラウド基盤の限界を見る |
| domain-design | Domain Design | クラウドネイティブパターン、マネージドサービス統合、サーバレス選択肢を助言する |
| nfr-design | NFR Design | NFR をインフラ仕様、オートスケール方針、耐障害設定へ写す |
| feedback-optimization | Feedback and Optimization | 本番指標からコスト最適化の機会とインフラ調律を拾う |

---

## 協働の型

### 受け取る相手

| 出所 | 成果物 |
|--------|-----------|
| aidlc-architect-agent | アプリケーショントポロジ、コンポーネント目録、インフラ要件 |
| aidlc-devsecops-agent | セキュリティ要件、コンプライアンス制御、暗号化仕様 |

### 渡す相手

| 行き先 | 成果物 |
|--------|-----------|
| aidlc-pipeline-deploy-agent | デプロイ先の環境エンドポイント、インフラ出力 |
| aidlc-operations-agent | 可観測性セットアップと監視向けの、プロビジョン済みインフラ |

---

## ナレッジ源

### 方法論（Tier 1）

パス: `.claude/knowledge/aidlc-aws-platform-agent/`

| ファイル | 内容 |
|------|---------|
| cdk-best-practices.md | AWS CDK のコンストラクトパターン、スタック編成、テスト |
| cost-optimization-patterns.md | FinOps パターン、適正サイズ、リザーブドインスタンス、Savings Plans |
| infrastructure-guide.md | インフラ設計の方法論と環境プロビジョニング |
| well-architected-framework.md | AWS Well-Architected Framework の 6 本柱 |

### チーム（Tier 2）

パス: `aidlc/knowledge/aidlc-aws-platform-agent/`（スペース単位のナレッジディレクトリ。利用者が管理）

チームが中身があるときに作るスペース単位ディレクトリです（エンジンは `aidlc/knowledge/` を空で出荷します）。既存 VPC 設計、AWS アカウント構造、承認済みサービスカタログ、コストベースラインなど、プロジェクト固有のインフラ文脈をチームが埋めます。

---

## 相互参照

- [Agent Reference Overview](README.md)
- [Agent Guide: aidlc-aws-platform-agent](../../guide/agents/aws-platform-agent.md)
- [Stage Documentation](../04-stages/)
- 正本: [`dist/claude/.claude/agents/aidlc-aws-platform-agent.md`](../../../dist/claude/.claude/agents/aidlc-aws-platform-agent.md)
