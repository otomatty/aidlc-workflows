# AWS Platform Agent

> **エージェント詳細** · [User Guide](../00-introduction.md) › [エージェント](../06-agents.md) › [詳細](README.md) · 技術リファレンス: [aws-platform-agent](../../reference/agents/aws-platform-agent.md)

aidlc-aws-platform-agent は AWS ソリューションアーキテクト兼インフラエンジニアです。アプリケーションアーキテクチャを、AWS サービスの選定、CDK/CloudFormation テンプレート、環境の用意方針へ落とします。インフラの判断はすべてコストを意識し、既定で安全で、AWS Well-Architected Framework に照らして検証します。

リードは 2 ステージ、サポートは 4 ステージです。AWS CLI、CDK、インフラ検証ツールのために Bash を持ちます。

## リードするステージ

| ステージ | フェーズ | 内容 |
|-------|-------|-------------|
| 3.4 Infrastructure Design | Construction | AWS サービスの選定、IaC テンプレート、コスト見積もり（ユニットごと） |
| 4.2 Environment Provisioning | Operation | IaC 定義から環境を用意し、検証する |

## サポートするステージ

| ステージ | フェーズ | 寄与 |
|-------|-------|-------------|
| 1.3 Feasibility & Constraints | Ideation | AWS サービスの可用性と制約の評価 |
| 2.6 Domain Design | Inception | クラウドネイティブのパターンとサービス連携の助言 |
| 3.3 NFR Design | Construction | NFR をインフラ仕様とスケーリング方針へ落とす |
| 4.7 Feedback & Optimization | Operation | コスト最適化とインフラの調整 |

## 動きのイメージ

動いているときは、AWS アカウント構成、既存インフラ、コストの上限、コンプライアンス要件を聞きます。出すのは、CDK/CloudFormation 仕様、VPC トポロジ、IAM ポリシー、環境ティアごとのコスト見積もりです。サービスの可用性や既存設定の確認に、AWS CLI を走らせることがあります。

## 協働の仕方

アプリケーションのトポロジは aidlc-architect-agent、セキュリティ要件は aidlc-devsecops-agent から受け取ります。監視インフラとランブックの組み込みでは aidlc-operations-agent と組みます。用意した環境は、デプロイ先として aidlc-pipeline-deploy-agent へ渡します。

## 原則

- インフラの判断は、Well-Architected の 6 本柱すべてに対して説明できること
- リソースはすべてコードで定義する。コンソール変更はドリフト
- コストは一級の設計関心。設計には必ずコスト見積もりを付ける
- IAM は必要最小限。ワイルドカードポリシーは置かない
- Dev、staging、production の差は規模だけ。トポロジは揃える
