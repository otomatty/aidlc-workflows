# 生成される aidlc-docs/ リファレンス

AI-DLC ワークフローを実行すると、すべてのドキュメント成果物がワークスペースのルートにある `aidlc-docs/` ディレクトリ内に生成されます。作成される正確なファイルは、プロジェクトの種類（グリーンフィールド vs ブラウンフィールド）、複雑さ、およびワークフローが実行またはスキップするステージによって異なります。

以下は、すべてのフェーズとステージにわたるすべての可能なファイルを示す完全に展開された構造です。条件付きファイルには、表示される状況を示す注記が付いています。

```text
aidlc-docs/
├── aidlc-state.md                                          # ワークフロー状態トラッカー — プロジェクト情報、ステージの進捗、現在の状態
├── audit.md                                                # 完全な監査証跡 — すべてのユーザー入力、AI の応答、タイムスタンプ付き承認
│
├── inception/                                              # 🔵 Inception フェーズ — 何を構築するか、なぜ構築するかを決定する
│   ├── plans/
│   │   ├── execution-plan.md                               # ワークフローの視覚化とフェーズ実行の決定（常に作成）
│   │   ├── story-generation-plan.md                        # ストーリー開発の方法論と質問（ユーザーストーリーが実行される場合）
│   │   ├── user-stories-assessment.md                      # ユーザーストーリーが価値を追加するかどうかの評価（ユーザーストーリーが実行される場合）
│   │   ├── application-design-plan.md                      # コンポーネントとサービスの設計計画と質問（アプリケーション設計が実行される場合）
│   │   └── unit-of-work-plan.md                            # システム分解計画と質問（作業単位(unit of work)生成が実行される場合）
│   │
│   ├── reverse-engineering/                                # ブラウンフィールドプロジェクトにのみ作成（既存のコードベースが検出された場合）
│   │   ├── business-overview.md                            # ビジネスコンテキスト、トランザクション、辞書
│   │   ├── architecture.md                                 # システムアーキテクチャ図、コンポーネントの説明、データフロー
│   │   ├── code-structure.md                               # ビルドシステム、主要なクラス/モジュール、デザインパターン、ファイルインベントリ
│   │   ├── api-documentation.md                            # REST API、内部 API、データモデル
│   │   ├── component-inventory.md                          # 種類別（アプリケーション、インフラストラクチャ、共有、テスト）の全パッケージのインベントリ
│   │   ├── technology-stack.md                             # 言語、フレームワーク、インフラストラクチャ、ビルドツール、テストツール
│   │   ├── dependencies.md                                 # 内部および外部の依存関係グラフと関係
│   │   ├── code-quality-assessment.md                      # テストカバレッジ、コード品質指標、技術的負債、パターン
│   │   └── reverse-engineering-timestamp.md                # 分析のメタデータと成果物チェックリスト
│   │
│   ├── requirements/
│   │   ├── requirements.md                                 # 機能要件と非機能要件（インテント分析付き）（常に作成）
│   │   └── requirement-verification-questions.md           # ユーザー入力用の [Answer]: タグ付き確認質問（常に作成）
│   │
│   ├── user-stories/                                       # ユーザーストーリーステージが実行される場合のみ作成
│   │   ├── stories.md                                      # 受け入れ基準付きの INVEST 基準に従ったユーザーストーリー
│   │   └── personas.md                                     # ユーザーアーキタイプ、特性、ペルソナとストーリーのマッピング
│   │
│   └── application-design/                                 # アプリケーション設計および/または作業単位(unit of work)生成が実行される場合のみ作成
│       ├── application-design.md                           # 統合設計ドキュメント（アプリケーション設計が実行される場合）
│       ├── components.md                                   # コンポーネントの定義、責任、インターフェース
│       ├── component-methods.md                            # メソッドのシグネチャ、目的、入出力の種類
│       ├── services.md                                     # サービスの定義、責任、オーケストレーションパターン
│       ├── component-dependency.md                         # コンポーネント間の依存関係マトリックスと通信パターン
│       ├── unit-of-work.md                                 # 作業単位(unit of work)の定義と責任（作業単位(unit of work)生成が実行される場合）
│       ├── unit-of-work-dependency.md                      # 作業単位(unit of work)間の依存関係マトリックス（作業単位(unit of work)生成が実行される場合）
│       └── unit-of-work-story-map.md                       # ユーザーストーリーから作業単位(unit of work)へのマッピング（作業単位(unit of work)生成が実行される場合）
│
├── construction/                                           # 🟢 Construction フェーズ — どのように構築するかを決定する
│   ├── plans/
│   │   ├── {unit-name}-functional-design-plan.md           # ビジネスロジック設計計画と質問（ユニットごと、機能設計が実行される場合）
│   │   ├── {unit-name}-nfr-requirements-plan.md            # NFR 評価計画と質問（ユニットごと、NFR 要件が実行される場合）
│   │   ├── {unit-name}-nfr-design-plan.md                  # NFR 設計パターン計画と質問（ユニットごと、NFR 設計が実行される場合）
│   │   ├── {unit-name}-infrastructure-design-plan.md       # インフラストラクチャマッピング計画と質問（ユニットごと、インフラストラクチャ設計が実行される場合）
│   │   └── {unit-name}-code-generation-plan.md             # チェックボックス付きの詳細なコード生成ステップ（ユニットごと、常に作成）
│   │
│   ├── {unit-name}/                                        # ユニットごとの成果物 — 作業単位(unit of work)ごとに 1 つのディレクトリ
│   │   ├── functional-design/                              # このユニットに対して機能設計が実行される場合のみ作成
│   │   │   ├── business-logic-model.md                     # 詳細なビジネスロジックとアルゴリズム
│   │   │   ├── business-rules.md                           # ビジネスルール、バリデーションロジック、制約
│   │   │   ├── domain-entities.md                          # エンティティと関係を含むドメインモデル
│   │   │   └── frontend-components.md                      # UI コンポーネント階層、プロップ、状態、インタラクション（ユニットにフロントエンドがある場合）
│   │   │
│   │   ├── nfr-requirements/                               # このユニットに対して NFR 要件が実行される場合のみ作成
│   │   │   ├── nfr-requirements.md                         # スケーラビリティ、パフォーマンス、可用性、セキュリティ要件
│   │   │   └── tech-stack-decisions.md                     # 技術選択とその根拠
│   │   │
│   │   ├── nfr-design/                                     # このユニットに対して NFR 設計が実行される場合のみ作成
│   │   │   ├── nfr-design-patterns.md                      # 耐障害性、スケーラビリティ、パフォーマンス、セキュリティのパターン
│   │   │   └── logical-components.md                       # 論理インフラストラクチャコンポーネント（キュー、キャッシュなど）
│   │   │
│   │   ├── infrastructure-design/                          # このユニットに対してインフラストラクチャ設計が実行される場合のみ作成
│   │   │   ├── infrastructure-design.md                    # クラウドサービスのマッピングとインフラストラクチャコンポーネント
│   │   │   └── deployment-architecture.md                  # デプロイメントモデル、ネットワーキング、スケーリング設定
│   │   │
│   │   └── code/                                           # 生成されたコードの Markdown サマリー（ユニットごとに常に作成）
│   │       └── *.md                                        # コード生成サマリー（実際のコードはワークスペースのルートに配置）
│   │
│   ├── shared-infrastructure.md                            # ユニット間の共有インフラストラクチャ（該当する場合）
│   │
│   └── build-and-test/                                     # すべてのユニットがコード生成を完了した後に常に作成
│       ├── build-instructions.md                           # 前提条件、ビルドステップ、トラブルシューティング
│       ├── unit-test-instructions.md                       # ユニットテストの実行コマンドと期待される結果
│       ├── integration-test-instructions.md                # 統合テストのシナリオ、セットアップ、実行
│       ├── performance-test-instructions.md                # 負荷/ストレステストの設定と実行（パフォーマンス NFR が存在する場合）
│       ├── contract-test-instructions.md                   # サービス間の API コントラクト検証（マイクロサービスの場合）
│       ├── security-test-instructions.md                   # 脆弱性スキャンとセキュリティテスト（セキュリティ NFR が存在する場合）
│       ├── e2e-test-instructions.md                        # エンドツーエンドのユーザーワークフローテスト（該当する場合）
│       └── build-and-test-summary.md                       # 全体的なビルド状態、テスト結果、準備状況の評価
│
└── operations/                                             # 🟡 Operations フェーズ — 将来の拡張のためのプレースホルダー
```

## 注意事項

- `{unit-name}` は実際のユニット名（例: `api-service`、`frontend-app`、`data-processor`）に置き換えられます。単一ユニットのプロジェクトでは、通常 `construction/` の下に 1 つのユニットディレクトリがあります。
- より単純な単一ユニットのプロジェクトでは、モデルが命名を簡略化する場合があります。例えば、`construction/plans/{unit-name}-code-generation-plan.md` の代わりに `construction/plans/code-generation-plan.md` を使用したり、個別のコンポーネントファイルなしに `application-design.md` を単一の統合ファイルとして配置したりすることがあります。
- `build-and-test/` ディレクトリには常に `build-and-test-summary.md` が含まれます。個別の指示ファイル（`build-instructions.md`、`unit-test-instructions.md`、`integration-test-instructions.md` など）はプロジェクトの複雑さとテストニーズに基づいて生成されます。
- `inception/plans/` と `construction/plans/` のプランには、ユーザーが入力を提供する `[Answer]:` タグと、実行の進捗を追跡する `[ ]`/`[x]` チェックボックスが含まれています。
- アプリケーションコードは `aidlc-docs/` 内には配置されません。ワークスペースのルートに配置されます。Markdown ドキュメントのみがここに置かれます。
- `audit.md` ファイルは追記専用であり、ISO 8601 タイムスタンプ付きのすべてのインタラクションをキャプチャします。
- `aidlc-state.md` ファイルは、拡張設定とともに、完了・スキップ・進行中のステージを追跡します。
