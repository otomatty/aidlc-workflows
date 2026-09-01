# DevSecOps Agent

> **エージェント詳細** · [User Guide](../00-introduction.md) › [エージェント](../06-agents.md) › [詳細](README.md) · 技術リファレンス: [devsecops-agent](../../reference/agents/devsecops-agent.md)

aidlc-devsecops-agent はセキュリティエンジニアです。セキュリティを最後に足すのではなく、ライフサイクルの各フェーズへ埋め込みます。Ideation で拾ったコンプライアンス要件を、セキュリティコントロール、脅威モデル、スキャンパイプライン、実行時監視として実装します。対象はアプリケーション、クラウド、パイプラインのセキュリティです。

aidlc-compliance-agent と同じく、役割はサポートだけです。Inception、Construction、Operation にまたがる 5 ステージへセキュリティの専門を足します。セキュリティスキャンツールのために Bash を持ちます。

## リードするステージ

aidlc-devsecops-agent はリードするステージを持ちません。

## サポートするステージ

| ステージ | フェーズ | 寄与 |
|-------|-------|-------------|
| 2.2 Practices Discovery | Inception | 互いに見えないセキュリティプラクティスのスポーク。自分の寄与ファイルを書く |
| 3.2 NFR Requirements | Construction | セキュリティコントロール、脅威モデル、STRIDE 分析 |
| 3.4 Infrastructure Design | Construction | IAM ポリシーのレビュー、セキュリティグループの検証 |
| 3.6 Build and Test | Construction | SAST/DAST スキャン、依存関係の脆弱性、IaC の lint |
| 4.2 Environment Provisioning | Operation | セキュリティ態勢の検証（Security Hub、Inspector、GuardDuty） |

## 動きのイメージ

動いているとき（サポートとして）は、攻撃面、信頼境界、セキュリティコントロールに集中します。設計のセキュリティアンチパターンを見、機微データの流れが暗号化とアクセス制御されているかを検証し、第三者依存の既知脆弱性を評価します。

## 協働の仕方

規制要件は aidlc-compliance-agent、システム設計は aidlc-architect-agent から受け取ります。セキュアコーディングでは aidlc-developer-agent、インフラの硬化では aidlc-aws-platform-agent、セキュリティテスト要件では aidlc-quality-agent と組みます。セキュリティゲートとスキャン設定は aidlc-pipeline-deploy-agent へ渡します。

## 原則

- 多層防御。一つのセキュリティコントロールが単一障害点になってはいけない
- どこでも最小権限。ユーザー、サービス、プロセスすべてに必要最小限
- 侵害を前提にする。内部コンポーネント同士も認証・認可する
- 既定設定は安全であること
- 入力は検証するまで敵対的。外部データはサニタイズするまで汚染されている
- セキュリティは要件であり、後回しにできる機能ではない
