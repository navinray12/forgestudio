# Pages

Validate and persist guarded draft commands, including concurrency and receipt handling.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [save-website-draft.ts](save-website-draft.ts) | Pages: module implementation. File responsibility: save website draft. |
| [validate-legacy-document.ts](validate-legacy-document.ts) | Pages: module implementation. File responsibility: validate legacy document. |
| [website-draft.routes.ts](website-draft.routes.ts) | Pages: HTTP route registration and middleware order. File responsibility: website draft routes. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
