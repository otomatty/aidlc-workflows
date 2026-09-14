# `test-pro` — 具体的な設定 / JSON 例

これらはプラグイン設計の **設定文書** を、同梱の `test-pro` フィクスチャ向けに具体化したものです。[文書 18](../../18-plugin-mechanism.md)（プラグイン仕組みの一章）を図示します。**描くものの大半は延期**であり、出荷ではありません。文書 18 §8 「Status」が、きょう配線されているもの（プラグインマニフェスト + compose 継ぎ目）対、設計済みだが将来（マーケットプレイス解決、managed-settings 信頼、ロックファイル、`aidlc engine plugin add` / `sync` インストーラ）を正確に書きます。意図したライフサイクルを示し、現行の振る舞いではありません。

| ファイル | 役割 | 書く人 | 置き場所 |
|---|---|---|---|
| [`../../../../plugins/test-pro/.aidlc-plugin/plugin.json`](../../../../plugins/test-pro/.aidlc-plugin/plugin.json) | **プラグインマニフェスト** — プラグインが何か + 何を出荷するか | プラグイン著者 | プラグインリポジトリ内（本物のファイル、作成済み） |
| [`marketplace.json`](marketplace.json) | **カタログ項目** — プラグインの発見 / 版付けの仕方 | マーケットプレイスメンテナ | マーケットプレイスリポジトリ |
| [`managed-settings.json`](managed-settings.json) | **信頼許可リスト** — 組織が許すソース | 組織管理者（管理スコープ） | マシンの managed-settings パス |
| [`aidlc.lock.json`](aidlc.lock.json) | **導入ロック** — 再現性のために合成結果をピン | `aidlc engine plugin` インストーラ | 消費者のプロジェクト |

## これらのファイルの現状

- `plugin.json` はリポジトリ内の **本物の、作られたファイル** です。同梱 `test-pro` フィクスチャのマニフェスト。執筆ツールは `aidlc.contributes` キーと正準パスを検証します。投影はそれでもディレクトリ慣習で対応バイトを発見します（文書 18 §3）。
- `marketplace.json`、`managed-settings.json`、`aidlc.lock.json` は設計レビュー専用の **図示例** です。それらを *作り* *消費する* インストーラ、マーケットプレイス解決、ロックファイルライターは **将来の仕事** です（文書 18 §9 「Status」）。ロックファイル内の `sha256:…` と `commit` 値は全部 **プレースホルダ** であり、計算したハッシュではありません。

## これらのファイルが辿るライフサイクル

1. **著者** が `plugin.json` とプラグインの部分木を書き、git タグを公開する。
2. **マーケットプレイス**（任意）が発見のために `marketplace.json` にプラグインを列挙する。
3. **組織管理者** が `managed-settings.json` をセットし、承認したソースだけが入れられるようにする — 開発者は上書きできない（管理スコープ、いちばん高い優先）。
4. **開発者** が `aidlc engine plugin add test-pro` を走る: 版を解決し、許可リストに対して検査し、取得 + 検証し、`bare core + test-pro` を合成し、`aidlc.lock.json` を書く。
5. **同僚** がコミットした `aidlc.lock.json` に対して `aidlc engine plugin sync` を走り、バイト一致のインストールを得る。
