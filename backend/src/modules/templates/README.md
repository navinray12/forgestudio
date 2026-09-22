# Templates

Manage reusable website or editor templates.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [template.controller.ts](template.controller.ts) | Templates: HTTP handlers that translate requests into module operations and responses. File responsibility: template controller. |
| [template.routes.ts](template.routes.ts) | Templates: HTTP route registration and middleware order. File responsibility: template routes. |
| [template.service.ts](template.service.ts) | Templates: business operations and coordination with persistence or external services. File responsibility: template service. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
