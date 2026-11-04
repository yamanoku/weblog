(function () {
  var SOURCE_KINDS = ["article", "tweet", "youtube"];

  function knownSource(source) {
    return source === "article" || source === "tweet" || source === "youtube";
  }

  function normalizeTitle(value) {
    if (typeof value !== "string") {
      return "";
    }
    return value.trim().replace(/\s+/g, " ");
  }

  function refused(source, refusal) {
    return { source: source, ownerWrite: null, refusal: refusal };
  }

  function clipSource(fixture) {
    var source = "";
    if (fixture && typeof fixture.source === "string") {
      source = fixture.source;
    }
    if (!knownSource(source)) {
      return refused(null, "unknown_source");
    }
    var visibility = fixture.visibility;
    if (visibility !== "draft" && visibility !== "public") {
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

  function submitClip(clipResult, credentials, store) {
    var records = [];
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
