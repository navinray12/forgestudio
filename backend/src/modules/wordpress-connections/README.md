# Wordpress Connections

Manage WordPress connection support; this folder is not a native WordPress plugin.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [connector.service.ts](connector.service.ts) | Wordpress connections: business operations and coordination with persistence or external services. File responsibility: connector service. |
| [process-webhook-receipts.ts](process-webhook-receipts.ts) | Wordpress connections: module implementation. File responsibility: process webhook receipts. |
| [transformer.service.ts](transformer.service.ts) | Wordpress connections: business operations and coordination with persistence or external services. File responsibility: transformer service. |
| [webhook-envelope.ts](webhook-envelope.ts) | Wordpress connections: module implementation. File responsibility: webhook envelope. |
| [webhook.service.ts](webhook.service.ts) | Wordpress connections: business operations and coordination with persistence or external services. File responsibility: webhook service. |
| [wordpress.controller.ts](wordpress.controller.ts) | Wordpress connections: HTTP handlers that translate requests into module operations and responses. File responsibility: wordpress controller. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
