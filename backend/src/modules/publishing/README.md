# Publishing

Coordinate releases, approval, rollback, deployment state and destination adapters.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [approval.service.ts](approval.service.ts) | Publishing: business operations and coordination with persistence or external services. File responsibility: approval service. |
| [deployment-state.repository.ts](deployment-state.repository.ts) | Publishing: database reads and writes. File responsibility: deployment state repository. |
| [destinations/destination-availability.ts](destinations/destination-availability.ts) | Publishing: module implementation. File responsibility: destination availability. |
| [destinations/internal.publisher.ts](destinations/internal.publisher.ts) | Publishing: module implementation. File responsibility: internal publisher. |
| [destinations/registry.ts](destinations/registry.ts) | Publishing: module implementation. File responsibility: registry. |
| [destinations/sftp.publisher.ts](destinations/sftp.publisher.ts) | Publishing: module implementation. File responsibility: sftp publisher. |
| [destinations/static-compiler.ts](destinations/static-compiler.ts) | Publishing: module implementation. File responsibility: static compiler. |
| [destinations/static-export.publisher.ts](destinations/static-export.publisher.ts) | Publishing: module implementation. File responsibility: static export publisher. |
| [destinations/types.ts](destinations/types.ts) | Publishing: module implementation. File responsibility: types. |
| [destinations/wordpress.publisher.ts](destinations/wordpress.publisher.ts) | Publishing: module implementation. File responsibility: wordpress publisher. |
| [published-snapshot.repository.ts](published-snapshot.repository.ts) | Publishing: database reads and writes. File responsibility: published snapshot repository. |
| [publishing.controller.ts](publishing.controller.ts) | Publishing: HTTP handlers that translate requests into module operations and responses. File responsibility: publishing controller. |
| [publishing.service.ts](publishing.service.ts) | Publishing: business operations and coordination with persistence or external services. File responsibility: publishing service. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
