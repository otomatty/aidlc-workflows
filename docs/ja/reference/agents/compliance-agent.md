# aidlc-compliance-agent — 技術リファレンス

## 身元

| フィールド | 値 |
|-------|-------|
| Name | aidlc-compliance-agent |
| Tier | **judgment** |
| Allowed Claude Code Tools | Read, Edit, Write, Glob, Grep, WebSearch, AskUserQuestion |
| Disallowed Claude Code Tools | Task |

---

## ステージ所有

### リードステージ

このエージェントにリードステージはありません。ライフサイクルを通じてサポートと助言だけです。

### サポートステージ

| ステージ | 名前 | このエージェントが寄与すること |
|-------|------|-----------------------------|
| feasibility | Feasibility and Constraint Analysis | 規制拘束の特定、コンプライアンス実現可能性の評価、RAID ログの初期化 |
| nfr-requirements | NFR Requirements | コンプライアンス由来の非機能要件と制御仕様 |
| infrastructure-design | Infrastructure Design | データ所在地の検証、暗号化要件、IAM 監査 |
| environment-provisioning | Environment Provisioning | プロビジョン済み環境のコンプライアンス姿勢検証 |

---

## 協働の型

### 受け取る相手

| 出所 | 成果物 |
|--------|-----------|
| aidlc-architect-agent | コンプライアンスレビュー向けのシステム設計、データフロー図 |
| aidlc-devsecops-agent | コンプライアンスマッピング向けのセキュリティ制御、暗号化仕様 |

### 渡す相手

| 行き先 | 成果物 |
|--------|-----------|
| aidlc-architect-agent | 設計へ取り込むコンプライアンス要件 |
| aidlc-devsecops-agent | 規制義務から導いたセキュリティ制御仕様 |
| オーケストレータ | コンプライアンスリスクのエスカレーション、RAID ログ更新 |

### 対等に協働する相手

| 相手 | 共有の関心 |
|------|----------------|
| aidlc-aws-platform-agent | データ所在地、保存時暗号化、IAM 監査 |

---

## ナレッジ源

### 方法論（Tier 1）

パス: `.claude/knowledge/aidlc-compliance-agent/`

| ファイル | 内容 |
|------|---------|
| regulatory-frameworks.md | 主な規制枠組みの参照（PCI-DSS、HIPAA、SOC 2、GDPR） |

### チーム（Tier 2）

パス: `aidlc/knowledge/aidlc-compliance-agent/`（スペース単位のナレッジディレクトリ。利用者が管理）

チームが中身があるときに作るスペース単位ディレクトリです（エンジンは `aidlc/knowledge/` を空で出荷します）。既存コンプライアンスマトリクス、監査所見、データ分類、規制解釈など、プロジェクト固有のコンプライアンス文脈をチームが埋めます。

---

## 相互参照

- [Agent Reference Overview](README.md)
- [Agent Guide: aidlc-compliance-agent](../../guide/agents/compliance-agent.md)
- [Stage Documentation](../04-stages/)
- 正本: [`dist/claude/.claude/agents/aidlc-compliance-agent.md`](../../../dist/claude/.claude/agents/aidlc-compliance-agent.md)
