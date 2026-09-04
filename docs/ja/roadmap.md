# AI-DLC Workflows 2.0 — ロードマップ

2026-09-03 時点の状況です。

- いまの v2 は **2.7.0**（`origin/main` の先端 `96b11d39`）です。
  版番号はコミット済みのフレームワーク木を指し、GitHub Releases ではありません。
- AI-DLC Workflows 2.0 は既定ブランチ `main` で **GA** です。新規導入とアップグレードは `main` を使います。以前の実装は `v1` で別管理です。
- 公開リリースはまだ `main` と揃っていません。GitHub の Latest はいまも `v1.0.1` で、#635 で追っています。#722 のネイティブ配布実装は #756 でレビュー中で、公開の v2 ネイティブリリースはまだありません。
- PR 検証は、smoke・unit・packaging・typecheck・lint に加え、決定論的な integration と end-to-end も回します（#791）。

下の版番号は、`main` に何が載ったかを示します。これからやるテーマと開いている PR は方向性であり、リリースの約束ではありません。

## 北極星

AI-DLC Workflows 2.0 の機能目標は 7 つです。意図はそのままです。

1. **現場でやっていることを真似る** — Owner / Collaborator / Verifier の編成でステージを実行し、ハーネスをまたいで意味を揃える。
2. **振る舞いをカスタムできる** — 新しい振る舞い、方針、拘束は、狙いを定めた変更 2 箇所以内で書け、ハーネス固有の書き直しなしで再利用できる。
3. **ワークフローが適応する** — 縮小（報告の仕分けから短い Fix / Test / PR）も拡大（境界で次のステージを決める）もできる。合成であり、配線の固定ではない。
4. **Verifier は本当の敵対者** — 敵対的な品質ゲート。生産者と別の LLM でもよい。機械で検査できる証拠に照らす。予算付きの自己修復があり、足りなければ HITL へ上げる。
5. **循環しつつ向きのある流れ** — 前へ進むことに加え、統治された、向きのあるフィードバックループ。
6. **成果物のトレーサビリティを守る** — 下流は上流の成果物を豊かにし、切れ目のない別物を増やさない。
7. **成果物リポジトリは組織のもの** — プロジェクト局所ではなく、プロジェクト・インテント・リポジトリをまたぐ共有の組織ナレッジ層。名前付きシナリオは 6 つ。

## 戦略の柱

北極星を利用者まで届ける柱は二つです。

- **プロダクト化と配布（#722）** — 対応ハーネスで、導入・設定・アップグレード・リリース・ロールバックを素直にする。
- **プラグイン生態系とマーケットプレイス（#723）** — 信頼できる拡張を見つけ、入れ、再利用できるようにする。外部プラグインから第一級の能力への道筋もはっきりさせる。

## 目標スコアカード

<!-- markdownlint-disable MD013 -->

| # | 目標 | 状態 | 届いたもの | 残り |
| --- | --- | --- | --- | --- |
| 1 | 現場の編成 | 出荷済み | 2.5.0 独立した協力者と選べるトポロジ（#568）、強制されるレビュアーレシート（#569）、ユニットごとの並行ウェーブ（#617）、チーム所有の並行ユニット（#879） | ハーネスネイティブのライブチーム輸送は強化として残る |
| 2 | カスタマイズ | 出荷済み、追随あり | 2.3.0 プラグインシーム、2.3.5 コンテンツ投影と選択（#550）、決定論的なルール配送（#658）、プラグインスコープ（#664）、再利用できるプラグインテストキット（#792）、plugin doctor の拡張（#797）、独立した作成ツールチェーン（#892） | ステージ固有ルール、`when:` 評価、遠隔発見とマーケットプレイス（#723） |
| 3 | 適応性 | 出荷済み | 2.2.0 コンポーザー、エントロピー採点の合成（#595）、決定論的 ARS（#644）、unit-major の Code Generation（#705）、Classic / Express スコープと条件付きプロトコルモジュール（#767）、セッション単位のワークフロー紐づけ（#858） | 境界の変更は設計どおり人の承認が要る |
| 4 | Verifier は敵対者 | 出荷済み | 2.4.0 敵対的な証拠契約（#566）、ゲートと完了の強制（#569、#551）、レビュアークラスのコストダイヤル（#718）、ターン / 復旧のバックストップ（#613、#758）、ゲート結びの blocking センサー（#836） | PR 単位の敵対レビューは #799 で開発中 |
| 5 | 循環する流れ | 一部 | ステージ内のレビュー / 改訂ループ、有界の復旧、人が明示承認する前方 / 後方 / やり直しジャンプ、Build & Test から Code Generation への有界な戻り（#616） | ステージをまたぐ一般の統治フィードバックループは未実装 |
| 6 | トレーサビリティ | 一部 | 成果物グラフ、上流カバレッジ、ステージごとの強制（#401）、主張の出自（#647、#686）、共有 CodeKB の保護（#670）、ドメイン / 契約の境界（#711）、古い結果の伝播（#716）、ソース結びとユニットごとのレビューレシート（#646、#813） | その場で上流を段階的に豊かにすることと、ユニットをまたぐ発見の伝播（#299） |
| 7 | 組織リポジトリ | 出荷済み | 2.1.0 スペース / インテント / org-KB、宣言した複数リポジトリマニフェストと同期（#674）、クローンしても壊れないアクティブスペースカーソル（#709）、DocumentKB の索引と引用（#731）、要約とタグ（#894） | 監査できる補足ナレッジの選択は拡張として進行中（#694） |

<!-- markdownlint-enable MD013 -->

## 届いたもの

<!-- markdownlint-disable MD013 -->

| 版 | 能力 | 目標 | 主な PR |
| --- | --- | --- | --- |
| 2.0.0 - 2.0.2 | GA プレビュー。レビュアー機構、複数ハーネスのコア、エージェント名簿 | 1, 4 | v2 ベースライン |
| 2.1.0 | インテント単位の作業場所。スペース、インテント、複数リポジトリ、org-KB | 7 | #429 |
| 2.1.2 | ユニットごとの `for_each` 反復 | 3 | #444 |
| 2.1.3 - 2.1.8 | ループの整合と、ハーネスをまたぐレビュアー配線 | 1, 4, 5 | #405, #443, #466, #482 |
| 2.2.0 - 2.2.19 | 適応型ワークフロー、コンポーザー、縮小と Construction の強化 | 3 | #477, #491, #509-#512, #520-#522, #525 |
| 2.3.0 - 2.3.5 | プラグイン機構、エージェントティア、導入時のプラグイン選択とコンテンツ投影 | 2, 4 | #475, #546, #550 |
| 2.3.6 - 2.3.11 | フェーズ進捗、引用を意識した上流カバレッジ、ピン留め lint とゲート会計 | 4, 6 | #562, #563, #572, #573 |
| 2.4.0 | レビュアー＝Verifier。敵対的で、証拠に根ざしたレビュー | 4 | #566 |
| 2.4.2 - 2.4.6 | ルート全体のパッケージ、ネイティブディスパッチャ / バイナリ、ドキュメントの揃え、opencode ハーネス | 1, 2 | #560, #571, #577, #578, #581 |
| 2.5.0 | 三役の編成。独立した協力者、パイプライン、モブ、ハブ＆スポーク | 1 | #568 |
| 2.5.1, 2.5.25 | エントロピー採点の最小ワークフロー合成と決定論的 ARS | 3 | #595, #644 |
| 2.5.2 | 秘匿した `/aidlc --doctor --export` 診断バンドル | - | #576 |
| 2.5.5, 2.5.39, 2.5.41, 2.5.54-2.5.55 | レビュアーレシート、レビュー凍結、コード前の計画ガード、レビュアークラスと認可レシート | 1, 4 | #569, #677, #692, #702, #718 |
| 2.5.11, 2.5.38, 2.5.57-2.5.58 | 主張の出自、生成前の確認、プロジェクト言語への接地 | 6 | #647, #686, #703, #707 |
| 2.5.33 - 2.5.36 | 決定論的な操舵配送、プラグインスコープ、CodeKB の保全、ワークスペースマニフェスト / 同期 | 2, 7 | #658, #664, #670, #674 |
| 2.5.40, 2.5.53 | ステージごとのトークン / コスト会計、任意のメトリクス、使用量追跡のキルスイッチ | - | #673, #720 |
| 2.5.56 | Code Generation が unit-major の Construction 歩きに加わる | 3 | #705 |
| 2.5.60 | GitHub Copilot ハーネス（Copilot CLI と VS Code agent mode） | 1, 2 | #657 |
| 2.5.63 | Cursor ハーネス | 1, 2 | #661 |
| 2.5.67 | ユニットごとの並行ウェーブとフォアグラウンドレビュアー | 1, 4 | #617 |
| 2.5.71 - 2.5.75 | ステージごとのトレーサビリティ強制、設計ステージのコード境界、テスト指示の所有、第一級の観測成果物 | 4, 6 | #401-#404 |
| 2.6.1 - 2.6.2 | ドメイン / 契約設計の再編、インフラ設計の統合と追随ガード | 1, 6 | #711, #751 |
| 2.6.8 - 2.6.9 | レビュアーターンのバックストップと、古いレシートの有界復旧 | 4 | #613, #758 |
| 2.6.12 - 2.6.14 | Copilot 継続の安定、ゲート著者の強制、監査時刻の正規化 | 1, 4 | #749, #750, #759 |
| 2.6.15 | DocumentKB S1 の索引と引用配送 | 7 | #731 |
| 2.6.16 | Code Generation 計画を、確めた Testing Posture に結ぶ | 4, 6 | #772 |
| 2.6.17 | 再利用できるプラグインテストキットと、プラグイン著者向けテスト階層 | 2 | #792 |
| 2.6.18 | Classic と Express スコープ、Classic の暗黙既定、条件付きプロトコルモジュール | 2, 3 | #767 |
| 2.6.20 | Build & Test から Code Generation への有界な失敗戻り | 5 | #616 |
| 2.6.37 | Code Generation のレビューレシートをワークスペースのソース状態に結ぶ | 4, 6 | #646 |
| 2.6.51 - 2.6.64 | 継続カーソル、Kiro の信頼性、プラグイン拡張できる doctor 検査、ステージ妥当性レシート、ネイティブ Kiro IDE 面 | 1, 2, 4, 6 | #822, #788, #797, #716, #824 |
| 2.6.69 | Code Generation レビューレシートのユニット単位ソース帰属 | 4, 6 | #813 |
| 2.6.72 - 2.6.74 | ゲート結びの blocking センサーと、結びの品質目標検証 | 4, 6 | #836, #842 |
| 2.6.80 | スペース内の並行インテント向け、セッション単位のワークフロー紐づけ | 3, 7 | #858 |
| 2.6.87 | DocumentKB の要約とタグ | 7 | #894 |
| 2.6.105 | 独立したプラグイン create / validate / build / test ツールチェーン | 2 | #892 |
| 2.6.107 | チーム所有のユニットと、チームをまたぐ並行 Construction | 1, 3 | #879 |
| 2.6.114 | DAG なしのユニット単位レビュー継続 | 1, 4 | #947 |
| 2.6.121 - 2.6.124 | 不変のレビュアー証拠、Git に依存しないソース結び、持ち運べるワークフロー状態パス | 4, 6 | #888, #904, #962 |
| 2.7.0 | 2.6.x 周期を GA のマイナーベースラインとして集約 | 1-7 | #991, #992 |

<!-- markdownlint-enable MD013 -->

## 進行中

開いている作業の抜粋です。版の約束はしません。マージ準備は頻繁に変わるので、リンク先の PR が正です。

<!-- markdownlint-disable MD013 -->

| PR | 作業 | テーマ |
| --- | --- | --- |
| [#756](https://github.com/awslabs/aidlc-workflows/pull/756) | ネイティブ配布、6 コマンド CLI、設定方針、リリースの強化 | 導入とリリース |
| [#775](https://github.com/awslabs/aidlc-workflows/pull/775) | エージェントハーネスに揃えた統一 Kiro 配布 | ハーネスの揃え |
| [#782](https://github.com/awslabs/aidlc-workflows/pull/782) | プロダクト発見プラグイン（AI-PLC） | プラグインとプロダクト発見 |
| [#799](https://github.com/awslabs/aidlc-workflows/pull/799) | 敵対的な AI プルリクエストレビューエージェント | CI と検証 |
| [#969](https://github.com/awslabs/aidlc-workflows/pull/969) | プルリクエスト経由の Construction 統合 | デリバリの流れ |
| [#968](https://github.com/awslabs/aidlc-workflows/pull/968) | Devin CLI と Desktop ハーネス | ハーネスの拡張 |
| [#907](https://github.com/awslabs/aidlc-workflows/pull/907) | mabl 検証プラグイン | プラグインと検証 |
| [#753](https://github.com/awslabs/aidlc-workflows/pull/753) | Evaluator 統合 | 評価 |
| [#526](https://github.com/awslabs/aidlc-workflows/pull/526) | Ideation でのプロダクト発見 | プロダクト発見 |

<!-- markdownlint-enable MD013 -->

## 方向性のあるテーマ

開いている RFC、issue、実装 PR が支えていますが、リリース版はまだ決まっていません。

### トレーサビリティと段階的な enrichment

- ステージごとの上流トレーサビリティ強制は [#401](https://github.com/awslabs/aidlc-workflows/pull/401) で出荷済みです。ソース結びのレビュー証拠は [#646](https://github.com/awslabs/aidlc-workflows/pull/646)、古いステージ結果の伝播は [#716](https://github.com/awslabs/aidlc-workflows/pull/716)、ユニット単位の帰属は [#813](https://github.com/awslabs/aidlc-workflows/pull/813) です。
- ユニットをまたぐ発見の伝播は未解決です（[#299](https://github.com/awslabs/aidlc-workflows/issues/299) / [#300](https://github.com/awslabs/aidlc-workflows/pull/300)）。
- 北極星の到達点は、下流が上流の成果物をその場で段階的に豊かにすることです。ADR は中核の設計成果物です。
- コミット単位の出自はまだ設計課題です。いまの監査鎖では、任意のソースコミットからインテントとワークフローへ、耐久のある逆引きはできません。

### 統治されたフィードバックループ

- [#616](https://github.com/awslabs/aidlc-workflows/pull/616) は、[#611](https://github.com/awslabs/aidlc-workflows/issues/611) 向けに Build & Test から Code Generation への有界な戻りを出荷しました。増分のループであり、一般の循環グラフエンジンではありません。
- ステージをまたぐ一般の後方エッジには、エンジンレベルの統治、古い成果物の扱い、人の明示承認がまだ要ります。

### プラグインとマーケットプレイス

- プラグイン機構、コンテンツ投影、選択、プラグインが寄与するスコープは出荷済みです。プラグインテストキットと作成階層は [#792](https://github.com/awslabs/aidlc-workflows/pull/792) です。
- プラグイン拡張できる doctor 検査は [#797](https://github.com/awslabs/aidlc-workflows/pull/797) です。オフラインの CREATE / VALIDATE / BUILD / TEST 作成階層は、独立した `aidlc-plugin-create.ts`、`aidlc-plugin-validate.ts`、`aidlc-plugin-build.ts`、`aidlc-plugin-test.ts` として出荷しています。トップレベルの `plugin validate` と `plugin build` も出荷済みです。トップレベルの `plugin create` と `plugin test` は [#723](https://github.com/awslabs/aidlc-workflows/issues/723) で提案中です。遠隔発見、信頼、第一級のマーケットプレイス、卒業の道筋も #723 です。プロダクト発見（[#652](https://github.com/awslabs/aidlc-workflows/issues/652)、[#782](https://github.com/awslabs/aidlc-workflows/pull/782)）と設計（[#527](https://github.com/awslabs/aidlc-workflows/issues/527)）は、第一級プラグインの候補です。
- `aidlc-plugin-test.ts` は、外部プラグイン著者向けに、導入の使い捨てコピーに対して合成を試します。

### ナレッジと文書

- [#731](https://github.com/awslabs/aidlc-workflows/pull/731) は DocumentKB の最初の索引と引用スライスです。要約とタグは [#894](https://github.com/awslabs/aidlc-workflows/pull/894) で、追跡中の [#714](https://github.com/awslabs/aidlc-workflows/issues/714) RFC のそのメタデータ部分を閉じました。
- [#694](https://github.com/awslabs/aidlc-workflows/issues/694) は、ステージトポロジをまたぐインテント意識の発見と、監査できる補足ナレッジ配送を追っています。

### プロダクト発見

- コアの Ideation 配送は [#526](https://github.com/awslabs/aidlc-workflows/pull/526) でレビュー中です。外部引き渡し契約は [#586](https://github.com/awslabs/aidlc-workflows/issues/586)、プラグイン形の代替は [#652](https://github.com/awslabs/aidlc-workflows/issues/652) です。
- 配送面をコアにするか第一級プラグインにするかは、まだ決まっていません。

### 導入、アップグレード、リリース

- GA 実装といまの開発線は `main` です。以前の実装は `v1` に残ります。
- [#722](https://github.com/awslabs/aidlc-workflows/issues/722) はバイナリパッケージ、インストーラ、リリース自動化、ロールバック、導入後のセットアップです。マイルストーン 1–3 の実装は [#756](https://github.com/awslabs/aidlc-workflows/pull/756) でレビュー中です。以前の Bun 依存トラッカー [#399](https://github.com/awslabs/aidlc-workflows/issues/399) は #722 に置き換えられ、閉じました。
- [#636](https://github.com/awslabs/aidlc-workflows/issues/636) は第一級のアップグレード契約です。以前の実装 PR [#535](https://github.com/awslabs/aidlc-workflows/pull/535) はマージせず閉じました。
- [#635](https://github.com/awslabs/aidlc-workflows/issues/635) は、v2 GA の `main` と、GitHub の Latest がまだ `v1.0.1` を指しているずれです。

### ハーネスの拡張と揃え

- GitHub Copilot 対応は [#657](https://github.com/awslabs/aidlc-workflows/pull/657) で出荷し、RFC [#472](https://github.com/awslabs/aidlc-workflows/issues/472) は閉じました。
- Cursor 対応は [#661](https://github.com/awslabs/aidlc-workflows/pull/661) です。統一 Kiro 配布は [#775](https://github.com/awslabs/aidlc-workflows/pull/775) でレビュー中です。ネイティブ Kiro IDE 面は [#824](https://github.com/awslabs/aidlc-workflows/pull/824) で出荷し [#555](https://github.com/awslabs/aidlc-workflows/issues/555) を閉じ、フック matcher の強化は [#788](https://github.com/awslabs/aidlc-workflows/pull/788) です。
- Antigravity のセットアップは [#690](https://github.com/awslabs/aidlc-workflows/issues/690) で提案中です。

### 評価と運用

- [#684](https://github.com/awslabs/aidlc-workflows/issues/684) は、AI-DLC の結果を測る繰り返し可能なベンチマークです。Evaluator 作業は [#753](https://github.com/awslabs/aidlc-workflows/pull/753) で動いています。以前のハーネス評価トラッカー [#223](https://github.com/awslabs/aidlc-workflows/issues/223) は v1 では予定なしとして閉じました。
- Operation フェーズの操舵は要望として残っています（[#221](https://github.com/awslabs/aidlc-workflows/issues/221)、[#473](https://github.com/awslabs/aidlc-workflows/issues/473)）。`main` の実装ストリームではありません。

## いま分かっている隙間

- ステージ固有ルール（`aidlc-stage-<slug>.md`）は予約済みですが未実装です。
- プラグインの `when:` 評価、遠隔発見、マーケットプレイスの信頼は未解決です。
- Write 発火のセンサーは advisory のままです。ゲート結びのセンサーは blocking 重大度と、人の裏付けがあるオーバーライドを持てます。
- ステージをまたぐ一般の循環と、その場で成果物を段階的に豊かにすることは、北極星の隙間です。
- 統一 Kiro 配布は #775 でレビュー中です。
- 古いコミュニティ PR #526 は開いたままで、リベースか処分が要ります。PR #432、#535、#552、#653、#712 はマージせず閉じました。
