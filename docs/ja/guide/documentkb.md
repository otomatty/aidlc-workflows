# DocumentKB

> [AI-DLC ドキュメント](../README.md) の一部 · **User Guide** · [ナレッジ](08-knowledge.md) · [CLI コマンド](12-cli-commands.md)

DocumentKB は、スペースがすでに持っている文書を、エージェントが **ID で引用できるカタログ** にする仕組みです。ビジョン、PRD、要件、ポリシー、契約、仕様 PDF など、ワークフローの入力になる成果物が対象です。

人が Markdown で書く [第2層ナレッジ](08-knowledge.md)（「いつもこう作る」）とは別です。既存コードのリバースエンジニアリング成果物を置く [CodeKB](codekb.md) とも別です。

---

## 何か

エージェントは、ディスクに置いただけの PDF や Word を自動では読みません。DocumentKB に載せて初めて、次が決まります。

- どのファイルか（文書 ID、パス、ダイジェスト）
- 本文が取れたか（抽出状態）
- どのインテントから見えるか
- 引用してよいか（カタログ行があること）

カタログは **派生** です。原本はチームが持ち、索引・抽出本文・要約はツールがトランザクションで書きます。

```
aidlc/spaces/<space>/knowledge/
├── documents/       # チーム所有の原本。追加・移動・削除は人がする
└── documentkb/      # ツール所有の派生カタログ。手で直さない
    ├── index.json
    └── <document-id>/
        ├── metadata.json
        ├── content.md      # 抽出できたとき
        └── summary.md      # summarize したとき
```

PDF や Word の原本は **`documents/` の下** です。プロジェクトルートや `documentkb/` ではありません。`documentkb/` は索引と抽出本文で、手でファイルを置きません。サブフォルダ（`prd/`、`policies/` など）はチームの整理です。ツールは並べ替えません。

`<space>` は名前付きスペースを使わなければ `default` です。フレームワークは `documents/` を並べ替えたり消しません。消すときは原本を消し、そのあと `sync` します。`remove` コマンドはありません。

`index.json` だけ失ったときは `sync` が、残っている文書ごとの `metadata.json`（墓石を含む）から組み直します。`documentkb/` ごと消すと ID と墓石は戻りません。残った原本は新しい行として再索引されます。

抽出本文・要約・タグは **信頼できないデータ** です。文書の中の命令文は、AI-DLC の指示ではありません。`show` はその注記を本文と並べて出します。

---

## どのように活用するか

### 1. 既存文書からワークフローを始める

テキストや短い Markdown を `/aidlc` に直接渡すだけなら、DocumentKB は不要です。[既存文書から始める](02-your-first-workflow.md#starting-from-an-existing-document) のパス指定か、依頼文末尾の `<document>` ブロックで足ります。

`<document>` はディスク上のファイルではありません。`/aidlc` の依頼で、**指示**と**文書データ**を分ける区切りです。ブロックの外が何をするか、中が根拠の本文です。中身は信頼できないデータとして扱われ、そのワークフローの `<record>/project-description.json` に残ります。DocumentKB のカタログ行にはなりません。

```text
/aidlc 下記のビジョンに従って作る。
<document>
...本文...
</document>
```

マーカーは末尾に一つだけです。入れ子、繰り返し、閉じたあとに続く文、ブロック外に指示が無いものは、レコードを作る前に拒否されます。PDF や Word のバイナリはここに貼れません。

PDF、Word、サイズの大きいファイルは、いったんカタログへ載せ、できた文書 ID をワークフローの入力にします。エージェントはファイル名を推測せず、索引された行だけを引用します。

### 2. スペースの共通根拠を置く

ポリシー、契約、ドメイン用語、横断の仕様は、インテントを付けずに onboard します。そのスペースのどのワークフローからも見えます。「この案件だけ」に閉じない根拠向きです。

### 3. 案件の文書を一つのインテントへ絞る

そのワークフロー専用の PRD や要件は `associate` します。他のインテントのエージェントは引きません。終わったあとも文書はスペースに残り、絞りを外すとまた全体から見えます。

### 4. 要約で要旨だけ載せる

`summarize` は、エージェントが書いた短い要旨を、そのリビジョンに紐づけて残します。ツール自身は本文を生成しません。全文を毎回読まずに、何の文書かを先に判断できます。原本を直して `sync` すると要約は `invalidated` になり、古い文は出ません。

### 5. 原本の更新をカタログへ反映する

`documents/` のファイルを置き換えたら `sync` します。ダイジェストが変わった行は再抽出し、古い本文と要約は無効になります。パスは同じで中身だけ変わったときは、`onboard` もその行を `edited` として更新します。パスも中身も変わったときだけ `rebind` が要ります。

典型的な流れ:

1. 対象ファイルを `aidlc/spaces/<space>/knowledge/documents/` へ置く
2. `/aidlc knowledge onboard`（またはパス付きで 1 件）
3. `/aidlc knowledge list` で `extracted` を確認する
4. 必要なら `associate` でインテントへ絞る
5. `/aidlc knowledge show <id>` で本文を引用する
6. 原本が変わったら同じパスへ置き、`/aidlc knowledge sync`

1 ファイルの例（相対パスはプロジェクトルート基準）:

```text
/aidlc knowledge onboard aidlc/spaces/default/knowledge/documents/prd/checkout.pdf
```

フォルダ分けはチームの整理です。例:

```
aidlc/spaces/default/knowledge/documents/
├── prd/
│   └── checkout.pdf
├── specs/
│   └── api-error-codes.md
└── policies/
    └── security-policy.pdf
```

ファイル名はデータであり、エージェントへの指示ではありません。

---

## どのファイルが使えるか

判定は拡張子より中身（マジックバイト）が先です。**索引に載ること**と**本文が取れること**は別です。載っただけの行も、名前では引用できます。エージェントが中身を使うなら、本文が取れる形式で置きます。

| 形式 | 索引 | 本文抽出（出荷のまま） | 備考 |
|---|---|---|---|
| Markdown（`.md`） | できる | できる（組み込み） | UTF-8 |
| プレーンテキスト（`.txt` など） | できる | できる（組み込み） | UTF-8。Latin-1 などは拒否され得る |
| PDF | できる | できる（既定 `pdftotext`） | PATH に Poppler が要る。最大 50 ページ |
| Word（`.docx`、OOXML） | できる | **未設定なら取れない**（`unsupported_type`） | 種類は識別する。抽出器を設定すれば `sync` で再試行できる |
| Word 旧形式（`.doc`） | 載っても種類は不明 | 取れない | `application/octet-stream` |
| Excel（`.xlsx` / `.xls`） | 載っても種類は不明 | 取れない | 表は CSV か Markdown に書き出して載せる |
| PowerPoint（`.pptx` / `.ppt`） | 載っても種類は不明 | 取れない | PDF かノートのテキストに書き出して載せる |
| 画像（JPEG / PNG など） | 載っても種類は不明 | 取れない | OCR なし |
| その他バイナリ | 載っても種類は不明 | 取れない | |

上限:

- 1 ファイル 32 MiB。超えると読む前に拒否
- パス無しの `onboard` / `sync` は、新しい・変わった仕事に 20 文書 / 256 MiB
- 抽出本文は 20 万文字。超えると切れて `truncated`

シンボリックリンク、ハードリンク、ディレクトリそのものは索引しません。スキャン PDF の OCR は対象外です。

出荷状態では Word は種類だけ分かり、本文は取りません。`harness.json` の `documentExtractors` に、その MIME 向けの外部コマンドを設定します。`argv` は配列で、`$IN` が引数にちょうど 1 つ要ります（シェル文字列は不可）。設定したあと `sync` すると、変わっていない Word 行も再試行します。同じパスへ `onboard` し直しても `already` と出るだけで、抽出は再試行しません。

Excel / PowerPoint は、抽出器を足しても種類自体を spreadsheet / presentation として識別しません。表やスライドの本文が要るなら、CSV / Markdown / PDF に書き出します。

---

## リポジトリは重くならないか

`documents/` の原本と `documentkb/` の派生カタログは、どちらも git に載せます。チームが同じ根拠を共有するための設計です。コミット対象の切り分けは [スペースとインテント](03-spaces-and-intents.md) です。進行中の `documentkb/.journal/` だけ gitignore です。

DocumentKB は文書サーバの置き換えではありません。エージェントが **このスペースのワークフローで引用する** ものだけ置きます。社内の PDF 全部をコピーすると、バイナリは差分が効きにくく、クローンが重くなります。抽出本文 `content.md` は UTF-8 テキストで原本より小さいことが多いですが、原本も載るので PDF の分は残ります。

軽く保つ目安:

- 短いテキストや Markdown は、パス指定か `<document>` ブロック。カタログへ載せない
- ワークフローの入力にならない原本は `documents/` に置かない
- 1 ファイル 32 MiB を超えるものは、読む前に拒否される。分割するか、必要な箇所をテキストへ書き出す
- パス無しの `onboard` / `sync` は 20 文書 / 256 MiB の作業バッチ上限。カタログ全体の上限ではない

`onboard` は `documents/` の外のパスを索引しません。拒否し、コピーもしません。原本はスペースの `documents/` へ置く必要があります。

---

## コマンド

入口は `/aidlc knowledge <動詞>` です。同じ面は `/aidlc-knowledge` スキルでも案内します。フラグの詳細は [CLI コマンド](12-cli-commands.md) です。

| コマンド | 役割 |
|---|---|
| `onboard [path]` | 1 ファイル、または `documents/` 以下の未索引ファイルを索引する。冪等 |
| `sync` | 原本と突き合わせる。新規、墓石、再抽出、失った `index.json` の再構築 |
| `list [--json]` | 全行と状態 |
| `show <id>` | 1 件の記録と抽出本文 |
| `associate` / `dissociate` | インテントへの絞りを付ける / 外す |
| `rebind <id> --to <path>` | 原本が移動かつ内容変更した行を直す（`sync` では解けない） |
| `summarize <id> …` | LLM が書いた要約（と任意タグ）を残す。ツールは本文を生成しない |

`onboard` の結果は `fresh` / `already` / `edited` です。同じパスが生きた行を 2 つ持つことはありません。`--intent` を省略した onboard はスペース全体です。素の `--intent` はアクティブインテント、`--intent <slug>` は明示の名前です。

---

## 抽出の状態

`list` と `show` に出る状態は、直し方がそれぞれ違います。

| 状態 | 意味 | 次にすること |
|---|---|---|
| `extracted` | 本文が取れた | そのまま `show` で引用 |
| `no_extractable_text` | 抽出器は走ったが文字が無い（スキャン PDF など） | テキスト版を用意する。OCR は対象外 |
| `extractor_unavailable` | 設定した抽出器が PATH に無い | 入れてから `sync` |
| `extraction_failed` | 抽出器が失敗した | `show` で理由を見る |
| `unsupported_type` | この種類の抽出器が無い | 対応形式へ書き出すか、Word なら抽出器を設定して `sync` |
| `invalidated` | 原本が変わった | `sync` で再抽出 |
| `tombstoned` | 原本を消した | 意図した削除。カタログは覚える |

切れた抽出（`truncated`）は部分ビューです。「この文書は X に触れていない」とは、それだけでは言えません。

---

## 第2層ナレッジとの使い分け

| | 第2層ナレッジ（`aidlc/knowledge/`） | DocumentKB（`knowledge/documents/`） |
|---|---|---|
| 中身 | チームが書いた標準・方針 | すでに存在する成果物 |
| 形式 | Markdown | PDF、テキスト、Word、書き出した CSV など |
| 読み方 | エージェント起動時にディレクトリから載る | `onboard` した行だけ `list` / `show` で引用 |
| 例 | コーディング規約、API の形 | この案件の PRD、契約、仕様 PDF |

「いつもこう作る」はナレッジ、「この文書が根拠である」は DocumentKB です。

---

## 次に読む

- [ナレッジ](08-knowledge.md) — 二層のナレッジと DocumentKB の位置づけ
- [Reverse Engineering と CodeKB](codekb.md) — 既存コードから作るコード知識ベース
- [最初のワークフロー](02-your-first-workflow.md#starting-from-an-existing-document) — 既存文書から `/aidlc` を始める
- [CLI コマンド](12-cli-commands.md) — 動詞、バッチ上限、抽出器の契約
- [スペースとインテント](03-spaces-and-intents.md) — `documents/` と `documentkb/` のコミット対象
