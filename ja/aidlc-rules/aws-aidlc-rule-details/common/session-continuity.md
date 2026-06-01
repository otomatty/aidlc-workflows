# セッション継続テンプレート

## ウェルカムバックプロンプトテンプレート
ユーザーが既存のAI-DLC(AI駆動開発ライフサイクル)プロジェクトの作業を続けるために戻ってきた場合、次のプロンプトを表示する：

```markdown
**Welcome back! I can see you have an existing AI-DLC project in progress.**

Based on your aidlc-state.md, here's your current status:
- **Project**: [project-name]
- **Current Phase**: [INCEPTION/CONSTRUCTION/OPERATIONS]
- **Current Stage**: [Stage Name]
- **Last Completed**: [Last completed step]
- **Next Step**: [Next step to work on]

**What would you like to work on today?**

A) Continue where you left off ([Next step description])

B) Review a previous stage ([Show available stages])

[Answer]: 
```

## 必須：セッション継続に関する指示
1. **既存プロジェクトを検出したら、まず aidlc-state.md を読み込む**
2. **現在の状態を解析する**：ワークフロー(workflow)ファイルから現在の状態を取得してプロンプトに反映する
3. **必須：前のステージの成果物を読み込む**：ステージを再開する前に、前のステージの関連成果物をすべて自動的に読み込む：
   - **Reverse Engineering**：architecture.md、code-structure.md、api-documentation.md を読み込む
   - **Requirements Analysis**：requirements.md、requirement-verification-questions.md を読み込む
   - **User Stories**：stories.md、personas.md、story-generation-plan.md を読み込む
   - **Application Design**：アプリケーション設計の成果物（components.md、component-methods.md、services.md）を読み込む
   - **Design（Units）**：unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md を読み込む
   - **ユニットごとの設計**：ユニットごとの成果物は `aidlc-docs/construction/{unit-name}/` 以下の
     `functional-design/`、`nfr-requirements/`、`nfr-design/`、`infrastructure-design/`
     サブディレクトリに配置される。再開時は `aidlc-state.md` から進行中のユニットを特定し、
     そのユニットの設計成果物と（`unit-of-work-dependency.md` に基づく）依存するユニットの
     設計成果物を読み込む。各サブディレクトリの具体的なファイルは対応するコンストラクションステージのルールで列挙されている。
   - **コードステージ**：すべてのコードファイル、計画、および前のすべての成果物を読み込む
4. **ステージ別のスマートなコンテキスト読み込み**：
   - **初期ステージ（Workspace Detection、Reverse Engineering）**：ワークスペース分析を読み込む
   - **Requirements/Stories**：リバースエンジニアリング＋要件の成果物を読み込む
   - **設計ステージ**：要件＋ストーリー＋アーキテクチャ＋設計成果物を読み込む
   - **コードステージ**：すべての成果物＋既存のコードファイルを読み込む
5. **オプションを適応させる**：アーキテクチャの選択と現在のフェーズに基づいて選択肢を調整する
6. **具体的な次のステップを示す**：汎用的な説明ではなく具体的な次のステップを表示する
7. **継続プロンプトを記録する**：タイムスタンプとともに audit.md に記録する
8. **コンテキストの要約**：成果物を読み込んだ後、ユーザーが把握できるよう読み込んだ内容の簡単な要約を提供する
9. **質問する際**：確認またはユーザーフィードバックの質問は必ず .md ファイルに配置すること。多肢選択式の質問をチャットセッション内に直接記述しないこと。

## エラー処理
セッション再開時に成果物が欠落または破損している場合は、復旧手順のガイダンスとして [error-handling.md](error-handling.md) を参照すること。
