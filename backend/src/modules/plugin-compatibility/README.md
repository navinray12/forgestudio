# Plugin Compatibility

Manage existing plugin compatibility checks and records.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [plugin-compat.controller.ts](plugin-compat.controller.ts) | Plugin compatibility: HTTP handlers that translate requests into module operations and responses. File responsibility: plugin compat controller. |
| [plugin-compat.routes.ts](plugin-compat.routes.ts) | Plugin compatibility: HTTP route registration and middleware order. File responsibility: plugin compat routes. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
