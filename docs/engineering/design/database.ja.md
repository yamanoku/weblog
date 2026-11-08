# データベース設計

[English](database.md)

## このドキュメントについて

この設計は、[weblog.yamanoku.net](../../products/weblog/product.ja.md) の一つの D1 にあるテーブルを挙げる。エントリの行は [所有者の書き込み](../../products/weblog/features/owner-writing/requirements.ja.md) に残る。公開の読み取りは [公開閲覧](../../products/weblog/features/public-reading/requirements.ja.md) に残る。配送の行は [ActivityPub](../../products/weblog/features/activitypub/requirements.ja.md) に残る。取り込みの列は [Cosense からの取り込み](../../products/weblog/features/cosense-import/requirements.ja.md) に残る。[移設](../../products/weblog/features/relocation/requirements.ja.md) はテーブルを足さない。

### 対象読者

このデータベースを作る人と、その作業を引き受けるエージェント。

### 前提知識

保存の第一アダプタを D1 とする、というプロダクトの規則。上の要件。

### このドキュメントで扱わないこと

- 問い合わせのライブラリ。保存アダプタは `void/db` を使う。この文書は、別のライブラリを選ばない。
- HTTP の経路と、フィードの文書。
- 見た目。
- アクターの秘密鍵。これは Worker の秘密である。列ではない。

## 実装方針

D1 は一つである。この設計は、二つ目のデータベースを足さない。下の一覧を超える列も足さない。保存アダプタは、一つの `batch()` で確定する。失敗した batch は、その batch の変更を残さない。

エントリ機能が保存する時刻は、UTC の ISO 8601 文字列である。例外は `source_updated_at` である。これは Unix 秒である。エントリの ID は、小文字の UUID である。batch の前に、Worker の中で選ぶ。

## アーキテクチャ・シーケンス図

図は要らない。下の節がスキーマである。図を足しても、名前は増えない。

## データモデル・ER 図

`entries` は、辺と過去タイトルと移転の親である。`delivery_records` と `tombstones` は、エントリの行が消えたあとも残る。外部キーの削除連鎖では消さない。辺と過去タイトルは、削除の batch の明示的な文で消す。`followers` から活動やジョブへの外部キーは無い。`entries` から活動やジョブへの外部キーも無い。`gyazo_objects` から `entries` への外部キーは無い。画像 ID は、本文のテキストから取る。

### `entries`

列の前半は `id`、`kind`、`title`、`body`、`visibility`、`bookmark_url`、`published_at` である。続く列は `cosense_page_id`、`created_at`、`updated_at`、`view_path`、`last_imported_body`、`source_updated_at` である。返信の列は `in_reply_to_id` と `thread_root_id` である。

`id` は主キーである。`kind` は article、note、bookmark、page のいずれかである。`visibility` は draft か public である。`view_path` は一意である。NULL の行は複数あってよい。`cosense_page_id` は一意である。NULL でもよい。所有者の HTTP API は、`cosense_page_id` を受け付けない。所有者の更新 SQL は、その列を書かない。

`last_imported_body` と `source_updated_at` は NULL でもよい。書くのは、取り込みの確定だけである。`source_updated_at` は Unix 秒の整数である。`updated_at` ではない。

`in_reply_to_id` と `thread_root_id` は NULL でもよい。どちらにも外部キーは無い。他の note への返信ではない note は、両方を NULL のままにする。返信は、選んだ note の id を `in_reply_to_id` に入れる。選んだ note に `thread_root_id` があるときはその値を入れ、無いときは選んだ note の id を入れる。一つの note を削除しても、他の行のこれらの列は変えない。

### `edges`

列は `source_id`、`written_title`、`target_id` である。`target_id` は NULL でもよい。索引は `source_id` と `written_title` にある。

### `past_titles`

列は `entry_id`、`title`、`recorded_at` である。主キーは `entry_id` と `title` である。`title` には索引がある。

### `path_redirects`

主キーは `path_key` である。行は `entry_id` を持つ。

### `owner_token`

テーブルは常に一行である。列は `hash` と `issued_at` だけである。保存する値は、CLI トークンの SHA256 ハッシュである。

### `delivery_records`

主キーは `entry_id` である。ActivityPub は、Create のジョブを確定するときに行を入れる。種類、公開状態、削除では消さない。所有者の書き込みは、この行を入れない。

### `tombstones`

列は `entry_id` と `deleted_at` である。本文の列は無い。配送済みのエントリを削除するときだけ入れる。

### `gyazo_objects`

列は `image_id`、`extension`、`object_key` である。`extension` は小文字である。ドットは含まない。`object_key` は、書き出しディレクトリの名を含む。主キーは `image_id` と `extension` である。公開の要求は、このテーブルを書かない。エントリの書き込み batch にも入らない。

読み取り用の索引は、次の三つである。一意な `view_path` は置き換えない。辺と過去タイトルの索引も置き換えない。

- `entries_feed` は `(kind, published_at, id)` である。条件は `visibility = 'public'` かつ `published_at` が NULL でないことである。
- `entries_titles` は `(updated_at, id)` である。条件は `visibility = 'public'` かつ `title <> ''` である。
- `entries_thread` は `(thread_root_id, created_at, id)` である。

### 配送

- `activities` の列は `id`、`type`、`entry_id`、`object_id`、`published_at` である。`id` は活動 URL である。主キーでもある。`type` は `Create`、`Update`、`Delete`、`Accept` のいずれかである。Accept の `entry_id` は NULL である。outbox の索引は、`published_at` の降順、その次に `id` の降順である。
- `delivery_jobs` の主キーは `activity_id` である。行があるとき、送信は終わっていない。成功すると行を消す。
- `delivery_targets` の列は `activity_id`、`actor_id`、`inbox_url`、`sent_at` である。主キーは `activity_id` と `actor_id` である。`inbox_url` は、取得が成功するまで NULL でもよい。`sent_at` は、その宛先を送るか飛ばすまで NULL である。ジョブの成功は、これらの行を消す。
- `followers` の主キーは `actor_id` である。ほかの列は `inbox_url`、`follow_activity_id`、`created_at` である。`inbox_url` と `follow_activity_id` は NULL でもよい。送信元一人が一行である。Undo はその行を消す。活動は消さない。
- `queue_op_tally` の主キーは `utc_date` である。値は UTC の `YYYY-MM-DD` である。整数の `operations` を持つ。
- `kv_write_tally` の主キーは `utc_date` である。整数の `writes` を持つ。

### 取り込み

`import_walk` は一行である。主キーは定数 `yamanoku` である。`last_completed_page_id` は NULL でもよいテキストである。`finished` は 0 か 1 である。行が無いときは、カーソルが NULL の未完了の走査として読む。

`import_write_tally` の主キーは `utc_date` である。値は UTC の `YYYY-MM-DD` である。整数の `rows_written` を持つ。

エントリを削除すると、その行のページ ID と写しとソース時刻も消える。走査の行は残る。

## API・インターフェース

追加は無い。所有者の一覧と一件は、`entries` に残る行だけを返す。tombstone は、編集できるエントリではない。

## 外部サービスとの連携方式

データベースは、一つの D1 バインディングである。この文書は、ほかのデータベース製品を足さない。

## データの取り扱い設計

`entries` に保存する本文は、プレーンテキストである。HTML は保存しない。`tombstones` は本文を写さない。`delivery_records` と `tombstones` は、エントリの行が消えたあとも残る。`gyazo_objects` は、所有者のコマンドが手元の一覧から入れる。閲覧者は書かない。

## 認証認可に関する特記事項

`owner_token` が保存するのはハッシュだけである。トークンの値は、発行の応答で一度だけ返す。ログには書かない。公開応答にも書かない。

## セキュリティ上の留意事項

アクターの秘密鍵は、公開の SQL では選ばない。公開 HTML は、配送のテーブルを読まない。`owner_token` も読まない。`cosense_page_id` も読まない。

## デプロイに関する特記事項

最初のデータベースは、上のテーブル以外は空である。`gyazo_objects` は空で始めてよい。`followers` も空で始めてよい。この文書の中に、既存サイトからの移行は無い。移設はテーブルを足さない。

## 検討した代替手段

### 二つ目の D1

配送と画像は、エントリの batch から離れる。一つの確定が、エントリと配送ジョブを一緒に残せなくなる。保存先は一つの D1 のままである。

### 画像からエントリへの外部キー

画像 ID は、本文の中のテキストである。外部キーは、行に無い関係を作る。`gyazo_objects` は分けたままである。

### 配送の行を削除連鎖で消す

配送済みの削除は、あとから 410 を返す必要がある。連鎖は `delivery_records` と `tombstones` を消す。それらの行を消すのは、名前を挙げた文だけである。

## 未決事項

このスキーマを止める未決は無い。
