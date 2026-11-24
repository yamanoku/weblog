// Cosense import and local edit for weblog.yamanoku.net.
//
// Source: requirements.md in this directory, and the plan/cursor rules in
// design.md ("Walk", "One page"). The requirements prose stays the product
// source. This file is the executable model.
//
// One host. Three list slots, in walk order: page 1 (migration set), page 3
// (outside the set), page 2 (migration set). Bodies and titles are small
// integers. 0 is the empty body. Markdown conversion, Gyazo brackets, edges,
// and the 60-second or UTC-midnight waits are omitted. A deferral is one
// action that leaves the page and the cursor alone.
//
// Import decision, in order: text unavailable; outside the set and not stored;
// current body differs from the last imported body (local edit, source stays
// out, including when the source is newer); empty body (no create, no replace);
// no entry (create one public page, host id is not the Cosense id); source
// time newer (replace title and body, keep kind, visibility, and host id);
// otherwise skip. A title change alone is not a local edit.
//
// An unfinished walk resumes after the last committed page and does not
// revisit it. Empty, unavailable, and outside do not commit, and the same
// run continues. A finished walk starts at the first page, applies the same
// decision, and does not move the cursor. After a delete, the next recheck
// can create a new host id. There is no action that writes a newer source
// over a local edit.
//
// Coverage:
//   Create one public page. A later page is not a second entry. Outside the
//     set is not stored.              requirements.md "Import a new page"
//   Resume after the last commit. A finished walk rechecks from the start.
//                                   requirements.md "Continue the list and recheck it"
//   Local edit stays. A matching newer source replaces. Empty is refused.
//                                   requirements.md "Keep a local edit"
//   Deferral does not commit.       requirements.md store allowance and source retry

module cosenseImport {
  type PageId = int

  type Kind = EntryPage | Article
  type Visibility = Public | Draft
  type Phase = Idle | Walking | Rechecking
  type Outcome = Hold | Skip | LocalEdit | Create | Replace | EmptyBody | Outside | Unavailable | Allowance

  type Entry = {
    present: bool,
    hostId: int,
    title: int,
    body: int,
    lastImported: int,
    sourceTime: int,
    kind: Kind,
    visibility: Visibility,
  }

  type Source = {
    inSet: bool,
    title: int,
    body: int,
    updated: int,
    textAvailable: bool,
  }

  type Trace = {
    didLocal: bool,
    didReplace: bool,
    didEmpty: bool,
    didOutside: bool,
    didResume: bool,
    didRecheck: bool,
    didDefer: bool,
    didRecreate: bool,
    didSkip: bool,
  }

  pure val LENGTH: int = 3
  pure val MAX_BODY: int = 3
  pure val MAX_TIME: int = 4
  pure val FIRST_HOST: int = 10

  pure val ABSENT: Entry = {
    present: false,
    hostId: 0,
    title: 0,
    body: 0,
    lastImported: 0,
    sourceTime: 0,
    kind: EntryPage,
    visibility: Public,
  }

  pure val NO_TRACE: Trace = {
    didLocal: false,
    didReplace: false,
    didEmpty: false,
    didOutside: false,
    didResume: false,
    didRecheck: false,
    didDefer: false,
    didRecreate: false,
    didSkip: false,
  }

  // Walk order: a migration page, a page outside the set, a migration page.
  pure def pageAt(i: int): PageId =
    if (i == 0) 1 else if (i == 1) 3 else 2

  pure def initialSource(id: PageId): Source = {
    inSet: id != 3,
    title: id,
    body: 1,
    updated: 1,
    textAvailable: true,
  }

  var entries: PageId -> Entry
  var sources: PageId -> Source
  var cursor: int
  var index: int
  var phase: Phase
  var finished: bool
  var advancing: bool
  var nextHostId: int
  var sound: bool
  var lastOutcome: Outcome
  var lastPage: PageId
  var deleted: Set[PageId]
  var trace: Trace

  pure def plan(e: Entry, src: Source): Outcome =
    if (not(src.textAvailable)) Unavailable
    else if (not(src.inSet) and not(e.present)) Outside
    else if (e.present and e.body != e.lastImported) LocalEdit
    else if (src.body == 0) EmptyBody
    else if (not(e.present)) Create
    else if (src.updated > e.sourceTime) Replace
    else Skip

  pure def applied(e: Entry, src: Source, outcome: Outcome, hostId: int): Entry =
    if (outcome == Create)
      {
        present: true,
        hostId: hostId,
        title: src.title,
        body: src.body,
        lastImported: src.body,
        sourceTime: src.updated,
        kind: EntryPage,
        visibility: Public,
      }
    else if (outcome == Replace)
      {
        ...e,
        title: src.title,
        body: src.body,
        lastImported: src.body,
        sourceTime: src.updated,
      }
    else
      e

  pure def sameEntry(a: Entry, b: Entry): bool =
    a.present == b.present
      and a.hostId == b.hostId
      and a.title == b.title
      and a.body == b.body
      and a.lastImported == b.lastImported
      and a.sourceTime == b.sourceTime
      and a.kind == b.kind
      and a.visibility == b.visibility

  // A local edit is left untouched, whatever the source body and time are.
  pure def keepsLocal(before: Entry, after: Entry): bool =
    not(before.present and before.body != before.lastImported) or sameEntry(before, after)

  pure def replaceKeepsIdentity(before: Entry, after: Entry, outcome: Outcome): bool =
    outcome != Replace
      or (after.present and after.hostId == before.hostId and after.kind == before.kind and after.visibility == before.visibility)

  pure def createShape(after: Entry, src: Source, outcome: Outcome, hostId: int): bool =
    outcome != Create
      or (after.present
        and after.hostId == hostId
        and after.hostId >= FIRST_HOST
        and after.kind == EntryPage
        and after.visibility == Public
        and after.body == src.body
        and after.body != 0
        and after.lastImported == src.body
        and after.title == src.title
        and after.sourceTime == src.updated)

  pure def refusalLeavesEntry(before: Entry, after: Entry, outcome: Outcome): bool =
    (outcome != EmptyBody and outcome != LocalEdit and outcome != Outside and outcome != Unavailable and outcome != Skip)
      or sameEntry(before, after)

  pure def stepSound(before: Entry, after: Entry, src: Source, outcome: Outcome, hostId: int, nextCursor: int, cursorNow: int): bool =
    keepsLocal(before, after)
      and replaceKeepsIdentity(before, after, outcome)
      and createShape(after, src, outcome, hostId)
      and refusalLeavesEntry(before, after, outcome)
      and nextCursor >= cursorNow

  action init: bool = all {
    entries' = Set(1, 2, 3).mapBy(_ => ABSENT),
    sources' = Set(1, 2, 3).mapBy(id => initialSource(id)),
    cursor' = -1,
    index' = 0,
    phase' = Idle,
    finished' = false,
    advancing' = false,
    nextHostId' = FIRST_HOST,
    sound' = true,
    lastOutcome' = Hold,
    lastPage' = 0,
    deleted' = Set(),
    trace' = NO_TRACE,
  }

  action beginRun: bool = all {
    phase == Idle,
    phase' = if (finished) Rechecking else Walking,
    index' = if (finished) 0 else cursor + 1,
    advancing' = not(finished),
    trace' = if (finished) { ...trace, didRecheck: true }
             else if (cursor >= 0) { ...trace, didResume: true }
             else trace,
    entries' = entries,
    sources' = sources,
    cursor' = cursor,
    finished' = finished,
    nextHostId' = nextHostId,
    sound' = sound,
    lastOutcome' = lastOutcome,
    lastPage' = lastPage,
    deleted' = deleted,
  }

  action walkOne: bool = {
    val id = pageAt(index)
    val before = entries.get(id)
    val src = sources.get(id)
    val outcome = plan(before, src)
    val after = applied(before, src, outcome, nextHostId)
    val committed = outcome == Create or outcome == Replace
    val nextCursor = if (advancing and committed) index else cursor
    all {
      phase != Idle,
      index < LENGTH,
      entries' = entries.set(id, after),
      nextHostId' = if (outcome == Create) nextHostId + 1 else nextHostId,
      cursor' = nextCursor,
      index' = index + 1,
      phase' = if (index + 1 == LENGTH) Idle else phase,
      finished' = if (index + 1 == LENGTH and advancing) true else finished,
      advancing' = if (index + 1 == LENGTH) false else advancing,
      sound' = if (stepSound(before, after, src, outcome, nextHostId, nextCursor, cursor)) sound else false,
      lastOutcome' = outcome,
      lastPage' = id,
      sources' = sources,
      deleted' = deleted,
      trace' = {
        didLocal: trace.didLocal or outcome == LocalEdit,
        didReplace: trace.didReplace or outcome == Replace,
        didEmpty: trace.didEmpty or outcome == EmptyBody,
        didOutside: trace.didOutside or outcome == Outside,
        didResume: trace.didResume,
        didRecheck: trace.didRecheck,
        didDefer: trace.didDefer,
        didRecreate: trace.didRecreate or (outcome == Create and deleted.contains(id)),
        didSkip: trace.didSkip or outcome == Skip,
      },
    }
  }

  // Source retry and free-allowance deferral: the same page stays uncommitted.
  action deferWalk: bool = all {
    phase != Idle,
    index < LENGTH,
    lastOutcome' = Allowance,
    trace' = { ...trace, didDefer: true },
    entries' = entries,
    sources' = sources,
    cursor' = cursor,
    index' = index,
    phase' = phase,
    finished' = finished,
    advancing' = advancing,
    nextHostId' = nextHostId,
    sound' = sound,
    lastPage' = lastPage,
    deleted' = deleted,
  }

  // The owner stops, or the list request is refused. An unfinished cursor stays.
  action stopRun: bool = all {
    phase != Idle,
    index < LENGTH,
    phase' = Idle,
    advancing' = false,
    entries' = entries,
    sources' = sources,
    cursor' = cursor,
    index' = index,
    finished' = finished,
    nextHostId' = nextHostId,
    sound' = sound,
    lastOutcome' = lastOutcome,
    lastPage' = lastPage,
    deleted' = deleted,
    trace' = trace,
  }

  action setSourceBody(id: PageId, body: int): bool = all {
    body >= 0,
    body <= MAX_BODY,
    sources' = sources.set(id, { ...sources.get(id), body: body }),
    entries' = entries,
    cursor' = cursor,
    index' = index,
    phase' = phase,
    finished' = finished,
    advancing' = advancing,
    nextHostId' = nextHostId,
    sound' = sound,
    lastOutcome' = lastOutcome,
    lastPage' = lastPage,
    deleted' = deleted,
    trace' = trace,
  }

  action setSourceTitle(id: PageId, title: int): bool = all {
    title >= 1,
    title <= MAX_TIME,
    sources' = sources.set(id, { ...sources.get(id), title: title }),
    entries' = entries,
    cursor' = cursor,
    index' = index,
    phase' = phase,
    finished' = finished,
    advancing' = advancing,
    nextHostId' = nextHostId,
    sound' = sound,
    lastOutcome' = lastOutcome,
    lastPage' = lastPage,
    deleted' = deleted,
    trace' = trace,
  }

  action setSourceTime(id: PageId, time: int): bool = all {
    time > sources.get(id).updated,
    time <= MAX_TIME,
    sources' = sources.set(id, { ...sources.get(id), updated: time }),
    entries' = entries,
    cursor' = cursor,
    index' = index,
    phase' = phase,
    finished' = finished,
    advancing' = advancing,
    nextHostId' = nextHostId,
    sound' = sound,
    lastOutcome' = lastOutcome,
    lastPage' = lastPage,
    deleted' = deleted,
    trace' = trace,
  }

  action setUnavailable(id: PageId): bool = all {
    sources.get(id).textAvailable,
    sources' = sources.set(id, { ...sources.get(id), textAvailable: false }),
    entries' = entries,
    cursor' = cursor,
    index' = index,
    phase' = phase,
    finished' = finished,
    advancing' = advancing,
    nextHostId' = nextHostId,
    sound' = sound,
    lastOutcome' = lastOutcome,
    lastPage' = lastPage,
    deleted' = deleted,
    trace' = trace,
  }

  action ownerEditBody(id: PageId): bool = all {
    entries.get(id).present,
    entries.get(id).body < MAX_BODY,
    entries' = entries.set(id, { ...entries.get(id), body: entries.get(id).body + 1 }),
    sources' = sources,
    cursor' = cursor,
    index' = index,
    phase' = phase,
    finished' = finished,
    advancing' = advancing,
    nextHostId' = nextHostId,
    sound' = sound,
    lastOutcome' = lastOutcome,
    lastPage' = lastPage,
    deleted' = deleted,
    trace' = trace,
  }

  action ownerRetitle(id: PageId): bool = all {
    entries.get(id).present,
    entries.get(id).title < MAX_TIME,
    entries' = entries.set(id, { ...entries.get(id), title: entries.get(id).title + 1 }),
    sources' = sources,
    cursor' = cursor,
    index' = index,
    phase' = phase,
    finished' = finished,
    advancing' = advancing,
    nextHostId' = nextHostId,
    sound' = sound,
    lastOutcome' = lastOutcome,
    lastPage' = lastPage,
    deleted' = deleted,
    trace' = trace,
  }

  action ownerSetArticle(id: PageId): bool = all {
    entries.get(id).present,
    entries.get(id).kind == EntryPage,
    entries' = entries.set(id, { ...entries.get(id), kind: Article }),
    sources' = sources,
    cursor' = cursor,
    index' = index,
    phase' = phase,
    finished' = finished,
    advancing' = advancing,
    nextHostId' = nextHostId,
    sound' = sound,
    lastOutcome' = lastOutcome,
    lastPage' = lastPage,
    deleted' = deleted,
    trace' = trace,
  }

  action ownerSetDraft(id: PageId): bool = all {
    entries.get(id).present,
    entries.get(id).visibility == Public,
    entries' = entries.set(id, { ...entries.get(id), visibility: Draft }),
    sources' = sources,
    cursor' = cursor,
    index' = index,
    phase' = phase,
    finished' = finished,
    advancing' = advancing,
    nextHostId' = nextHostId,
    sound' = sound,
    lastOutcome' = lastOutcome,
    lastPage' = lastPage,
    deleted' = deleted,
    trace' = trace,
  }

  action ownerDelete(id: PageId): bool = all {
    entries.get(id).present,
    entries' = entries.set(id, ABSENT),
    deleted' = deleted.union(Set(id)),
    sources' = sources,
    cursor' = cursor,
    index' = index,
    phase' = phase,
    finished' = finished,
    advancing' = advancing,
    nextHostId' = nextHostId,
    sound' = sound,
    lastOutcome' = lastOutcome,
    lastPage' = lastPage,
    trace' = trace,
  }

  action step: bool = {
    nondet id = Set(1, 2, 3).oneOf()
    nondet body = 0.to(MAX_BODY).oneOf()
    nondet title = 1.to(MAX_TIME).oneOf()
    nondet time = 2.to(MAX_TIME).oneOf()
    any {
      beginRun,
      walkOne,
      deferWalk,
      stopRun,
      setSourceBody(id, body),
      setSourceTitle(id, title),
      setSourceTime(id, time),
      setUnavailable(id),
      ownerEditBody(id),
      ownerRetitle(id),
      ownerSetArticle(id),
      ownerSetDraft(id),
      ownerDelete(id),
    }
  }

  val createdEntry: bool = entries.get(1).present or entries.get(2).present
  val reportedLocal: bool = trace.didLocal
  val replacedEntry: bool = trace.didReplace
  val refusedEmpty: bool = trace.didEmpty
  val skippedOutside: bool = trace.didOutside
  val resumedWalk: bool = trace.didResume
  val recheckedList: bool = trace.didRecheck
  val deferredPage: bool = trace.didDefer
  val recreatedAfterDelete: bool = trace.didRecreate
  val skippedSame: bool = trace.didSkip

  val outsideStaysOut: bool = not(entries.get(3).present)

  val hostIdIsNotTheCosenseId: bool =
    Set(1, 2, 3).forall(id => not(entries.get(id).present) or (entries.get(id).hostId >= FIRST_HOST and entries.get(id).hostId != id))

  val importedBodyIsNonEmpty: bool =
    Set(1, 2, 3).forall(id => not(entries.get(id).present) or entries.get(id).lastImported != 0)

  val hostIdsDiffer: bool =
    not(entries.get(1).present and entries.get(2).present) or entries.get(1).hostId != entries.get(2).hostId

  val walkBounds: bool = and {
    index >= 0,
    index <= LENGTH,
    cursor >= -1,
    cursor < LENGTH,
    phase != Idle implies index < LENGTH,
    finished implies phase != Walking,
    phase == Walking implies (not(finished) and advancing and index == cursor + 1 or index > cursor + 1),
    phase == Rechecking implies (finished and not(advancing)),
  }

  val safety: bool = and {
    sound,
    outsideStaysOut,
    hostIdIsNotTheCosenseId,
    importedBodyIsNonEmpty,
    hostIdsDiffer,
    walkBounds,
  }
}
