# Teams

Manage teams and team membership.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [team.controller.ts](team.controller.ts) | Teams: HTTP handlers that translate requests into module operations and responses. File responsibility: team controller. |
| [team.routes.ts](team.routes.ts) | Teams: HTTP route registration and middleware order. File responsibility: team routes. |
| [team.service.ts](team.service.ts) | Teams: business operations and coordination with persistence or external services. File responsibility: team service. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
