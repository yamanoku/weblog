// Scripted paths for cosenseImport.qnt.
module cosenseImportTest {
  import cosenseImport.* from "./cosenseImport"

  run createPublicPageTest =
    init
      .then(beginRun)
      .then(walkOne)
      .expect(and {
        entries.get(1).present,
        entries.get(1).kind == EntryPage,
        entries.get(1).visibility == Public,
        entries.get(1).hostId == 10,
        entries.get(1).hostId != 1,
        entries.get(1).body == 1,
        entries.get(1).lastImported == 1,
        entries.get(1).title == 1,
        cursor == 0,
        lastOutcome == Create,
        not(entries.get(2).present),
      })

  run outsidePageIsNotStoredTest =
    init
      .then(beginRun)
      .then(walkOne)
      .then(walkOne)
      .expect(not(entries.get(3).present) and cursor == 0 and lastOutcome == Outside and lastPage == 3)

  run noSecondEntryTest =
    init
      .then(beginRun)
      .then(walkOne)
      .then(walkOne)
      .then(walkOne)
      .expect(finished and entries.get(1).present and entries.get(2).present)
      .then(beginRun)
      .then(walkOne)
      .expect(lastOutcome == Skip and entries.get(1).hostId == 10 and nextHostId == 12)

  run resumeSkipsCompletedPageTest =
    init
      .then(beginRun)
      .then(walkOne)
      .then(stopRun)
      .expect(phase == Idle and not(finished) and cursor == 0 and entries.get(1).body == 1)
      .then(setSourceBody(1, 2))
      .then(setSourceTime(1, 2))
      .then(beginRun)
      .then(walkOne)
      .expect(and {
        trace.didResume,
        lastPage == 3,
        not(entries.get(3).present),
        entries.get(1).body == 1,
        entries.get(1).lastImported == 1,
        cursor == 0,
      })

  run recheckStartsAtTheFirstPageTest =
    init
      .then(beginRun)
      .then(walkOne)
      .then(walkOne)
      .then(walkOne)
      .then(setSourceTitle(1, 4))
      .then(setSourceTime(1, 2))
      .then(beginRun)
      .expect(phase == Rechecking and index == 0 and trace.didRecheck)
      .then(walkOne)
      .expect(and {
        lastOutcome == Replace,
        lastPage == 1,
        entries.get(1).title == 4,
        entries.get(1).body == 1,
        entries.get(1).lastImported == 1,
        entries.get(1).sourceTime == 2,
        entries.get(1).hostId == 10,
        entries.get(1).kind == EntryPage,
        cursor == 2,
      })

  run localEditBlocksNewerSourceTest =
    init
      .then(beginRun)
      .then(walkOne)
      .then(walkOne)
      .then(walkOne)
      .then(ownerEditBody(1))
      .expect(entries.get(1).body == 2 and entries.get(1).lastImported == 1)
      .then(setSourceBody(1, 3))
      .then(setSourceTime(1, 2))
      .then(beginRun)
      .then(walkOne)
      .expect(and {
        lastOutcome == LocalEdit,
        entries.get(1).body == 2,
        entries.get(1).title == 1,
        entries.get(1).lastImported == 1,
        entries.get(1).sourceTime == 1,
        entries.get(1).kind == EntryPage,
        entries.get(1).visibility == Public,
        entries.get(1).present,
      })

  run replaceKeepsKindAndVisibilityTest =
    init
      .then(beginRun)
      .then(walkOne)
      .then(walkOne)
      .then(walkOne)
      .then(ownerSetArticle(1))
      .then(ownerSetDraft(1))
      .then(setSourceBody(1, 2))
      .then(setSourceTime(1, 2))
      .then(beginRun)
      .then(walkOne)
      .expect(and {
        lastOutcome == Replace,
        entries.get(1).kind == Article,
        entries.get(1).visibility == Draft,
        entries.get(1).body == 2,
        entries.get(1).lastImported == 2,
        entries.get(1).hostId == 10,
        entries.get(1).sourceTime == 2,
      })

  run titleChangeIsNotALocalEditTest =
    init
      .then(beginRun)
      .then(walkOne)
      .then(walkOne)
      .then(walkOne)
      .then(ownerRetitle(1))
      .expect(entries.get(1).title == 2 and entries.get(1).body == entries.get(1).lastImported)
      .then(setSourceTitle(1, 4))
      .then(setSourceTime(1, 2))
      .then(beginRun)
      .then(walkOne)
      .expect(lastOutcome == Replace and entries.get(1).title == 4 and not(trace.didLocal))

  run emptyBodyDoesNotCreateTest =
    init
      .then(setSourceBody(1, 0))
      .then(beginRun)
      .then(walkOne)
      .expect(and {
        lastOutcome == EmptyBody,
        not(entries.get(1).present),
        cursor == -1,
        phase == Walking,
      })
      .then(walkOne)
      .expect(lastPage == 3 and not(entries.get(3).present))

  run emptyBodyDoesNotReplaceTest =
    init
      .then(beginRun)
      .then(walkOne)
      .then(walkOne)
      .then(walkOne)
      .then(setSourceBody(1, 0))
      .then(setSourceTime(1, 2))
      .then(beginRun)
      .then(walkOne)
      .expect(lastOutcome == EmptyBody and entries.get(1).body == 1 and entries.get(1).lastImported == 1 and entries.get(1).present)

  run deleteThenRecheckMintsANewHostIdTest =
    init
      .then(beginRun)
      .then(walkOne)
      .then(walkOne)
      .then(walkOne)
      .then(ownerDelete(1))
      .expect(not(entries.get(1).present))
      .then(beginRun)
      .then(walkOne)
      .expect(lastOutcome == Create and entries.get(1).present and entries.get(1).hostId == 12 and trace.didRecreate)

  run unavailableLeavesTheEntryTest =
    init
      .then(beginRun)
      .then(walkOne)
      .then(walkOne)
      .then(walkOne)
      .then(setUnavailable(1))
      .then(beginRun)
      .then(walkOne)
      .expect(lastOutcome == Unavailable and entries.get(1).present and entries.get(1).body == 1 and cursor == 2)

  run deferDoesNotAdvanceTest =
    init
      .then(beginRun)
      .then(deferWalk)
      .expect(index == 0 and cursor == -1 and phase == Walking and not(entries.get(1).present) and trace.didDefer)
      .then(walkOne)
      .expect(lastOutcome == Create and entries.get(1).present and cursor == 0)
}
