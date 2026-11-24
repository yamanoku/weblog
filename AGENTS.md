<!-- sdev:begin -->
## Specifications-first development

Before creating or changing specifications, design, implementation, or verification, run `./bin/sdev help` and choose the guide for the task.
Tasks include defining product purpose, specifying feature requirements, designing an implementation, and updating documents.

Treat an idea such as 'I want to build this' as a starting point for discussing purpose and scope, rather than permission to implement.
When only a document is requested, present the document and its key points, then stop. When implementation is requested, present requirement and design decisions along the way.
Ask the user about unresolved decisions affecting purpose, scope, or observable behavior.
Ask instead of inventing purposes or constraints; prefer available question tools and follow up according to the answers.
Read `./bin/sdev help workflow` for the full workflow.

Prioritize the consuming project's instructions, conventions, and existing specifications.
If no template is designated for a new document, choose one from `./bin/sdev template`. Respect an existing document's structure when editing it.

Use this project's Product, Requirements, and Design. Without another placement rule, put specifications under `docs/products/`.
Use the default language and translations configured in sdev.toml. Default-language documents use `.md`; other language versions use `.<language>.md`.
Keep language versions equivalent and update them in the same change.
<!-- sdev:end -->

## Quint checks during implementation verification

When verifying an implementation, also run every Quint model that covers the behavior being changed. Models live next to that feature's requirements as `<name>.qnt` and `<name>Test.qnt`.

The ActivityPub Follow, Undo, and delivery model is `docs/products/weblog/features/activitypub/followDelivery.qnt`. Its test module is `followDeliveryTest`. Its invariant is `safety`.

The Cosense import and local-edit model is `docs/products/weblog/features/cosense-import/cosenseImport.qnt`. Its test module is `cosenseImportTest`. Its invariant is `safety`.

From the directory that contains the model:

```sh
npx @informalsystems/quint test followDeliveryTest.qnt --main followDeliveryTest
npx @informalsystems/quint run followDelivery.qnt --main followDelivery --invariant safety
```

```sh
npx @informalsystems/quint test cosenseImportTest.qnt --main cosenseImportTest
npx @informalsystems/quint run cosenseImport.qnt --main cosenseImport --invariant safety
```

`quint` may be absent from `PATH`. Use `npx @informalsystems/quint`.

Tests must pass. `quint run --invariant safety` must report no violation. Say so in the verification report, including the seed the command prints.

These commands check the model. Still verify the implementation's own scenarios. A passing Quint run does not replace that.

If the implementation and the model disagree, stop and report the disagreement. Leave both unchanged until the user decides which one is wrong.

When a change alters a property the model states, update the model in the same change and run both commands again.
