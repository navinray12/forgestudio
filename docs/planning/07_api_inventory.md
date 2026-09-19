# Deliverable 07: Comprehensive API Inventory
**Project:** ForgeStudio SaaS Platform  
**Date:** September 2026  
**Format:** Method, Route, Middleware/Auth, Controller, Request/Response Contract  

---

## 1. Authentication, Identity & User Management

| Method | Endpoint | Auth Guard | Controller / Service | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login`<br>`/api/auth/login` | Public (Rate Limited) | `loginHandler` | Authenticates with email/phone + password; returns User and sets HTTP-only cookie. |
| `POST` | `/api/v1/auth/signup`<br>`/api/auth/signup` | Public (Rate Limited) | `signupHandler` | Registers new user; hashes password via argon2/bcrypt. |
| `POST` | `/api/v1/auth/send-otp` | Public | `sendOtpHandler` | Sends email or WhatsApp OTP for verification. |
| `POST` | `/api/v1/auth/verify-otp` | Public | `verifyOtpHandler` | Validates OTP hash against active pending record. |
| `GET` | `/api/v1/auth/google` | Public | `passport.authenticate("google")` | Initiates Google OAuth2 handshake. |
| `GET` | `/api/v1/auth/google/callback` | Public | `googleCallbackHandler` | Handles OAuth2 callback, creates or links identity. |
| `GET` | `/api/v1/auth/github` | Public | `passport.authenticate("github")` | Initiates GitHub OAuth2 handshake. |
| `GET` | `/api/v1/auth/github/callback` | Public | `githubCallbackHandler` | Handles GitHub OAuth2 callback. |
| `GET` | `/api/v1/auth/me`<br>`/api/users/me` | `requireAuth` | `getMeHandler` | Returns authenticated user profile, active subscription, and teams. |
| `POST` | `/api/v1/auth/logout` | `requireAuth` | `logoutHandler` | Revokes current session token and clears cookies. |
| `POST` | `/api/v1/auth/forgot-password` | Public | `forgotPasswordHandler` | Generates password reset token and dispatches email. |
| `POST` | `/api/v1/auth/reset-password` | Public | `resetPasswordHandler` | Validates reset token and updates password hash. |

---

## 2. Websites, Content & Lifecycle Management

| Method | Endpoint | Auth Guard | Controller / Service | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/websites` | `requireAuth` | `getWebsitesHandler` | Lists websites owned or shared with the user. |
| `POST` | `/api/websites` | `requireAuth` | `createWebsiteHandler` | Creates a new website with default CanonicalWebsiteData. |
| `GET` | `/api/websites/:id` | `authorizeCapability("VIEW")` | `getWebsiteByIdHandler` | Fetches website metadata and JSON `editorData`. |
| `PUT` | `/api/websites/:id` | `authorizeCapability("EDIT")` | `updateWebsiteHandler` | Persists updated canonical `editorData`. |
| `DELETE` | `/api/websites/:id` | `authorizeCapability("DELETE")` | `deleteWebsiteHandler` | Soft/hard deletes website and dependent records. |
| `GET` | `/api/websites/public/:id` | Public | `getPublicWebsiteHandler` | Returns published website JSON for runtime rendering. |
| `POST` | `/api/websites/:id/duplicate` | `authorizeCapability("CREATE")` | `duplicateWebsiteHandler` | Clones website, pages, and settings. |

---

## 3. Revisions & Rollback

| Method | Endpoint | Auth Guard | Controller / Service | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/websites/:id/revisions` | `authorizeCapability("VIEW")` | `getWebsiteRevisionsHandler` | Lists historical snapshots of website revisions. |
| `GET` | `/api/websites/:id/revisions/:revId` | `authorizeCapability("VIEW")` | `getRevisionByIdHandler` | Fetches snapshot data for a specific revision. |
| `POST` | `/api/websites/:id/revisions` | `authorizeCapability("EDIT")` | `createRevisionHandler` | Creates a manual checkpoint revision snapshot. |
| `POST` | `/api/websites/:id/revisions/:revId/restore` | `authorizeCapability("EDIT")` | `restoreRevisionHandler` | Restores website `editorData` from a historical revision. |

---

## 4. Publishing & Deployments

| Method | Endpoint | Auth Guard | Controller / Service | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/websites/:id/validate-publish` | `authorizeCapability("PUBLISH")` | `validatePublishHandler` | Runs structural and link validation before publishing. |
| `POST` | `/api/websites/:id/publish` | `authorizeCapability("PUBLISH")` | `publishWebsiteHandler` | Executes publication pipeline to target destination. |
| `GET` | `/api/websites/:id/deployments` | `authorizeCapability("VIEW")` | `getDeploymentsHandler` | Returns history of deployment logs and statuses. |
| `GET` | `/api/websites/:id/deployments/:deploymentId` | `authorizeCapability("VIEW")` | `getDeploymentByIdHandler` | Returns deployment details, byte counts, and errors. |
| `GET` | `/api/websites/:id/deployments/:deploymentId/export-download` | `authorizeCapability("VIEW")` | `downloadStaticExportHandler` | Streams generated static ZIP archive to client. |
| `POST` | `/api/websites/:id/deployments/:deploymentId/rollback` | `authorizeCapability("ROLLBACK")` | `rollbackDeploymentHandler` | Rolls back destination to prior successful deployment. |
| `POST` | `/api/websites/:id/schedule-publish` | `authorizeCapability("PUBLISH")` | `schedulePublishHandler` | Queues background job for future publication. |
| `POST` | `/api/websites/:id/cancel-scheduled-publish` | `authorizeCapability("PUBLISH")` | `cancelScheduledPublishHandler` | Cancels pending scheduled publication job. |

---

## 5. WordPress Integration & Webhooks

| Method | Endpoint | Auth Guard | Controller / Service | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/websites/:id/wordpress/connect` | `authorizeCapability("MANAGE_INTEGRATIONS")` | `connectWordPressHandler` | Registers WordPress site URL and credentials. |
| `GET` | `/api/websites/:id/wordpress/status` | `authorizeCapability("VIEW")` | `getWordPressStatusHandler` | Returns WordPress connection status and health. |
| `POST` | `/api/websites/:id/wordpress/verify` | `authorizeCapability("MANAGE_INTEGRATIONS")` | `verifyWordPressHandler` | Verifies remote connector REST connectivity. |
| `POST` | `/api/websites/:id/wordpress/disconnect` | `authorizeCapability("MANAGE_INTEGRATIONS")` | `disconnectWordPressHandler` | Revokes WordPress credentials and unlinks connection. |
| `POST` | `/api/websites/:id/wordpress/sync-pages` | `authorizeCapability("MANAGE_INTEGRATIONS")` | `syncWordPressPagesHandler` | Pushes canonical pages into WordPress Gutenberg blocks. |
| `POST` | `/api/websites/:id/wordpress/webhook` | Public (HMAC Verified) | `handleWordPressWebhook` | Ingests remote WordPress events (post updated/deleted). |

---

## 6. SFTP Transport & Remote Servers

| Method | Endpoint | Auth Guard | Controller / Service | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/sftp/:websiteId` | `authorizeCapability("VIEW")` | `getSftpConfigHandler` | Fetches active SFTP host, port, username, and path. |
| `POST` | `/api/v1/sftp/:websiteId` | `authorizeCapability("MANAGE_INTEGRATIONS")` | `saveSftpConfigHandler` | Saves or updates encrypted SFTP credentials. |
| `POST` | `/api/v1/sftp/:websiteId/test` | `authorizeCapability("MANAGE_INTEGRATIONS")` | `testSftpConnectionHandler` | Executes test handshake and validates directory access. |

---

## 7. Teams, Collaborators & Granular Permissions

| Method | Endpoint | Auth Guard | Controller / Service | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/teams` | `requireAuth` | `getTeamsHandler` | Lists teams user owns or belongs to. |
| `POST` | `/api/teams` | `requireAuth` | `createTeamHandler` | Creates a new organization/team. |
| `POST` | `/api/teams/:id/invite` | `requireAuth` | `inviteTeamMemberHandler` | Sends email invitation with secure token. |
| `POST` | `/api/teams/accept-invite` | `requireAuth` | `acceptTeamInviteHandler` | Validates token and adds user to team. |
| `GET` | `/api/websites/:id/permissions` | `authorizeCapability("MANAGE_TEAM")` | `getGranularPermissionsHandler` | Lists granular capability overrides for website. |
| `POST` | `/api/websites/:id/permissions` | `authorizeCapability("MANAGE_TEAM")` | `setGranularPermissionHandler` | Sets ALLOW/DENY/INHERIT rule on resource/capability. |
| `GET` | `/api/v1/component-access/:websiteId` | `requireAuth` | `getComponentAccessHandler` | Returns component locking permissions. |
| `PUT` | `/api/v1/component-access/:websiteId` | `requireAuth` | `updateComponentAccessHandler` | Updates user permissions for specific components. |

---

## 8. Custom Post Types & Custom Entries

| Method | Endpoint | Auth Guard | Controller / Service | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/cpt/:websiteId/types` | `authorizeCapability("VIEW")` | `getCustomPostTypesHandler` | Lists all custom post types for a website. |
| `POST` | `/api/v1/cpt/:websiteId/types` | `authorizeCapability("EDIT")` | `createCustomPostTypeHandler` | Registers a new CPT and custom field schemas. |
| `GET` | `/api/v1/cpt/:websiteId/types/:cptId` | `authorizeCapability("VIEW")` | `getCustomPostTypeByIdHandler` | Fetches CPT definition and fields. |
| `PUT` | `/api/v1/cpt/:websiteId/types/:cptId` | `authorizeCapability("EDIT")` | `updateCustomPostTypeHandler` | Updates CPT schema and supported attributes. |
| `DELETE` | `/api/v1/cpt/:websiteId/types/:cptId` | `authorizeCapability("EDIT")` | `deleteCustomPostTypeHandler` | Deletes CPT and associated entries. |
| `GET` | `/api/v1/cpt/:websiteId/entries/:cptId` | `authorizeCapability("VIEW")` | `getCustomEntriesHandler` | Fetches custom content entries for a CPT. |
| `POST` | `/api/v1/cpt/:websiteId/entries/:cptId` | `authorizeCapability("EDIT")` | `createCustomEntryHandler` | Creates a new CPT entry with structured field values. |

---

## 9. Forms & Lead Generation

| Method | Endpoint | Auth Guard | Controller / Service | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/forms/submit`<br>`/api/forms/submit` | Public (Rate Limited) | `submitFormHandler` | Captures form submission data, IP, and timestamp. |
| `GET` | `/api/v1/forms/:websiteId/submissions` | `authorizeCapability("VIEW")` | `getFormSubmissionsHandler` | Fetches captured leads for website forms. |

---

## 10. Developer Platform & Public API v1

| Method | Endpoint | Auth Guard | Scopes Required | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/websites` | `authenticateApiV1` | `websites:read` | Lists tenant websites via developer API key. |
| `POST` | `/api/v1/websites` | `authenticateApiV1` | `websites:write` | Programmatically creates a website project. |
| `GET` | `/api/v1/websites/:id` | `authenticateApiV1` | `websites:read` | Returns website details via API key. |
| `PUT` | `/api/v1/websites/:id` | `authenticateApiV1` | `websites:write` | Updates website canonical data via API key. |
| `GET` | `/api/v1/websites/:id/pages` | `authenticateApiV1` | `websites:read` | Lists all pages in a website project. |
| `PUT` | `/api/v1/websites/:id/pages` | `authenticateApiV1` | `websites:write` | Batch updates page structures. |
| `POST` | `/api/v1/websites/:id/publish` | `authenticateApiV1` | `publish:write` | Triggers programmatic publishing via API key. |
| `GET` | `/api/v1/websites/:id/deployments` | `authenticateApiV1` | `websites:read` | Retrieves programmatic deployment history. |
| `POST` | `/api/v1/websites/:id/deployments/:id/rollback` | `authenticateApiV1` | `publish:write` | Triggers programmatic rollback via API key. |
| `GET` | `/api/v1/apikeys` | `requireAuth` | - | Lists user's developer API keys. |
| `POST` | `/api/v1/apikeys` | `requireAuth` | - | Generates new hashed API key with specified scopes. |
| `DELETE` | `/api/v1/apikeys/:id` | `requireAuth` | - | Revokes an API key. |

---

## 11. Operations, Automation & Auditing

| Method | Endpoint | Auth Guard | Controller / Service | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/operations/health` | Public | `getSystemHealthHandler` | Checks database, redis/job queue, memory, and uptime. |
| `GET` | `/api/v1/operations/jobs` | `requireRole("ADMIN")` | `listJobsHandler` | Lists queued, running, failed, and completed background jobs. |
| `POST` | `/api/v1/operations/jobs/:id/cancel` | `requireRole("ADMIN")` | `cancelJobHandler` | Cancels a queued background job. |
| `GET` | `/api/v1/audit-logs` | `requireRole("ADMIN")` | `queryAuditLogsHandler` | Searches security and audit trail logs. |
