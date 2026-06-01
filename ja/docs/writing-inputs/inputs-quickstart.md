# AI-DLC クイックスタート

AI-DLC(AI駆動開発ライフサイクル)は、AIアシスタントがソフトウェアの計画・設計・構築を進めるための体系的なワークフローです。プロジェクトを開始する前に、**何を作るか**と**どのツールを使うか**をAIに伝える2つのドキュメントを用意します。

---

## 用意するドキュメント

### 1. ビジョンドキュメント — 何を・なぜ作るか

| セクション                         | 書くべき内容                                                               | 長さの目安                                                   |
| ---------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **エグゼクティブサマリー**         | 1段落：何であるか、誰のためか、なぜ重要か                                  | 3〜5文                                                       |
| **問題提起**                       | このプロジェクトが解決する具体的なビジネス課題                             | 1〜2段落                                                     |
| **対象ユーザー**                   | 誰が使うか、各ユーザータイプが必要とするもの                               | ユーザータイプごとに1行のテーブル                            |
| **成功指標**                       | プロジェクトの成否をどう測るか                                             | 測定可能な目標値を含むテーブル                               |
| **フルスコープビジョン**           | 製品が成熟した際に実現し得るすべての機能、機能エリアごとに整理             | 必要な数の機能エリア                                         |
| **MVPスコープ — 含まれる機能**    | 初回リリースに含まれるすべての機能と採用理由                               | テーブル形式。ここに記載のないものはMVPに含まれません。      |
| **MVPスコープ — 除外される機能**  | MVPから意図的に除外した機能、その理由と対象フェーズ                        | テーブル形式。スコープクリープを防止します。                 |
| **リスクとオープンクエスチョン**   | 何が問題になり得るか、何がまだ未決定か                                     | テーブルと箇条書きリスト                                     |

**重要な原則**: フルビジョンとMVPを明確に分けてください。フルビジョンは将来への志向を示すものであり、MVPは価値を届ける最小のものです。

完全なガイド: [vision-document-guide.md](vision-document-guide.md)
実例: [example-vision-scientific-calculator-api.md](example-vision-scientific-calculator-api.md)

---

### 2. 技術環境ドキュメント — どのツールを使うか

| セクション                       | 書くべき内容                                                                                                                              | 長さの目安                                         |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **言語**                         | 必須・許可・禁止の言語とバージョン                                                                                                        | カテゴリごとにテーブル                             |
| **フレームワークとライブラリ**   | 必須・推奨・禁止のものと理由・代替手段                                                                                                    | カテゴリごとにテーブル                             |
| **クラウドサービス**             | 使用許可リストと使用禁止リスト、制約条件付き                                                                                              | リストごとにテーブル                               |
| **アーキテクチャとパターン**     | APIスタイル、データパターン、メッセージング、プロジェクト構成                                                                             | テーブルを含む短いセクション                       |
| **セキュリティ**                 | 認証方式、暗号化、入力バリデーション、シークレット管理、選択したセキュリティコンプライアンスフレームワークとカテゴリ別のコントロール記録   | 複数のサブセクション                               |
| **テスト**                       | テスト種別、カバレッジ目標、ツール、CI/CDゲート                                                                                           | テーブル                                           |
| **サンプルコード**               | エンドポイント・関数・テスト・インフラの標準的なパターンを示すテンプレートコード                                                          | `examples/` ディレクトリに実際に動作するコードファイル |

**重要な原則**: 何が許可されていて何が許可されていないかを明示してください。許可リストと禁止リストがあることで、AIが勝手に判断するのを防ぎます。

完全なガイド: [technical-environment-guide.md](technical-environment-guide.md)
実例: [example-tech-env-scientific-calculator-api.md](example-tech-env-scientific-calculator-api.md)

---

## 最小限のインプット

すぐに始めて後から詳細を補完したい場合は、少なくとも以下を用意してください。

### ビジョン（最小限）

```text
1. One paragraph saying what you are building and for whom
2. A list of MVP features (what is IN scope)
3. A list of what is NOT in the MVP
4. Open questions -- things you already know are uncertain or unresolved
```

オープンクエスチョンは任意ですが、非常に有効です。要件分析における事前宣言済みの曖昧点として直接反映されるため、設計の途中で突然浮上する問題としてではなく、AI-DLCが早い段階で対処できます。

実例: [example-minimal-vision-scientific-calculator-api.md](example-minimal-vision-scientific-calculator-api.md)

### 技術環境（最小限）

```text
1. Language and version
2. Package manager
3. Web framework (if applicable)
4. Cloud provider and deployment model (or "local only")
5. Test framework
6. Prohibited libraries and services -- use a table: prohibited | reason | use instead
7. Security basics (auth method, input validation approach, secrets management)
8. Example code patterns -- one short example each for a typical endpoint, function, and test
```

**項目6について**: 禁止理由と推奨される代替手段を記載することが重要です。これらがなければ、AI-DLCは禁止事項を守ることはできても、意図を十分に理解して適切な代替判断を下せない可能性があります。

**項目8について**: 1〜2個の短いサンプルコードを提供するだけでも、コード生成時にAI-DLCが独自のパターンを作り出すのではなく、既存の具体的なパターンに従うことができます。基本事項を超えた追加として、これが最も高いレバレッジを持つ項目です。

実例: [example-minimal-tech-env-scientific-calculator-api.md](example-minimal-tech-env-scientific-calculator-api.md)

その他の詳細はInception(インセプション)フェーズ中のAI-DLCの確認質問を通じて補完できます。事前に提供する情報が多いほど、AIが質問する回数は少なくなります。

---

## ブラウンフィールドプロジェクト

既存のコードベースに追加・変更を行う場合、インプットは異なる質問群に答える必要があります。全ガイドにはブラウンフィールドの詳細が記載されていますが、最小限のインプットは以下のとおりです。

### ビジョン（ブラウンフィールド最小限）

```text
1. Current state -- one paragraph describing what the system does today
2. What we are adding or changing -- a clear description of the change
3. Features IN scope for this iteration
4. Features OUT of scope for this iteration
5. What must NOT change -- existing components, APIs, or data the new work must not touch
6. Open questions
```

「変更してはならないもの」のセクションは非常に重要です。AI-DLCはリバースエンジニアリングステージで既存のコードベースを分析しますが、境界を明示することで、正常に動作しているシステムの部分を不安定にするような変更を提案されるのを防ぎます。

実例: [example-minimal-vision-brownfield.md](example-minimal-vision-brownfield.md)

### 技術環境（ブラウンフィールド最小限）

```text
1. Existing stack -- language, framework, database, infra -- with versions
2. What to add (new services, tables, components)
3. What must stay unchanged -- services, schemas, contracts, configs not to touch
4. Prohibited patterns -- libraries or approaches that conflict with the existing codebase
5. Security basics -- how auth and secrets work in the existing system
6. Example code patterns from the existing codebase
```

サンプルコードパターンはブラウンフィールドでは特に重要です。AI-DLCは既存のコードベースに馴染むコードを生成すべきであり、既存の慣習の隣に新しい慣習を持ち込むようなコードを生成すべきではありません。実際の既存ファイルからサンプルを取得してください。

実例: [example-minimal-tech-env-brownfield.md](example-minimal-tech-env-brownfield.md)

---

## これらのドキュメントを提供した後の流れ

AI-DLCは2つの主要フェーズを実行します。

**Inception(インセプション)** — 理解と計画

1. ワークスペースの検出（新規プロジェクトか既存コードか）
2. 要件の分析（不明点があれば確認質問を実施）
3. ユーザーストーリーの作成（プロジェクトの規模が必要とする場合）
4. 実行計画の構築（どのステージを実行し、どれをスキップするか）
5. コンポーネントと作業単位(unit of work)の設計（複雑さが必要とする場合）

**Construction(コンストラクション)** — 設計と構築（作業単位(unit of work)ごとに実施）

1. 機能設計（ビジネスロジック、ドメインモデル）
2. 非機能要件と設計（パフォーマンス、セキュリティ、スケーラビリティ）
3. インフラ設計（実際のクラウドサービスへのマッピング）
4. コード生成（コード、テスト、デプロイメント成果物の作成）
5. ビルドとテスト（ビルド手順、テスト実行、検証）

各ステージは、次に進む前に承認が必要です。ゲートごとに変更の要求、スキップしたステージの追加、方向転換が可能です。

---

## ファイル概要

```text
docs/writing-inputs/
  inputs-quickstart.md                               <-- You are here
  vision-document-guide.md                           <-- How to write a vision document
  technical-environment-guide.md                     <-- How to write a tech environment document

  -- Greenfield examples (new project from scratch) --
  example-vision-scientific-calculator-api.md        <-- Full example: CalcEngine vision
  example-tech-env-scientific-calculator-api.md      <-- Full example: CalcEngine tech env
  example-minimal-vision-scientific-calculator-api.md<-- Minimal example: CalcEngine vision
  example-minimal-tech-env-scientific-calculator-api.md<-- Minimal example: CalcEngine tech env

  -- Brownfield examples (adding to an existing system) --
  example-minimal-vision-brownfield.md               <-- Minimal example: returns module on existing platform
  example-minimal-tech-env-brownfield.md             <-- Minimal example: returns module on existing platform
```
