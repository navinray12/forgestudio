# Component Access

Control access to individual editor components.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [component-access.controller.ts](component-access.controller.ts) | Component access: HTTP handlers that translate requests into module operations and responses. File responsibility: component access controller. |
| [component-access.routes.ts](component-access.routes.ts) | Component access: HTTP route registration and middleware order. File responsibility: component access routes. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
