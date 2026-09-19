# Deliverable 08: Frontend Component Inventory
**Project:** ForgeStudio SaaS Platform  
**Date:** September 2026  
**Technology:** React 19, TypeScript, Tailwind CSS v4, Monaco Editor, Lucide Icons  

---

## 1. Top-Level Pages & Route Components

| Component | Path | Responsibilities | State Dependencies |
| :--- | :--- | :--- | :--- |
| **`App.tsx`** | `src/App.tsx` | App root, routing definitions, role-based route protection (`RoleRoute`). | `AuthContext` |
| **`LoginPage.tsx`** | `src/pages/auth/LoginPage.tsx` | Password login, phone login, OAuth trigger buttons (Google/GitHub). | `useAuth`, `phone-input` |
| **`SignupPage.tsx`** | `src/pages/auth/SignupPage.tsx` | Account registration, password confirmation, phone OTP validation. | `useAuth`, `phone-input` |
| **`UserDashboard.tsx`** | `src/pages/dashboard/UserDashboard.tsx` | Project listing, website creation modal, kit import/export, developer tab switcher. | `useAuth`, `useState` |
| **`AdminDashboard.tsx`** | `src/pages/dashboard/AdminDashboard.tsx` | Admin panel view (currently placeholder scaffold). | `useAuth` |
| **`SuperAdminDashboard.tsx`**| `src/pages/dashboard/SuperAdminDashboard.tsx`| Super Admin system view (currently placeholder scaffold). | `useAuth` |
| **`SubscriptionPage.tsx`** | `src/pages/subscriptions/SubscriptionPage.tsx`| Plan comparison, billing cycle selection, plan upgrade triggers. | `useAuth` |
| **`WebsiteEditor.tsx`** | `src/pages/editor/WebsiteEditor.tsx` | Core visual builder studio (canvas, navigator, inspector, toolbar). | Editor state, history stack, canonical data |
| **`PublishedSite.tsx`** | `src/pages/published/PublishedSite.tsx` | Public live runtime renderer for published websites. | `useParams`, canonical JSON |
| **`CustomPostTypesList.tsx`**| `src/pages/dashboard/CustomPostTypesList.tsx`| Lists registered CPTs for a given website. | REST API |
| **`CustomPostTypeBuilder.tsx`**| `src/pages/dashboard/CustomPostTypeBuilder.tsx`| Visual schema builder for CPT fields. | REST API |
| **`CustomEntriesList.tsx`** | `src/pages/dashboard/CustomEntriesList.tsx` | Data grid for viewing custom entries of a CPT. | REST API |
| **`CustomEntryEditor.tsx`** | `src/pages/dashboard/CustomEntryEditor.tsx` | Form editor for inputting custom fields for an entry. | REST API |
| **`SharedTemplatePreviewPage.tsx`**| `src/pages/templates/SharedTemplatePreviewPage.tsx`| Public preview of shared single-page template. | REST API |

---

## 2. Editor Studio Components & Modals

| Component | Path | Purpose |
| :--- | :--- | :--- |
| **`PublishModal.tsx`** | `editor/components/PublishModal.tsx` | Multi-destination publishing dialog (Internal, WordPress, SFTP, Static ZIP), pre-publish validation, deployment logs, rollback controls. |
| **`PageManagerModal.tsx`** | `editor/components/PageManagerModal.tsx` | Multi-page CRUD, slug management, homepage designation, duplicate page, page SEO settings. |
| **`PopupManagerModal.tsx`** | `editor/components/PopupManagerModal.tsx` | Visual popup manager, trigger condition setup (time, scroll, exit-intent), responsive preview. |
| **`PopupSettingsPanel.tsx`** | `editor/components/PopupSettingsPanel.tsx` | Granular trigger configurations, overlay styles, frequency capping. |
| **`ComponentAccessModal.tsx`**| `editor/components/ComponentAccessModal.tsx`| Element-level and component-level permission locking to specific users/roles. |
| **`DeveloperModal.tsx`** | `editor/components/DeveloperModal.tsx` | Developer tools, raw JSON tree inspection, schema validation errors. |
| **`CustomCodeModal.tsx`** | `components/CustomCodeModal.tsx` | Monaco editor integration for page-level and global CSS/JS snippets. |
| **`FontPickerModal.tsx`** | `components/FontPickerModal.tsx` | Google Fonts selector, search, categories, dynamic CSS link injection. |
| **`IconPickerModal.tsx`** | `editor/components/IconPickerModal.tsx` | Lucide icon library browser with search and categorization. |
| **`NotesPanel.tsx`** | `editor/components/NotesPanel.tsx` | Contextual collaboration notes pinned to canvas elements. |
| **`PerformanceSettingsPanel.tsx`**| `editor/components/PerformanceSettingsPanel.tsx`| DOM reduction, CSS minification, lazy loading, and asset priority toggles. |
| **`CodeInjectionRuntime.tsx`**| `editor/components/CodeInjectionRuntime.tsx`| Safe runtime execution of custom `<head>` and `<body>` scripts. |

---

## 3. Widget Renderer Registry (`renderers.tsx`)

| Category | Widget Types | Implementation Status |
| :--- | :--- | :--- |
| **Basic Elements** | `heading`, `text`, `paragraph`, `image`, `video`, `button`, `divider`, `spacer`, `icon`, `html` | **FULLY IMPLEMENTED** |
| **Layout & Structure** | `container`, `div-block`, `columns`, `section` | **FULLY IMPLEMENTED** |
| **Interactive & Conversion**| `slides`, `price-table`, `price-list`, `gallery`, `flip-box`, `call-to-action`, `countdown`, `form`, `login` | **FULLY IMPLEMENTED** |
| **Carousels & Loops** | `media-carousel`, `testimonial-carousel`, `nested-carousel`, `loop-carousel`, `image-carousel` | **FULLY IMPLEMENTED** |
| **Navigation** | `nav-menu`, `mega-menu`, `breadcrumbs`, `menu-anchor`, `off-canvas` | **FULLY IMPLEMENTED** |
| **Social & External** | `social-icons`, `google-maps`, `soundcloud`, `facebook-page`, `facebook-button`, `facebook-comments`, `paypal-button`, `stripe-button` | **FULLY IMPLEMENTED** |
| **Media & Animation** | `lottie`, `code-highlight`, `video-playlist`, `audio-playlist`, `dynamic-lightbox`, `custom-svg` | **FULLY IMPLEMENTED** |
| **WooCommerce** | `wc-product-title`, `wc-product-price`, `wc-product-images`, `wc-add-to-cart`, `wc-product-rating` | **FULLY IMPLEMENTED** (Frontend) |

---

## 4. Feature Packages (`src/features/`)

1. **`atomic-editor/`:**
   - Components: `VariablesPanel`, `ClassesPanel`, `GlobalElementsPanel`, `ReusableComponentsPanel`, `ControlledComponentEditor`.
   - Hooks: `useVariables`, `useClasses`, `useGlobalElements`, `useReusableComponents`, `useAtomicGrid`, `useAtomicForm`.
2. **`autosave/`:**
   - Hooks: `useAutosave` with dirty detection, debouncing, and server heartbeat.
3. **`fonts/`:**
   - Manager: `FontRegistry`, `FontLoader`, `FontService`.
4. **`publishing/`:**
   - Services: `publishingService` executing validation, deployment polling, rollback.
5. **`revision-history/`:**
   - Components: `RevisionHistoryModal`, `RevisionDiffViewer`.
6. **`templates/` & `website-kits/`:**
   - Data & Exporters: Multi-page starter kits, JSON export/import utilities.
