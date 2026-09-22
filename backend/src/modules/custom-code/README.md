# Custom Code

Store website-specific code snippets and their configuration.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [custom-code.controller.ts](custom-code.controller.ts) | Custom code: HTTP handlers that translate requests into module operations and responses. File responsibility: custom code controller. |
| [custom-code.routes.ts](custom-code.routes.ts) | Custom code: HTTP route registration and middleware order. File responsibility: custom code routes. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
