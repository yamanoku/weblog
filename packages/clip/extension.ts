type SourceKind = "article" | "tweet" | "youtube";

type ClipInput = {
  source?: unknown;
  visibility?: unknown;
  title?: unknown;
  url?: unknown;
  body?: unknown;
};

type OwnerWrite = {
  kind: "bookmark";
  title: string;
  body: string;
  visibility: "draft" | "public";
  bookmarkUrl: string;
};

type ClipResult = {
  source: SourceKind | null;
  ownerWrite: OwnerWrite | null;
  refusal: string | null;
};

type StoredBookmark = {
  kind: "bookmark";
  title: string;
  body: string;
  visibility: "draft" | "public";
  bookmarkUrl: string;
};

type SubmitResult = {
  stored: boolean;
  reason: "unauthorized" | "no_payload" | "stored";
  count: number;
};

declare const window: {
  weblogClip: {
    SOURCE_KINDS: readonly SourceKind[];
    clipSource: (fixture: ClipInput | null | undefined) => ClipResult;
    submitClip: (
      clipResult: ClipResult | null | undefined,
      credentials: { token?: unknown } | null | undefined,
      store: StoredBookmark[] | null | undefined,
    ) => SubmitResult;
  };
};

(function () {
  var SOURCE_KINDS = ["article", "tweet", "youtube"] as ["article", "tweet", "youtube"];

  function knownSource(source: string): source is SourceKind {
    return source === "article" || source === "tweet" || source === "youtube";
  }

  function normalizeTitle(value: unknown): string {
    if (typeof value !== "string") {
      return "";
    }
    return value.trim().replace(/\s+/g, " ");
  }

  function refused(source: SourceKind | null, refusal: string): ClipResult {
    return { source: source, ownerWrite: null, refusal: refusal };
  }

  function clipSource(fixture: ClipInput | null | undefined): ClipResult {
    var source = "";
    if (fixture && typeof fixture.source === "string") {
      source = fixture.source;
    }
    if (!knownSource(source) || !fixture) {
      return refused(null, "unknown_source");
    }
    var visibility: "draft" | "public";
    if (fixture.visibility === "draft" || fixture.visibility === "public") {
      visibility = fixture.visibility;
    } else {
      return refused(source, "invalid_visibility");
    }
    var title = normalizeTitle(fixture.title);
    if (title === "") {
      return refused(source, "missing_title");
    }
    var url = "";
    if (typeof fixture.url === "string") {
      url = fixture.url;
    }
    if (url.trim() === "") {
      return refused(source, "missing_bookmark_url");
    }
    var body = "";
    if (typeof fixture.body === "string") {
      body = fixture.body;
    }
    if (visibility === "public" && body === "") {
      return refused(source, "empty_body");
    }
    return {
      source: source,
      ownerWrite: {
        kind: "bookmark",
        title: title,
        body: body,
        visibility: visibility,
        bookmarkUrl: url,
      },
      refusal: null,
    };
  }

  function submitClip(
    clipResult: ClipResult | null | undefined,
    credentials: { token?: unknown } | null | undefined,
    store: StoredBookmark[] | null | undefined,
  ): SubmitResult {
    var records: StoredBookmark[] = [];
    if (store && typeof store.length === "number") {
      records = store;
    }
    var count = records.length;
    var token = "";
    if (credentials && typeof credentials.token === "string") {
      token = credentials.token;
    }
    if (token === "") {
      return { stored: false, reason: "unauthorized", count: count };
    }
    if (!clipResult || clipResult.ownerWrite == null) {
      return { stored: false, reason: "no_payload", count: count };
    }
    var write = clipResult.ownerWrite;
    records.push({
      kind: write.kind,
      title: write.title,
      body: write.body,
      visibility: write.visibility,
      bookmarkUrl: write.bookmarkUrl,
    });
    return { stored: true, reason: "stored", count: records.length };
  }

  window.weblogClip = {
    SOURCE_KINDS: SOURCE_KINDS,
    clipSource: clipSource,
    submitClip: submitClip,
  };
})();
