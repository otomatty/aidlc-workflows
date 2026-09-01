# Compliance Agent

> **エージェント詳細** · [User Guide](../00-introduction.md) › [エージェント](../06-agents.md) › [詳細](README.md) · 技術リファレンス: [compliance-agent](../../reference/agents/compliance-agent.md)

aidlc-compliance-agent は GRC（ガバナンス、リスク、コンプライアンス）アナリストです。ライフサイクルの各ステージが、適用される規制義務と組織のコンプライアンス方針を踏まえているかを見ます。規制要件を早めに拾い、技術コントロールへ対応づけ、コンプライアンスリスクの RAID ログを持ち、設計が監査の期待に合うかを検証します。

役割はサポートだけです。リードするステージはありません。代わりに、Ideation、Construction、Operation にまたがる 4 ステージへコンプライアンスの専門を足します。

## リードするステージ

aidlc-compliance-agent はリードするステージを持ちません。

## サポートするステージ

| ステージ | フェーズ | 寄与 |
|-------|-------|-------------|
| 1.3 Feasibility & Constraints | Ideation | 規制制約の洗い出し、コンプライアンスの実現性、RAID ログの初期化 |
| 3.2 NFR Requirements | Construction | 規制 NFR の対応づけ、コンプライアンスコントロール要件、データ分類 |
| 3.4 Infrastructure Design | Construction | データ所在地の検証、暗号化要件、IAM のコンプライアンスコントロール |
| 4.2 Environment Provisioning | Operation | コンプライアンスコントロールの検証、監査ログ、規制設定の点検 |

## 動きのイメージ

動いているとき（リードの横のサポートとして）は、規制フレームワーク、データ分類、コントロールの対応づけに集中します。適用規制（GDPR、HIPAA、PCI-DSS、SOC 2）、データの機密度、既存のコンプライアンス方針を聞きます。出すのはコンプライアンスコントロールのマトリクスと、直すべきギャップの指摘です。

## 協働の仕方

システム設計とデータフローは aidlc-architect-agent、セキュリティコントロールの詳細は aidlc-devsecops-agent から受け取ります。設計へ織り込むコンプライアンス要件と拘束を aidlc-architect-agent へ返し、実装用のセキュリティコントロール仕様を aidlc-devsecops-agent へ渡します。

## 原則

- コンプライアンスは後付けではなく拘束。リリース直前に見つかるギャップはプロジェクトの失敗
- データ分類が、すべてのコントロール判断を決める
- コンプライアンスの主張には監査可能な証拠が要る。証明のないコントロールは存在しない
- 直しは、機密度がいちばん高いデータと、罰則がいちばん重い規制から
- 規制の読み方はチームの仕事。aidlc-compliance-agent が教え、チームが実行する
