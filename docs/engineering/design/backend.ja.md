# バックエンドのパッケージ

[English](backend.md)

## このドキュメントについて

この設計は、[weblog.yamanoku.net](../../products/weblog/product.ja.md) のバックエンドパッケージを記録する。プロダクトは、ORM を `void/db` と決めている。保存の第一アダプタは D1 のままである。書き込みは [所有者の書き込み](../../products/weblog/features/owner-writing/requirements.ja.md) に残る。連合は [ActivityPub](../../products/weblog/features/activitypub/requirements.ja.md) に残る。

### 対象読者

保存と経路のパッケージを足す人と、その作業を引き受けるエージェント。

### 前提知識

ORM を `void/db` とし、保存の第一アダプタを D1 のままにする、というプロダクトの指針。このホストは、一つの `void` アプリケーションが返す。

### このドキュメントで扱わないこと

- 画面のパッケージ。Svelte と `@void/svelte` は、画面の一覧に残す。
- 経路の割り当て、フィードの文書、編集の項目。
- 見た目。

## 実装方針

ORM は `void/db` である。保存アダプタは、D1 のバインディング上で `void/db` から `db` を import する。`void/db` はパッケージ `void` の export である。二つ目のパッケージ名ではない。データベースのページは、`void/db` から Drizzle の演算子を再公開している。同じページは、`drizzle-orm` を別にインストールしなくてよいと説明している。出典は [データベース](https://void.cloud/guide/database) である。スキーマの補助は `void` に含まれる。D1 の表は、`drizzle-orm` を入れる理由にしない。

保存の第一アダプタは D1 のままである。このアプリは `drizzle-orm` を別にインストールしない。

Void の経路ハンドラは、パッケージ `void` の内側にある Hono で動く。Hono のページは、Void の内側の依存として Hono を挙げている。アプリが `hono/*` を直接 import するときだけ、パッケージ `hono` を依存へ足す。出典は [Hono](https://void.cloud/integrations/hono) である。このアプリは `hono/*` を import しない。依存へ `hono` は足さない。

ドメインは `void/db` を import しない。ドメインは Hono を import しない。ドメインは Fedify を import しない。ドメインは Cloudflare SDK を import しない。この文書は、その SDK の npm 名を書かない。ページのファイルは `void/db` を import しない。連合のアダプタは Fedify を使わない。所有者は、自前の署名を選んだ。

版は固定しない。下のオブジェクトは、版の欄を省く。

このアプリのバックエンドパッケージは、次のとおりである。

```json
{
  "dependencies": {
    "void": null
  }
}
```

このオブジェクトは、バックエンドの一覧である。画面の一覧は置き換えない。画面の一覧は `svelte` と `@void/svelte` を残す。

## アーキテクチャ・シーケンス図

図は要らない。決定は、パッケージ名一つである。図を足しても、名前は増えない。

## データモデル・ER 図

無し。この設計は、表を足さない。列も足さない。保存先は D1 のままである。

## API・インターフェース

経路ハンドラはドメインを呼ぶ。`void/db` の `db` を呼ぶのは、保存アダプタだけである。ドメインは、変更の一覧を渡す。アダプタは、batch を実行する。

## 外部サービスとの連携方式

ここでの追加は無い。D1、KV、キュー、R2 は、要件が既に使う資源のままである。新しい npm の依存ではない。

## データの取り扱い設計

保存アダプタは、`void/db` を通して D1 を読み書きする。ページのファイルは D1 を読まない。

## 認証認可に関する特記事項

無し。このアプリは、Void が管理するログインを有効にしない。ブラウザのログインは、所有者の書き込みに残す。

## セキュリティ上の留意事項

ドメインは `void/db` を import しない。ドメインは Hono を import しない。ドメインは Fedify を import しない。ドメインは Cloudflare SDK を import しない。保存アダプタは `void/db` を import する。連合のアダプタは Fedify を import しない。

## デプロイに関する特記事項

無し。公開は、所有者の Cloudflare アカウント上の `void` アプリ一つである。ホスト名は `weblog.yamanoku.net` のままである。

## 検討した代替手段

次のパッケージは検討した。このアプリの依存には入らない。版は固定しない。オブジェクトは、版の欄を省く。

```json
{
  "considered": {
    "drizzle-orm": null,
    "hono": null,
    "fedify": null
  }
}
```

### Drizzle を別に入れる

`drizzle-orm` を入れると、`void/db` が既に再公開する演算子を重ねる。保存は `void/db` の `db` のままである。`drizzle-orm` は依存ではない。

### `hono` を直接依存にする

ハンドラは、既に `void` の内側の Hono で動く。`hono` の直接の依存は、`hono/*` を import するアプリのためである。このアプリは、それを import しない。経路は Hono を使う。`hono` は依存ではない。

### Fedify

Fedify は、アダプタの中の連合ライブラリになる。連合のアダプタは Fedify を使わない。`fedify` は依存ではない。

### 素の D1 バインディング

素の D1 バインディングは、`void/db` なしでプライマリを読む。所有者は `void/db` を選んだ。保存アダプタは、その export から `db` を import する。素のバインディングはパッケージではない。保存でもない。

## 未決事項

これらのパッケージを止める未決は無い。
