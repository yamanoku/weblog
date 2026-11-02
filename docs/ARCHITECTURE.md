# weblog.yamanoku.net のアーキテクチャ

この文書は、移した振る舞いの正本へのリンクと、まだ仕様に書いていない事実と、未決を残す。移した振る舞いの正本は、リンク先の Product、Requirements、Design である。未決は、下の「未決定事項」の各文が、まだ決めていないと書く。

読者は、このあと実装する yamanoku と、その作業を引き受けるエージェントである。

## 移した決まり

次の文書が、移した振る舞いの正本である。

### プロダクト

目的、利用者、提供価値は [weblog.yamanoku.net](products/weblog/product.ja.md) にある。英語版は [product.md](products/weblog/product.md) である。

このリンク先には、次も書いてある。

- ゼロ円に収めること
- 公開後のホスト名を変えないこと
- 取り込みページを自動では分類しないこと
- 過去ページを一括では配送しないこと
- 署名の CPU が無料枠を定常的に超えたあとの選択が未決であること

### 所有者の書き込み

種類、タイトル、本文、公開状態、配送対象、`publishedAt`、辺の抽出、正規 URL、閲覧用パス、ブラウザと CLI の資格は、次の文書にある。

- [要件](products/weblog/features/owner-writing/requirements.ja.md)
- [設計](products/weblog/features/owner-writing/design.ja.md)
- 英語の [requirements.md](products/weblog/features/owner-writing/requirements.md)
- 英語の [design.md](products/weblog/features/owner-writing/design.md)

### 公開閲覧

人間向けの HTML、Atom、JSON Feed、タイトル一覧、空ページ、Gyazo のバイト列は、次の文書にある。

- [要件](products/weblog/features/public-reading/requirements.ja.md)
- [設計](products/weblog/features/public-reading/design.ja.md)
- 英語の [requirements.md](products/weblog/features/public-reading/requirements.md)
- 英語の [design.md](products/weblog/features/public-reading/design.md)

### Cosense からの取り込み

公開プロジェクトからの取り込み、再実行、ローカル編集の報告は、次の文書にある。

- [要件](products/weblog/features/cosense-import/requirements.ja.md)
- [設計](products/weblog/features/cosense-import/design.ja.md)
- 英語の [requirements.md](products/weblog/features/cosense-import/requirements.md)
- 英語の [design.md](products/weblog/features/cosense-import/design.md)

### ActivityPub

WebFinger、アクター、inbox、outbox、フォロワー、Follow、Create、Update、Delete は、次の文書にある。

- [要件](products/weblog/features/activitypub/requirements.ja.md)
- [設計](products/weblog/features/activitypub/design.ja.md)
- 英語の [requirements.md](products/weblog/features/activitypub/requirements.md)
- 英語の [design.md](products/weblog/features/activitypub/design.md)

## まだ仕様に書いていない決まり

この節は、上の文書に書いていない決まりである。未決は、ここには書かない。

### 無料枠の数値

各機能の設計が参照する制限に、次の数はまだ書いていない。出典の日付は、この文書が読んだ日のまま残す。

- Workers Paid は、利用が無くても月額 5 ドルである。出典は 2026-10-02 更新の Workers 料金である。測定の前に、このプランは契約しない。
- D1 の無料枠は、1 日 500 万行の読み取りと、アカウント合計 5 GB を含む。出典は D1 の料金ページである。
- [D1 の制限](https://developers.cloudflare.com/d1/platform/limits/) は、Free の 1 回の実行につきクエリ 50 と書く。欄の名前は、読み取りサブリクエストの上限でもある。更新日は 2026-10-30 である。
- KV の無料枠は、1 日 10 万回の読み取りを含む。1 日 1000 回の書き込みは、ActivityPub の要件にある。
- R2 の読み取りは Class B である。無料枠は、Class A が月 100 万回、Class B が月 1000 万回、保存が月 10 GB である。
- 2026-11-01 のローカル展開は 26.3 GiB だった。請求上の使用量は、まだ測っていない。同じ image id は、一つのディレクトリだけにあった。複数の拡張子を持つ image id は 243 だった。ファイルの無い metadata は 2 件だった。ファイル数 15686 は、公開閲覧の設計にある。
- カスタムドメインは、Free プランのゾーンへ付ける。2026-10-02 の料金ページには、追加料金が書かれていない。2026-10-29 の制限ページにも、追加料金は書かれていない。上限は、ゾーンあたり 100 件である。ゾーンは Free プランのままである。Pro 以上のゾーンプランは契約しない。
- Durable Objects は、初版で使わない。Workers Free でも、SQLite 付きは作れる。起動している間の経過時間には、1 日 13,000 GB-s の枠がある。このアプリは一人分の関係データであり、オブジェクトを起こし続ける理由が無い。ActivityPub の設計は、初版で使わないことだけを書いている。
- Access の席が 50 まで追加料金が無いことは、所有者の書き込みの要件にある。2026-10-17 の Cloudflare Community では、Free プランは席数で頭打ちになると説明されている。Log Explorer などの有料追加は、明示的なアップグレードが無い限り課金されない。支払い情報の入力を求められても、Free を選んだ組織は課金されない。その手順の更新日は 2026-10-12 である。
- [Workers の制限](https://developers.cloudflare.com/workers/platform/limits/) は、認証や大きな JSON の解析が 10 から 20 ms 程度になることがあると書く。更新日は 2026-10-29 である。inbox か消費者が繰り返し `exceededCpu` になる処理は、無料枠では実行できない。
- Workers Logs は、2026-12-01 から Observability の料金へ移る。移るという記載は、2026-10-02 更新の料金ページにある。移行後の単価は、まだ確認していない。ActivityPub の設計は、古いログに依存しないことと、Logpush を使わないことを書いている。
- DNS の提供元は、ホスト名がアプリの HTTPS へ解決する限り差し替えられる。アクターのドメインをホスト名に固定することは、Product が公開後のホスト名を変えないと書くことと同じである。

### 取り出しと移設

所有者が取り出せる項目は、次のとおりである。これを復元できることは、保存方式の採否条件であると決めた。

- エントリの不変 ID
- 種類
- 現在のタイトル
- 過去のタイトル
- 本文
- 公開状態
- 時刻
- Cosense のページ ID
- 辺
- フォロワーのアクター URL
- 配送済み活動の ID
- アクターの秘密鍵

秘密鍵を公開応答とリポジトリへ出さないことは、ActivityPub の設計にある。

実行場所を移すときは、上の項目と秘密鍵を新しい実行場所へ復元する。同じホスト名の HTTPS を向ける。ホスト名を捨てる移行は、既存フォロワーとの参照を切る。Gyazo の元 URL が非公開や失効になっても、バケット `gyazo-archives` の実体は残る。移すときは、このバケットも移す。

### ポート

初版で分けるポートは、次のとおりである。一つの仕様には、この一覧をまとめて書いていない。各機能の設計が、自分の使うポートを書く。ドメインのコードは、Cloudflare の SDK、特定の ORM、Fedify の型を import しない。

- エントリ保存
- リンク保存
- フォロワー保存
- 配送キュー
- 鍵保管
- ブラウザ認証
- CLI 認証
- リンク抽出
- 描画
- 画像取得

CLI は、本文のファイルを受け取って、作成、更新、公開、削除、取得、一覧を呼べる。書き込み API が受ける項目は、所有者の書き込みの要件にある。

### 退けた案

比較の条件は、次のとおりである。

- 一つのホストで公開閲覧できる
- タイトルで双方向に辿れる
- リモートフォローできる
- 更新できるのは所有者だけで、経路はブラウザと CLI である
- アダプタを差し替えられる
- 実行費用をゼロ円に収める
- Cosense の本文とリンクを取り込める
- 過去ページをフォロワーへ一括配送しない

最後の二つは Product にある。ORM を決めないことは、未決定事項に書く。

退けた案は、次のとおりである。

- archives.yamanoku.net の静的生成を広げる案は採らない。閲覧とフィードには足りる。inbox、署名、フォロワーへの配送、ブラウザと CLI からの同時更新には、要求を受けるサーバが要る。このサイトは Astro で生成した静的アーカイブである。静的ファイルでは inbox と同時更新を持てないことは、Product にある。
- Cosense を正本のまま埋め込む案は採らない。この判断は Product にある。
- 既存の Mastodon や Misskey へ投稿する案は採らない。リモートフォローは満たせる。記事、ブックマーク、未作成タイトルへの双方向リンクを、一つの行テキストから出せない。
- タイトル文字列を ActivityPub の ID にする案は採らない。リネームでリモートの参照が切れる。不変 ID と閲覧用パスを分ける。この分け方は、所有者の書き込みの要件にある。
- 連合の契約を後から足す案は採らない。公開 URL と活動 ID の形は、先に固定しないと後からホスト全体が変わる。実装の順番は、この文書の決まりにしない。
- Workers Paid を最初から契約する案は採らない。月額 5 ドルは、利用が無くても発生する。配送の遅れは、無料枠の翌日送りで吸収する。10 ms を定常的に超えたあとの選択は、未決定事項である。

### 受け入れる差

次は、初版で受け入れると決めた差である。

- Mastodon 系のクライアントは、Article を Note より弱く表示することがある。初版はこの差を受け入れる。article を Note として重ねて送らないことは、ActivityPub の要件にある。表示が不足するかは、公開後に実クライアントで確認する。確認の前に、Note へ変えることは決めていない。
- bookmark の受信側のリンクプレビューは、その URL に任せると決めた。Note にその URL のリンクを含めることは、ActivityPub の要件にある。
- Fedify の Workers 公式例が示す範囲は、Follow の Accept と Undo(Follow) までである。例は、ブログ全体の実装ではない。アダプタとして採る条件は、ActivityPub の設計にある。

## 未決定事項

この節の各項目は、まだ決めていない。文面だけで、未決だと分かるように書く。初版で既に決めた扱いと、まだ決めていない部分は、文を分ける。

フロントエンドのフレームワークは未決である。どの製品にするかは、まだ選んでいない。

ORM は未決である。どのライブラリにするかは、まだ選んでいない。保存の第一アダプタは D1 と決めた。D1 の 500 MB、1 日の行数、1 回 50 クエリを超える ORM は採らないと決めた。Product は、この目的ではフレームワークと ORM を決めないと書いている。

リンク以外の Cosense 記法を HTML にする順序は未決である。初版は、装飾、アイコン、表、コードブロック、数式をソースのテキストのまま見せると決めた。順序を決めるのは、その描画の Requirements を書くときである。それまでは順序を決めない。同じ未決は、[公開閲覧の要件](products/weblog/features/public-reading/requirements.ja.md) にある。

ローカル編集のあとで、より新しい Cosense の本文を採る手順は未決である。所有者が手順を決めるまでは、ページ ID を報告し、ローカルの本文と辺を残すと決めた。本文の差が残るあいだ、新しいソースの本文は取り込まない。同じ未決は、[取り込みの要件](products/weblog/features/cosense-import/requirements.ja.md) にある。

Cosense の画面上のリンク範囲と、抽出規則が違ったときの扱いは未決である。決まるまでは、所有者の書き込みにある抽出規則で辺を作ると決めた。違いが無いと決まったわけではない。同じ未決は、[所有者の書き込みの要件](products/weblog/features/owner-writing/requirements.ja.md) にある。

取り出しファイルの物理形式は未決である。どの形式にするかは、保存方式を決めるときに決める。取り出せる項目と、復元できることが採否条件であることは、上で決めた。

Access を外したあとのブラウザ認証の方式は未決である。パスキーは候補として挙がっているだけで、採用とは決めていない。初版のブラウザ側は Access と決めた。CLI トークンの規則は変えない。置き換え先を別に決めることは、[所有者の書き込みの要件](products/weblog/features/owner-writing/requirements.ja.md) にある。

HTTP 署名の生成または検証が、無料枠の 1 回あたりの CPU 時間を定常的に超える場合に、計算量を減らすか、有料プランを採るかは未決である。測定で定常的に超えると分かるまで、有料プランは契約しない。同じ未決は、[Product](products/weblog/product.ja.md) の未決事項にある。

Workers Logs の 2026-12-01 以降の単価は、まだ確認していない。金額は、確認できるまでこの文書に書かない。

Gyazo バケット `gyazo-archives` の請求上の使用量は、まだ測っていない。展開の 26.3 GiB は、上に書いたローカルの大きさであり、請求額ではない。
