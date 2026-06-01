# AGENTS.md

## プロジェクト概要

AI-DLC(AI駆動開発ライフサイクル)は、AIコーディングエージェントを構造化されたソフトウェア開発ワークフローに沿って導くための方法論です。このリポジトリには、コアワークフローのルール、フェーズ別の詳細ルール、および評価フレームワークが含まれています。

配布可能な成果物は `aidlc-rules/` ディレクトリであり、ZIP形式に圧縮されてGitHub Releasesで公開されます。

## リポジトリ構造

```text
aidlc-rules/
├── aws-aidlc-rules/              # コアワークフローのエントリポイント（リネーム禁止）
│   └── core-workflow.md
└── aws-aidlc-rule-details/       # ワークフローから参照される詳細ルール（リネーム禁止）
    ├── common/                   # 全フェーズ共通のガイダンス
    ├── inception/                # 計画・アーキテクチャのルール
    ├── construction/             # 設計・実装のルール
    ├── extensions/               # オプションの横断的制約ルール
    └── operations/               # デプロイ・モニタリングのルール
scripts/aidlc-evaluator/          # Python評価フレームワーク（uv管理）
docs/
├── ADMINISTRATIVE_GUIDE.md       # CI/CD、ワークフロー、シークレット、リリースプロセス
├── DEVELOPERS_GUIDE.md           # ローカルビルド（CodeBuild、act）、セキュリティスキャナー
├── WORKING-WITH-AIDLC.md         # AI-DLC方法論のユーザーガイド
├── GENERATED_DOCS_REFERENCE.md   # aidlc-docs/ディレクトリの完全リファレンス
└── writing-inputs/               # ビジョンドキュメント・技術環境ドキュメントのガイドと例
.github/
├── workflows/                    # CI/CDパイプライン（8ワークフロー）
├── dependabot.yml                # Dependabot依存関係更新設定
├── CODEOWNERS                    # PRレビュー用のコードオーナールール
├── ISSUE_TEMPLATE/               # Issueテンプレート
├── pull_request_template.md      # 貢献者声明付きPRテンプレート
└── labeler.yml                   # 自動ラベルルール（パス→ラベルのマッピング）
.claude/                          # Claude Codeプロジェクト設定
```

## 主要ドキュメント

- [CONTRIBUTING.md](CONTRIBUTING.md) — 貢献プロセスと規約
- [docs/ADMINISTRATIVE_GUIDE.md](docs/ADMINISTRATIVE_GUIDE.md) — CI/CDアーキテクチャ、保護された環境、シークレット、権限、リリースプロセス
- [docs/DEVELOPERS_GUIDE.md](docs/DEVELOPERS_GUIDE.md) — CodeBuildのローカル実行、セキュリティスキャナーの詳細と修正手順
- [docs/WORKING-WITH-AIDLC.md](docs/WORKING-WITH-AIDLC.md) — AI-DLC方法論のユーザーガイド（コンテキスト管理、プロンプトパターン、フェーズウォークスルー）
- [docs/GENERATED_DOCS_REFERENCE.md](docs/GENERATED_DOCS_REFERENCE.md) — ワークフロー実行中に生成される `aidlc-docs/` ディレクトリ構造の完全リファレンス
- [docs/writing-inputs/](docs/writing-inputs/) — ビジョンドキュメントおよび技術環境ドキュメントのガイドと例

**タスク種別ごとに読むべきドキュメント:**

- CI/CD、ワークフロー、またはリリース → `ADMINISTRATIVE_GUIDE.md`、`DEVELOPERS_GUIDE.md`
- aidlc-rulesのコンテンツ → `WORKING-WITH-AIDLC.md`、`GENERATED_DOCS_REFERENCE.md`
- ビジョンドキュメントまたは技術環境ドキュメント → `docs/writing-inputs/`

## セットアップコマンド

```bash
# 全Markdownファイルのリント
npx markdownlint-cli2 "**/*.md"

# Markdownリント問題の自動修正
npx markdownlint-cli2 --fix "**/*.md"

# 評価テストの実行（scripts/aidlc-evaluator/ から）
cd scripts/aidlc-evaluator && uv run pytest
```

## コードスタイル

- すべてのコンテンツはMarkdown形式です — `.markdownlint-cli2.yaml` の設定に従ってください
- MD013（行の長さ）は無効 — 長いURL、テーブル、コード例は許容されます
- MD033（インラインHTML）は無効 — スクリーンショットに `<img>` タグを使用しています
- MD024（重複する見出し）は無効 — プラットフォームガイド間でセクション名が繰り返されます
- MD036（見出しとしての強調）は無効 — リスト内のサブラベルに太字テキストを使用しています
- MD060（テーブルの配置）は適用 — テーブルのパイプは縦に揃える必要があります
- MD040（コードフェンスの言語指定）は適用 — コードフェンスには常に言語を指定してください
- コミットメッセージは[conventional commits](https://www.conventionalcommits.org/)の形式に従います
  （例: `feat:`、`fix:`、`docs:`、`chore:`）

## テスト手順

- ルールの変更を提出する前に、少なくとも1つのサポートされているプラットフォーム（Amazon Q Developer、Kiro、
  Cursor、Cline、Claude Code、またはGitHub Copilot）でテストしてください
- インストール手順を追加・更新する場合は、macOS、Windows CMD、および
  Windows PowerShellでテストしてください
- コミット前に `npx markdownlint-cli2 "**/*.md"` を実行してリント問題を確認してください
- 設定済みの場合、pre-commitフックがmarkdownlintを自動的に実行します

## PR手順

- PRタイトルはconventional commits形式に従う必要があります（例: `fix: 説明`）
- PRの本文末尾には必ず以下の貢献者声明を含めてください:

  > By submitting this pull request, I confirm that you can use, modify, copy,
  > and redistribute this contribution, under the terms of the
  > [project license](https://github.com/awslabs/aidlc-workflows/blob/main/LICENSE).

- CIが強制するもの: conventionalコミットタイトル、貢献者声明、markdownlint、
  およびdo-not-mergeラベルチェック
- `.github/pull_request_template.md` の構造を使用してください

## セキュリティスキャナー

6つのスキャナーが `main` へのすべてのプッシュ、すべてのPR、および毎日実行されます。HIGHおよびCRITICALの
検出結果はすべて、マージ前に修正するか、文書化されたリスク受け入れが必要です。

| スキャナー | 検出対象                 | 失敗条件                        | 設定ファイル                                    |
| ---------- | ------------------------ | ------------------------------- | ----------------------------------------------- |
| Bandit     | Python SASTの問題        | 高信頼度の検出結果              | `.bandit`                                       |
| Semgrep    | 多言語SAST               | 任意の検出結果（PR: 新規のみ）  | `.semgrepignore`                                |
| Grype      | 依存関係のCVE            | High/Critical CVE               | `.grype.yaml`                                   |
| Gitleaks   | gitヒストリーの秘密情報  | ベースライン外の任意の秘密情報  | `.gitleaks.toml`、`.gitleaks-baseline.json`     |
| Checkov    | IaC設定ミス              | 任意のチェック失敗              | `.checkov.yaml`                                 |
| ClamAV     | マルウェア               | 任意の検出                      | なし                                            |

インライン抑制パターン:

- Bandit: `# nosec BXXX — justification`
- Semgrep: `# nosemgrep: rule-id — justification`
- Checkov: `# checkov:skip=CKV_ID:justification`

修正と抑制の詳細については、[docs/DEVELOPERS_GUIDE.md](docs/DEVELOPERS_GUIDE.md#security-scanners) を参照してください。

## 重要な制約

- `aws-aidlc-rules/` および `aws-aidlc-rule-details/` フォルダ名はパブリックコントラクトの一部です — リネーム、移動、または再編成しないでください
- ルール間でコンテンツを重複させないでください — 共通のガイダンスは `common/` に配置し、参照してください
- コアの方法論はIDE/エージェント/モデルに依存しない状態を保ってください
- セキュリティ上の問題は、公開GitHubイシューではなく、
  [AWSの脆弱性報告](http://aws.amazon.com/security/vulnerability-reporting/)を通じて報告してください
- `CHANGELOG.md` はgit-cliffによって自動生成されます — 手動で編集しないでください

## エージェント実行スニペット（Copilotによる追加）

エージェント向けの簡単なガイダンス: リポジトリのuvラッパーとnpxベースのツールを優先してください。コマンドを実行する前に docs/DEVELOPERS_GUIDE.md と docs/ADMINISTRATIVE_GUIDE.md を読んでください。

テスト（uv）:

```bash
uv run pytest
uv run pytest --cov --cov-report=term-missing
```

Markdownリント（npx）:

```bash
npx markdownlint-cli2 "**/*.md"
npx markdownlint-cli2 --fix "**/*.md"
```

Dockerを使用したセキュリティスキャン（ローカル・クロスプラットフォームに推奨）:

```bash
# Grype
docker run --rm -v "$PWD:/workspace" anchore/grype:latest grype dir:/workspace -o sarif=grype.sarif
# Gitleaks
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect --source /repo --report-format sarif --report-path gitleaks.sarif
# Semgrep
docker run --rm -v "$PWD:/src" returntocorp/semgrep semgrep --config=r/all --sarif /src > semgrep.sarif
# Checkov
docker run --rm -v "$PWD:/src" bridgecrew/checkov --directory /src --output-file-path checkov.sarif --output sarif
# Bandit
docker run --rm -v "$PWD:/src" python:3.12-slim bash -c "pip install -q bandit && bandit -r /src -f sarif -o /src/bandit.sarif"
# ClamAV
docker run --rm -v "$PWD:/data" mkodockx/docker-clamav clamscan -r /data --log=/data/clamdscan.txt
```

注意事項:

- これらのコマンドはSARIF/テキスト形式のアーティファクトをプロジェクトルートに書き出すため、CI/エージェントが利用できます。
- CIはすでにスキャナーを実行しています。Dockerが利用可能な場合のローカル検証に使用してください。
- Dockerが利用できない場合は、docs/DEVELOPERS_GUIDE.md に記載されたプラットフォーム固有のインストール方法を使用してください。
