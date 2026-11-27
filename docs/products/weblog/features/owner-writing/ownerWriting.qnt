// Owner create, update, publish, and delete for weblog.yamanoku.net.
//
// Source: requirements.md in this directory (Create, Update, Change visibility,
// Delete, and the write rules under Functional requirements). The requirements
// prose stays the product source. This file is the executable model.
//
// One owner. Two slots. A slot's number is the immutable id and the canonical
// URL. Titles, bodies, and bookmark URLs are small integers. 0 is empty.
// An unverified request is not a transition. Browser and CLI use the same
// actions. Images, token hashes, screens, and edge-extraction syntax are
// omitted. The edges field commits with the body: a refusal does not run, so
// the previous body and edges stay. ActivityPub records delivery; this model
// only keeps that flag. It does not send an activity.
//
// A deliverable entry is a public article, diary, note, or bookmark that is
// not a reply. A page is never deliverable. A reply is a public note with no
// publishedAt. publishedAt is set when the entry becomes deliverable, kept
// while it stays deliverable, and cleared when it stops. An article or
// bookmark create may name a positive posted instant. That instant becomes
// publishedAt when the create is public, and it may be ahead of the clock.
// A later publish uses the clock. chosenAt records that named instant.
// The delivered flag
// stays across draft, kind changes, and delete. A deleted id is not reused.
// No delivered record means the public get is a miss. A delivered delete keeps
// the id with an empty body. A draft body is not publicly readable.
// The verified owner may read that body at the canonical URL. This reader
// is the public reader, so readerSeesBody stays limited to public entries.
//
// Coverage:
//   Create stores one entry and a fixed id. Empty title, missing bookmark URL,
//     and a public empty body store nothing. A note may have an empty title.
//     A bookmark may be public with an empty body.   "Create an entry", "Writes"
//   A later write replaces the fields and keeps the id. A title change keeps
//     the id and records the old title. Another entry's body stays.
//                                                     "Update an entry"
//   Publish sets publishedAt. A later publish keeps it. A page stays
//     undeliverable. Leaving the deliverable set clears publishedAt and keeps
//     the delivered flag.                       "Change visibility"
//   Delete of an undelivered entry leaves a miss. Delete of a delivered entry
//     keeps the id and the delivered flag and clears the body.
//                                                     "Delete an entry"

module ownerWriting {
  type Slot = int
  type Kind = Article | Diary | Note | Bookmark | PageKind
  type Visibility = Draft | Public

  type Entry = {
    present: bool,
    deleted: bool,
    delivered: bool,
    seenDeliverable: bool,
    kind: Kind,
    visibility: Visibility,
    title: int,
    body: int,
    url: int,
    publishedAt: int,
    chosenAt: int,
    replyTo: Slot,
    cosenseId: int,
    edges: int,
    past: Set[int],
  }

  type Trace = {
    didCreate: bool,
    didUpdate: bool,
    didPublish: bool,
    didRepublish: bool,
    didDraft: bool,
    didDeleteMissing: bool,
    didDeleteGone: bool,
    didReply: bool,
  }

  pure val MAX_N: int = 2

  pure val ABSENT: Entry = {
    present: false,
    deleted: false,
    delivered: false,
    seenDeliverable: false,
    kind: Article,
    visibility: Draft,
    title: 0,
    body: 0,
    url: 0,
    publishedAt: 0,
    chosenAt: 0,
    replyTo: 0,
    cosenseId: 0,
    edges: 0,
    past: Set(),
  }

  pure val NO_TRACE: Trace = {
    didCreate: false,
    didUpdate: false,
    didPublish: false,
    didRepublish: false,
    didDraft: false,
    didDeleteMissing: false,
    didDeleteGone: false,
    didReply: false,
  }

  var entries: Slot -> Entry
  var clock: int
  var trace: Trace

  pure def deliverable(e: Entry): bool =
    e.present and e.visibility == Public and e.replyTo == 0
      and (e.kind == Article or e.kind == Diary or e.kind == Note or e.kind == Bookmark)

  pure def readerSeesBody(e: Entry): bool =
    e.present and e.visibility == Public

  pure def needsTitle(kind: Kind): bool =
    kind == Article or kind == Diary or kind == Bookmark or kind == PageKind

  pure def willDeliver(kind: Kind, vis: Visibility, replyTo: Slot): bool =
    vis == Public and replyTo == 0
      and (kind == Article or kind == Diary or kind == Note or kind == Bookmark)

  pure def sameEntry(a: Entry, b: Entry): bool =
    a.present == b.present
      and a.deleted == b.deleted
      and a.delivered == b.delivered
      and a.seenDeliverable == b.seenDeliverable
      and a.kind == b.kind
      and a.visibility == b.visibility
      and a.title == b.title
      and a.body == b.body
      and a.url == b.url
      and a.publishedAt == b.publishedAt
      and a.chosenAt == b.chosenAt
      and a.replyTo == b.replyTo
      and a.cosenseId == b.cosenseId
      and a.edges == b.edges
      and a.past == b.past

  // Two public entries with the same non-empty title have no view path.
  pure def hasViewPath(es: Slot -> Entry, id: Slot): bool =
    es.get(id).present and es.get(id).visibility == Public and es.get(id).title != 0
      and not(Set(1, 2).exists(other =>
        other != id and es.get(other).present and es.get(other).visibility == Public and es.get(other).title == es.get(id).title))

  pure def written(e: Entry, id: Slot, kind: Kind, title: int, body: int, vis: Visibility, url: int, replyTo: Slot, now: int, posted: int, creating: bool): Entry = {
    present: true,
    deleted: false,
    delivered: e.delivered,
    seenDeliverable: e.seenDeliverable or willDeliver(kind, vis, replyTo),
    kind: kind,
    visibility: vis,
    title: title,
    body: body,
    url: if (kind == Bookmark) url else 0,
    publishedAt: if (not(willDeliver(kind, vis, replyTo))) 0
                 else if (deliverable(e)) e.publishedAt
                 else if (creating and posted > 0) posted
                 else now,
    chosenAt: if (creating) posted else e.chosenAt,
    replyTo: replyTo,
    cosenseId: if (e.present) e.cosenseId else if (kind == PageKind) id else 0,
    edges: body,
    past: if (e.present and e.title != title and e.title != 0) e.past.union(Set(e.title)) else e.past,
  }

  pure def inRange(n: int): bool = n >= 0 and n <= MAX_N

  pure def fieldsOk(kind: Kind, title: int, body: int, vis: Visibility, url: int): bool =
    inRange(title) and inRange(body) and inRange(url)
      and not(needsTitle(kind) and title == 0)
      and (kind != Bookmark or url != 0)
      and not(vis == Public and body == 0 and kind != Bookmark)

  // A reply target is read only when replyTo is a real slot.
  pure def replyOk(es: Slot -> Entry, id: Slot, replyTo: Slot, kind: Kind, title: int, body: int, vis: Visibility, creating: bool): bool =
    if (replyTo == 0) true
    else if (not(Set(1, 2).contains(replyTo))) false
    else if (not(creating)) kind == Note and vis == Public and title == 0
    else if (replyTo == id) false
    else if (kind != Note or vis != Public or title != 0 or body == 0) false
    else es.get(replyTo).present and es.get(replyTo).kind == Note and es.get(replyTo).visibility == Public and es.get(replyTo).replyTo == 0

  action init: bool = all {
    entries' = Set(1, 2).mapBy(_ => ABSENT),
    clock' = 1,
    trace' = NO_TRACE,
  }

  action store(id: Slot, kind: Kind, title: int, body: int, vis: Visibility, url: int, replyTo: Slot, creating: bool, posted: int): bool = {
    val before = entries.get(id)
    val after = written(before, id, kind, title, body, vis, url, replyTo, clock, posted, creating)
    val becomes = not(deliverable(before)) and willDeliver(kind, vis, replyTo)
    all {
      Set(1, 2).contains(id),
      fieldsOk(kind, title, body, vis, url),
      replyOk(entries, id, replyTo, kind, title, body, vis, creating),
      if (creating) not(before.present) and not(before.deleted) else before.present,
      if (creating) true else replyTo == before.replyTo,
      entries' = entries.set(id, after),
      clock' = if (becomes) clock + 1 else clock,
      trace' = {
        didCreate: trace.didCreate or creating,
        didUpdate: trace.didUpdate or not(creating),
        didPublish: trace.didPublish or (becomes and not(before.seenDeliverable)),
        didRepublish: trace.didRepublish or (becomes and before.seenDeliverable),
        didDraft: trace.didDraft or (before.present and before.visibility == Public and vis == Draft),
        didDeleteMissing: trace.didDeleteMissing,
        didDeleteGone: trace.didDeleteGone,
        didReply: trace.didReply or (creating and replyTo != 0),
      },
    }
  }

  action createArticle(id: Slot, title: int, body: int, vis: Visibility): bool =
    store(id, Article, title, body, vis, 0, 0, true, 0)

  action createArticleAt(id: Slot, title: int, body: int, vis: Visibility, posted: int): bool =
    all {
      posted > 0,
      store(id, Article, title, body, vis, 0, 0, true, posted),
    }

  action createDiary(id: Slot, title: int, body: int, vis: Visibility): bool =
    store(id, Diary, title, body, vis, 0, 0, true, 0)

  action createNote(id: Slot, title: int, body: int, vis: Visibility): bool =
    store(id, Note, title, body, vis, 0, 0, true, 0)

  action createBookmark(id: Slot, title: int, body: int, vis: Visibility, url: int): bool =
    store(id, Bookmark, title, body, vis, url, 0, true, 0)

  action createBookmarkAt(id: Slot, title: int, body: int, vis: Visibility, url: int, posted: int): bool =
    all {
      posted > 0,
      store(id, Bookmark, title, body, vis, url, 0, true, posted),
    }

  action createPage(id: Slot, title: int, body: int, vis: Visibility): bool =
    store(id, PageKind, title, body, vis, 0, 0, true, 0)

  action createReply(id: Slot, target: Slot, body: int): bool =
    store(id, Note, 0, body, Public, 0, target, true, 0)

  action write(id: Slot, kind: Kind, title: int, body: int, vis: Visibility, url: int): bool =
    store(id, kind, title, body, vis, url, entries.get(id).replyTo, false, 0)

  action markDelivered(id: Slot): bool = {
    val before = entries.get(id)
    all {
      deliverable(before),
      not(before.delivered),
      entries' = entries.set(id, { ...before, delivered: true, seenDeliverable: true }),
      clock' = clock,
      trace' = trace,
    }
  }

  action delete(id: Slot): bool = {
    val before = entries.get(id)
    all {
      before.present,
      entries' = entries.set(id, {
        ...before,
        present: false,
        deleted: true,
        title: 0,
        body: 0,
        url: 0,
        edges: 0,
        publishedAt: 0,
        chosenAt: 0,
        past: Set(),
      }),
      clock' = clock,
      trace' = {
        ...trace,
        didDeleteMissing: trace.didDeleteMissing or not(before.delivered),
        didDeleteGone: trace.didDeleteGone or before.delivered,
      },
    }
  }

  action step: bool = {
    nondet id = Set(1, 2).oneOf()
    nondet other = Set(1, 2).oneOf()
    nondet n = 0.to(MAX_N).oneOf()
    nondet m = 0.to(MAX_N).oneOf()
    nondet u = 1.to(MAX_N).oneOf()
    any {
      createArticle(id, u, m, Public),
      createArticle(id, u, m, Draft),
      createDiary(id, u, m, Public),
      createDiary(id, u, m, Draft),
      createNote(id, n, m, Public),
      createBookmark(id, u, 0, Public, u),
      createBookmark(id, u, m, Draft, u),
      createArticleAt(id, u, m, Public, 5),
      createArticleAt(id, u, m, Draft, 5),
      createBookmarkAt(id, u, 0, Public, u, 5),
      createPage(id, u, m, Public),
      createReply(id, other, u),
      write(id, Article, u, m, Public, 0),
      write(id, Article, u, m, Draft, 0),
      write(id, Note, n, m, Public, 0),
      write(id, Bookmark, u, m, Public, u),
      write(id, PageKind, u, m, Draft, 0),
      markDelivered(id),
      delete(id),
    }
  }

  val createdEntry: bool = Set(1, 2).exists(id => entries.get(id).present)
  val updatedEntry: bool = trace.didUpdate
  val publishedEntry: bool = Set(1, 2).exists(id => deliverable(entries.get(id)))
  val republishedEntry: bool = trace.didRepublish
  val returnedToDraft: bool = trace.didDraft
  val deletedMissing: bool = trace.didDeleteMissing
  val deletedGone: bool = trace.didDeleteGone
  val replyStored: bool = trace.didReply
  val publicPage: bool =
    Set(1, 2).exists(id => entries.get(id).present and entries.get(id).kind == PageKind and entries.get(id).visibility == Public)

  val publishedAtMatchesDeliverable: bool =
    Set(1, 2).forall(id =>
      (not(deliverable(entries.get(id))) or entries.get(id).publishedAt > 0)
        and (deliverable(entries.get(id)) or entries.get(id).publishedAt == 0))

  val edgesMatchBody: bool =
    Set(1, 2).forall(id => not(entries.get(id).present) or entries.get(id).edges == entries.get(id).body)

  val bookmarkUrlStaysApart: bool =
    Set(1, 2).forall(id =>
      (entries.get(id).kind != Bookmark or not(entries.get(id).present) or entries.get(id).url != 0)
        and (entries.get(id).kind == Bookmark or not(entries.get(id).present) or entries.get(id).url == 0))

  val replyIsNotDeliverable: bool =
    Set(1, 2).forall(id =>
      entries.get(id).replyTo == 0 or not(entries.get(id).present)
        or (entries.get(id).kind == Note
          and entries.get(id).visibility == Public
          and entries.get(id).title == 0
          and entries.get(id).publishedAt == 0
          and not(deliverable(entries.get(id)))))

  val deletedKeepsNoBody: bool =
    Set(1, 2).forall(id =>
      not(entries.get(id).deleted)
        or (not(entries.get(id).present) and entries.get(id).body == 0 and entries.get(id).title == 0 and entries.get(id).edges == 0))

  val deliveredStaysSeen: bool =
    Set(1, 2).forall(id => not(entries.get(id).delivered) or entries.get(id).seenDeliverable)

  val draftBodyIsNotPublic: bool =
    Set(1, 2).forall(id => entries.get(id).visibility == Public or not(readerSeesBody(entries.get(id))))

  val stampsFitTheClock: bool =
    clock >= 1 and Set(1, 2).forall(id =>
      entries.get(id).publishedAt == 0
        or entries.get(id).chosenAt > 0
        or entries.get(id).publishedAt < clock)

  val safety: bool = and {
    publishedAtMatchesDeliverable,
    edgesMatchBody,
    bookmarkUrlStaysApart,
    replyIsNotDeliverable,
    deletedKeepsNoBody,
    deliveredStaysSeen,
    draftBodyIsNotPublic,
    stampsFitTheClock,
  }
}
