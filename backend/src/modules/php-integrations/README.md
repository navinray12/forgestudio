# Php Integrations

Support existing Composer/PHP integration operations.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [composer.controller.ts](composer.controller.ts) | Php integrations: HTTP handlers that translate requests into module operations and responses. File responsibility: composer controller. |
| [composer.routes.ts](composer.routes.ts) | Php integrations: HTTP route registration and middleware order. File responsibility: composer routes. |
| [composer.service.ts](composer.service.ts) | Php integrations: business operations and coordination with persistence or external services. File responsibility: composer service. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
