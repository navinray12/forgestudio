# Plugin Integrations

Manage connections to supported external plugins.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [plugin-integration.controller.ts](plugin-integration.controller.ts) | Plugin integrations: HTTP handlers that translate requests into module operations and responses. File responsibility: plugin integration controller. |
| [plugin-integration.routes.ts](plugin-integration.routes.ts) | Plugin integrations: HTTP route registration and middleware order. File responsibility: plugin integration routes. |
| [plugin-integration.service.ts](plugin-integration.service.ts) | Plugin integrations: business operations and coordination with persistence or external services. File responsibility: plugin integration service. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
