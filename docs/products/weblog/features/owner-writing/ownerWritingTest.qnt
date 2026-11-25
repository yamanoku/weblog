// Scripted paths for ownerWriting.qnt.
module ownerWritingTest {
  import ownerWriting.* from "./ownerWriting"

  run createFixesTheCanonicalIdTest =
    init
      .then(createArticle(1, 1, 1, Draft))
      .expect(entries.get(1).present and entries.get(1).title == 1 and entries.get(1).edges == 1)
      .then(write(1, Article, 2, 1, Draft, 0))
      .expect(and {
        entries.get(1).present,
        entries.get(1).title == 2,
        entries.get(1).past.contains(1),
        entries.get(2).present == false,
      })

  run emptyTitleStoresNothingTest =
    init
      .then(createArticle(1, 0, 1, Draft).fail())

  run bookmarkWithoutUrlStoresNothingTest =
    init
      .then(createBookmark(1, 1, 1, Draft, 0).fail())

  run noteMayHaveAnEmptyTitleTest =
    init
      .then(createNote(1, 0, 1, Public))
      .expect(entries.get(1).present and entries.get(1).title == 0 and entries.get(1).kind == Note and deliverable(entries.get(1)))

  run publicEmptyBodyStoresNothingTest =
    init
      .then(createArticle(1, 1, 0, Public).fail())

  run publicEmptyUpdateLeavesTheBodyTest =
    init
      .then(createArticle(1, 1, 1, Draft))
      .expect(entries.get(1).body == 1 and entries.get(1).edges == 1)
      .then(write(1, Article, 1, 0, Public, 0).fail())

  run draftEmptyBodyIsStoredTest =
    init
      .then(createArticle(1, 1, 1, Public))
      .then(write(1, Article, 1, 0, Draft, 0))
      .expect(entries.get(1).visibility == Draft and entries.get(1).body == 0 and entries.get(1).edges == 0 and entries.get(1).publishedAt == 0)

  run bookmarkMayBePublicWithAnEmptyBodyTest =
    init
      .then(createBookmark(1, 1, 0, Public, 2))
      .expect(entries.get(1).body == 0 and entries.get(1).url == 2 and entries.get(1).edges == 0 and deliverable(entries.get(1)))

  run updateKeepsTheIdAndReplacesFieldsTest =
    init
      .then(createBookmark(1, 1, 1, Draft, 1))
      .then(write(1, Article, 2, 2, Public, 2))
      .expect(and {
        entries.get(1).kind == Article,
        entries.get(1).title == 2,
        entries.get(1).body == 2,
        entries.get(1).visibility == Public,
        entries.get(1).url == 0,
        entries.get(1).past.contains(1),
        deliverable(entries.get(1)),
      })

  run publishSetsPublishedAtOnceTest =
    init
      .then(createArticle(1, 1, 1, Public))
      .expect(entries.get(1).publishedAt == 1 and deliverable(entries.get(1)))
      .then(write(1, Article, 1, 2, Public, 0))
      .expect(entries.get(1).publishedAt == 1 and entries.get(1).body == 2 and entries.get(1).edges == 2)

  run draftClearsPublishedAtAndKeepsDeliveredTest =
    init
      .then(createNote(1, 1, 1, Public))
      .then(markDelivered(1))
      .then(write(1, Note, 1, 1, Draft, 0))
      .expect(not(deliverable(entries.get(1))) and entries.get(1).publishedAt == 0 and entries.get(1).delivered and not(readerSeesBody(entries.get(1))))
      .then(write(1, Note, 1, 1, Public, 0))
      .expect(entries.get(1).publishedAt == 2 and entries.get(1).delivered and trace.didRepublish)

  run diaryIsDeliverableLikeAnArticleTest =
    init
      .then(createDiary(1, 1, 1, Public))
      .expect(deliverable(entries.get(1)) and entries.get(1).kind == Diary and entries.get(1).publishedAt == 1)
      .then(write(1, Diary, 1, 1, Draft, 0))
      .expect(not(deliverable(entries.get(1))) and entries.get(1).publishedAt == 0 and entries.get(1).kind == Diary)

  run publicEmptyDiaryStoresNothingTest =
    init
      .then(createDiary(1, 1, 1, Public))
      .expect(entries.get(1).body == 1)
      .then(write(1, Diary, 1, 0, Public, 0).fail())

  run pageIsPublicButNotDeliverableTest =
    init
      .then(createPage(1, 1, 1, Public))
      .expect(not(deliverable(entries.get(1))) and entries.get(1).publishedAt == 0 and entries.get(1).cosenseId == 1 and readerSeesBody(entries.get(1)))
      .then(write(1, PageKind, 2, 2, Public, 0))
      .expect(entries.get(1).cosenseId == 1 and entries.get(1).title == 2 and entries.get(1).past.contains(1) and entries.get(1).publishedAt == 0)

  run replyHasNoPublishedAtTest =
    init
      .then(createNote(1, 0, 1, Public))
      .then(createReply(2, 1, 1))
      .expect(and {
        entries.get(2).replyTo == 1,
        entries.get(2).title == 0,
        entries.get(2).visibility == Public,
        entries.get(2).publishedAt == 0,
        not(deliverable(entries.get(2))),
        deliverable(entries.get(1)),
        readerSeesBody(entries.get(2)),
      })

  run deleteUndeliveredIsAMissTest =
    init
      .then(createArticle(1, 1, 1, Public))
      .then(createNote(2, 1, 1, Draft))
      .then(delete(1))
      .expect(entries.get(1).deleted and not(entries.get(1).present) and not(entries.get(1).delivered) and entries.get(1).body == 0 and entries.get(2).present)

  run deleteDeliveredKeepsTheIdTest =
    init
      .then(createArticle(1, 1, 1, Public))
      .then(markDelivered(1))
      .then(delete(1))
      .expect(entries.get(1).deleted and entries.get(1).delivered and entries.get(1).body == 0 and not(entries.get(1).present))
      .then(createArticle(1, 1, 1, Public).fail())

  run collidingTitlesHaveNoViewPathTest =
    init
      .then(createArticle(1, 1, 1, Public))
      .then(createArticle(2, 1, 1, Public))
      .expect(not(hasViewPath(entries, 1)) and not(hasViewPath(entries, 2)))
      .then(write(2, Article, 2, 1, Public, 0))
      .expect(hasViewPath(entries, 1) and hasViewPath(entries, 2))

  run updateDoesNotChangeTheOtherBodyTest =
    init
      .then(createArticle(1, 1, 1, Draft))
      .then(createPage(2, 1, 2, Draft))
      .then(write(1, Article, 2, 2, Public, 0))
      .expect(entries.get(2).body == 2 and entries.get(2).edges == 2 and entries.get(2).title == 1)
}
