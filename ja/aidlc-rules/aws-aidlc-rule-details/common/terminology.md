# AI-DLC 用語集

## コア用語

### Phase vs Stage（フェーズとステージ）

**Phase（フェーズ）**：AI-DLC(AI駆動開発ライフサイクル)における3つの高レベルライフサイクルフェーズのいずれか
- 🔵 **INCEPTION PHASE**（インセプション）- 計画とアーキテクチャ（WHATとWHY）
- 🟢 **CONSTRUCTION PHASE**（コンストラクション）- 設計、実装とテスト（HOW）
- 🟡 **OPERATIONS PHASE**（オペレーションズ）- デプロイメントとモニタリング（将来の拡張）

**Stage（ステージ）**：フェーズ内の個別のワークフロー(workflow)活動
- 例：Context Assessmentステージ、Requirements Assessmentステージ、Code Generationステージ
- 各ステージには特定の前提条件、手順、成果物がある
- ステージは「常時実行」または「条件付き」のいずれかである

**使用例**：
- ✅ 「CONSTRUCTION phaseには7つのステージが含まれる」
- ✅ 「Code Generationステージは常に実行される」
- ✅ 「現在はINCEPTION phaseにおり、Requirements Assessmentステージを実行中である」
- ❌ 「Requirements Assessment phase」（「stage」とすべき）
- ❌ 「CONSTRUCTION stage」（「phase」とすべき）

## 3フェーズのライフサイクル

### INCEPTION PHASE（インセプション）
**目的**：計画とアーキテクチャの決定
**焦点**：何を作るか（WHAT）、なぜ作るか（WHY）を決定する
**場所**：`inception/` ディレクトリ

**ステージ**：
- Workspace Detection（常時）
- Reverse Engineering（条件付き - ブラウンフィールドのみ）
- Requirements Analysis（常時 - 適応的深度）
- User Stories（条件付き）
- Workflow Planning（常時）
- Application Design（条件付き）
- Units Generation（条件付き）

**成果物**：要件(requirements)、ユーザーストーリー(user stories)、アーキテクチャの決定、作業単位(unit of work)の定義

### CONSTRUCTION PHASE（コンストラクション）
**目的**：詳細な設計と実装
**焦点**：どのように作るか（HOW）を決定する
**場所**：`construction/` ディレクトリ

**ステージ**：
- Functional Design（条件付き、ユニットごと）
- NFR Requirements（条件付き、ユニットごと）
- NFR Design（条件付き、ユニットごと）
- Infrastructure Design（条件付き、ユニットごと）
- Code Generation（常時）— パート1：計画、パート2：生成を含む
- Build and Test（常時）

**成果物**：設計成果物、NFR実装、コード、テスト

### OPERATIONS PHASE（オペレーションズ）
**目的**：デプロイメントと運用準備
**焦点**：どのようにデプロイ・運用するか（DEPLOY and RUN）
**場所**：`operations/` ディレクトリ

**ステージ**：
- Operations（PLACEHOLDER）

**成果物**：ビルド手順、デプロイメントガイド、モニタリング設定、検証手順

---

## ワークフローステージ

### 常時実行ステージ
- **Workspace Detection**：ワークスペースの状態とプロジェクト種別の初期分析
- **Requirements Analysis**：要件の収集（深度は複雑さに応じて変化）
- **Workflow Planning**：実行するフェーズの実行計画の作成
- **Code Generation**：2つのパートからなる単一ステージ — パート1（計画）で詳細な実装計画を作成し、パート2（生成）で計画と以前の成果物に基づいて実際のコードを生成する
- **Build and Test**：すべてのユニットのビルドと包括的なテストの実行

### 条件付きステージ
- **Reverse Engineering**：既存のコードベースの分析（ブラウンフィールドプロジェクトのみ）
- **User Stories**：ユーザーストーリー(user stories)とペルソナの作成（ストーリー計画とストーリー生成を含む）
- **Application Design**：アプリケーションのコンポーネント、メソッド、ビジネスルール、サービスの設計
- **Units Generation**：システムを作業単位(unit of work)に分解する（内部計画・生成サブステップとユニットごとの設計を含む）
- **Functional Design**：技術に依存しないビジネスロジック設計（ユニットごと）
- **NFR Requirements**：NFRの決定と技術スタックの選択（ユニットごと）
- **NFR Design**：NFRパターンと論理コンポーネントの組み込み（ユニットごと）
- **Infrastructure Design**：実際のインフラサービスへのマッピング（ユニットごと）

## アプリケーション設計の用語

- **Component（コンポーネント）**：特定の責務を持つ機能ユニット
- **Method（メソッド）**：定義されたビジネスルールを持つコンポーネント内の関数または操作
- **Business Rule（ビジネスルール）**：メソッドの振る舞いと検証を支配するロジック
- **Service（サービス）**：コンポーネント間のビジネスロジックを調整するオーケストレーション層
- **Component Dependency（コンポーネント依存関係）**：コンポーネント間の関係と通信パターン

## アーキテクチャ用語（インフラ）

### Unit of Work（作業単位）
開発目的でユーザーストーリー(user stories)を論理的にグループ化したもの。計画・分解の際に使用される用語。

**使用例**：「システムを作業単位(unit of work)に分解する必要がある」

### Service（サービス）
マイクロサービスアーキテクチャにおける独立してデプロイ可能なコンポーネント。各サービスは独立した作業単位(unit of work)である。

**使用例**：「Payment ServiceはすべてのPayment処理を扱う」

### Module（モジュール）
単一のサービスまたはモノリス内の機能の論理的なグループ。モジュールは独立してデプロイできない。

**使用例**：「User Service内の認証モジュール」

### Component（コンポーネント）
サービスまたはモジュール内の再利用可能なビルディングブロック。コンポーネントは特定の機能を提供するクラス、関数、またはパッケージである。

**使用例**：「EmailValidatorコンポーネントはメールアドレスを検証する」

## 用語使用のガイドライン

### 各用語をいつ使うか

**Unit of Work（作業単位）**：
- Units Generationステージの間
- システムの分解について話し合う際
- 計画ドキュメントや議論において
- 例：「これをどのように作業単位(unit of work)に分解するか？」

**Service（サービス）**：
- 独立してデプロイ可能なコンポーネントを指す場合
- マイクロサービスアーキテクチャのコンテキストで
- デプロイメントとインフラの議論において
- 例：「Order ServiceはECSにデプロイされる」

**Module（モジュール）**：
- サービス内の論理的なグループを指す場合
- モノリスアーキテクチャのコンテキストで
- 内部組織について話し合う際
- 例：「reportingモジュールはすべてのレポートを生成する」

**Component（コンポーネント）**：
- 特定のクラス、関数、またはパッケージを指す場合
- 設計と実装の議論において
- 再利用可能なビルディングブロックについて話し合う際
- 例：「DatabaseConnectionコンポーネントは接続を管理する」

## ステージの用語

### Planning vs Generation（計画と生成）
- **Planning（計画）**：実行のための質問とチェックボックスを含む計画の作成
- **Generation（生成）**：計画を実行して成果物を作成すること

例（これらは別個のステージではなく、単一ステージ内の内部サブステップである）：
- Story Planning → Story Generation（User Storiesステージ内）
- Units Planning → Units Generation（Units Generationステージ内）
- Unit Design Planning → Unit Design Generation（ユニットごとの設計内）
- NFR Planning → NFR Generation（NFR Requirementsステージ内）
- Code Generation Part 1（Planning）→ Code Generation Part 2（Generation）

### 深度レベル(Depth Levels)
- **Minimal**：シンプルな変更のための迅速で焦点を絞った実行
- **Standard**：標準的なプロジェクトのための標準的な成果物を伴う通常の深度
- **Comprehensive**：複雑・高リスクなプロジェクトのためのすべての成果物を含む完全な深度

## 成果物の種類

### 計画（Plans）
実行を導くチェックボックスと質問を含むドキュメント。
- `aidlc-docs/plans/` に配置される
- 例：`story-generation-plan.md`、`unit-of-work-plan.md`

### 成果物（Artifacts）
計画を実行することで生成される出力物。
- 各種 `aidlc-docs/` サブディレクトリに配置される
- 例：`requirements.md`、`stories.md`、`design.md`

### 状態ファイル（State Files）
ワークフロー(workflow)の進捗と状態を追跡するファイル。
- `aidlc-state.md`：ワークフロー全体の状態
- `audit.md`：すべてのインタラクションの完全な監査証跡

## 一般的な略語

- **AI-DLC**: AI-Driven Development Life Cycle（AI駆動開発ライフサイクル）
- **NFR**: Non-Functional Requirements（非機能要件）
- **UOW**: Unit of Work（作業単位）
- **API**: Application Programming Interface
- **CDK**: Cloud Development Kit (AWS)
