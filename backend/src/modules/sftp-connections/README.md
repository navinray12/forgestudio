# Sftp Connections

Manage SFTP connection configuration; delivery availability is controlled by publishing.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [sftp.controller.ts](sftp.controller.ts) | Sftp connections: HTTP handlers that translate requests into module operations and responses. File responsibility: sftp controller. |
| [sftp.routes.ts](sftp.routes.ts) | Sftp connections: HTTP route registration and middleware order. File responsibility: sftp routes. |
| [sftp.service.ts](sftp.service.ts) | Sftp connections: business operations and coordination with persistence or external services. File responsibility: sftp service. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
