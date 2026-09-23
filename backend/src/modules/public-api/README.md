# Public Api

Expose versioned website and publishing HTTP handlers and response envelopes.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [api-v1.controller.ts](api-v1.controller.ts) | Public api: HTTP handlers that translate requests into module operations and responses. File responsibility: api v1 controller. |
| [api-v1.routes.ts](api-v1.routes.ts) | Public api: HTTP route registration and middleware order. File responsibility: api v1 routes. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
