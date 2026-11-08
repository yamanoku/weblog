# フロントエンドのパッケージ

[English](frontend.md)

## このドキュメントについて

この設計は、[weblog.yamanoku.net](../../products/weblog/product.ja.md) の画面パッケージを記録する。プロダクトは、画面を Svelte と決めている。公開 HTML と編集画面は、[所有者の書き込み](../../products/weblog/features/owner-writing/requirements.ja.md) と [公開閲覧](../../products/weblog/features/public-reading/requirements.ja.md) に残る。

### 対象読者

画面のパッケージを足す人と、その作業を引き受けるエージェント。

### 前提知識

画面のフレームワークを Svelte とする、というプロダクトの指針。このホストは、一つの Worker が返す。SvelteKit は、その Worker を持たない。

### このドキュメントで扱わないこと

- 経路の割り当て、フィードの文書、編集フォームの項目。これらは上の要件に残す。
- ORM、保存、連合の署名。
- 見た目。

## 実装方針

画面は Svelte である。ページのファイルは `@void/svelte` を通して Svelte を import する。Vite のプラグイン `voidSvelte()` の export 元は `@void/svelte/plugin` である。そのパスは `@void/svelte` の export である。二つ目のパッケージ名ではない。Worker のアプリケーションパッケージは `void` である。このアプリは `ssr = false` を出さない。[ページルーティング](https://void.cloud/guide/pages-routing/overview) は、その指定がサーバ描画の HTML ではなく、ブラウザで載せる殻を返すと説明している。

版は固定しない。下のオブジェクトは、版の欄を省く。

このアプリのパッケージは、次のとおりである。

```json
{
  "dependencies": {
    "svelte": null,
    "@void/svelte": null,
    "void": null,
    "yama-normalize": null
  }
}
```

ドメインは `void` を import しない。ドメインは Svelte を import しない。ドメインは `@void/svelte` を import しない。ページのファイルは `void/db` を import しない。レイアウトは `yama-normalize` を読み込む。このスタイルシートは、全ページの既定の見た目である。

## アーキテクチャ・シーケンス図

図は要らない。決定は、パッケージ一覧一つである。図を足しても、名前は増えない。

## データモデル・ER 図

無し。この設計は、表を足さない。列も足さない。

## API・インターフェース

画面のインターフェースは、Svelte のページである。最初の応答は HTML である。このホスト内の後の移動は、ブラウザで行う。`ssr = false` は出さない。

## 外部サービスとの連携方式

無し。これらのパッケージは、有料の実行環境を足さない。

## データの取り扱い設計

無し。ページのファイルは D1 を読まない。

## 認証認可に関する特記事項

無し。ログインは、所有者の書き込みに残す。

## セキュリティ上の留意事項

ページのファイルは `@void/svelte` を import してよい。ドメインは、その import を持たない。

## デプロイに関する特記事項

無し。公開は、パッケージ `void` に対する `void deploy --platform cloudflare` のままである。ホスト名は `weblog.yamanoku.net` のままである。

## 検討した代替手段

次のパッケージは検討した。このアプリの依存には入らない。版は固定しない。オブジェクトは、版の欄を省く。

```json
{
  "considered": {
    "@void/react": null,
    "@void/vue": null,
    "@void/solid": null,
    "@sveltejs/adapter-cloudflare": null
  }
}
```

### React、Vue、Solid

[ページルーティング](https://void.cloud/guide/pages-routing/overview) は `@void/react` を示している。同じページは `@void/vue` を示している。同じページは `@void/solid` を示している。所有者は Svelte を選んだ。このアプリは、その三つのパッケージをインストールしない。React は画面ではない。Vue は画面ではない。Solid は画面ではない。

### Worker を SvelteKit にする

[adapter-cloudflare](https://svelte.dev/docs/kit/adapter-cloudflare) は、`main` が `.svelte-kit/cloudflare/_worker.js` の Worker を作る。そのパッケージは、SvelteKit を Worker の入口にする。入口はパッケージ `void` のままである。SvelteKit は画面ではない。このアプリは `@sveltejs/adapter-cloudflare` をインストールしない。

## 未決事項

これらのパッケージを止める未決は無い。
