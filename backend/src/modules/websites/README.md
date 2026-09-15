# Websites

Create, retrieve and update websites and their editor data.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [website.controller.ts](website.controller.ts) | Websites: HTTP handlers that translate requests into module operations and responses. File responsibility: website controller. |
| [website.routes.ts](website.routes.ts) | Websites: HTTP route registration and middleware order. File responsibility: website routes. |
| [website.service.ts](website.service.ts) | Websites: business operations and coordination with persistence or external services. File responsibility: website service. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
