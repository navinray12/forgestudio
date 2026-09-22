# Media

Authenticate and process uploaded images.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [upload.middleware.ts](upload.middleware.ts) | Media: request processing before the final handler. File responsibility: upload middleware. |
| [upload.routes.ts](upload.routes.ts) | Media: HTTP route registration and middleware order. File responsibility: upload routes. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
