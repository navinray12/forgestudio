# Permissions

Evaluate resource access and maintain permission rules.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [permission.service.ts](permission.service.ts) | Permissions: business operations and coordination with persistence or external services. File responsibility: permission service. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
