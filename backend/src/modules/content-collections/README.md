# Content Collections

Manage custom post types and their structured content.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [custom-post-type.controller.ts](custom-post-type.controller.ts) | Content collections: HTTP handlers that translate requests into module operations and responses. File responsibility: custom post type controller. |
| [custom-post-type.routes.ts](custom-post-type.routes.ts) | Content collections: HTTP route registration and middleware order. File responsibility: custom post type routes. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
