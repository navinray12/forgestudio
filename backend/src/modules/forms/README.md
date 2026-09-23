# Forms

Receive and manage website form submissions.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [form.controller.ts](form.controller.ts) | Forms: HTTP handlers that translate requests into module operations and responses. File responsibility: form controller. |
| [form.routes.ts](form.routes.ts) | Forms: HTTP route registration and middleware order. File responsibility: form routes. |
| [form.service.ts](form.service.ts) | Forms: business operations and coordination with persistence or external services. File responsibility: form service. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
