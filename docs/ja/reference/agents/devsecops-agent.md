# aidlc-devsecops-agent — 技術リファレンス

## 身元

| フィールド | 値 |
|-------|-------|
| Name | aidlc-devsecops-agent |
| Tier | **judgment** |
| Allowed Claude Code Tools | Read, Edit, Write, Glob, Grep, Bash, AskUserQuestion |
| Disallowed Claude Code Tools | Task |

---

## ステージ所有

### リードステージ

このエージェントにリードステージはありません。Inception、Construction、Operation の複数ステージでサポートだけです。

### サポートステージ

| ステージ | 名前 | このエージェントが寄与すること |
|-------|------|-----------------------------|
| practices-discovery | Practices Discovery | 互いに見えないスポーク。スキャン、秘密の扱い、セキュアパイプラインの所見を自分の寄与ファイルに残す |
| nfr-requirements | NFR Requirements | セキュリティ制御仕様と脅威モデルの統合 |
| infrastructure-design | Infrastructure Design | IAM ポリシーレビュー、セキュリティグループ検証、ネットワークセキュリティ評価 |
| build-and-test | Build and Test | SAST / DAST スキャン設定、依存脆弱性スキャン、IaC セキュリティ lint |
| environment-provisioning | Environment Provisioning | セキュリティ姿勢の検証（Security Hub、Inspector、GuardDuty、暗号化、CloudTrail、VPC Flow Logs） |

---

## 協働の型

### 受け取る相手

| 出所 | 成果物 |
|--------|-----------|
| aidlc-compliance-agent | Ideation からの規制要件（拘束レジスタ、RAID ログ） |
| aidlc-architect-agent | 脅威モデリング向けのシステム設計、コンポーネント境界 |

### 渡す相手

| 行き先 | 成果物 |
|--------|-----------|
| aidlc-developer-agent | セキュアコーディング要件、脆弱性修正仕様 |
| aidlc-quality-agent | 実行向けのセキュリティテストケース |
| aidlc-pipeline-deploy-agent | CI/CD パイプライン統合向けのセキュリティゲート |

---

## ナレッジ源

### 方法論（Tier 1）

パス: `.claude/knowledge/aidlc-devsecops-agent/`

| ファイル | 内容 |
|------|---------|
| devsecops-pipeline-patterns.md | セキュリティパイプライン統合の型（SAST、DAST、IaC スキャン） |
| nfr-requirements-guide.md | セキュリティに焦点を当てた NFR 要件の方法論 |
| security-guide.md | アプリケーションとクラウドのセキュリティ方法論 |
| threat-modelling-stride.md | STRIDE 脅威モデリングの方法論とテンプレート |

### チーム（Tier 2）

パス: `aidlc/knowledge/aidlc-devsecops-agent/`（スペース単位のナレッジディレクトリ。利用者が管理）

チームが中身があるときに作るスペース単位ディレクトリです（エンジンは `aidlc/knowledge/` を空で出荷します）。既存脅威モデル、セキュリティ方針、承認済み暗号化標準、ペネトレーションテスト所見など、プロジェクト固有のセキュリティ文脈をチームが埋めます。

---

## 相互参照

- [Agent Reference Overview](README.md)
- [Agent Guide: aidlc-devsecops-agent](../../guide/agents/devsecops-agent.md)
- [Stage Documentation](../04-stages/)
- 正本: [`dist/claude/.claude/agents/aidlc-devsecops-agent.md`](../../../dist/claude/.claude/agents/aidlc-devsecops-agent.md)
