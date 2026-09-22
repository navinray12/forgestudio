# Developer Tools

Expose developer-facing tools and metadata.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [developer.controller.ts](developer.controller.ts) | Developer tools: HTTP handlers that translate requests into module operations and responses. File responsibility: developer controller. |
| [developer.routes.ts](developer.routes.ts) | Developer tools: HTTP route registration and middleware order. File responsibility: developer routes. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
