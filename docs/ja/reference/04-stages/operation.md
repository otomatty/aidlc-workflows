# Operation Phase -- Stage Reference (4.1-4.7)

## Phase Overview

Operation は AI-DLC ライフサイクル 5 フェーズの最後です。Construction で作りテストしたソフトウェアを、デプロイ、監視、インシデント準備、性能検証、継続的な最適化へ運びます。7 ステージ（4.1 から 4.7）で、パイプライン設定、環境プロビジョニング、デプロイ実行、可観測性、インシデント対応、性能検証、フィードバック収集を覆います。

Operation の 7 ステージはすべて **CONDITIONAL** です。スコープと実行計画に応じて走ります。たとえば mvp と poc は Operation を丸ごと飛ばします。bugfix、refactor、infra、security-patch、express はデプロイ寄りの部分集合を走ります。

ステージはすべて **インライン** です（Operation フェーズにサブエージェントは無い）。承認ゲート、質問形式、完了メッセージ、状態追跡は `stage-protocol.md` に従います。

---

## Stage Summary Table

| Stage | Name                     | Execution   | Condition                                                              | Lead Agent          | Support Agents      | Mode                             |
|-------|--------------------------|-------------|------------------------------------------------------------------------|---------------------|---------------------|----------------------------------|
| 4.1   | Deployment Pipeline      | CONDITIONAL | Execute when CD pipeline needs creation or significant modification    | aidlc-pipeline-deploy-agent| (none)             | inline                           |
| 4.2   | Environment Provisioning | CONDITIONAL | Execute when AWS environments need provisioning or validation          | aidlc-aws-platform-agent  | aidlc-devsecops-agent, aidlc-compliance-agent     | inline                           |
| 4.3   | Deployment Execution     | CONDITIONAL | Execute after deployment pipeline and environment are ready            | aidlc-pipeline-deploy-agent| aidlc-developer-agent    | inline                           |
| 4.4   | Observability Setup      | CONDITIONAL | Execute when monitoring, dashboards, alarms, or tracing need config    | aidlc-operations-agent    | (none)              | inline                           |
| 4.5   | Incident Response        | CONDITIONAL | Execute when operational runbooks and incident response procedures needed | aidlc-operations-agent | (none)              | inline                           |
| 4.6   | Performance Validation   | CONDITIONAL | Execute when NFR performance targets need validation under load        | aidlc-quality-agent       | (none)              | inline                           |
| 4.7   | Feedback & Optimization  | CONDITIONAL | Execute when ongoing operational monitoring and optimization needed    | aidlc-operations-agent    | aidlc-aws-platform-agent  | inline                           |

### Multi-Agent Stages

Operation のうち複数エージェントが関わるのは 3 ステージです。

- **4.2 Environment Provisioning**: aidlc-aws-platform-agent（リード）+ aidlc-devsecops-agent（セキュリティ姿勢の検証）+ aidlc-compliance-agent（データ所在地、規制コントロール）
- **4.3 Deployment Execution**: aidlc-pipeline-deploy-agent（リード）+ aidlc-developer-agent（データベースマイグレーション）
- **4.7 Feedback & Optimization**: aidlc-operations-agent（リード）+ aidlc-aws-platform-agent（コスト最適化、ドリフト検出）

いずれでも、コンダクターは先にリードを呼び、その出力を文脈にしてサポートを呼びます。委譲するのはコンダクターです。エージェント同士は呼び合いません。

---

## Stage 4.1: Deployment Pipeline Configuration

### Metadata

| Property          | Value                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------|
| Stage             | 4.1                                                                                               |
| Phase             | Operation                                                                                         |
| Execution         | CONDITIONAL (skip if deployment pipeline already exists and is adequate)                           |
| Lead Agent        | aidlc-pipeline-deploy-agent                                                                             |
| support_agents    | (none)                                                                                            |
| Inputs            | CI pipeline config from Stage 3.7, infrastructure design from Stage 3.4                          |

### Purpose

CD パイプライン、デプロイ戦略、ロールバック手順、環境昇格ゲートを設定します。

### Outputs

| Artifact                          | Description                                                      |
|-----------------------------------|------------------------------------------------------------------|
| cd-config.md                      | CD パイプライン設定                                        |
| deployment-strategy.md            | デプロイ戦略（blue/green、canary、rolling）、昇格ゲート|
| rollback-runbook.md               | ロールバック手順とランブック                                  |
| deployment-pipeline-questions.md  | 答え付きの確認質問                                |

### Approval Gate

厳密に 2 選択肢: Approve / Request Changes。

---

## Stage 4.2: Environment Provisioning

### Metadata

| Property          | Value                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------|
| Stage             | 4.2                                                                                               |
| Phase             | Operation                                                                                         |
| Execution         | CONDITIONAL (skip if environments already provisioned)                                            |
| Lead Agent        | aidlc-aws-platform-agent                                                                                |
| support_agents    | aidlc-devsecops-agent (security posture validation), aidlc-compliance-agent (data residency, regulatory controls) |
| Inputs            | Infrastructure design from Stage 3.4, CD pipeline config from Stage 4.1                          |

### Purpose

Construction の Infrastructure as Code を使い、対象の AWS 環境をプロビジョニングして検証します。aidlc-devsecops-agent がセキュリティ姿勢を検証し、aidlc-compliance-agent がデータ所在地と規制コントロールを見ます。

### Outputs

| Artifact                              | Description                                                |
|---------------------------------------|------------------------------------------------------------|
| environment-inventory.md              | プロビジョニングした環境のインベントリ                          |
| validation-report.md                  | インフラ検証レポート、ヘルスチェック            |
| environment-provisioning-questions.md | 答え付きの確認質問                          |

### Approval Gate

厳密に 2 選択肢: Approve / Request Changes。

---

## Stage 4.3: Deployment Execution

### Metadata

| Property          | Value                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------|
| Stage             | 4.3                                                                                               |
| Phase             | Operation                                                                                         |
| Execution         | CONDITIONAL (execute after deployment pipeline and environment are ready; skip if already deployed) |
| Lead Agent        | aidlc-pipeline-deploy-agent                                                                             |
| support_agents    | aidlc-developer-agent (database migrations)                                                             |
| Inputs            | CD pipeline config from Stage 4.1, provisioned environments from Stage 4.2                       |

### Purpose

実際のデプロイを実行します。成果物をパイプラインに流し、スモークテストを走り、ヘルスチェックを検証し、データベースマイグレーションを実行します。

### Outputs

| Artifact                          | Description                                                  |
|-----------------------------------|--------------------------------------------------------------|
| deployment-log.md                 | デプロイ実行ログ                                     |
| smoke-test-results.md             | デプロイ後のスモークテスト結果                          |
| health-check-report.md            | ヘルスチェック検証レポート                               |
| deployment-execution-questions.md | 答え付きのデプロイ前確認質問                  |

### Approval Gate

厳密に 2 選択肢: Approve / Request Changes。

---

## Stage 4.4: Observability Setup

### Metadata

| Property          | Value                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------|
| Stage             | 4.4                                                                                               |
| Phase             | Operation                                                                                         |
| Execution         | CONDITIONAL (skip if observability already configured)                                            |
| Lead Agent        | aidlc-operations-agent                                                                                  |
| Inputs            | NFR design from Stage 3.3, infrastructure design from Stage 3.4, deployed application             |

### Purpose

監視、ダッシュボード、アラーム、SLO/SLI 追跡、ログクエリ、分散トレーシング、異常検知を設定します。

### Outputs

| Artifact                          | Description                                                    |
|-----------------------------------|----------------------------------------------------------------|
| dashboards.md                     | CloudWatch ダッシュボード設定                            |
| alarms.md                         | 重大度、SNS ルーティング、エスカレーション付きのアラーム定義       |
| slo-config.md                     | SLO/SLI 追跡設定                                |
| log-queries.md                    | CloudWatch Logs Insights の保存クエリ                         |
| tracing-config.md                 | X-Ray トレーシング設定                                   |
| anomaly-config.md                 | 異常検知設定                                |
| observability-setup-questions.md  | 答え付きの確認質問                              |

### Notes

- Operation の中でいちばん成果物が多い（本文 6 ファイル + 質問）。
- AWS 固有（CloudWatch、X-Ray、SNS）だが、型は他へ移せる。

---

## Stage 4.5: Incident Response & Runbook Generation

### Metadata

| Property          | Value                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------|
| Stage             | 4.5                                                                                               |
| Phase             | Operation                                                                                         |
| Execution         | CONDITIONAL (skip for POCs or non-production deployments)                                         |
| Lead Agent        | aidlc-operations-agent                                                                                  |
| Inputs            | Observability setup from Stage 4.4, NFR design from Stage 3.3, infrastructure design from Stage 3.4 |

### Purpose

運用ランブック、インシデント対応計画、エスカレーション手順を出します。

### Outputs

| Artifact                          | Description                                                    |
|-----------------------------------|----------------------------------------------------------------|
| runbooks.md                       | SSM Automation ランブックライブラリ                                 |
| incident-plan.md                  | インシデント対応計画（AWS Incident Manager 連携）      |
| escalation-matrix.md              | エスカレーション経路、オンコールローテーション、コミュニケーション手順  |
| incident-response-questions.md    | 答え付きの確認質問                              |

---

## Stage 4.6: Performance Validation & Load Testing

### Metadata

| Property          | Value                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------|
| Stage             | 4.6                                                                                               |
| Phase             | Operation                                                                                         |
| Execution         | CONDITIONAL (skip for POCs or non-performance-critical applications)                              |
| Lead Agent        | aidlc-quality-agent                                                                                     |
| Inputs            | NFR requirements from Stage 3.2, NFR design from Stage 3.3, observability data from Stage 4.4    |

### Purpose

負荷試験を設計して実行し、デプロイ済みアプリケーションに対して NFR の性能目標を検証します。

### Outputs

| Artifact                              | Description                                                |
|---------------------------------------|------------------------------------------------------------|
| load-test-plan.md                     | シナリオ、ツール、設定付きの負荷試験計画    |
| test-results.md                       | 性能試験結果（レイテンシ、スループット、エラー率） |
| nfr-validation-matrix.md             | NFR 目標 vs 実測の検証マトリクス                    |
| performance-validation-questions.md   | 答え付きの確認質問                          |

---

## Stage 4.7: Continuous Feedback & Optimization

### Metadata

| Property          | Value                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------|
| Stage             | 4.7                                                                                               |
| Phase             | Operation                                                                                         |
| Execution         | CONDITIONAL (skip for one-off deployments)                                                        |
| Lead Agent        | aidlc-operations-agent                                                                                  |
| support_agents    | aidlc-aws-platform-agent (cost optimization, drift detection)                                           |
| Inputs            | All Operation phase artifacts, production monitoring data                                         |

### Purpose

SLO 準拠のレビュー、コスト最適化の分析、インフラドリフトの検出、運用知見の収集です。AI-DLC ワークフロー全体の **最終ステージ** です。

### Outputs

| Artifact                              | Description                                                |
|---------------------------------------|------------------------------------------------------------|
| slo-report.md                         | SLO 準拠レポート、エラーバジェット消費率              |
| cost-analysis.md                      | AWS Cost Explorer 分析、最適化の提案   |
| drift-report.md                       | AWS Config ドリフト検出レポート、Trusted Advisor レビュー  |
| feedback-loop.md                      | 運用知見、改善提案、次の Ideation サイクルへの入力 |
| feedback-optimization-questions.md    | 答え付きの確認質問                          |

### Approval Gate -- Three-Option (Unique)

ステージ 4.7 には **このステージだけの 3 選択肢承認ゲート** があります。

1. **Approve** -- ワークフロー完了。AI-DLC ライフサイクル一通りが終わる。
2. **Request Changes** -- 直しのフィードバックを出す。
3. **Start New Ideation Cycle** -- `feedback-loop.md` の知見を新しいステージ 1.1 へ戻す。

AI-DLC ライフサイクルが循環であることの反映です。

---

## Phase Summary

**デプロイステージ（4.1–4.3）:**
- 4.1 Deployment Pipeline -- CD パイプライン設定、デプロイ戦略、ロールバックランブック
- 4.2 Environment Provisioning -- セキュリティ姿勢レビュー付きの AWS 環境プロビジョニングと検証
- 4.3 Deployment Execution -- 成果物のデプロイ、スモークテスト、ヘルスチェック、データベースマイグレーション

**運用準備ステージ（4.4–4.6）:**
- 4.4 Observability Setup -- ダッシュボード、アラーム、SLO、ログクエリ、トレーシング、異常検知
- 4.5 Incident Response -- ランブック、インシデント計画、エスカレーションマトリクス
- 4.6 Performance Validation -- 負荷試験、NFR 目標の検証、キャパシティ計画

**継続的改善（4.7）:**
- 4.7 Feedback & Optimization -- SLO 準拠、コスト分析、ドリフト検出、フィードバックループ

**スコープの適用:**
- enterprise / feature / classic / workshop: 7 ステージ全部
- infra: ステージ 4.1–4.4（deployment-pipeline、environment-provisioning、deployment-execution、observability-setup）
- bugfix / refactor: ステージ 4.1、4.3（deployment-pipeline、deployment-execution）
- security-patch: ステージ 4.1、4.3（deployment-pipeline、deployment-execution）
- express: ステージ 4.1、4.3、4.4（deployment-pipeline、deployment-execution、observability-setup）
- mvp / poc: Operation フェーズを丸ごと飛ばす

## Cross-References

- [Orchestrator](../03-orchestrator.md) -- ルーティング論理、スコープ写像
- [Stage Protocol](../04-stage-protocol.md) -- 承認ゲート、状態追跡
- [Construction Stages](construction.md) -- 前のフェーズ
