# Notifications

Send transactional email through the configured provider.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [email.service.ts](email.service.ts) | Notifications: business operations and coordination with persistence or external services. File responsibility: email service. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
