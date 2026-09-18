# Deliverable 02: Existing Feature Inventory
**Project:** ForgeStudio SaaS Platform  
**Date:** September 2026  
**Scope:** Verified Functional Assets across Frontend, Backend & Integrations  

---

## 1. Authentication & User Management

| Feature | Backend Files | Frontend Files | DB Models | API Endpoints | Status & Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Email & Password Login** | `login.controller.ts`<br>`login.service.ts` | `LoginPage.tsx`<br>`AuthContext.tsx` | `User`, `Session` | `POST /api/v1/auth/login`<br>`POST /api/auth/login` | **Working:** Verifies argon2/bcrypt password, generates session token cookie and returns User object. |
| **Email & Phone Signup** | `signup.controller.ts`<br>`signup.service.ts` | `SignupPage.tsx`<br>`phone-input/` | `User`, `OtpVerification` | `POST /api/v1/auth/signup`<br>`POST /api/auth/signup` | **Working:** Creates user account, generates verification token, sets up initial active state. |
| **Multi-Channel OTP** | `otp.service.ts`<br>`auth.controller.ts` | `AuthContext.tsx` | `OtpVerification` | `POST /api/v1/auth/send-otp`<br>`POST /api/v1/auth/verify-otp` | **Working:** Email and WhatsApp OTP generation, verification, attempt limits, expiration. |
| **OAuth 2.0 (Google & GitHub)** | `oauth.controller.ts`<br>`oauth.service.ts`<br>`config/passport.ts` | `LoginPage.tsx`<br>`SignupPage.tsx` | `Identity`, `User` | `GET /api/v1/auth/google`<br>`GET /api/v1/auth/github` | **Working:** Passport strategy callback creates or links identity to user record. |
| **Session & User Profile** | `session.service.ts`<br>`me.routes.ts` | `AuthContext.tsx` | `Session`, `User` | `GET /api/v1/auth/me`<br>`POST /api/v1/auth/logout` | **Working:** Authenticated session lookup, user profile hydration, secure token revocation. |

---

## 2. Organization, Workspace & Multi-Tenancy

| Feature | Backend Files | Frontend Files | DB Models | API Endpoints | Status & Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Organization Management** | `organization.service.ts` | `TeamSwitcher.tsx` | `Organization`<br>`OrganizationMember` | Internal Services & API V1 | **Working:** Slug generation, member assignment, role assignment (OWNER, ADMIN, MEMBER). |
| **Workspace Management** | `workspace.service.ts` | `TeamSwitcher.tsx` | `Workspace`<br>`WorkspaceMember` | Internal Services & API V1 | **Working:** Workspace grouping under organizations with member-level isolation. |
| **Team Management** | `team.service.ts`<br>`team.controller.ts` | `TeamDashboardView.tsx`<br>`RoleManagerModal.tsx` | `Team`<br>`TeamMember`<br>`TeamInvitation` | `GET /api/v1/teams`<br>`POST /api/v1/teams`<br>`POST /api/v1/teams/:id/invite` | **Working:** Team creation, invitation tokens, member role assignment, audit logging. |

---

## 3. RBAC & Granular Authorization

| Feature | Backend Files | Frontend Files | DB Models | API Endpoints | Status & Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Declarative Capability Middleware** | `permission.service.ts`<br>`auth.middleware.ts` | `WebsiteEditor.tsx` | `WebsiteCollaborator`<br>`GranularPermission` | Route Guards | **Working:** Evaluates `canUserAccessResource(userId, websiteId, resourceId, capability)`. |
| **Granular Permission Overrides** | `permission.service.ts`<br>`website.controller.ts` | `RoleManagerModal.tsx`<br>`ComponentAccessModal.tsx` | `GranularPermission` | `GET /api/websites/:id/permissions`<br>`POST /api/websites/:id/permissions` | **Working:** Explicit resource/capability ALLOW/DENY/INHERIT rules with audit trail. |
| **Component-Level Access Control** | `componentAccess.controller.ts` | `ComponentAccessModal.tsx` | `ComponentAccess` | `GET /api/component-access/:id`<br>`PUT /api/component-access/:id` | **Working:** Locks specific elements or components to specific users/roles. |

---

## 4. Website Lifecycle & Revisions

| Feature | Backend Files | Frontend Files | DB Models | API Endpoints | Status & Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Website CRUD & Cloning** | `website.service.ts`<br>`website.controller.ts` | `UserDashboard.tsx`<br>`PageManagerModal.tsx` | `Website` | `GET /api/websites`<br>`POST /api/websites`<br>`GET /api/websites/:id`<br>`PUT /api/websites/:id` | **Working:** Website creation, project duplicate, title/slug updates, editor data persistence. |
| **Revision History & Checkpoints** | `revision.service.ts`<br>`revision.controller.ts` | `revision-history/`<br>`WebsiteEditor.tsx` | `WebsiteRevision` | `GET /api/websites/:id/revisions`<br>`POST /api/websites/:id/revisions`<br>`POST /api/websites/:id/revisions/:revId/restore` | **Working:** Automatic and manual revision snapshots, diff comparisons, rollback restore. |
| **Autosave Engine** | `autosave/` | `useAutosave.ts`<br>`AutosaveIndicator.tsx` | `Website` | `PUT /api/websites/:id` | **Working:** Debounced dirty-state detection, background server synchronization. |

---

## 5. Visual Editor, Canvas & Widget System

| Feature | Backend Files | Frontend Files | DB Models | API Endpoints | Status & Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Visual Canvas & Drag-and-Drop** | - | `WebsiteEditor.tsx`<br>`renderers.tsx` | - | Client-Side | **Working:** HTML5 Drag & Drop, element insertion, nestable containers, reordering. |
| **Responsive Breakpoint Switcher** | - | `WebsiteEditor.tsx`<br>`types/index.ts` | - | Client-Side | **Working:** Desktop (100%), Tablet (768px), Mobile (375px) canvas viewports. |
| **Navigator & Layers Panel** | - | `WebsiteEditor.tsx` | - | Client-Side | **Working:** Hierarchical element tree, select on click, collapse/expand nodes. |
| **Core Content Widgets** | - | `renderers.tsx`<br>`icons.tsx`<br>`DynamicWidgetInspectors.tsx` | - | Client-Side | **Working:** Heading, Text, Image, Video, Button, Icon, Icon Box, Divider, Spacer, HTML. |
| **Interactive & Pro Widgets** | - | `renderers.tsx`<br>`DynamicWidgetInspectors.tsx` | - | Client-Side | **Working:** Slides, Price Table, Price List, Gallery, Flip Box, Call To Action, Media Carousel, Testimonial Carousel, Nested Carousel, Loop Carousel, Countdown, Reviews, Lottie, Code Highlight. |
| **Navigation Widgets** | - | `NavigationRenderers.tsx`<br>`NavigationSettings.tsx` | - | Client-Side | **Working:** Nav Menu, Mega Menu, Breadcrumbs, Menu Anchor, Off-Canvas Menu. |
| **Social & External Embeds** | - | `renderers.tsx`<br>`IntegrationRenderers.tsx` | - | Client-Side | **Working:** Facebook Page/Button/Comments/Embed, Google Maps, SoundCloud, PayPal/Stripe Button. |

---

## 6. Theme Builder, Custom Types & Dynamic Content

| Feature | Backend Files | Frontend Files | DB Models | API Endpoints | Status & Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Site Parts (Header/Footer/404)** | `website.service.ts` | `WebsiteEditor.tsx`<br>`PublishedSite.tsx` | `Website.editorData` | `PUT /api/websites/:id` | **Working:** Header and footer global injection across pages, sticky headers, conditional display. |
| **Custom Post Types (CPT) Engine** | `customPostType.controller.ts`<br>`cpt.prisma` | `CustomPostTypesPanel.tsx`<br>`CustomPostTypeBuilder.tsx` | `CustomPostType`<br>`CustomField`<br>`CustomEntry` | `GET /api/cpt/types`<br>`POST /api/cpt/types`<br>`GET /api/cpt/entries`<br>`POST /api/cpt/entries` | **Working:** Custom post type definitions, schema fields (text, number, date, media), and content entries. |
| **Dynamic Fonts System** | - | `features/fonts/`<br>`FontPickerModal.tsx` | - | Google Fonts API | **Working:** Dynamic font stylesheet loading, search, preview, and element font-family attachment. |

---

## 7. Forms, Leads & Interactions

| Feature | Backend Files | Frontend Files | DB Models | API Endpoints | Status & Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Visual Form Builder** | `form.service.ts`<br>`form.controller.ts` | `FormWidgetRenderer`<br>`DynamicWidgetInspectors.tsx` | `FormSubmission` | `POST /api/v1/forms/submit`<br>`GET /api/v1/forms/:websiteId/submissions` | **Working:** Form fields definition (text, email, tel, select, checkbox, textarea), required validation. |
| **Form Lead Capture & Storage** | `form.service.ts` | `FormSubmissionList` | `FormSubmission` | `POST /api/forms/submit` | **Working:** Stores client IP, timestamp, submission JSON, submission notification dispatch. |
| **Popup Builder & Triggers** | - | `PopupManagerModal.tsx`<br>`PopupSettingsPanel.tsx`<br>`PopupRuntimePreview.tsx` | `Website.editorData` | Client-Side | **Working:** Time-delay, exit-intent, scroll-depth, and click triggers; frequency capping and overlays. |

---

## 8. Publishing, Deployments & Static Compiler

| Feature | Backend Files | Frontend Files | DB Models | API Endpoints | Status & Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Pre-Publish Validator** | `publishing.service.ts` | `publishingService.ts`<br>`PublishModal.tsx` | `Website` | `POST /api/websites/:id/validate-publish` | **Working:** Verifies home page existence, duplicate slugs, broken component references. |
| **Multi-Destination Publisher** | `publishing.service.ts`<br>`destinations/registry.ts` | `PublishModal.tsx` | `Deployment`<br>`WebsiteRevision` | `POST /api/websites/:id/publish` | **Working:** Creates immutable revision, schedules/executes deployment, updates deployment status. |
| **Static HTML/CSS Compiler** | `staticCompiler.ts`<br>`staticZip.service.ts` | `PublishModal.tsx` | - | `GET /api/websites/:id/deployments/:id/export-download` | **Working:** Generates `index.html`, subpage HTML files, `styles.css`, and portable ZIP archive. |
| **SFTP Transport Deployment** | `sftp.publisher.ts`<br>`sftp.service.ts` | `PublishModal.tsx` | `SftpConnection` | `POST /api/sftp/test`<br>`POST /api/websites/:id/publish` (SFTP) | **Working:** Connects via SSH2, recursive directory creation, byte stream upload, transfer verification. |
| **Deployment History & Rollback** | `publishing.service.ts` | `PublishModal.tsx` | `Deployment` | `GET /api/websites/:id/deployments`<br>`POST /api/websites/:id/deployments/:id/rollback` | **Working:** Historical deployment log, restore prior deployment snapshot. |

---

## 9. Background Jobs & Automation

| Feature | Backend Files | DB Models | Triggers / Status |
| :--- | :--- | :--- | :--- |
| **Durable Job Queue** | `jobRunner.ts`<br>`handlers.ts` | `BackgroundJob` | **Working:** Polling execution of pending jobs (`QUEUED` -> `RUNNING` -> `COMPLETED`/`FAILED`), retry attempts, dead-letter recording. |
| **Scheduled Publishing** | `publishing.service.ts`<br>`handlers.ts` | `BackgroundJob` | **Working:** `SCHEDULED_PUBLISH` job type triggers automated deployment at target UTC timestamp. |
| **Deployment Verification** | `handlers.ts` | `Deployment` | **Working:** `DEPLOYMENT_VERIFY` async job validates post-deployment site health. |
| **Webhook Delivery & Retries** | `handlers.ts`<br>`wordpress/webhook.service.ts` | `BackgroundJob` | **Working:** `WEBHOOK_RETRY` with exponential backoff on HTTP failure. |
