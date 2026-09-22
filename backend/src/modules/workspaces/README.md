# Workspaces

Manage workspaces and the resources assigned to them.

Routes register paths and middleware. Controllers translate HTTP input and output. Services coordinate business rules. Repositories isolate persistence where a separate boundary already exists. Not every module needs every layer.

| File | Responsibility |
| --- | --- |
| [workspace.service.ts](workspace.service.ts) | Workspaces: business operations and coordination with persistence or external services. File responsibility: workspace service. |

See the [navigation guide](../../../../docs/code-navigation/README.md) for naming, comments, compatibility and verification.
