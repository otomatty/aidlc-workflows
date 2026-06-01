# ビジョンドキュメントガイド

## 目的

ビジョンドキュメントは、AI-DLCのワークフローに入る前に、プロジェクトの**ビジネスゴール**・**目標とする成果**・**スコープの境界**を定義します。Inception(インセプション)フェーズへの主要インプットとして機能し、AIモデルとチームがプロジェクトで何を達成しようとしているのか、なぜそれが重要なのかについて共通理解を持てるようにします。

よく書かれたビジョンドキュメントは、要件分析における曖昧さを減らし、ユーザーストーリーの品質を高め、Construction(コンストラクション)中のスコープクリープを防ぎます。

## ビジョンドキュメントを書くタイミング

- 新規プロジェクトや大型の施策を開始する前
- 新しい製品、機能セット、またはプラットフォームを提案するとき
- 既存製品を新しい方向に転換するとき
- 開発開始前に複数のステークホルダー間でゴールの合意が必要なとき

## ドキュメント構成

### 1. エグゼクティブサマリー

プロジェクトの本質を捉えた短い段落（3〜5文）です。このセクションだけを読んだ人でも、プロジェクトが何であるか、誰のためのものか、なぜ存在するかが理解できるようにしてください。

**テンプレート:**

```markdown
## Executive Summary

[Project Name] is a [type of system/product] that enables [target users] to [core capability].
It addresses [business problem or opportunity] by [approach or differentiation].
The expected outcome is [measurable business result].
```

**例:**

```markdown
## Executive Summary

OrderFlow is a web-based order management platform that enables mid-size retailers to
track inventory, process customer orders, and manage supplier relationships in a single
interface. It addresses the fragmented tooling problem that causes fulfillment delays
and inventory mismatches. The expected outcome is a 30% reduction in order processing
time and elimination of manual inventory reconciliation.
```

---

### 2. ビジネスコンテキスト

ビジネス環境、解決しようとしている課題、そして今それを解決することがなぜ重要かを説明します。

**含めるべきセクション:**

```markdown
## Business Context

### Problem Statement
[What specific business problem or pain point does this project address?
Be concrete. Avoid vague statements like "improve efficiency."]

### Business Drivers
[Why is this project being pursued now? What market conditions, competitive
pressures, regulatory changes, or internal needs make this timely?]

### Target Users and Stakeholders
[Who will use the system? Who has a stake in its success?
List user types with a brief description of each.]

| User Type | Description | Primary Need |
|-----------|-------------|--------------|
| [Role]    | [Who they are] | [What they need from this system] |

### Business Constraints
[Budget limits, regulatory requirements, organizational policies, timeline
pressures, or other non-negotiable boundaries.]

### Success Metrics
[How will the business measure whether this project succeeded?
Use specific, measurable criteria.]

| Metric | Current State | Target State | Measurement Method |
|--------|--------------|--------------|-------------------|
| [Metric name] | [Baseline] | [Goal] | [How measured] |
```

---

### 3. フルスコープビジョン

このセクションでは、製品またはシステムの**長期的なビジョン全体**を説明します。意図的に将来志向の記述とし、最初に何を作るかだけでなく、プロジェクトが将来なり得るすべてのことを網羅します。

**含めるべきセクション:**

```markdown
## Full Scope Vision

### Product Vision Statement
[A single sentence or short paragraph that captures the long-term aspirational
state of the product. What does the world look like when this product is fully
realized?]

### Feature Areas
[Organize the full feature set into logical groups. For each area, describe
what the system will do at full maturity.]

#### Feature Area 1: [Name]
- **Description**: [What this area covers]
- **Key Capabilities**:
  - [Capability 1]
  - [Capability 2]
  - [Capability 3]
- **User Value**: [Why this matters to users]

#### Feature Area 2: [Name]
[Same structure]

### Integration Points
[What external systems, APIs, or data sources will the full system integrate
with at maturity?]

- [System/Service] - [Purpose of integration]

### User Journeys (Full Vision)
[Describe 2-3 end-to-end user journeys that represent the complete product
experience. These should reflect the full scope, not the MVP.]

#### Journey 1: [Name]
1. [Step]
2. [Step]
3. [Step]
**Outcome**: [What the user achieves]

### Scalability and Growth
[How is the product expected to grow? New markets, user types, geographies,
data volumes, or feature categories?]

### Long-Term Roadmap (Optional)
[If known, outline the high-level phases or milestones beyond the MVP.
This is directional, not committal.]

| Phase | Focus | Timeframe (if known) |
|-------|-------|---------------------|
| MVP | [Core scope] | [Target] |
| Phase 2 | [Expansion area] | [Target] |
| Phase 3 | [Further expansion] | [Target] |
```

---

### 4. MVPスコープ

このセクションでは、**最小限の実用製品**を定義します。測定可能な価値を提供し、コアビジネス仮説を検証するために必要な最小限の機能セットです。ここに挙げられたものはすべて、製品をリリース・評価する前に構築されなければなりません。

**含めるべきセクション:**

```markdown
## MVP Scope

### MVP Objective
[What is the single most important thing the MVP must prove or deliver?
Keep this to 1-2 sentences.]

### MVP Success Criteria
[How will you know the MVP succeeded? These should be testable and specific.]

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

### Features In Scope (MVP)
[List every feature that is included in the MVP. Be explicit. If it is not
listed here, it is not in the MVP.]

| Feature | Description | Priority | Rationale for Inclusion |
|---------|-------------|----------|------------------------|
| [Feature name] | [Brief description] | Must Have | [Why it cannot be deferred] |

### Features Explicitly Out of Scope (MVP)
[List features from the Full Scope Vision that are deliberately excluded
from the MVP. State why each is deferred. This prevents scope creep.]

| Feature | Reason for Deferral | Target Phase |
|---------|-------------------|--------------|
| [Feature name] | [Why it can wait] | [Phase 2/3/TBD] |

### MVP User Journeys
[Describe the user journeys that the MVP must support. These are subsets
or simplified versions of the Full Vision journeys.]

#### Journey 1: [Name]
1. [Step]
2. [Step]
3. [Step]
**Outcome**: [What the user achieves]
**Limitation vs Full Vision**: [What is simplified or missing compared to full scope]

### MVP Constraints and Assumptions
[What assumptions is the MVP built on? What known limitations are accepted?]

- **Assumption**: [Statement] - **Risk if wrong**: [Consequence]
- **Accepted Limitation**: [What is intentionally limited and why]

### MVP Definition of Done
[What must be true for the MVP to be considered complete and ready for
evaluation or launch?]

- [ ] All "Must Have" features implemented and tested
- [ ] [Additional criteria specific to this project]
- [ ] [Deployment or accessibility requirement]
- [ ] [Stakeholder sign-off requirement]
```

---

### 5. リスクと依存関係

```markdown
## Risks and Dependencies

### Key Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| [Risk description] | High/Medium/Low | High/Medium/Low | [Mitigation strategy] |

### External Dependencies
[List anything outside the team's control that the project depends on.]

- [Dependency] - [Owner] - [Status]

### Open Questions
[List unresolved questions that need answers before or during development.
These feed directly into the Requirements Analysis clarifying questions.]

- [ ] [Question]
- [ ] [Question]
```

---

## 執筆ガイドライン

### すべきこと

- 具体的かつ測定可能に書いてください。「注文処理時間を30%削減する」のほうが「もっと速くする」より優れています。
- フルビジョンとMVPを明確に分けてください。混在させるとスコープクリープが起きます。
- 「スコープ外」リストを含めてください。「スコープ内」リストと同様に価値があります。
- 経営幹部ではなくチームのために書いてください。マーケティング的な言葉は避けてください。
- 前提を明示し、検証できるようにしてください。
- 実際にテストできる成功基準を含めてください。

### すべきでないこと

- 曖昧な言葉を使わないでください。「世界クラス」「シームレス」「直感的」「業界最高水準」といった表現は避けてください。
- 技術やその実装の詳細を書かないでください。それは技術環境ドキュメントに属します。
- MVPセクションを省略しないでください。すべてのプロジェクトには定義された開始境界が必要です。
- 機能とユーザーストーリーを混在させないでください。機能はシステムが何をするかを説明し、ユーザーストーリーはユーザーがどのように体験するかを説明します。
- 読者がビジネスコンテキストを知っていると仮定しないでください。当然のように見えても問題提起は書いてください。

---

## このドキュメントがAI-DLCにどう活用されるか

| ビジョンドキュメントセクション | AI-DLCステージ                             | 活用方法                                                   |
| ------------------------------ | ------------------------------------------ | ---------------------------------------------------------- |
| エグゼクティブサマリー         | ワークスペース検出                         | プロジェクト分類のための初期コンテキスト                   |
| ビジネスコンテキスト           | 要件分析                                   | 確認質問と要件の深さを決定                                 |
| フルスコープビジョン           | ユーザーストーリー、アプリケーション設計   | ペルソナ作成、コンポーネント特定に活用                     |
| MVPスコープ                    | ワークフロー計画                           | 実行するステージの決定、スコープ境界の定義                 |
| スコープ内・外の機能           | コード生成                                 | 今回のイテレーションで構築するものを定義                   |
| リスクと依存関係               | 全ステージ                                 | リスク評価とエラーハンドリングに活用                       |
| オープンクエスチョン           | 要件分析                                   | 質問ファイルの確認質問として活用                           |
