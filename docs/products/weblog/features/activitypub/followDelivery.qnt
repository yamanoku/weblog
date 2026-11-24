// ActivityPub Follow, Undo, and delivery for weblog.yamanoku.net.
//
// Source: requirements.md in this directory, plus the activity planner and
// send-time skip in design.md ("Which change plans an activity", "Who receives
// the POST"). Owner writing defines deliverable: a public article, note, or
// bookmark that is not a reply. This file is the executable model. The
// requirements prose stays the product source.
//
// Scope: one host. Remote instances are ids. A verified Follow stores one
// follower and creates an Accept job (Accept is not an outbox activity).
// Follow again keeps one follower and creates another Accept. Undo drops that
// follower. A bad signature and any other inbox activity are not transitions:
// they cannot add a follower or an activity.
//
// Delivery: one owner save emits at most one Create, Update, or Delete.
// Create records the entry as delivered even when nobody follows. Update is a
// body change that leaves the entry deliverable. A title change or a bookmark
// URL change is editNonBody and emits nothing. Delete is leaving the
// deliverable set after a delivery, and the delivered flag stays. Becoming
// deliverable again emits a new Create for the same object id. A public page
// emits nothing. Jobs snapshot the followers at commit. A later follower is
// not backfilled. At send time a recipient who is no longer a follower is
// skipped. failSend covers both a failed POST and a free-allowance deferral:
// the activity id, the follower list, and the entry stay as they are.
//
// A kind change among article, note, and bookmark that keeps the entry
// deliverable and does not change the body emits nothing. design.md lists
// Update only for a body change.
//
// Not in this model: WebFinger, the actor document, signature bytes, object
// JSON, images, HTML, queue operation counts, outbox page order, and the live
// GET. Two remotes and two entries are a simulation bound. bodyRev stops at 2.
//
// Plain Quint, not Choreo. The protocol state sits on one host. Remotes do
// not carry local protocol state. Outbound work is a job set, not a conversation
// among peers.
//
// Coverage:
//   Follow stores one follower; a repeat stays one row; Accept can be sent
//     and sent again.           requirements.md "Follow this host"
//   Undo removes a follower. A miss is disabled, so the set stays.
//                                 requirements.md "Undo a follow"
//   Create, empty followers, page emits nothing, no backfill.
//                                 requirements.md "Receive a delivered entry"
//   Update, quiet non-body edit, Delete, redelivery, never-delivered silence.
//                                 requirements.md "Update or remove a delivered entry"
//   Unverified inbox posts are not actions.
//                                 requirements.md "Reject a bad signature"
//   failSend keeps the activity id.
//                                 requirements.md "Retry delivery without a new activity ID"

module followDelivery {
  type RemoteId = int
  type EntryId = int

  type Kind = Article | Note | Bookmark | Page
  type Visibility = Public | Draft
  type ActivityKind = Create | Update | Delete

  type Entry = {
    kind: Kind,
    visibility: Visibility,
    bodyRev: int,
    nonBodyRev: int,
    deleted: bool,
    reply: bool,
    delivered: bool,
    open: bool,
  }

  type Activity = {
    activityId: int,
    objectId: EntryId,
    kind: ActivityKind,
    bodyRev: int,
  }

  type Job = {
    activityId: int,
    recipients: Set[RemoteId],
  }

  type AcceptJob = {
    activityId: int,
    remote: RemoteId,
  }

  type Post = {
    activityId: int,
    remote: RemoteId,
  }

  type Trace = {
    didUndo: bool,
    didRetry: bool,
    didQuiet: bool,
    didSavePage: bool,
    didSendAccept: bool,
    didSkip: bool,
    didPublicOnly: bool,
  }

  pure val REMOTES: Set[RemoteId] = Set(1, 2)
  pure val ENTRIES: Set[EntryId] = Set(1, 2)
  pure val MAX_REV: int = 2
  pure val FIRST_ACTIVITY_ID: int = 10

  pure val BLANK: Entry = {
    kind: Page,
    visibility: Draft,
    bodyRev: 0,
    nonBodyRev: 0,
    deleted: false,
    reply: false,
    delivered: false,
    open: false,
  }

  pure val NO_TRACE: Trace = {
    didUndo: false,
    didRetry: false,
    didQuiet: false,
    didSavePage: false,
    didSendAccept: false,
    didSkip: false,
    didPublicOnly: false,
  }

  var followers: Set[RemoteId]
  var entries: EntryId -> Entry
  var activities: Set[Activity]
  var jobs: Set[Job]
  var acceptJobs: Set[AcceptJob]
  var posts: Set[Post]
  var nextActivityId: int
  var trace: Trace

  pure def deliverable(e: Entry): bool =
    (not(e.deleted)) and (not(e.reply)) and e.visibility == Public
      and (e.kind == Article or e.kind == Note or e.kind == Bookmark)

  pure def storedEntry(before: Entry, after: Entry): Entry =
    if (deliverable(after) and not(before.open))
      { ...after, delivered: true, open: true }
    else if (before.open and not(deliverable(after)))
      { ...after, delivered: before.delivered, open: false }
    else
      { ...after, delivered: before.delivered, open: before.open }

  pure def markPublicOnly(note: Trace, creating: bool, noFollowers: bool): Trace =
    if (creating and noFollowers) { ...note, didPublicOnly: true } else note

  action init: bool = all {
    followers' = Set(),
    entries' = ENTRIES.mapBy(_ => BLANK),
    activities' = Set(),
    jobs' = Set(),
    acceptJobs' = Set(),
    posts' = Set(),
    nextActivityId' = FIRST_ACTIVITY_ID,
    trace' = NO_TRACE,
  }

  // Owner fields change together. The planner emits at most one activity.
  action commitEntry(id: EntryId, after: Entry, note: Trace): bool = {
    val before = entries.get(id)
    val creating = deliverable(after) and not(before.open)
    val updating = before.open and deliverable(after) and (after.bodyRev != before.bodyRev)
    val deleting = before.open and not(deliverable(after))
    val emit = creating or updating or deleting
    val actKind = if (creating) Create else if (deleting) Delete else Update
    all {
      before != after,
      entries' = entries.set(id, storedEntry(before, after)),
      activities' =
        if (emit)
          activities.union(Set({
            activityId: nextActivityId,
            objectId: id,
            kind: actKind,
            bodyRev: after.bodyRev,
          }))
        else
          activities,
      jobs' =
        if (emit and followers.size() > 0)
          jobs.union(Set({ activityId: nextActivityId, recipients: followers }))
        else
          jobs,
      nextActivityId' = if (emit) nextActivityId + 1 else nextActivityId,
      trace' = markPublicOnly(note, creating, followers.size() == 0),
      followers' = followers,
      acceptJobs' = acceptJobs,
      posts' = posts,
    }
  }

  action publishArticle(id: EntryId): bool = {
    val before = entries.get(id)
    commitEntry(id, { ...before, kind: Article, visibility: Public, reply: false, deleted: false }, trace)
  }

  action publishNote(id: EntryId): bool = {
    val before = entries.get(id)
    commitEntry(id, { ...before, kind: Note, visibility: Public, reply: false, deleted: false }, trace)
  }

  action publishBookmark(id: EntryId): bool = {
    val before = entries.get(id)
    commitEntry(id, { ...before, kind: Bookmark, visibility: Public, reply: false, deleted: false }, trace)
  }

  action publishPage(id: EntryId): bool = {
    val before = entries.get(id)
    commitEntry(id, { ...before, kind: Page, visibility: Public, reply: false, deleted: false }, { ...trace, didSavePage: true })
  }

  action saveDraft(id: EntryId): bool = {
    val before = entries.get(id)
    commitEntry(id, { ...before, visibility: Draft }, trace)
  }

  action deleteEntry(id: EntryId): bool = {
    val before = entries.get(id)
    commitEntry(id, { ...before, deleted: true }, trace)
  }

  action editBody(id: EntryId): bool = {
    val before = entries.get(id)
    all {
      before.bodyRev < MAX_REV,
      commitEntry(id, { ...before, bodyRev: before.bodyRev + 1 }, trace),
    }
  }

  action editNonBody(id: EntryId): bool = {
    val before = entries.get(id)
    all {
      before.nonBodyRev < MAX_REV,
      commitEntry(id, { ...before, nonBodyRev: before.nonBodyRev + 1 }, { ...trace, didQuiet: true }),
    }
  }

  action makeReply(id: EntryId): bool = {
    val before = entries.get(id)
    commitEntry(id, { ...before, kind: Note, visibility: Public, reply: true, deleted: false }, trace)
  }

  action follow(remote: RemoteId): bool = all {
    not(followers.contains(remote)),
    followers' = followers.union(Set(remote)),
    acceptJobs' = acceptJobs.union(Set({ activityId: nextActivityId, remote: remote })),
    nextActivityId' = nextActivityId + 1,
    entries' = entries,
    activities' = activities,
    jobs' = jobs,
    posts' = posts,
    trace' = trace,
  }

  action followAgain(remote: RemoteId): bool = all {
    followers.contains(remote),
    followers' = followers,
    acceptJobs' = acceptJobs.union(Set({ activityId: nextActivityId, remote: remote })),
    nextActivityId' = nextActivityId + 1,
    entries' = entries,
    activities' = activities,
    jobs' = jobs,
    posts' = posts,
    trace' = trace,
  }

  action undo(remote: RemoteId): bool = all {
    followers.contains(remote),
    followers' = followers.exclude(Set(remote)),
    acceptJobs' = acceptJobs.filter(j => j.remote != remote),
    trace' = { ...trace, didUndo: true },
    entries' = entries,
    activities' = activities,
    jobs' = jobs,
    posts' = posts,
    nextActivityId' = nextActivityId,
  }

  action sendAccept: bool = {
    nondet job = acceptJobs.oneOf()
    all {
      followers.contains(job.remote),
      acceptJobs' = acceptJobs.exclude(Set(job)),
      trace' = { ...trace, didSendAccept: true },
      followers' = followers,
      entries' = entries,
      activities' = activities,
      jobs' = jobs,
      posts' = posts,
      nextActivityId' = nextActivityId,
    }
  }

  action failAccept: bool = {
    nondet job = acceptJobs.oneOf()
    all {
      job.activityId >= FIRST_ACTIVITY_ID,
      acceptJobs' = acceptJobs,
      trace' = { ...trace, didRetry: true },
      followers' = followers,
      entries' = entries,
      activities' = activities,
      jobs' = jobs,
      posts' = posts,
      nextActivityId' = nextActivityId,
    }
  }

  action sendOne: bool = {
    nondet job = jobs.oneOf()
    nondet remote = job.recipients.intersect(followers).oneOf()
    val remaining = job.recipients.exclude(Set(remote))
    all {
      followers.contains(remote),
      posts' = posts.union(Set({ activityId: job.activityId, remote: remote })),
      jobs' =
        if (remaining.size() == 0)
          jobs.exclude(Set(job))
        else
          jobs.exclude(Set(job)).union(Set({ ...job, recipients: remaining })),
      followers' = followers,
      entries' = entries,
      activities' = activities,
      acceptJobs' = acceptJobs,
      nextActivityId' = nextActivityId,
      trace' = trace,
    }
  }

  // A snapshotted recipient who unfollowed is not posted.
  action skipOne: bool = {
    nondet job = jobs.oneOf()
    nondet remote = job.recipients.exclude(followers).oneOf()
    val remaining = job.recipients.exclude(Set(remote))
    all {
      not(followers.contains(remote)),
      posts' = posts,
      jobs' =
        if (remaining.size() == 0)
          jobs.exclude(Set(job))
        else
          jobs.exclude(Set(job)).union(Set({ ...job, recipients: remaining })),
      trace' = { ...trace, didSkip: true },
      followers' = followers,
      entries' = entries,
      activities' = activities,
      acceptJobs' = acceptJobs,
      nextActivityId' = nextActivityId,
    }
  }

  // Failed POST and free-allowance deferral: same activity id, same entry, same followers.
  action failSend: bool = {
    nondet job = jobs.oneOf()
    all {
      job.activityId >= FIRST_ACTIVITY_ID,
      jobs' = jobs,
      trace' = { ...trace, didRetry: true },
      followers' = followers,
      entries' = entries,
      activities' = activities,
      acceptJobs' = acceptJobs,
      posts' = posts,
      nextActivityId' = nextActivityId,
    }
  }

  action step: bool = {
    nondet remote = REMOTES.oneOf()
    nondet id = ENTRIES.oneOf()
    any {
      follow(remote),
      followAgain(remote),
      undo(remote),
      publishArticle(id),
      publishNote(id),
      publishBookmark(id),
      publishPage(id),
      saveDraft(id),
      deleteEntry(id),
      editBody(id),
      editNonBody(id),
      makeReply(id),
      failSend,
      sendOne,
      skipOne,
      failAccept,
      sendAccept,
    }
  }

  val gainedFollower: bool = followers.size() > 0
  val removedFollower: bool = trace.didUndo
  val createdActivity: bool = activities.exists(a => a.kind == Create)
  val updatedActivity: bool = activities.exists(a => a.kind == Update)
  val deletedActivity: bool = activities.exists(a => a.kind == Delete)
  val retriedSameJob: bool = trace.didRetry
  val acceptedFollow: bool = trace.didSendAccept
  val skippedExFollower: bool = trace.didSkip
  val publicCreateWithoutFollowers: bool = trace.didPublicOnly
  val redelivered: bool =
    ENTRIES.exists(id => activities.filter(a => a.objectId == id and a.kind == Create).size() > 1)
  val savedPublicPage: bool = trace.didSavePage
  val quietEdit: bool = trace.didQuiet
  val repeatedAccept: bool = acceptJobs.size() > 1

  val recordMatchesActivities: bool =
    ENTRIES.forall(id =>
      entries.get(id).delivered == activities.exists(a => a.objectId == id))

  val openMeansDeliverable: bool =
    ENTRIES.forall(id => not(entries.get(id).open) or deliverable(entries.get(id)))

  val openMeansDelivered: bool =
    ENTRIES.forall(id => not(entries.get(id).open) or entries.get(id).delivered)

  val activityIdIsNotObjectId: bool =
    activities.forall(a => not(ENTRIES.contains(a.activityId)))

  val uniqueActivityIds: bool =
    activities.map(a => a.activityId).size() == activities.size()

  val jobsReferToActivities: bool =
    jobs.forall(j => activities.exists(a => a.activityId == j.activityId))

  val uniqueJobIds: bool =
    jobs.map(j => j.activityId).size() == jobs.size()

  val acceptTargetsAreFollowers: bool =
    acceptJobs.forall(j => followers.contains(j.remote))

  val acceptIdsStayOutOfTheOutbox: bool =
    acceptJobs.forall(j => activities.forall(a => a.activityId != j.activityId))

  val postsReferToKnownActivities: bool =
    posts.forall(p => activities.exists(a => a.activityId == p.activityId))

  val updateCarriesABodyChange: bool =
    activities.forall(a => a.kind != Update or a.bodyRev >= 1)

  val followersAreKnownRemotes: bool =
    followers.subseteq(REMOTES)

  val safety: bool = and {
    recordMatchesActivities,
    openMeansDeliverable,
    openMeansDelivered,
    activityIdIsNotObjectId,
    uniqueActivityIds,
    jobsReferToActivities,
    uniqueJobIds,
    acceptTargetsAreFollowers,
    acceptIdsStayOutOfTheOutbox,
    postsReferToKnownActivities,
    updateCarriesABodyChange,
    followersAreKnownRemotes,
  }
}
