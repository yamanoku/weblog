# Cloudflare のサービス

[English](cloudflare.md)

## このドキュメントについて

この設計は、[weblog.yamanoku.net](../../products/weblog/product.ja.md) が使う予定の Cloudflare のサービスと、使わないものを挙げる。書き込みは [所有者の書き込み](../../products/weblog/features/owner-writing/requirements.ja.md) に残る。公開のバイト列は [公開閲覧](../../products/weblog/features/public-reading/requirements.ja.md) に残る。配送は [ActivityPub](../../products/weblog/features/activitypub/requirements.ja.md) に残る。取り込みは [Cosense からの取り込み](../../products/weblog/features/cosense-import/requirements.ja.md) に残る。ホストの移動は [移設](../../products/weblog/features/relocation/requirements.ja.md) に残る。

### 対象読者

このアカウントを用意する人と、その作業を引き受けるエージェント。

### 前提知識

Workers Free、カスタムドメイン、DNS の提供元についてのプロダクトの規則。上にリンクした要件。

### このドキュメントで扱わないこと

- 画面のパッケージと、バックエンドのパッケージ名。
- 経路の割り当てと、フィードの文書。
- 見た目。
- 画像バケットの請求上の大きさ。公開閲覧は、それを未測のままにする。

## 実装方針

このアプリが使うサービスは、次のとおりである。ほかの Cloudflare 製品は足さない。アプリ自身は、有料プランへ移らない。

Cloudflare Worker は一つである。プランは Workers Free である。ホスト名は `weblog.yamanoku.net` である。公開は `void deploy --platform cloudflare` である。二つ目の Worker は置かない。

Cron Trigger は一つである。式は `0 * * * *` である。この Worker 上で、ActivityPub の配送に使う。Cosense からの取り込みは、Cron Trigger を登録しない。移設も登録しない。

保存の第一アダプタは D1 である。D1 は一つである。

Workers KV のバインディング `KEY_CACHE` は、リモートの公開鍵を短時間だけ置く。フォロワーの正本ではない。ジョブの正本でもない。

Queues のバインディング `DELIVERY_QUEUE` は、配送ジョブを運ぶ。

既存の R2 バケット `gyazo-archives` は読む。複製はしない。月 10 GB を超える保管は、ゼロ円の対象外である。バケットは使い続ける。

Cloudflare Access は、Zero Trust の Free プランである。対象は `/edit` と `/edit/*` だけである。有料の追加機能は切ったままである。

カスタムドメインは、Free プランのゾーンへ付ける。DNS の提供元は差し替えられる。ホスト名の HTTPS は、このアプリへ解決したままである。

Workers Web Crypto は、この Worker の実行時 API である。契約する二つ目の製品ではない。自前の署名は、これを使う。

## アーキテクチャ・シーケンス図

図は要らない。上の一覧がアカウントである。図を足しても、名前は増えない。

## データモデル・ER 図

無し。この設計は、表を足さない。列も足さない。

## API・インターフェース

追加は無い。各サービスは、要件が既に名付けたバインディングか経路を保つ。

## 外部サービスとの連携方式

使うサービスは、実装方針の一覧である。枠は、プロダクトと上の要件に残す。この文書は枠を足さない。

## データの取り扱い設計

D1 が保存先である。KV に置くのは、リモート鍵の短時間の写しだけである。キューが運ぶのは、ジョブの識別子である。R2 が持つのは、既存の画像のバイト列である。アクターの秘密鍵は Worker の秘密である。新しい製品ではない。

## 認証認可に関する特記事項

初版のブラウザログインは Access である。パスキーは、ブラウザのログインではない。Access を外したあとの方式は、所有者の書き込みの未決のままである。所有者が決めるまで、Access は残す。

## セキュリティ上の留意事項

ドメインは Cloudflare SDK を import しない。このアプリは、古い Workers Logs を読むことに依存しない。2026-12-01 以降の Workers Logs の単価は、ここでは書かない。Logpush は使わない。

## デプロイに関する特記事項

`main` への push は、GitHub Actions で `void deploy --platform cloudflare` を実行する。ジョブは、Actions のシークレット `CLOUDFLARE_API_TOKEN` で認証する。ワークフローは `CLOUDFLARE_ACCOUNT_ID` を、`void.lock.json` のアカウントに固定する。この文書は、Cloudflare の製品を用意しない。トークンには、Workers Scripts の編集、束ねた資源の読み取り、そのコマンドが用意する製品の編集が要る。出典は [CI からのデプロイ](https://void.cloud/integrations/cloudflare#deploying-from-ci) である。

## 検討した代替手段

### Workers Paid

プロダクトは、最初から Workers Paid を契約しない。測定の前にも契約しない。アプリ自身は、有料プランへ移らない。

### Workers for Platforms

その製品は、独自の有料プランを必要とする。このアプリは、所有者のアカウントへ直接デプロイする。Void のプラットフォームは入れない。

### Sandboxes と Containers

Sandboxes は、Workers Paid と Containers を必要とする。このアプリは、それらを使わない。

### 別の Worker へのサービスバインディング

任意のバインディングは、二つ目の Worker を呼ぶ。このアプリは、そのバインディングを足さない。

### Durable Objects

Workers Free でも作れる。このアプリは作らない。一人分のデータは、オブジェクトを起こし続けない。

### GraphQL Analytics API

Cosense からの取り込みは、自分の集計を見る。その API は呼ばない。

### Logpush

配送は、ログを書き出さない。Logpush は使わない。

### Cloudflare Pages

`wrangler pages deploy` は、静的な Pages の出力を置く。このアプリのホストは、上の Worker 一つである。Pages は、そのホストではない。

### Pro 以上のゾーンプラン

カスタムドメインは、Free プランのゾーンのままである。より高いゾーンプランは契約しない。

### Access の有料追加

Free プランが、所有者一人の席を覆う。有料の追加は切ったままである。

### DNS の提供元を Cloudflare に固定する

Cloudflare DNS を必須の提供元にはしない。提供元の差し替えは残る。

### パスキーをブラウザのログインにする

パスキーは、Access のあとの候補だけである。初版は採用しない。

## 未決事項

Access を外したあとのブラウザログインは、所有者の書き込みで開いたままである。2026-12-01 以降の Workers Logs の単価は、未確認のままである。どちらも、上の一覧を止めない。
