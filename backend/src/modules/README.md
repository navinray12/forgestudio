# Backend business modules

Start with the business capability, then choose the file matching the operation.

| Module | Owns |
| --- | --- |
| [api-keys](api-keys/README.md) | Issue, list and revoke API credentials for integrations. |
| [audit](audit/README.md) | Record activity used for review and operational investigation. |
| [authentication](authentication/README.md) | Sign-in, registration, sessions, OTP verification, OAuth and API authentication. |
| [component-access](component-access/README.md) | Control access to individual editor components. |
| [content-collections](content-collections/README.md) | Manage custom post types and their structured content. |
| [custom-code](custom-code/README.md) | Store website-specific code snippets and their configuration. |
| [design-notes](design-notes/README.md) | Manage comments and notes attached to editor work. |
| [developer-tools](developer-tools/README.md) | Expose developer-facing tools and metadata. |
| [forms](forms/README.md) | Receive and manage website form submissions. |
| [integrations](integrations/README.md) | Manage configured external service connections. |
| [media](media/README.md) | Authenticate and process uploaded images. |
| [multisite](multisite/README.md) | Manage the existing multisite operations. |
| [notifications](notifications/README.md) | Send transactional email through the configured provider. |
| [organizations](organizations/README.md) | Manage organization records and membership. |
| [pages](pages/README.md) | Validate and persist guarded draft commands, including concurrency and receipt handling. |
| [permissions](permissions/README.md) | Evaluate resource access and maintain permission rules. |
| [php-integrations](php-integrations/README.md) | Support existing Composer/PHP integration operations. |
| [plugin-compatibility](plugin-compatibility/README.md) | Manage existing plugin compatibility checks and records. |
| [plugin-integrations](plugin-integrations/README.md) | Manage connections to supported external plugins. |
| [public-api](public-api/README.md) | Expose versioned website and publishing HTTP handlers and response envelopes. |
| [publishing](publishing/README.md) | Coordinate releases, approval, rollback, deployment state and destination adapters. |
| [revisions](revisions/README.md) | Read and store document revision history. |
| [sftp-connections](sftp-connections/README.md) | Manage SFTP connection configuration; delivery availability is controlled by publishing. |
| [subscriptions](subscriptions/README.md) | Apply subscription and usage-limit rules. |
| [teams](teams/README.md) | Manage teams and team membership. |
| [templates](templates/README.md) | Manage reusable website or editor templates. |
| [websites](websites/README.md) | Create, retrieve and update websites and their editor data. |
| [wordpress-connections](wordpress-connections/README.md) | Manage WordPress connection support; this folder is not a native WordPress plugin. |
| [workspaces](workspaces/README.md) | Manage workspaces and the resources assigned to them. |

See the [project navigation guide](../../../docs/code-navigation/README.md) for the request pipeline and development conventions.
