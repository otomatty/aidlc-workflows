# 開発者ガイド

## CodeBuild をローカルで実行する

[CodeBuild ローカルエージェント](https://docs.aws.amazon.com/codebuild/latest/userguide/use-codebuild-agent.html) を使って AWS CodeBuild のビルドをローカルで実行できます。リモートにプッシュすることなく buildspec の変更をテストする場合に便利です。

### 前提条件

- Docker がインストールされ、起動していること
- `codebuild_build.sh` スクリプト

### 基本的な使い方

1. セットアップ

- ローカル CodeBuild スクリプトをダウンロードして実行可能にします。
- `GH_TOKEN` 環境変数の GitHub Personal Access Token（PAT）を `./.env` ファイルに書き込みます。

```bash
if [ ! -f codebuild_build.sh ]; then
  curl -O https://raw.githubusercontent.com/aws/aws-codebuild-docker-images/master/local_builds/codebuild_build.sh && chmod +x codebuild_build.sh;
fi;
echo "GH_TOKEN=${GH_TOKEN:-ghp_notset}" > "./.env";
```

1. 反復作業

- _オプションで `.github/workflows/codebuild.yml` GitHub ワークフロー内の `buildspec-override` の値を編集します_
- ワークフローの内容に基づいて `./buildspec.yml` をローカルファイルとして更新します
- マシンのアーキテクチャに基づいたイメージで AWS CodeBuild のビルドをローカルで実行します

```bash
cat .github/workflows/codebuild.yml \
    | uvx yq -r '.jobs.build.steps[] | select(.id == "codebuild") | .with["buildspec-override"]' \
    > buildspec.yml
./codebuild_build.sh \
  -i "public.ecr.aws/codebuild/amazonlinux-$([ "$(arch)" = "arm64" -o "$(arch)" = "aarch64" ] && echo "aarch64" || echo "x86_64")-standard:$([ "$(arch)" = "arm64" -o "$(arch)" = "aarch64" ] && echo "3.0" || echo "5.0")" \
  -a "./.codebuild/artifacts/" \
  -l "public.ecr.aws/codebuild/local-builds:$([ "$(arch)" = "arm64" -o "$(arch)" = "aarch64" ] && echo "aarch64" || echo "latest")" \
  -c \
  -e "./.env"
```

### すべてのスクリプトオプション

| フラグ         | 必須       | 説明                                                                                                                                                                                                  |
| -------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-i IMAGE`     | はい       | カスタムビルドコンテナイメージ（例: `aws/codebuild/standard:5.0`）                                                                                                                                    |
| `-a DIR`       | はい       | 成果物の出力ディレクトリ                                                                                                                                                                              |
| `-b FILE`      | いいえ     | buildspec のオーバーライドファイル。デフォルトはソースディレクトリ内の `buildspec.yml`                                                                                                                |
| `-s DIR`       | いいえ     | ソースディレクトリ。最初の `-s` がプライマリソース。追加の `-s` フラグはセカンダリソースに `<sourceIdentifier>:<sourceLocation>` 形式を使用します。デフォルトは現在の作業ディレクトリ               |
| `-l IMAGE`     | いいえ     | デフォルトのローカルエージェントイメージをオーバーライドする                                                                                                                                          |
| `-r DIR`       | いいえ     | レポートの出力ディレクトリ                                                                                                                                                                            |
| `-c`           | いいえ     | ローカルホストの AWS 設定と認証情報を使用する（`~/.aws` および `AWS_*` 環境変数）                                                                                                                     |
| `-p PROFILE`   | いいえ     | 使用する AWS CLI プロファイル（`-c` が必要）                                                                                                                                                           |
| `-e FILE`      | いいえ     | 環境変数を含むファイル（`VAR=VAL` 形式、1 行に 1 つ）                                                                                                                                                |
| `-m`           | いいえ     | ソースディレクトリをビルドコンテナに直接マウントする                                                                                                                                                  |
| `-d`           | いいえ     | ビルドコンテナを Docker の特権モードで実行する                                                                                                                                                        |

## セキュリティスキャナー

[`security-scanners.yml`](../.github/workflows/security-scanners.yml) ワークフローは、`main` へのすべてのプッシュ、`main` を対象とするすべての PR、および毎日のスケジュールで 6 つのスキャナーを実行します。ClamAV を除く各スキャナーは SARIF レポートを GitHub Code Scanning（**Security** タブに表示）とダウンロード可能な成果物としてアップロードします。

ClamAV を除くすべてのスキャナーは**遅延失敗パターン**を使用しています。スキャンは常に完了まで実行され、結果をアップロードした後にジョブが失敗します。これにより、ビルドが失敗した場合でも検出事項が記録されます。

### Bandit — Python SAST

**検出内容:** Python コードの一般的なセキュリティ問題（例: `subprocess`、`eval` の使用、ハードコードされたパスワード、脆弱な暗号化）。

**失敗をトリガーする条件:** 重大度レベルに関わらず、**高い信頼度**のいずれかの検出事項。使用される正確なフィルターについては [`.github/workflows/security-scanners.yml`](../.github/workflows/security-scanners.yml) の Bandit 設定を参照してください。

**スコープ:** リポジトリ内のすべてのトラッキングされた Python ファイルに対して実行されます。正確なインクルード/エクスクルードパターンについては [`.github/workflows/security-scanners.yml`](../.github/workflows/security-scanners.yml) を参照してください。

**検出事項の確認方法:**

1. GitHub Security タブの **Code Scanning** アラートを確認するか、`bandit.sarif` 成果物をダウンロードする
2. 各検出事項には Bandit のルール ID（例: `B603`）とリスクの説明が含まれています

**修正方法:**

- **コードを修正する** — 推奨アプローチ。Bandit のドキュメントには各ルールの安全な代替手段が記載されています
- **インラインで抑制する** — 影響を受ける行に `# nosec BXXX`（正当化付き）を追加する:

  ```python
  subprocess.run(cmd, check=True)  # nosec B603 — cmd is built from validated config, not user input
  ```

- **パスを除外する** — `.bandit` の `exclude` リストに追加する

### Semgrep — 多言語 SAST

**検出内容:** 完全な Semgrep Registry（`--config=r/all`）を使って、すべての言語のセキュリティアンチパターン、危険な API 使用、コード品質の問題。

**失敗をトリガーする条件:** いずれかの検出事項。PR では、PR のベースコミットと比較した**新規**検出事項のみが失敗をトリガーします（`--baseline-commit` を使ってすでに存在する検出事項を無視します）。

**検出事項の確認方法:**

1. **Code Scanning** アラートを確認するか、`semgrep.sarif` 成果物をダウンロードする
2. 各検出事項にはルール ID（例: `python.lang.security.dangerous-subprocess-use-audit`）とルールドキュメントへのリンクが含まれています

**修正方法:**

- **コードを修正する** — Semgrep Registry のドキュメントに記載されたルールの推奨修正に従う
- **インラインで抑制する** — 影響を受ける行に `# nosemgrep: <rule-id>` を追加する:

  ```python
  time.sleep(5)  # nosemgrep: arbitrary-sleep — polling for server startup
  ```

  YAML ファイルの場合:

  ```yaml
  run: exit ${{ steps.scan.outputs.exit_code }}  # nosemgrep: yaml.github-actions.security.curl-eval.curl-eval
  ```

- **パスを除外する** — `.semgrepignore` にパスを追加する（注: `changed-semgrepignore` 監査ルールが新しいエントリをアプリセキュリティレビューのためにフラグを立てます）

### Grype — 依存関係の脆弱性スキャン（SCA）

**検出内容:** ロックファイル、マニフェスト、コンテナイメージをスキャンすることで、プロジェクトの依存関係の既知 CVE。

**失敗をトリガーする条件:** **HIGH または CRITICAL** と評価された脆弱性（`.grype.yaml` の `fail-on-severity: high`）。LOW および MEDIUM の脆弱性はレポートされますが、ビルドを失敗させません。

**検出事項の確認方法:**

1. **Code Scanning** アラートを確認するか、`grype.sarif` 成果物をダウンロードする
2. 各検出事項には CVE ID、影響を受けるパッケージ、インストール済みバージョン、修正済みバージョン（利用可能な場合）が含まれています

**修正方法:**

- **依存関係をアップグレードする** — 推奨アプローチ。パッチ済みバージョンが存在するか確認し、関連する `pyproject.toml` またはロックファイルを更新する
- **設定で抑制する** — 理由とともに `.grype.yaml` の `ignore` リストにエントリを追加する:

  ```yaml
  ignore:
    - vulnerability: CVE-2024-12345
      reason: "only affects server-side XML parsing which we don't use"
  ```

  特定のパッケージにスコープを絞ることもできます:

  ```yaml
  ignore:
    - vulnerability: CVE-2024-12345
      package:
        name: "some-package"
        version: "1.2.3"
      reason: "pinned version; affected code path is unreachable"
  ```

> **注意:** Grype は SCA スキャナーです — ソースコードの行ではなく依存関係を分析します。抑制のためのインラインコードコメントはなく、受容されたリスクはすべて `.grype.yaml` に記載します。

### Gitleaks — シークレット検出

**検出内容:** git 履歴のどこかにコミットされたシークレット（API キー、トークン、パスワード、秘密鍵）。

**失敗をトリガーする条件:** ベースラインファイル（`.gitleaks-baseline.json`）に存在しないシークレット。

**検出事項の確認方法:**

1. `gitleaks.sarif` 成果物をダウンロードする
2. 各検出事項にはシークレットの種類（例: `generic-api-key`、`jwt`）、ファイル、コミットが特定されています

**修正方法:**

- **シークレットをすぐにローテーションする** — 検出されたシークレットは侵害されたものとして扱う
- **履歴から削除する** — `git filter-repo` または BFG Repo-Cleaner を使ってすべてのコミットからシークレットを消去する
- **ベースラインに追加する** — 既知の偽陽性のみ対象（例: 合成された認証情報を含むテストフィクスチャ）。ベースラインを再生成する:

  ```bash
  gitleaks git --config=.gitleaks.toml --report-path=.gitleaks-baseline.json --report-format=json .
  ```

  コミットする前に更新されたベースラインを慎重に確認する
- **パスを許可リストに追加する** — シークレットのようなパターンを意図的に含むファイル（例: テスト用認証情報のスクラバー）に対して `.gitleaks.toml` の `[allowlist] paths` に正規表現を追加する

### Checkov — Infrastructure as Code スキャン

**検出内容:** GitHub Actions ワークフローと Dockerfile の設定ミス（例: 固定されていないアクション、セキュリティ設定の欠如、過度に広い権限）。

**スコープ:** `github_actions` と `dockerfile` フレームワークのみをスキャンします（`.checkov.yaml` で設定）。

**失敗をトリガーする条件:** `skip-check` にリストされているチェックを除く、すべてのチェック失敗。

**検出事項の確認方法:**

1. **Code Scanning** アラートを確認するか、`checkov.sarif` 成果物をダウンロードする
2. 各検出事項にはチェック ID（例: `CKV_GHA_7`、`CKV_DOCKER_2`）と設定ミスの説明が含まれています

**修正方法:**

- **設定を修正する** — 特定のチェック ID に対する Checkov のドキュメントに従う
- **インラインで抑制する** — 影響を受ける行の上またはその行にコメントを追加する:

  Dockerfile の場合:

  ```dockerfile
  # checkov:skip=CKV_DOCKER_2:healthcheck not needed for build-only image
  FROM python:3.12-slim
  ```

  GitHub Actions ワークフローの場合:

  ```yaml
  # checkov:skip=CKV_GHA_7:buildspec-override requires user parameters
  - uses: aws-actions/aws-codebuild-run-build@v1
  ```

  1 行に複数のスキップ:

  ```yaml
  # checkov:skip=CKV_DOCKER_2,CKV_DOCKER_3:reason for both
  ```

- **リポジトリ全体でスキップする** — なぜスキップするかを説明するコメントとともに `.checkov.yaml` の `skip-check` リストにチェック ID を追加する

### ClamAV — マルウェアスキャン

**検出内容:** ClamAV のシグネチャデータベースを使って、リポジトリファイル内のマルウェア、ウイルス、トロイの木馬。

**失敗をトリガーする条件:** いずれかのマルウェア検出（バイナリの pass/fail）。

**検出事項の確認方法:**

1. `clamdscan.txt` 成果物をダウンロードする — 感染したファイルパスを含む完全なスキャンログが含まれています

> **注意:** ClamAV は SARIF 出力を生成せず、GitHub Code Scanning とは統合されません。結果はテキストログの成果物としてのみ利用できます。

**修正方法:**

- **感染したファイルを削除**し、どのように導入されたかを調査する
- **検出を確認する** — 偽陽性はまれですが発生する可能性があります。ClamAV のシグネチャ名を既知の偽陽性データベースと照合する

### 失敗しきい値のまとめ

| スキャナー | 失敗条件                           | 重大度フィルター          | 設定ファイル                                |
| ---------- | ---------------------------------- | ------------------------- | ------------------------------------------- |
| Bandit     | 高い信頼度のいずれかの検出事項     | すべての重大度            | `.bandit`                                   |
| Semgrep    | いずれかの検出事項（PR: 新規のみ） | すべての重大度            | `.semgrepignore`                            |
| Grype      | HIGH または CRITICAL の CVE        | LOW/MEDIUM は失敗しない   | `.grype.yaml`                               |
| Gitleaks   | ベースラインにないいずれかのシークレット | すべて                | `.gitleaks.toml`、`.gitleaks-baseline.json` |
| Checkov    | いずれかのチェック失敗             | すべて（スキップを除く）  | `.checkov.yaml`                             |
| ClamAV     | いずれかのマルウェア検出           | バイナリ pass/fail        | なし                                        |

### 抑制方法のまとめ

| スキャナー | インラインコメント          | 設定レベル                    | ベースライン/差分            |
| ---------- | --------------------------- | ----------------------------- | ---------------------------- |
| Bandit     | `# nosec BXXX`              | `.bandit` `exclude`           | —                            |
| Semgrep    | `# nosemgrep: rule-id`      | `.semgrepignore`              | PR での `--baseline-commit`  |
| Grype      | _（該当なし — SCA）_        | `.grype.yaml` `ignore`        | —                            |
| Gitleaks   | —                           | `.gitleaks.toml` `allowlist`  | `.gitleaks-baseline.json`    |
| Checkov    | `# checkov:skip=ID:reason`  | `.checkov.yaml` `skip-check`  | —                            |
| ClamAV     | —                           | —                             | —                            |

## GitHub Actions をローカルで実行する

_注意: これは [`act`](https://github.com/nektos/act) ツールを使用し、"us-east-1" の有効な AWS CodeBuild プロジェクト `codebuild-project` へのアクセスを前提としています_

```shell
act --platform ubuntu-latest=-self-hosted \
    --job build \
    --workflows .github/workflows/codebuild.yml \
    --env-file .env \
    --var CODEBUILD_PROJECT_NAME=codebuild-project \
    --var AWS_REGION=us-east-1 \
    --var ROLE_DURATION_SECONDS=7200 \
    --artifact-server-path=$PWD/.codebuild/artifacts \
    --cache-server-path=$PWD/.codebuild/artifacts \
    --env ACT_CODEBUILD_DIR=$PWD/.codebuild/downloads \
    --bind
```
