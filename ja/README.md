# AI-DLC(AI駆動開発ライフサイクル)

> [!IMPORTANT]
> 生成AIは誤りを犯すことがあります。選択したAIモデルおよびエージェント型コーディングアシスタントが生成するすべての出力とコストを確認することをお勧めします。詳細は [AWS Responsible AI Policy](https://aws.amazon.com/ai/responsible-ai/policy/) をご覧ください。

<!-- TODO: Replace this Amplify URL with a permanent/stable URL when available -->
AI-DLCは、ニーズに適応し、品質基準を維持し、プロセスを常に手元でコントロールできるインテリジェントなソフトウェア開発ワークフローです。AI-DLC方法論の詳細については、こちらの[ブログ](https://aws.amazon.com/blogs/devops/ai-driven-development-life-cycle/)およびそこで参照されている[方法論定義ペーパー](https://prod.d13rzhkk8cj2z0.amplifyapp.com/)をお読みください。

## 目次

- [共通手順](#共通手順)
- [プラットフォーム別セットアップ](#プラットフォーム別セットアップ)
- [使い方](#使い方)
- [3フェーズ適応型ワークフロー](#3フェーズ適応型ワークフロー)
- [主な機能](#主な機能)
- [拡張機能](#拡張機能)
- [サポートツール](#サポートツール)
- [信条](#信条)
- [前提条件](#前提条件)
- [トラブルシューティング](#トラブルシューティング)
- [バージョン管理の推奨事項](#バージョン管理の推奨事項)
- [その他のリソース](#その他のリソース)
- [生成される aidlc-docs/ リファレンス](#生成される-aidlc-docs-リファレンス)
- [実験的機能: AIによるセットアップ支援（リリースのダウンロード）](#実験的機能-aiによるセットアップ支援リリースのダウンロード)
- [コントリビュート](#コントリビュート)
- [ライセンス](#ライセンス)

---

## 共通手順

1. [リリースページ](../../releases/latest)から最新リリースのzipファイル `ai-dlc-rules-v<release-number>.zip` を、プロジェクトディレクトリの**外**のフォルダ（例: `~/Downloads`）にダウンロードします。
2. zipを展開します。展開後の `aidlc-rules/` フォルダには2つのサブディレクトリが含まれています:
   - `aws-aidlc-rules/` — AI-DLCワークフローのコアルール
   - `aws-aidlc-rule-details/` — コアルールから条件付きで参照される詳細ルール
3. 以下のコーディングエージェントとプラットフォームに合わせたセットアップ手順に従ってください。

---

## プラットフォーム別セットアップ

- [Kiro](#kiro)
- [Amazon Q Developer IDE Plugin](#amazon-q-developer-ide-pluginextension)
- [Cursor IDE](#cursor-ide)
- [Cline](#cline)
- [Claude Code](#claude-code)
- [GitHub Copilot](#github-copilot)

---

### Kiro

AI-DLCは、プロジェクトワークスペース内で [Kiro Steering Files](https://kiro.dev/docs/cli/steering/) を使用します。

以下のコマンドは、zipを `Downloads` フォルダに展開して `Downloads/aidlc-rules/` というパスになっていることを前提としています。別の場所を使用した場合は、`Downloads` を実際のフォルダパスに置き換えてください。

> [!NOTE]
> **Windowsユーザーへ:** ファイルエクスプローラーの **「すべて展開...」** ダイアログを使用すると、デフォルトでzipファイル名をそのままフォルダ名にしたラッパーフォルダが作成されます（例: `ai-dlc-rules-v0.1.8\aidlc-rules\...`）。展開先を編集して内容が直接 `Downloads\aidlc-rules\` に入るようにするか（以下のコマンドに合わせるため）、各コマンドの `Downloads\` の前に `ai-dlc-rules-v<version>\` を付加してください（`<version>` はダウンロードしたリリース番号に置き換えてください）。

macOS/Linux の場合:

```bash
mkdir -p .kiro/steering
cp -R ~/Downloads/aidlc-rules/aws-aidlc-rules .kiro/steering/
cp -R ~/Downloads/aidlc-rules/aws-aidlc-rule-details .kiro/
```

Windows (PowerShell) の場合:

```powershell
New-Item -ItemType Directory -Force -Path ".kiro\steering"
Copy-Item -Recurse "$env:USERPROFILE\Downloads\aidlc-rules\aws-aidlc-rules" ".kiro\steering\"
Copy-Item -Recurse "$env:USERPROFILE\Downloads\aidlc-rules\aws-aidlc-rule-details" ".kiro\"
```

Windows (CMD) の場合:

```cmd
mkdir .kiro\steering
xcopy %USERPROFILE%\Downloads\aidlc-rules\aws-aidlc-rules .kiro\steering\aws-aidlc-rules\ /E /I
xcopy %USERPROFILE%\Downloads\aidlc-rules\aws-aidlc-rule-details .kiro\aws-aidlc-rule-details\ /E /I
```

プロジェクト構成は次のようになります:

```text
<project-root>/
    ├── .kiro/
    │     ├── steering/
    │     │      ├── aws-aidlc-rules/
    │     ├── aws-aidlc-rule-details/
```

ルールが読み込まれているか確認するには:

#### Kiro IDEで確認する

ステアリングファイルパネルを開き、以下のスクリーンショットのように `Workspace` の下に `core-workflow` のエントリが表示されていることを確認してください。

<img src="./assets/images/kiro-ide-aidlc-rules-loaded.png?raw=true" alt="Kiro IDEにおけるAI-DLCルール" width="700" height="450">

AI-DLCワークフローを実行する際は、Kiro IDEをVibeモードで使用します。これにより、AI-DLCワークフローがKiroでの開発ワークフローを適切に誘導します。Kiroがspecモードへの切り替えを促すことがありますが、そのようなプロンプトには `No` を選択してVibeモードを維持してください。

<img src="./assets/images/kiro-sdd-nudge.png?raw=true" alt="Kiro Vibeモードを維持する" width="500" height="175">

#### Kiro CLIで確認する

`kiro-cli` を起動し、`/context show` を実行して、`.kiro/steering/aws-aidlc-rules` のエントリが表示されていることを確認してください。

<img src="./assets/images/kiro-cli-aidlc-rules-loaded.png?raw=true" alt="Kiro CLIにおけるAI-DLCルール" width="700" height="660">

---

### Amazon Q Developer IDE Plugin/Extension

AI-DLCは、プロジェクトワークスペース内で [Amazon Q Rules](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/context-project-rules.html) を使用します。

以下のコマンドは、zipを `Downloads` フォルダに展開して `Downloads/aidlc-rules/` というパスになっていることを前提としています。別の場所を使用した場合は、`Downloads` を実際のフォルダパスに置き換えてください。

> [!NOTE]
> **Windowsユーザーへ:** ファイルエクスプローラーの **「すべて展開...」** ダイアログを使用すると、デフォルトでzipファイル名をそのままフォルダ名にしたラッパーフォルダが作成されます（例: `ai-dlc-rules-v0.1.8\aidlc-rules\...`）。展開先を編集して内容が直接 `Downloads\aidlc-rules\` に入るようにするか（以下のコマンドに合わせるため）、各コマンドの `Downloads\` の前に `ai-dlc-rules-v<version>\` を付加してください（`<version>` はダウンロードしたリリース番号に置き換えてください）。

macOS/Linux の場合:

```bash
mkdir -p .amazonq/rules
cp -R ~/Downloads/aidlc-rules/aws-aidlc-rules .amazonq/rules/
cp -R ~/Downloads/aidlc-rules/aws-aidlc-rule-details .amazonq/
```

Windows (PowerShell) の場合:

```powershell
New-Item -ItemType Directory -Force -Path ".amazonq\rules"
Copy-Item -Recurse "$env:USERPROFILE\Downloads\aidlc-rules\aws-aidlc-rules" ".amazonq\rules\"
Copy-Item -Recurse "$env:USERPROFILE\Downloads\aidlc-rules\aws-aidlc-rule-details" ".amazonq\"
```

Windows (CMD) の場合:

```cmd
mkdir .amazonq\rules
xcopy %USERPROFILE%\Downloads\aidlc-rules\aws-aidlc-rules .amazonq\rules\aws-aidlc-rules\ /E /I
xcopy %USERPROFILE%\Downloads\aidlc-rules\aws-aidlc-rule-details .amazonq\aws-aidlc-rule-details\ /E /I
```

プロジェクト構成は次のようになります:

```text
<project-root>/
    ├── .amazonq/
    │     ├── rules/
    │     │     ├── aws-aidlc-rules/
    │     ├── aws-aidlc-rule-details/
```

ルールが読み込まれているか確認するには:

1. Amazon Q チャットウィンドウで、右下隅の `Rules` ボタンをクリックします。
2. `.amazonq/rules/aws-aidlc-rules` のエントリが表示されていることを確認します。

<img src="./assets/images/q-ide-aidlc-rules-loaded.png?raw=true" alt="Q Developer IDEプラグインにおけるAI-DLCルール" width="700" height="400">

---

### Cursor IDE

AI-DLCは、インテリジェントなワークフローを実現するために [Cursor Rules](https://cursor.com/docs/context/rules) を使用します。

以下のコマンドは、zipを `Downloads` フォルダに展開して `Downloads/aidlc-rules/` というパスになっていることを前提としています。別の場所を使用した場合は、`Downloads` を実際のフォルダパスに置き換えてください。

> [!NOTE]
> **Windowsユーザーへ:** ファイルエクスプローラーの **「すべて展開...」** ダイアログを使用すると、デフォルトでzipファイル名をそのままフォルダ名にしたラッパーフォルダが作成されます（例: `ai-dlc-rules-v0.1.8\aidlc-rules\...`）。展開先を編集して内容が直接 `Downloads\aidlc-rules\` に入るようにするか（以下のコマンドに合わせるため）、各コマンドの `Downloads\` の前に `ai-dlc-rules-v<version>\` を付加してください（`<version>` はダウンロードしたリリース番号に置き換えてください）。

#### オプション1: プロジェクトルール（推奨）

**Unix/Linux/macOS:**

```bash
mkdir -p .cursor/rules

cat > .cursor/rules/ai-dlc-workflow.mdc << 'EOF'
---
description: "AI-DLC (AI-Driven Development Life Cycle) adaptive workflow for software development"
alwaysApply: true
---

EOF
cat ~/Downloads/aidlc-rules/aws-aidlc-rules/core-workflow.md >> .cursor/rules/ai-dlc-workflow.mdc

mkdir -p .aidlc-rule-details
cp -R ~/Downloads/aidlc-rules/aws-aidlc-rule-details/* .aidlc-rule-details/
```

**Windows PowerShell:**

```powershell
New-Item -ItemType Directory -Force -Path ".cursor\rules"

$frontmatter = @"
---
description: "AI-DLC (AI-Driven Development Life Cycle) adaptive workflow for software development"
alwaysApply: true
---

"@
$frontmatter | Out-File -FilePath ".cursor\rules\ai-dlc-workflow.mdc" -Encoding utf8

Get-Content "$env:USERPROFILE\Downloads\aidlc-rules\aws-aidlc-rules\core-workflow.md" | Add-Content ".cursor\rules\ai-dlc-workflow.mdc"

New-Item -ItemType Directory -Force -Path ".aidlc-rule-details"
Copy-Item "$env:USERPROFILE\Downloads\aidlc-rules\aws-aidlc-rule-details\*" ".aidlc-rule-details\" -Recurse
```

**Windows CMD:**

```cmd
mkdir .cursor\rules

(
echo ---
echo description: "AI-DLC (AI-Driven Development Life Cycle) adaptive workflow for software development"
echo alwaysApply: true
echo ---
echo.
) > .cursor\rules\ai-dlc-workflow.mdc

type "%USERPROFILE%\Downloads\aidlc-rules\aws-aidlc-rules\core-workflow.md" >> .cursor\rules\ai-dlc-workflow.mdc

mkdir .aidlc-rule-details
xcopy "%USERPROFILE%\Downloads\aidlc-rules\aws-aidlc-rule-details" ".aidlc-rule-details\" /E /I
```

#### オプション2: AGENTS.md（シンプルな代替手段）

**Unix/Linux/macOS:**

```bash
cp ~/Downloads/aidlc-rules/aws-aidlc-rules/core-workflow.md ./AGENTS.md
mkdir -p .aidlc-rule-details
cp -R ~/Downloads/aidlc-rules/aws-aidlc-rule-details/* .aidlc-rule-details/
```

**Windows PowerShell:**

```powershell
Copy-Item "$env:USERPROFILE\Downloads\aidlc-rules\aws-aidlc-rules\core-workflow.md" ".\AGENTS.md"
New-Item -ItemType Directory -Force -Path ".aidlc-rule-details"
Copy-Item "$env:USERPROFILE\Downloads\aidlc-rules\aws-aidlc-rule-details\*" ".aidlc-rule-details\" -Recurse
```

**Windows CMD:**

```cmd
copy "%USERPROFILE%\Downloads\aidlc-rules\aws-aidlc-rules\core-workflow.md" ".\AGENTS.md"
mkdir .aidlc-rule-details
xcopy "%USERPROFILE%\Downloads\aidlc-rules\aws-aidlc-rule-details" ".aidlc-rule-details\" /E /I
```

**セットアップの確認:**

1. **Cursor設定 → Rules, Commands** を開きます
2. **プロジェクトルール** の下に `ai-dlc-workflow` が表示されていることを確認します
3. `AGENTS.md` の場合は、自動的に検出・適用されます

![CursorにおけるAI-DLCルール](./assets/images/cursor-ide-aidlc-rules-loaded.png?raw=true "AI-DLC Rules in Cursor")

**ディレクトリ構成（オプション1）:**

```text
<my-project>/
├── .cursor/
│   └── rules/
│       └── ai-dlc-workflow.mdc
└── .aidlc-rule-details/
    ├── common/
    ├── inception/
    ├── construction/
    ├── extensions/
    └── operations/
```

---

### Cline

AI-DLCは、インテリジェントなワークフローを実現するためにCline Rulesを使用します。

以下のコマンドは、zipを `Downloads` フォルダに展開して `Downloads/aidlc-rules/` というパスになっていることを前提としています。別の場所を使用した場合は、`Downloads` を実際のフォルダパスに置き換えてください。

> [!NOTE]
> **Windowsユーザーへ:** ファイルエクスプローラーの **「すべて展開...」** ダイアログを使用すると、デフォルトでzipファイル名をそのままフォルダ名にしたラッパーフォルダが作成されます（例: `ai-dlc-rules-v0.1.8\aidlc-rules\...`）。展開先を編集して内容が直接 `Downloads\aidlc-rules\` に入るようにするか（以下のコマンドに合わせるため）、各コマンドの `Downloads\` の前に `ai-dlc-rules-v<version>\` を付加してください（`<version>` はダウンロードしたリリース番号に置き換えてください）。

#### オプション1: .clinerules ディレクトリ（推奨）

**Unix/Linux/macOS:**

```bash
mkdir -p .clinerules
cp ~/Downloads/aidlc-rules/aws-aidlc-rules/core-workflow.md .clinerules/
mkdir -p .aidlc-rule-details
cp -R ~/Downloads/aidlc-rules/aws-aidlc-rule-details/* .aidlc-rule-details/
```

**Windows PowerShell:**

```powershell
New-Item -ItemType Directory -Force -Path ".clinerules"
Copy-Item "$env:USERPROFILE\Downloads\aidlc-rules\aws-aidlc-rules\core-workflow.md" ".clinerules\"
New-Item -ItemType Directory -Force -Path ".aidlc-rule-details"
Copy-Item "$env:USERPROFILE\Downloads\aidlc-rules\aws-aidlc-rule-details\*" ".aidlc-rule-details\" -Recurse
```

**Windows CMD:**

```cmd
mkdir .clinerules
copy "%USERPROFILE%\Downloads\aidlc-rules\aws-aidlc-rules\core-workflow.md" ".clinerules\"
mkdir .aidlc-rule-details
xcopy "%USERPROFILE%\Downloads\aidlc-rules\aws-aidlc-rule-details" ".aidlc-rule-details\" /E /I
```

#### オプション2: AGENTS.md（代替手段）

**Unix/Linux/macOS:**

```bash
cp ~/Downloads/aidlc-rules/aws-aidlc-rules/core-workflow.md ./AGENTS.md
mkdir -p .aidlc-rule-details
cp -R ~/Downloads/aidlc-rules/aws-aidlc-rule-details/* .aidlc-rule-details/
```

**Windows PowerShell:**

```powershell
Copy-Item "$env:USERPROFILE\Downloads\aidlc-rules\aws-aidlc-rules\core-workflow.md" ".\AGENTS.md"
New-Item -ItemType Directory -Force -Path ".aidlc-rule-details"
Copy-Item "$env:USERPROFILE\Downloads\aidlc-rules\aws-aidlc-rule-details\*" ".aidlc-rule-details\" -Recurse
```

**Windows CMD:**

```cmd
copy "%USERPROFILE%\Downloads\aidlc-rules\aws-aidlc-rules\core-workflow.md" ".\AGENTS.md"
mkdir .aidlc-rule-details
xcopy "%USERPROFILE%\Downloads\aidlc-rules\aws-aidlc-rule-details" ".aidlc-rule-details\" /E /I
```

**セットアップの確認:**

1. Clineのチャット入力欄の下にあるRulesポップオーバーを確認します
2. `core-workflow.md` が表示されてアクティブになっていることを確認します
3. ポップオーバーUIを使ってルールファイルをオン/オフ切り替えできます

![ClineにおけるAI-DLCルール](./assets/images/cline-ide-aidlc-rules-loaded.png?raw=true "AI-DLC Rules in Cline")

**ディレクトリ構成（オプション1）:**

```text
<my-project>/
├── .clinerules/
│   └── core-workflow.md
└── .aidlc-rule-details/
    ├── common/
    ├── inception/
    ├── construction/
    ├── extensions/
    └── operations/
```

---

### Claude Code

AI-DLCは、インテリジェントなワークフローを実現するためにClaude Codeのプロジェクトメモリファイル（`CLAUDE.md`）を使用します。

以下のコマンドは、zipを `Downloads` フォルダに展開して `Downloads/aidlc-rules/` というパスになっていることを前提としています。別の場所を使用した場合は、`Downloads` を実際のフォルダパスに置き換えてください。

> [!NOTE]
> **Windowsユーザーへ:** ファイルエクスプローラーの **「すべて展開...」** ダイアログを使用すると、デフォルトでzipファイル名をそのままフォルダ名にしたラッパーフォルダが作成されます（例: `ai-dlc-rules-v0.1.8\aidlc-rules\...`）。展開先を編集して内容が直接 `Downloads\aidlc-rules\` に入るようにするか（以下のコマンドに合わせるため）、各コマンドの `Downloads\` の前に `ai-dlc-rules-v<version>\` を付加してください（`<version>` はダウンロードしたリリース番号に置き換えてください）。

#### オプション1: プロジェクトルート（推奨）

**Unix/Linux/macOS:**

```bash
cp ~/Downloads/aidlc-rules/aws-aidlc-rules/core-workflow.md ./CLAUDE.md
mkdir -p .aidlc-rule-details
cp -R ~/Downloads/aidlc-rules/aws-aidlc-rule-details/* .aidlc-rule-details/
```

**Windows PowerShell:**

```powershell
Copy-Item "$env:USERPROFILE\Downloads\aidlc-rules\aws-aidlc-rules\core-workflow.md" ".\CLAUDE.md"
New-Item -ItemType Directory -Force -Path ".aidlc-rule-details"
Copy-Item "$env:USERPROFILE\Downloads\aidlc-rules\aws-aidlc-rule-details\*" ".aidlc-rule-details\" -Recurse
```

**Windows CMD:**

```cmd
copy "%USERPROFILE%\Downloads\aidlc-rules\aws-aidlc-rules\core-workflow.md" ".\CLAUDE.md"
mkdir .aidlc-rule-details
xcopy "%USERPROFILE%\Downloads\aidlc-rules\aws-aidlc-rule-details" ".aidlc-rule-details\" /E /I
```

#### オプション2: .claude ディレクトリ

**Unix/Linux/macOS:**

```bash
mkdir -p .claude
cp ~/Downloads/aidlc-rules/aws-aidlc-rules/core-workflow.md .claude/CLAUDE.md
mkdir -p .aidlc-rule-details
cp -R ~/Downloads/aidlc-rules/aws-aidlc-rule-details/* .aidlc-rule-details/
```

**Windows PowerShell:**

```powershell
New-Item -ItemType Directory -Force -Path ".claude"
Copy-Item "$env:USERPROFILE\Downloads\aidlc-rules\aws-aidlc-rules\core-workflow.md" ".claude\CLAUDE.md"
New-Item -ItemType Directory -Force -Path ".aidlc-rule-details"
Copy-Item "$env:USERPROFILE\Downloads\aidlc-rules\aws-aidlc-rule-details\*" ".aidlc-rule-details\" -Recurse
```

**Windows CMD:**

```cmd
mkdir .claude
copy "%USERPROFILE%\Downloads\aidlc-rules\aws-aidlc-rules\core-workflow.md" ".claude\CLAUDE.md"
mkdir .aidlc-rule-details
xcopy "%USERPROFILE%\Downloads\aidlc-rules\aws-aidlc-rule-details" ".aidlc-rule-details\" /E /I
```

**セットアップの確認:**

1. プロジェクトディレクトリでClaude Codeを起動します（CLI: `claude` またはVS Code拡張機能）
2. `/config` コマンドで現在の設定を確認します
3. Claudeに「このプロジェクトで現在アクティブな指示は何ですか？」と質問します

**ディレクトリ構成（オプション1）:**

```text
<my-project>/
├── CLAUDE.md
└── .aidlc-rule-details/
    ├── common/
    ├── inception/
    ├── construction/
    ├── extensions/
    └── operations/
```

---

### GitHub Copilot

AI-DLCは、インテリジェントなワークフローを実現するために [GitHub Copilotのカスタム指示](https://code.visualstudio.com/docs/copilot/customization/custom-instructions) を使用します。`.github/copilot-instructions.md` ファイルはワークスペース内のすべてのチャットリクエストに自動的に検出・適用されます。

以下のコマンドは、zipを `Downloads` フォルダに展開して `Downloads/aidlc-rules/` というパスになっていることを前提としています。別の場所を使用した場合は、`Downloads` を実際のフォルダパスに置き換えてください。

> [!NOTE]
> **Windowsユーザーへ:** ファイルエクスプローラーの **「すべて展開...」** ダイアログを使用すると、デフォルトでzipファイル名をそのままフォルダ名にしたラッパーフォルダが作成されます（例: `ai-dlc-rules-v0.1.8\aidlc-rules\...`）。展開先を編集して内容が直接 `Downloads\aidlc-rules\` に入るようにするか（以下のコマンドに合わせるため）、各コマンドの `Downloads\` の前に `ai-dlc-rules-v<version>\` を付加してください（`<version>` はダウンロードしたリリース番号に置き換えてください）。

**Unix/Linux/macOS:**

```bash
mkdir -p .github
cp ~/Downloads/aidlc-rules/aws-aidlc-rules/core-workflow.md .github/copilot-instructions.md
mkdir -p .aidlc-rule-details
cp -R ~/Downloads/aidlc-rules/aws-aidlc-rule-details/* .aidlc-rule-details/
```

**Windows PowerShell:**

```powershell
New-Item -ItemType Directory -Force -Path ".github"
Copy-Item "$env:USERPROFILE\Downloads\aidlc-rules\aws-aidlc-rules\core-workflow.md" ".github\copilot-instructions.md"
New-Item -ItemType Directory -Force -Path ".aidlc-rule-details"
Copy-Item "$env:USERPROFILE\Downloads\aidlc-rules\aws-aidlc-rule-details\*" ".aidlc-rule-details\" -Recurse
```

**Windows CMD:**

```cmd
mkdir .github
copy "%USERPROFILE%\Downloads\aidlc-rules\aws-aidlc-rules\core-workflow.md" ".github\copilot-instructions.md"
mkdir .aidlc-rule-details
xcopy "%USERPROFILE%\Downloads\aidlc-rules\aws-aidlc-rule-details" ".aidlc-rule-details\" /E /I
```

**セットアップの確認:**

1. プロジェクトフォルダをVS Codeで開きます
2. Copilot Chatパネルを開きます（Cmd/Ctrl+Shift+I）
3. **Configure Chat**（歯車アイコン）> **Chat Instructions** を選択して、`copilot-instructions` が一覧に表示されていることを確認します
4. または、チャット入力欄に `/instructions` と入力してアクティブな指示を確認します

**ディレクトリ構成:**

```text
<my-project>/
├── .github/
│   └── copilot-instructions.md
└── .aidlc-rule-details/
    ├── common/
    ├── inception/
    ├── construction/
    ├── extensions/
    └── operations/
```

---

### OpenAI Codex

AI-DLCはOpenAI Codexをサポートされているコーディングエージェントとして対応しており、[Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md) の規約を使用してインテリジェントなワークフローを提供します。Codexはセッション開始時にプロジェクトルートから `AGENTS.md` を自動的に検出して読み込みます。

以下のコマンドは、zipを `Downloads` フォルダに展開して `Downloads/aidlc-rules/` というパスになっていることを前提としています。別の場所を使用した場合は、`Downloads` を実際のフォルダパスに置き換えてください。

> [!NOTE]
> **Windowsユーザーへ:** ファイルエクスプローラーの **「すべて展開...」** ダイアログを使用すると、デフォルトでzipファイル名をそのままフォルダ名にしたラッパーフォルダが作成されます（例: `ai-dlc-rules-v0.1.8\aidlc-rules\...`）。展開先を編集して内容が直接 `Downloads\aidlc-rules\` に入るようにするか（以下のコマンドに合わせるため）、各コマンドの `Downloads\` の前に `ai-dlc-rules-v<version>\` を付加してください（`<version>` はダウンロードしたリリース番号に置き換えてください）。

**Unix/Linux/macOS:**

```bash
cp ~/Downloads/aidlc-rules/aws-aidlc-rules/core-workflow.md ./AGENTS.md
mkdir -p .aidlc-rule-details
cp -R ~/Downloads/aidlc-rules/aws-aidlc-rule-details/* .aidlc-rule-details/
```

**Windows PowerShell:**

```powershell
Copy-Item "$env:USERPROFILE\Downloads\aidlc-rules\aws-aidlc-rules\core-workflow.md" ".\AGENTS.md"
New-Item -ItemType Directory -Force -Path ".aidlc-rule-details"
Copy-Item "$env:USERPROFILE\Downloads\aidlc-rules\aws-aidlc-rule-details\*" ".aidlc-rule-details\" -Recurse
```

**Windows CMD:**

```cmd
copy "%USERPROFILE%\Downloads\aidlc-rules\aws-aidlc-rules\core-workflow.md" ".\AGENTS.md"
mkdir .aidlc-rule-details
xcopy "%USERPROFILE%\Downloads\aidlc-rules\aws-aidlc-rule-details" ".aidlc-rule-details\" /E /I
```

**セットアップの確認:**

1. プロジェクトディレクトリでCodexセッションを開始します
2. Codexに次のように質問します。既存プロジェクトの場合: "Using AIDLC analyze the project?" 新規プロジェクトの場合: "Using Aidlc what workflow do you see"
3. CodexがAI-DLCの3フェーズワークフロー（Inception → Construction → Operations）を説明するはずです

> [!NOTE]
> `AGENTS.md` ファイルはCodexのデフォルト設定の指示バジェット内に収まるよう設計されています。プロジェクト固有のコンテンツを大量に追加して、Codexがプロジェクトドキュメントの上限を超えると報告した場合は、Codexの設定で上限を増やすことができます（例えば `config.toml` の `project_doc_max_bytes` を調整する）:
>
> ```toml
> project_doc_max_bytes = 65536  # 例の値。プロジェクトに適した上限を選択してください
> ```

**ディレクトリ構成:**

```text
<my-project>/
├── AGENTS.md
└── .aidlc-rule-details/
    ├── common/
    ├── inception/
    ├── construction/
    ├── extensions/
    └── operations/
```

---

### その他のエージェント

AI-DLCは、プロジェクトレベルのルールまたはステアリングファイルをサポートするあらゆるコーディングエージェントで動作します。一般的な手順は次のとおりです:

1. `aws-aidlc-rules/` をエージェントがプロジェクトルールを読み込む場所に配置します（エージェントのドキュメントを参照）。
2. ルールから参照できるように `aws-aidlc-rule-details/` を同じ階層に配置します。

エージェントにルールファイルの規約がない場合は、両フォルダをプロジェクトルートに配置し、エージェントに `aws-aidlc-rules/` をルールディレクトリとして指定してください。

---

## 使い方

1. チャットで **"Using AI-DLC, ..."** というフレーズから始めて、ソフトウェア開発プロジェクトを開始します
2. AI-DLCワークフローが自動的に起動し、そこからガイドします
3. AI-DLCが質問する構造化された質問に回答します
4. AIが生成するすべての計画を注意深く確認し、監視と検証を行ってください
5. 実行計画を確認して、どのステージが実行されるかを把握します
6. 成果物を注意深く確認し、コントロールを維持するために各ステージを承認します
7. すべての成果物は `aidlc-docs/` ディレクトリに生成されます

---

## 3フェーズ適応型ワークフロー

AI-DLCはプロジェクトの複雑さに適応する、構造化された3フェーズのアプローチに従います:

### 🔵 INCEPTION(着想)フェーズ

何を**「何を」**構築し、**「なぜ」**構築するかを決定します

- 要件の分析と検証
- ユーザーストーリーの作成（該当する場合）
- アプリケーション設計と並列開発のための作業単位(unit of work)の作成
- リスク評価と複雑さの評価

### 🟢 CONSTRUCTION(構築)フェーズ

**「どのように」**構築するかを決定します

- 詳細なコンポーネント設計
- コード生成と実装
- ビルド設定とテスト戦略
- 品質保証と検証

### 🟡 OPERATIONS(運用)フェーズ

デプロイとモニタリング（将来予定）

- デプロイ自動化とインフラストラクチャ
- モニタリングとオブザーバビリティのセットアップ
- 本番環境対応の検証

---

## 主な機能

| 機能                        | 説明                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| **適応型インテリジェンス**  | あなたの特定のリクエストに価値を追加するステージのみを実行します                                  |
| **コンテキスト認識**        | 既存のコードベースと複雑さの要件を分析します                                                      |
| **リスクベース**            | 複雑な変更には包括的な対応を、シンプルな変更には効率的な対応をします                              |
| **質問駆動型**              | チャットではなくファイル内で構造化された多肢選択式の質問を行います                                |
| **常にコントロール可能**    | 実行計画を確認して各フェーズを承認できます                                                        |
| **拡張可能**                | セキュリティ、コンプライアンス、組織固有のルールなどのカスタムルールをコアワークフローに追加できます |

---

## 拡張機能

AI-DLCはコアワークフローの上に追加ルールを積み重ねることができる拡張システムをサポートしています。拡張機能は `aws-aidlc-rule-details/extensions/` 以下にカテゴリ（例: `security/`、`testing/`）ごとに整理されたMarkdownファイルです。

### 拡張機能の仕組み

各拡張機能は同一ディレクトリに配置された2つのファイルで構成されます:

- **ルールファイル**（例: `security-baseline.md`）— 拡張機能のルールが含まれています。
- **オプトインファイル**（例: `security-baseline.opt-in.md`）— 要件分析時にユーザーに表示される構造化された多肢選択式の質問が含まれています。

ワークフロー開始時に、AI-DLCは `extensions/` ディレクトリをスキャンして `*.opt-in.md` ファイルのみを読み込みます。要件分析中に各オプトインプロンプトをユーザーに表示します。ユーザーがオプトインすると、対応するルールファイルが読み込まれます（命名規則から導出: `.opt-in.md` を取り除いて `.md` を付加）。ユーザーがオプトアウトすると、ルールファイルは読み込まれません。対応する `*.opt-in.md` ファイルがない拡張機能は常に適用されます。

有効になった拡張ルールはブロッキング制約となります — 各ステージで、モデルはステージの続行を許可する前にコンプライアンスを検証します。

### 組み込みの拡張機能

`extensions/` ディレクトリには以下の拡張機能が同梱されています（新しい拡張機能は随時追加される場合があります）:

```text
aws-aidlc-rule-details/
└── extensions/
    ├── security/                      # 拡張機能カテゴリ
    │   └── baseline/
    │       ├── security-baseline.md          # ベースラインセキュリティルール
    │       └── security-baseline.opt-in.md   # オプトインプロンプト
    └── testing/                       # 拡張機能カテゴリ
        └── property-based/
            ├── property-based-testing.md          # プロパティベーステストルール
            └── property-based-testing.opt-in.md   # オプトインプロンプト
```

> [!IMPORTANT]
> セキュリティ拡張機能のルールは、AI-DLCワークフロー内で効果的なセキュリティルールを構築するための方向性を示すリファレンスとして提供されています。各組織は、本番ワークフローにデプロイする前に、独自のセキュリティルールを構築、カスタマイズ、十分にテストしてください。

### 独自の拡張機能を追加する

既存のカテゴリを拡張したり、まったく新しいカテゴリを作成したりできます。

1. `extensions/` 以下にディレクトリを作成します（例: `security/compliance/` や `performance/baseline/`）。
2. **ルールファイル**を追加します（例: `compliance.md`）。`security-baseline.md` と同じ構造に従ってください:
   - 各ルールを `## Rule <PREFIX-NN>: <Title>` の形式の見出しとして定義します。プレフィックスは短いカテゴリ識別子で、NNは連番です（例: `COMPLIANCE-01`、`COMPLIANCE-02`）。これらのIDは監査ログとコンプライアンスサマリーで参照されるため、読み込まれたすべての拡張機能にわたって一意でなければなりません。
   - 要件を説明する **Rule** セクションを含めます。
   - モデルが評価すべき具体的なチェック項目を含む **Verification** セクションを含めます。
3. 命名規則 `<name>.opt-in.md` を使用した対応する**オプトインファイル**を追加します（例: `compliance.opt-in.md`）。期待される形式については `security-baseline.opt-in.md` を参照してください。このファイルを省略すると、拡張機能は常に適用され、ユーザーはオプトアウトできません。
4. ルールはデフォルトでブロッキングです — 検証基準が満たされない場合、問題が解決されるまでステージを続行できません。

---

## サポートツール

`scripts/` ディレクトリには、AI-DLCワークフローを強化するサポートツールが含まれています:

### AIDLC Evaluator

**場所:** [`scripts/aidlc-evaluator/`](scripts/aidlc-evaluator/)

AI-DLCワークフローへの変更を検証するための自動テストおよびレポートフレームワークです。Evaluatorが提供する機能:

- **ゴールデンテストケース** — 検証のためにキュレーションされたベースラインテストケース
- **実行フレームワーク** — 評価パイプラインを通じてテストケースを実行するためのオーケストレーション
- **セマンティック評価** — 出力の正確さと完全性のAIベース評価
- **コード評価** — 静的分析（リンティング、セキュリティスキャン、重複検出）
- **NFR評価** — 非機能要件テスト（トークン使用量、実行時間、クロスモデル一貫性）
- **CI/CD統合** — PRバリデーションの自動パイプライン

**クイックスタート:**

```bash
cd scripts/aidlc-evaluator
uv sync
uv run python run.py test
```

**ドキュメント:** [scripts/aidlc-evaluator/README.md](scripts/aidlc-evaluator/README.md) を参照してください

---

### AIDLC Design Reviewer

**場所:** [`scripts/aidlc-designreview/`](scripts/aidlc-designreview/)

⚠️ **実験的機能** — AWS Bedrock経由でClaudeモデルを使用してAIDLC設計成果物を分析するAI駆動型設計レビューツールです。

**機能:**

- **マルチエージェントレビュー** — 3つの専門AIエージェント（批評、代替案、ギャップ分析）
- **品質スコアリング** — アクション可能な推奨事項を伴う重み付け重大度分析
- **2つのデプロイモード:**
  - **CLIツール** — CI/CDパイプライン向けのオンデマンドレビュー
  - **Claude Code Hook** — 開発中のリアルタイムレビュー（実験的）

**インストール（CLIツール）:**

```bash
cd scripts/aidlc-designreview
uv sync --extra test
source .venv/bin/activate  # Linux/Mac
design-reviewer --aidlc-docs /path/to/aidlc-docs
```

**インストール（Claude Code Hook）:**

```bash
# ワークスペースルートから実行
./scripts/aidlc-designreview/tool-install/install-linux.sh      # Linux
./scripts/aidlc-designreview/tool-install/install-mac.sh        # macOS
.\scripts\aidlc-designreview\tool-install\install-windows.ps1   # Windows PowerShell
```

インストーラーはワークスペースルートを自動的に検出し、`.claude/` にフックをインストールします。

**ドキュメント:**

- [scripts/aidlc-designreview/README.md](scripts/aidlc-designreview/README.md) — メインドキュメント
- [scripts/aidlc-designreview/INSTALLATION.md](scripts/aidlc-designreview/INSTALLATION.md) — Hookインストールガイド

---

## 信条

これらは意思決定を導くためのコア原則です。

- **重複なし**。正規の情報源は1か所に存在します。特定のファイルを必要とする新しいツールやフォーマットのサポートを追加する場合は、個別のコピーを維持するのではなく、そのソースから生成します。

- **方法論優先**。AI-DLCは根本的にはツールではなく方法論です。ユーザーが始めるためにインストールが必要であってはなりません。とはいえ、ユーザーが方法論を採用・拡張するのに役立つ便利なツール（スクリプト、CLI）は将来的には検討します。

- **再現可能**。ルールは、異なるモデルが同様の結果を生成できるほど明確であるべきです。モデルの動作が異なることはわかっていますが、方法論は明示的なガイダンスによってばらつきを最小限に抑えるべきです。

- **モデル非依存**。方法論はあらゆるIDE、エージェント、モデルで機能します。特定のツールやベンダーに縛られません。

- **ヒューマン・イン・ザ・ループ**。重要な決定には明示的なユーザーの確認が必要です。エージェントが提案し、人間が承認します。

---

## 前提条件

サポートされているAIコーディング支援プラットフォーム/ツールのいずれかをインストールしてください:

| プラットフォーム               | インストールリンク                                                                                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kiro                           | [インストール](https://kiro.dev/)                                                                                                                               |
| Kiro CLI                       | [インストール](https://kiro.dev/cli/)                                                                                                                           |
| Amazon Q Developer IDE Plugin  | [インストール](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/q-in-IDE.html)                                                                          |
| Cursor IDE                     | [インストール](https://cursor.com/)                                                                                                                             |
| Cline VS Code Extension        | [インストール](https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev)                                                                      |
| Claude Code CLI                | [インストール](https://github.com/anthropics/claude-code)                                                                                                       |
| GitHub Copilot                 | [インストール](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot) + [Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat) |

---

## トラブルシューティング

### 一般的な問題

| 問題                             | 解決策                                                           |
| -------------------------------- | ---------------------------------------------------------------- |
| ルールが読み込まれない           | ファイルがプラットフォームに合った正しい場所に存在するか確認します |
| ファイルエンコーディングの問題   | ファイルがUTF-8エンコードされていることを確認します              |
| セッションでルールが適用されない | ファイルを変更した後に新しいチャットセッションを開始します       |
| ルール詳細が読み込まれない       | `.aidlc-rule-details/` がサブディレクトリとともに存在することを確認します |

### プラットフォーム固有の問題

#### Amazon Q Developer / Kiro

- `/context show` を使用してルールが読み込まれているか確認します
- `.amazonq/rules/` または `.kiro/steering/` のディレクトリ構成を確認します

#### Cursor

- 「Apply Intelligently」の場合、フロントマターに説明が定義されていることを確認します
- **Cursor設定 → Rules** でルールが有効になっていることを確認します
- ルールが大きすぎる場合（500行超）は、複数のフォーカスされたルールに分割します

#### Cline

- チャット入力欄の下のRulesポップオーバーを確認します
- ポップオーバーUIを使用して必要に応じてルールファイルをオン/オフ切り替えします

#### Claude Code

- `/config` コマンドで現在の設定を確認します
- 「このプロジェクトで現在アクティブな指示は何ですか？」と質問します

#### GitHub Copilot

- **Configure Chat**（歯車アイコン）> **Chat Instructions** を選択して指示が読み込まれていることを確認します
- チャット入力欄に `/instructions` と入力してアクティブな指示ファイルを確認します
- ワークスペースルートに `.github/copilot-instructions.md` が存在することを確認します

### Windows でのファイルパスの問題

- Markdownファイル内のファイルパスにはスラッシュ `/` を使用します
- バックスラッシュを含むWindowsパスは正しく動作しない場合があります

---

## バージョン管理の推奨事項

**リポジトリにコミットするもの:**

```gitignore
# バージョン管理すべきもの
CLAUDE.md
AGENTS.md
.amazonq/rules/
.amazonq/aws-aidlc-rule-details/
.kiro/steering/
.kiro/aws-aidlc-rule-details/
.cursor/rules/
.clinerules/
.github/copilot-instructions.md
.aidlc-rule-details/
```

**オプション — `.gitignore` に追加（必要な場合）:**

```gitignore
# ローカルのみの設定
.claude/settings.local.json
```

---

## 生成される aidlc-docs/ リファレンス

AI-DLCワークフローによって生成されるすべてのドキュメント成果物の完全なリファレンスについては、[docs/GENERATED_DOCS_REFERENCE.md](docs/GENERATED_DOCS_REFERENCE.md) を参照してください。

---

## 実験的機能: AIによるセットアップ支援（リリースのダウンロード）

| リソース                                              | リンク                                                                                                                        |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| AI-DLC方法論定義ペーパー                              | [ペーパー](https://prod.d13rzhkk8cj2z0.amplifyapp.com/)                                                                        |
| AI-DLC方法論ブログ                                    | [AWSブログ](https://aws.amazon.com/blogs/devops/ai-driven-development-life-cycle/)                                             |
| AI-DLCオープンソース公開ブログ                        | [AWSブログ](https://aws.amazon.com/blogs/devops/open-sourcing-adaptive-workflows-for-ai-driven-development-life-cycle-ai-dlc/) |
| AI-DLC使用例ウォークスルーブログ                      | [AWSブログ](https://aws.amazon.com/blogs/devops/building-with-ai-dlc-using-amazon-q-developer/)                                |
| Amazon Q Developerドキュメント                        | [ドキュメント](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/q-in-IDE.html)                                         |
| Kiro CLIドキュメント                                  | [ドキュメント](https://kiro.dev/docs/cli/steering/)                                                                             |
| Cursor Rulesドキュメント                              | [ドキュメント](https://cursor.com/docs/context/rules)                                                                           |
| Claude Codeドキュメント                               | [GitHub](https://github.com/anthropics/claude-code)                                                                            |
| GitHub Copilotドキュメント                            | [ドキュメント](https://docs.github.com/en/copilot)                                                                              |
| AI-DLCとの連携（インタラクションパターンとヒント）    | [docs/WORKING-WITH-AIDLC.md](docs/WORKING-WITH-AIDLC.md)                                                                       |
| コントリビュートガイドライン                          | [CONTRIBUTING.md](CONTRIBUTING.md)                                                                                              |
| 行動規範                                              | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)                                                                                        |

---

## その他のリソース

<!-- TODO: Replace this Amplify URL with a permanent/stable URL when available -->
| リソース                                              | リンク                                                                                                                        |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| AI-DLC方法論定義ペーパー                              | [ペーパー](https://prod.d13rzhkk8cj2z0.amplifyapp.com/)                                                                        |
| AI-DLC方法論ブログ                                    | [AWSブログ](https://aws.amazon.com/blogs/devops/ai-driven-development-life-cycle/)                                             |
| AI-DLCオープンソース公開ブログ                        | [AWSブログ](https://aws.amazon.com/blogs/devops/open-sourcing-adaptive-workflows-for-ai-driven-development-life-cycle-ai-dlc/) |
| AI-DLC使用例ウォークスルーブログ                      | [AWSブログ](https://aws.amazon.com/blogs/devops/building-with-ai-dlc-using-amazon-q-developer/)                                |
| Amazon Q Developerドキュメント                        | [ドキュメント](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/q-in-IDE.html)                                         |
| Kiro CLIドキュメント                                  | [ドキュメント](https://kiro.dev/docs/cli/steering/)                                                                             |
| Cursor Rulesドキュメント                              | [ドキュメント](https://cursor.com/docs/context/rules)                                                                           |
| Claude Codeドキュメント                               | [GitHub](https://github.com/anthropics/claude-code)                                                                            |
| GitHub Copilotドキュメント                            | [ドキュメント](https://docs.github.com/en/copilot)                                                                              |
| AI-DLCとの連携（インタラクションパターンとヒント）    | [docs/WORKING-WITH-AIDLC.md](docs/WORKING-WITH-AIDLC.md)                                                                       |
| コントリビュートガイドライン                          | [CONTRIBUTING.md](CONTRIBUTING.md)                                                                                              |
| 行動規範                                              | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)                                                                                        |

---

## コントリビュート

詳細は [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) を参照してください。

## ライセンス

このライブラリはMIT-0ライセンスの下でライセンスされています。[LICENSE](LICENSE) ファイルを参照してください。
