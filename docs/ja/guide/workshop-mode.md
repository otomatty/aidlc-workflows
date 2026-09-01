# 複数チームの Construction とワークショップ

チーム所有の Construction では、承認済みの 1 インテントから、複数の人間チームが別々のユニットを組めます。ワークショップはその仕組みの使い方のひとつです。エンジンの契約はスコープに依りません:

- `Construction Iteration: unit-major`
- `Unit Ownership: team`
- 妥当なユニット依存 DAG
- 共有の git 名前空間、または 1 つのローカル ref データベースを共有する兄弟ワークツリー

チーム所有はいま、ワークスペースルートそのものがソースの Git リポジトリであることを要求します。兄弟リポジトリ集合が記録されたインテントは、`Unit Ownership: team` を残す前に拒否されます。その複数リポジトリインテントではソロ所有を使います。

統合リードはスコープ無しの main から動きます。各デリバリーチームは、取得した 1 ユニットにスタンプされたチェックアウトから動きます。取得済みチェックアウトは、そのユニットの Construction 鎖（ステージ 3.1 から 3.5）をグラフ順にそのまま走ります。チームのキー付きレシートが監査シャードと一緒に届くので、マージのあと main はそれらのステージを再実行しません。

Workshop スコープのステージ格子と Minimal のテスト下限は [スコープ・深度・テスト戦略](05-scopes-and-depth.md#workshop) です。

---

## 役割とトポロジ

| 役割 | 責任 |
|------|------|
| **統合リード** | Inception と、要ればウォーキングスケルトンを main で回す。取得を監視し、完了した候補を固定し、マージゲートを出し、承認したユニットを着地させる |
| **ユニットチーム** | 依存が揃ったユニットを 1 つ取得し、スコープ付きの 3.1–3.5 鎖を走り、成果物／レシート／ソースをコミットし、候補を公開する |
| **レビューグループ** | ユニット側で選んだチームゲートと、main 側の固定マージゲートに答える |

同じコマンドと証拠を使うトポロジが 2 つあります。

コマンド例はハーネス非依存の公開文法です。導入したハーネスの `/aidlc` 面か、同梱の `aidlc` ディスパッチャから走らせます。例は `.claude/`、`.kiro/`、`.codex/` のツールパスを前提にしません。

### チームごとにクローン

各チームが共有リモートをクローンします。取得の調整と候補の公開は `refs/heads/claim/<intent-id8>/<unit>` を使います。

```bash
git clone <shared-remote> payments-team
cd payments-team
git fetch --all
aidlc unit claim payments --team "Payments team"
```

### 兄弟ワークツリー

1 つのリポジトリが兄弟ワークツリーを作ります。リモートが無いときだけ、取得は原子的な `git update-ref` で共有のローカルブランチ名前空間を使います。`origin` があるときは、兄弟ワークツリーも別クローンと同じリモート付き取得です。1 台のマシンと決定論的なテスト向きです。リモートを外すのは、演習全体を意図してローカル／オフラインにするときだけです。

```bash
# From unscoped main:
# Optional local-only mode: git remote remove origin
aidlc worktree create --slug payments --base main
cd .aidlc/worktrees/bolt-payments
aidlc unit claim payments --team "Payments team"
```

そのワークツリーから、下の同じスコープ付きビルドと `publish` を走らせます。main が候補を着地させて push したあと、main に戻り、終わったローカルワークツリーを `aidlc worktree discard --slug payments` で捨てます。

通常のスコープ付き `next`、ライフサイクル、レビュー、ゲート作業はオフライン優先です。ネットワークは、明示の取得、公開、status、固定、マージ ref の検証に限ります。

---

## Construction の準備

統合リードが Inception を完了します。含むものは次です:

1. 権威あるユニット DAG
2. `Construction Iteration: unit-major`
3. `Unit Ownership: team`
4. チームゲートのリズム。`per-stage` か `unit-end`
5. 確認したブランチ戦略

スコープが `skeleton: on` を記録しているとき、DAG の最初のユニットがウォーキングスケルトンです。取得が開く前にスコープ無しの main で走り、マージバックゲートは要りません。`skeleton: off` なら、依存が揃ったユニットがすぐ開きます。

チームが取得する前に、承認した Inception の状態と成果物を公開します:

```bash
git push origin main
```

取得は依存バッチごとに開きます。「Delivery Planning が終わった」は、どのユニットも取得できる、ではありません。`depends_on` の行が全部マージされるまで、そのユニットはブロックのままです。

---

## 取得、実装、公開

### 1. 取得

参加者のクローンで:

```bash
git fetch --all
aidlc unit participate
```

案内付きピッカーは `/aidlc`、直接取得するなら:

```bash
aidlc unit claim payments --team "Payments team"
```

同時の取得者はちょうど 1 人だけ勝ちます。コマンドはチェックアウトにスペース、インテント、ユニット、世代、nonce、ゲートリズムをスタンプします。

同じ試行を別マシンの同僚に渡すときは、取得 ref を push します。同僚は fetch し、ローカルの `claim/<intent-id8>/<unit>` ブランチをそのまま checkout してから、次を走らせます:

```bash
aidlc unit adopt payments
```

引き継ぎは、checkout したペイロードを生きている ref と突き合わせ、取得に紐づいた監査シャードを保つので、同僚は後継の試行を作らずに再開して公開できます。

### 2. 実装

取得済みチェックアウトで `/aidlc` を走らせます。エンジンはスタンプされたユニットだけを回します:

1. Functional Design (3.1)
2. NFR Requirements (3.2)
3. NFR Design (3.3)
4. Infrastructure Design (3.4)
5. Code Generation (3.5)

Code Generation 中の Plan Approval は必須のままです。

ゲートリズムがチームレビューの地点を決めます:

- `per-stage`: 落ち着いた `(stage, Unit)` ごとにゲート 1 回
- `unit-end`: 3.5 のあとにチーム完了ゲート 1 回
- どちらのリズムでも、main 側の固定マージゲートが 1 回足されます

完了した成果物、ソース、状態の鏡、監査シャードをコミットします。公開には、追跡ファイルがきれいなチェックアウトが要ります:

```bash
git add -A
git commit -m "Complete payments Unit"
aidlc unit publish payments
```

`publish` は、チームがコミットした仕事をツリーにし、親が取得履歴と実装履歴の両方を結ぶ候補コミットを作ります。取得 ref を CAS 更新します。公開は統合ではありません。

---

## 固定、ゲート、着地

マージ系のコマンドはすべて、スコープ無しの main から走らせます。

### 1. 候補を固定する

```bash
git fetch --all
aidlc unit pin payments
```

固定は、候補 OID と試行世代を 1 組だけ記録します。証拠は git オブジェクトの plumbing で読みます。マージもワークツリー作成もしません:

- 必須のユニット成果物
- 対象ステージの `UNIT_COMPLETED` レシート
- 取得リズムでのチームゲート承認
- 必須レビュアーの `READY` 判定
- Plan Approval の指紋と明示の承認
- 候補の状態行
- 運べるチーム監査シャード

**信頼モデル。** 取得に紐づいたチームシャードは、そのチーム自身の試行キー付き `UNIT_COMPLETED`、チームゲート、レビュアーレシートを運べます。それらはチームの主張です。固定は必須成果物と指紋を再検証し、残りの信頼は人が固定マージゲートで見ます。チームシャードは `HUMAN_TURN`、`MERGE_DISPATCH_*`、`UNIT_MERGED`、ユニットマージゲート、別ユニットのレシート、別の／新しい監査シャードを運んではいけません。固定と着地は、取得したユニットのサブツリーの外にあるワークフロー記録の変更も拒みます。ユニットのレコードツリーの外にあるプロダクトソースのパスは、人が重なりを判断できるよう、ゲート証拠には見えたままです。

取得がリリース／再取得された、または固定のあと ref が動いたときは、ゲートと着地のコマンドは拒否します。`pin` をやり直し、新しい OID を明示でレビューします。レジストリに届かないときは、固定が tombstone になっていないことを証明できないので、ゲートと着地は閉じて失敗します。

### 2. マージゲートを出す

ゲートの前に、ハーネスは既存のマージディスパッチ継ぎ目を辿ります。`MERGE_DISPATCH_INVOKED` を出し、pipeline-deploy エージェントにアクティブなプラクティスから確認済みの対象／戦略を解かせ、`MERGE_DISPATCH_RETURNED` か `MERGE_DISPATCH_FALLBACK` を出します。固定 OID、ユニット試行世代、固定トランザクション ID は、ディスパッチイベントの呼び出しすべてに `--pinned-oid`、`--attempt-generation`、`--pin-id` で渡します。ゲートは紐づいていない行や古い行を無視します。同じ候補の前の固定からの括りもです。その括りが終わるまでゲートは出ません。固定ユニットの着地は戦略 `merge` を要求します。レビューした OID が直接の親になるためです。squash / rebase の結果は拒否され、ゲートの前に揃える必要があります。

統合リードは証拠の要約と固定 OID を人に出し、正確な答えを残します:

```bash
aidlc unit gate payments \
  --decision approve \
  --user-input "Approve pinned candidate"
```

拒否すると候補は未マージのままです。`Merge-Held: true` を持つ候補は、チームが HOLD-MERGE 手順を解き、再度公開し、main が再固定するまで拒否されます。

### 3. 着地

```bash
aidlc unit land payments --target main
```

着地は順序付きで、途中から再開できます:

1. **先に git の中身。** 統合ブランチを再 fetch し、承認したユニット DAG、ユニット種別、対象ステージ列、証拠がまだ今のものだと確認してから、固定 OID をマージします。契約のドリフトは変更の前に拒否し、rebase、再公開、再固定、新しいマージゲートが要ります。main の `aidlc-state.md`、ランタイムグラフ、カーソル、エンジンマーカは残し、チームの新しい監査シャードとユニットごとの成果物／ソースが着地します。本物のソース衝突は、きれいなチェックアウトに戻してファイルを列挙します。共有ファイルの自動マージがきれいに見えても、結果が固定候補と違うなら拒否し、rebase して再公開します。この時点ではユニット行はまだ畳まれていません。
2. **状態の畳み込み。** インテント単位のロックの下で、候補が運んできたレシートを導き、main のシングルトンと他行を保ったままマージ済みユニット行を書き、`UNIT_MERGED` を出します。
3. **監査／確定。** main の状態とマージライフサイクル行をコミットし、ローカルトランザクションを完了と印します。

復旧ではステップを分けて駆動できます:

```bash
aidlc unit land payments --step git
aidlc unit land payments --step state
aidlc unit land payments --step audit
```

各ステップは冪等です。`merge-status` がローカルトランザクションを出します:

```bash
aidlc unit merge-status payments
```

着地した対象ブランチを push し、他チームと今後の取得検査が新しい統合状態を見るようにします:

```bash
git push origin main
```

依存側は、マージ済み行から取得できるようになります。最後の行がマージされたあと、ユニットごとのブロックが落ち着き、main はソロ Construction と同じく Build and Test (3.6)、続けて CI Pipeline (3.7) へ回します。

---

## ディスパッチャ、status、健全性検査

スコープ無しの main では、チームのファンアウトが生きているあいだ `/aidlc` はターン終端のディスパッチャです。決定論的なボードを原文のまま 1 枚出します:

- Unit Progress。オーナー、ステージ／ゲートのセル、マージ済み状態
- ローカルの取得スキャン。オーナー、試行世代、**観測した ref の動き**（git refs に push 時刻は無い）
- マージゲート待ち、または着地復旧待ちの固定候補
- 取得できるユニットと、依存でブロックされているユニット

同じボードの読み取り専用スナップショットは、main でもスコープ付きチェックアウトでも `/aidlc --status` です。fetch せず、状態もキャッシュも監査行も書きません。明示のスペース／インテントセレクタが、status ヘッダ、ユニット DAG、取得、マージジャーナルを 1 つの身元に揃えます。ボードは次の取得、ゲート、または `aidlc unit land` の復旧コマンドを名前で出します。いま取得できるユニットが無い参加者には、main のソロウォークへ落ちず、この終端ボードが出ます。リリース済みの取得履歴だけではファンアウトは生きません。生きている取得も未完了のマージトランザクションも無くなったとき、main は通常の Construction ウォークに戻ります。

新しいクローンにインテントが複数あり、アクティブインテントのカーソルが無いとき、ピッカーは混在したチームワークスペースに `team construction, 2 units claimable`、`parked at code-generation`、`complete` のような状態を付けます。単一インテントと非チームのピッカー文言は変わりません。

`/aidlc --doctor` はローカルだけの取得突合せを足します:

- リリース／置き換え済みの試行なのにチェックアウトスタンプが残っているのは、直し必須の古いスタンプ所見
- 生きている取得に既知の観測時刻があり、ref の動きが 24 時間無いのは異常。リリースは人の明示判断のまま
- 観測時刻の無いアップグレード前キャッシュは、誤った無活動所見ではなくベースラインの助言
- インテント id がローカルに無い取得 ref は孤立所見

doctor は fetch も取得のリリースもしません。

---

## リリース、サルベージ、再開

チームが終えられないときは、統合リードがスコープ無しの main から取得をリリースします:

```bash
aidlc unit release payments
```

リリースは世代を上げる tombstone を公開します。古いレシートは履歴として残りますが、後継やマージの権限にはなりません。使えるソース／成果物は、後継が新しく取得したチェックアウトへ cherry-pick かコピーで残します。

狭い競合には明示の復旧があります。レビューしたマージコミットがすでにローカルへ着地し（`land --step git`）、その正確な試行がそのあとリリースされたときは、着地コミットを見て、畳み込む前に人の確認を残します:

```bash
aidlc unit land payments --accept-released-attempt \
  --user-input "I inspected the landed commit and accept completing this tombstoned attempt"
```

受け付けるのは、固定 OID が直前の tombstone の前任である場合だけです。状態の畳み込みより前で、後継の取得には使いません。ジャーナルと main の監査が tombstone と確認を残します。

以前のリリース／再取得のあと、意図した 2 回目のリリースは今の nonce に結びます:

```bash
aidlc unit status
aidlc unit release payments --expect-nonce <nonce>
```

取得済みチェックアウトは、ローカルのスタンプとディスク上の証拠から、ネットワーク無しで再開します。同僚の新しいチェックアウトは、正確な取得ブランチで一度 `aidlc unit adopt <unit>` が要ります。取得、引き継ぎ、公開、固定の前に pull / fetch します。通常のスコープ付き `/aidlc` 再開にレジストリは要りません。

---

## 2 日ワークショップの通し

### 1 日目

1. 進行役がグループと Inception を走る。
2. 有効なら、進行役がウォーキングスケルトンを main で組み、ゲートする。
3. Alice が `billing` を取得し、Bob が `notifications` を取得する。
4. 各チームがスコープ付きの 3.1–3.5 鎖とチームゲートを走る。
5. 各チームがコミットし、`aidlc unit publish` を走らせる。

### 2 日目

1. 進行役が Alice の候補を固定し、証拠をレビューし、マージゲートを残し、着地させる。
2. main を push する。`billing` に依存するユニットが取得できるようになる。
3. 進行役が Bob の固定候補に対して pin / gate / land を繰り返す。
4. 最後の行がマージされたら、main の `/aidlc` は Build and Test、続けて CI Pipeline へ回す。
5. グループが結合した監査シャードで `UNIT_MERGED`、ゲート、レビュアー、マージディスパッチの行を見る。

チームが main へ先に push し合うことはありません。候補 ref が動くのは取得に紐づいた CAS 公開だけです。main はレビューした固定 OID を直列にします。

---

## 関連する章

- [CLI コマンド](12-cli-commands.md) — claim、publish、pin、gate、land
- [状態と監査](10-state-and-audit.md) — クローンごとのシャードとマージ済みレシートの下限
- [Construction](../reference/04-stages/construction.md) — unit-major の経路とゲートリズム
- [ランタイムグラフ](../reference/13-runtime-graph.md) — ソロ／スウォームのボルトマージ経路（別物）
- [Branching Strategies](../../core/knowledge/aidlc-pipeline-deploy-agent/branching-strategies.md) — マージディスパッチの戦略選択
