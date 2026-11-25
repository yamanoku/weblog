// Scripted paths for followDelivery.qnt. Random exploration lives on the main module.
module followDeliveryTest {
  import followDelivery.* from "./followDelivery"

  run followStoresOneFollowerTest =
    init
      .then(follow(1))
      .expect(followers == Set(1) and acceptJobs.size() == 1 and activities.size() == 0)
      .then(sendAccept)
      .expect(followers.contains(1) and acceptJobs.size() == 0 and trace.didSendAccept)

  run secondFollowRejectedTest =
    init
      .then(follow(1))
      .expect(followers.size() == 1)
      .then(follow(1).fail())

  run followAgainKeepsOneFollowerTest =
    init
      .then(follow(1))
      .then(followAgain(1))
      .expect(followers.size() == 1 and acceptJobs.size() == 2)

  run undoRemovesFollowerTest =
    init
      .then(follow(1))
      .then(undo(1))
      .expect(followers.size() == 0 and acceptJobs.size() == 0 and trace.didUndo)

  run undoOfStrangerFailsTest =
    init
      .then(undo(1).fail())

  run createWithFollowerTest =
    init
      .then(follow(1))
      .then(publishArticle(1))
      .expect(and {
        entries.get(1).delivered,
        entries.get(1).open,
        activities.size() == 1,
        activities.forall(a => a.objectId == 1 and a.kind == Create and a.activityId != a.objectId),
        jobs.size() == 1,
      })

  run createWithNoFollowerTest =
    init
      .then(publishNote(1))
      .expect(activities.size() == 1 and jobs.size() == 0 and entries.get(1).delivered and trace.didPublicOnly)

  run diarySendsCreateTest =
    init
      .then(follow(1))
      .then(publishDiary(1))
      .expect(activities.size() == 1 and activities.exists(a => a.kind == Create and a.objectId == 1) and entries.get(1).delivered)

  run diaryKindChangeSendsNothingTest =
    init
      .then(publishArticle(1))
      .then(publishDiary(1))
      .expect(activities.size() == 1 and not(activities.exists(a => a.kind == Update)))

  run pageSendsNothingTest =
    init
      .then(publishPage(1))
      .expect(activities.size() == 0 and not(entries.get(1).delivered) and trace.didSavePage)

  run titleOnlySendsNothingTest =
    init
      .then(publishArticle(1))
      .then(editNonBody(1))
      .expect(activities.size() == 1 and not(activities.exists(a => a.kind == Update)) and trace.didQuiet)

  run bodySendsUpdateTest =
    init
      .then(publishBookmark(1))
      .then(editBody(1))
      .expect(activities.exists(a => a.kind == Update and a.objectId == 1 and a.bodyRev == 1))

  run draftSendsDeleteAndKeepsRecordTest =
    init
      .then(publishArticle(1))
      .then(saveDraft(1))
      .expect(entries.get(1).delivered and not(entries.get(1).open) and activities.exists(a => a.kind == Delete))

  run redeliverSendsNewCreateTest =
    init
      .then(publishArticle(1))
      .then(deleteEntry(1))
      .then(publishArticle(1))
      .expect(and {
        activities.filter(a => a.kind == Create).map(a => a.activityId).size() == 2,
        activities.exists(a => a.kind == Delete),
        entries.get(1).delivered,
        entries.get(1).open,
      })

  run neverDeliveredDeleteSendsNothingTest =
    init
      .then(deleteEntry(1))
      .expect(activities.size() == 0 and entries.get(1).deleted and not(entries.get(1).delivered))

  run retryKeepsActivityIdTest =
    init
      .then(follow(1))
      .then(publishArticle(1))
      .then(failSend)
      .expect(jobs.size() == 1 and activities.size() == 1 and trace.didRetry and followers == Set(1))
      .then(sendOne)
      .expect(posts.size() == 1 and jobs.size() == 0 and activities.size() == 1)

  run undoSkipsInFlightTargetTest =
    init
      .then(follow(1))
      .then(publishArticle(1))
      .then(undo(1))
      .then(skipOne)
      .expect(posts.size() == 0 and jobs.size() == 0 and trace.didSkip and followers.size() == 0)

  run newFollowerIsNotBackfilledTest =
    init
      .then(publishArticle(1))
      .then(follow(2))
      .expect(activities.size() == 1 and jobs.size() == 0 and acceptJobs.size() == 1)

  run replyIsNotDeliverableTest =
    init
      .then(makeReply(1))
      .expect(activities.size() == 0 and entries.get(1).reply)
      .then(publishNote(1))
      .then(makeReply(1))
      .expect(not(deliverable(entries.get(1))) and activities.exists(a => a.kind == Delete))

  run articleIsOneCreateTest =
    init
      .then(publishArticle(1))
      .expect(activities.size() == 1 and entries.get(1).kind == Article)
      .then(publishNote(1))
      .expect(activities.size() == 1 and entries.get(1).kind == Note and not(activities.exists(a => a.kind == Update)))
}
