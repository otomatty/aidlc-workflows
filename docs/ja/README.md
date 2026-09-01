# AI-DLC ドキュメント（日本語）

このディレクトリは [docs/](../README.md) の**意訳**です。英語原文を上書きしていません。公式ファイルをその場で置換すると、上流取り込みのたびに衝突するためです。

訳は直訳ではなく、エンジニアが読んで自然な日本語になるよう言い換えています。コマンド名・パス・コード・固有名詞はそのまま残しています。

導入手順だけ先に読む場合は [導入方法](../導入方法.md)（Claude Code / GitHub Copilot）を見てください。

## 訳してあるもの / まだ英語のもの

読む人が使う三系統は、ミラー済みです。入口は次です。

| 系統 | 内容 | 置き場所 |
| ---- | ---- | -------- |
| User Guide | `/aidlc` でソフトウェアを作る人向け | [guide/00-introduction.md](guide/00-introduction.md) |
| Harness Engineer Guide | ステージやエージェントなど**データ**を足す人向け | [harness-engineering/00-overview.md](harness-engineering/00-overview.md) |
| Developer Reference | エンジンやフックなど**コード**を変える人向け | [reference/00-overview.md](reference/00-overview.md) |

ロードマップは [roadmap.md](roadmap.md) です。

まだ訳していないのは、設計経緯の資料だけです。英語原文を見てください。

- `docs/rfcs/`
- `docs/reference/research/`

## 用語

本文では次の語を揃えています。括弧内は原文です。

| 日本語 | 原文 | 意味 |
| ------ | ---- | ---- |
| ハーネス | harness | AI-DLC を載せる CLI / IDE 環境 |
| ステージ | stage | ライフサイクルの 1 ステップ（全 33） |
| フェーズ | phase | Initialization / Ideation / Inception / Construction / Operation |
| スコープ | scope | どのステージを、どの深さで走らせるか。案内ではワークフロープロファイルとも呼ぶ |
| インテント | intent | 1 件の作業。レコードディレクトリを持つ |
| スペース | space | チーム単位の作業場所。ナレッジとインテントを抱える |
| 成果物 | artifact | ステージが書く Markdown |
| 承認ゲート | approval gate | ステージ末尾の人の確認点 |
| オーケストレータ | orchestrator | エンジン（次を決める）とコンダクター（実行する）の総称 |
| エンジン | engine | 次の手を決める決定論的な部品 |
| コンダクター | conductor | `/aidlc` セッション。エンジンの指示を実行する |
| フック | hook | イベントで自動実行される TypeScript |
| 深度 | depth | Minimal / Standard / Comprehensive。成果物の詳しさ |
| テスト戦略 | test strategy | テストの量。深度とは独立 |
| ユニット | unit / unit of work | 独立して実装できる塊 |
| ボルト | Bolt | Construction のイテレーション単位 |
| スウォーム | swarm | 複数エージェントの並行実行 |
| ナレッジ | knowledge | エージェントが読む参照資料 |
| ルール | rule | 毎回効く立ち振る舞い |
| センサー | sensor | 出力に対する決定論的な検査 |
| プラグイン | plugin | ステージや寄与を足す拡張 |
| ワークフロー | workflow | `/aidlc` から始まる 1 回の実行 |

パス（`core/`、`dist/`、`aidlc/` など）とコマンド（`/aidlc`、`bun`）は訳しません。

## リンク

`docs/ja/` は英語側と同じ相対パスです。訳済みどうしは相対リンクのままで届きます。未訳の先は英語原文を開きます。
