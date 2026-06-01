# ワークスペース検出

**目的**: ワークスペースの状態を確認し、既存の AI-DLC(AI駆動開発ライフサイクル) プロジェクトを確認する

## ステップ1: 既存の AI-DLC プロジェクトを確認する

`aidlc-docs/aidlc-state.md` が存在するか確認する：
- **存在する場合**: 最後のフェーズから再開する（以前のフェーズのコンテキストを読み込む）
- **存在しない場合**: 新規プロジェクトの評価を続行する

## ステップ2: 既存コードのワークスペースをスキャンする

**ワークスペースに既存コードがあるかどうかを確認する：**
- ソースコードファイルをスキャンする（.java、.py、.js、.ts、.jsx、.tsx、.kt、.kts、.scala、.groovy、.go、.rs、.rb、.php、.c、.h、.cpp、.hpp、.cc、.cs、.fs など）
- ビルドファイルを確認する（pom.xml、package.json、build.gradle など）
- プロジェクト構造の指標を探す
- ワークスペースのルートディレクトリを特定する（aidlc-docs/ ではない）

**調査結果を記録する：**
```markdown
## Workspace State
- **Existing Code**: [Yes/No]
- **Programming Languages**: [List if found]
- **Build System**: [Maven/Gradle/npm/etc. if found]
- **Project Structure**: [Monolith/Microservices/Library/Empty]
- **Workspace Root**: [Absolute path]
```

## ステップ3: 次のフェーズを決定する

**ワークスペースが空の場合（既存コードなし）**：
- フラグを設定する: `brownfield = false`
- 次のフェーズ: 要件分析

**ワークスペースに既存コードがある場合**：
- フラグを設定する: `brownfield = true`
- `aidlc-docs/inception/reverse-engineering/` の既存のリバースエンジニアリング成果物を確認する
- **リバースエンジニアリング成果物が存在する場合**：
    - 成果物が古くなっていないか確認する（成果物のタイムスタンプとコードベースの最後の重要な変更を比較する）
    - **成果物が有効な場合**: それらを読み込み、要件分析にスキップする
    - **成果物が古い場合**: 次のフェーズはリバースエンジニアリング（成果物を更新するために再実行）
    - **ユーザーが明示的に再実行を要求した場合**: 古さに関係なく次のフェーズはリバースエンジニアリング
- **リバースエンジニアリング成果物が存在しない場合**: 次のフェーズはリバースエンジニアリング

## ステップ4: 初期状態ファイルの作成

`aidlc-docs/aidlc-state.md` を作成する：

```markdown
# AI-DLC State Tracking

## Project Information
- **Project Type**: [Greenfield/Brownfield]
- **Start Date**: [ISO timestamp]
- **Current Stage**: INCEPTION - Workspace Detection

## Workspace State
- **Existing Code**: [Yes/No]
- **Reverse Engineering Needed**: [Yes/No]
- **Workspace Root**: [Absolute path]

## Code Location Rules
- **Application Code**: Workspace root (NEVER in aidlc-docs/)
- **Documentation**: aidlc-docs/ only
- **Structure patterns**: See code-generation.md Critical Rules

## Stage Progress
[Will be populated as workflow progresses]
```

## ステップ5: 完了メッセージの提示

**ブラウンフィールドプロジェクトの場合：**
```markdown
# 🔍 Workspace Detection Complete

Workspace analysis findings:
• **Project Type**: Brownfield project
• [AI-generated summary of workspace findings in bullet points]
• **Next Step**: Proceeding to **Reverse Engineering** to analyze existing codebase...
```

**グリーンフィールドプロジェクトの場合：**
```markdown
# 🔍 Workspace Detection Complete

Workspace analysis findings:
• **Project Type**: Greenfield project
• **Next Step**: Proceeding to **Requirements Analysis**...
```

## ステップ6: 自動的に次のフェーズに進む

- **ユーザーの承認は不要** — これは情報提供のみ
- 次のフェーズに自動的に進む：
  - **ブラウンフィールド**: リバースエンジニアリング（既存の成果物がない場合）または要件分析（成果物が存在する場合）
  - **グリーンフィールド**: 要件分析
