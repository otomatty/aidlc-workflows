# `test-pro` — 具体的な設定 / JSON の例

プラグイン設計の **設定文書** を、同梱の `test-pro` フィクスチャ向けに具体化したものです。[doc 18](../../18-plugin-mechanism.md)（プラグイン機構の単一章）を示します。**描いているものの大半は先送り** であり、同梱ではありません — いま結ばれているもの（プラグインマニフェスト + 合成シーム）と、設計済みで将来のもの（マーケットプレイス解決、managed-settings の信頼、ロックファイル、`aidlc plugin add` / `sync` インストーラ）の正確な切りは doc 18 §8 "Status" です。意図したライフサイクルを見せるものであり、いまの振る舞いではありません。

| File | Role | Authored by | Where it lives |
|---|---|---|---|
| [`../../../../plugins/test-pro/.aidlc-plugin/plugin.json`](../../../../plugins/test-pro/.aidlc-plugin/plugin.json) | **プラグインマニフェスト** — プラグインが何か + 何を同梱するか | プラグインの著者 | プラグインリポジトリ内（実ファイル、作成済み） |
| [`marketplace.json`](marketplace.json) | **カタログ項目** — プラグインの発見 / 版付けの仕方 | マーケットプレイスのメンテナ | マーケットプレイスリポジトリ |
| [`managed-settings.json`](managed-settings.json) | **信頼の許可リスト** — 組織が許すソース | 組織管理者（managed スコープ） | マシンの managed-settings パス |
| [`aidlc.lock.json`](aidlc.lock.json) | **導入ロック** — 再現性のため合成結果をピン留めする | `aidlc plugin` インストーラ | 消費側のプロジェクト |

## Status of these files {#status-of-these-files}

- `plugin.json` はリポジトリ内の **実在する、作成済みファイル** です — 同梱 `test-pro` フィクスチャのマニフェスト。著者ツールは `aidlc.contributes` キーと正規パスを検証します。投影はまだディレクトリ約束で対応バイトを発見します（doc 18 §3）。
- `marketplace.json`、`managed-settings.json`、`aidlc.lock.json` は設計レビュー用の **説明例** だけです。それらを *作り* *消費する* インストーラ、マーケットプレイス解決、ロックファイル書き手は **将来の仕事** です（doc 18 §8 "Status"）。ロックファイル内の `sha256:…` と `commit` 値はすべて **プレースホルダ** であり、計算したハッシュではありません。

## The lifecycle these files trace {#the-lifecycle-these-files-trace}

1. **著者** が `plugin.json` とプラグインのサブツリーを書き、git タグを出す。
2. **マーケットプレイス**（任意）が発見用に `marketplace.json` へプラグインを載せる。
3. **組織管理者** が `managed-settings.json` を設定し、承認したソースだけ導入できるようにする — 開発者は上書きできない（managed スコープ、最優先）。
4. **開発者** が `aidlc plugin add test-pro` を走る: 版を解決し、許可リストと照合し、取得 + 検証し、`bare core + test-pro` を合成し、`aidlc.lock.json` を書く。
5. **同僚** がコミット済みの `aidlc.lock.json` に対して `aidlc plugin sync` を走り、バイト一致の導入を得る。
