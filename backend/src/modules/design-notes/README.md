# Design Notes

Manage comments and notes attached to editor work.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [design-notes.controller.ts](design-notes.controller.ts) | Design notes: HTTP handlers that translate requests into module operations and responses. File responsibility: design notes controller. |
| [design-notes.routes.ts](design-notes.routes.ts) | Design notes: HTTP route registration and middleware order. File responsibility: design notes routes. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
