# ForgeStudio × WordPress Integration Developer Documentation

## 1. Architecture
The integration uses a 3-tier architecture:
- **Layer 1 (Frontend)**: React + TypeScript Visual Editor (`frontend/src/integrations/wordpress/`).
- **Layer 2 (Backend)**: Express + Prisma API (`backend/src/services/wordpress/`).
- **Layer 3 (WordPress Plugin)**: Standalone PHP plugin (`forge-studio/`) acting as the bridge to WordPress.

```text
WordPress Website <--> ForgeStudio Plugin <--> ForgeStudio Backend Proxy <--> ForgeStudio Editor
```

---

## 2. Installation
1. Copy the `forge-studio/` directory to the WordPress target installation at `wp-content/plugins/forge-studio/`.
2. Navigate to **WordPress Admin → Plugins** and click **Activate** on **ForgeStudio**.

---

## 3. WordPress Plugin Setup
1. Open **WP Admin → ForgeStudio**.
2. Set your ForgeStudio application URL (e.g., `http://localhost:5173`).
3. Generate or copy your secret API Key from **ForgeStudio Settings → WordPress Integration**.
4. Click **Connect ForgeStudio**.

---

## 4. API Authentication
- Authentication between ForgeStudio Backend and WordPress Plugin uses HMAC/SHA-256 hashed secret tokens sent in the `X-ForgeStudio-Api-Key` HTTP request header.
- Credentials are never saved in cleartext or exposed to the browser DOM.

---

## 5. REST Endpoints
Namespace: `forgestudio/v1`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/wp-json/forgestudio/v1/test` | Public | Connectivity ping test |
| `GET` | `/wp-json/forgestudio/v1/status` | Authenticated | Plugin version & health status |

---

## 6. Page Synchronization
- Durable mapping between ForgeStudio `forgePageId` and WordPress `wpPostId` is maintained in `wordpress_page_mappings` table in PostgreSQL.
- Updating a page in ForgeStudio updates the mapped WordPress post automatically without re-creating new post IDs.

---

## 7. Document Format
Canonical schema stored in `_forgestudio_document` post meta:
```json
{
  "version": 1,
  "page": { "id": "page-home", "title": "Home" },
  "elements": [
    {
      "id": "section-1",
      "type": "section",
      "styles": { "padding": "40px" },
      "children": [
        {
          "id": "heading-1",
          "type": "heading",
          "content": { "text": "Welcome to ForgeStudio", "level": 1 }
        }
      ]
    }
  ]
}
```

---

## 8. Rendering
- `ForgeStudio_Renderer::render_document()` parses canonical JSON into HTML5 elements (`section`, `h1-h6`, `text`, `img`, `a.button`, `hr`, `spacer`).
- Applied styles are converted into inline CSS styles for zero external CSS dependencies.

---

## 9. Media Integration
- Standard WordPress Media Library attachment IDs and URLs are supported in `image` widgets via `url`, `alt`, and `attachmentId`.

---

## 10. Menu Integration
- Integrates with WordPress Navigation Menus using the existing `wp-menu` widget type and `NavigationRenderers.tsx`.

---

## 11. Publishing
- Triggered via `PublishModal` or `publishingService.publishWebsite(websiteId, { destinationType: "WORDPRESS" })`.
- Validates canonical document structure before pushing to WordPress destination.

---

## 12. Security
- Direct script execution guarded via `defined('ABSPATH') || exit;`.
- Inputs sanitized with `sanitize_text_field()`, `esc_url_raw()`, and outputs escaped with `esc_html()`, `esc_attr()`, `esc_url()`, `wp_kses_post()`.

---

## 13. Error Handling
Provides structured error codes:
- `WORDPRESS_UNREACHABLE`
- `PLUGIN_NOT_INSTALLED`
- `AUTHENTICATION_FAILED`
- `INVALID_SITE_URL`
- `WORDPRESS_NOT_CONNECTED`

---

## 14. Testing
- Run test health checks via `POST /api/websites/:id/wordpress/verify`.
- Verify REST endpoint via `GET /wp-json/forgestudio/v1/test`.

---

## 15. Troubleshooting
- **Connection status shows Not Connected**: Verify `X-ForgeStudio-Api-Key` matches the key stored in WP options.
- **Content not displaying on page**: Ensure `_forgestudio_document` post meta is saved on the WP page.

---

## 16. Future Extensions
- WooCommerce Extension architecture.
- Theme Builder templates (Header, Footer, Single, Archive, 404).
