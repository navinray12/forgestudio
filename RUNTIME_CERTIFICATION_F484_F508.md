# FORGESTUDIO — LIVE RUNTIME CERTIFICATION REPORT (F-484 → F-508)

**Test Date/Time**: 2026-09-23 18:41 IST  
**Environment**: Local Windows Host + Docker Desktop (WSL2)  
**Overall Certification Status**: `RUNTIME CERTIFICATION BLOCKED`  

---

## 1. Executive Summary & Environment Discovery

Live network and HTTP probing confirms:
- **Frontend (`http://localhost:5173`)**: **PASS (HTTP 200 OK)** — Active and rendering login interface.
- **Backend API (`http://localhost:5000/api/v1/health`)**: **PASS (HTTP 200 OK)** — Healthy response `{"success":true,"message":"API is healthy"}`.
- **WordPress REST (`http://localhost:8000/wp-json/`)**: **FAIL (Connection Refused)** — Docker container `forgestudio-wp` is offline.
- **PostgreSQL (`localhost:5432`)**: **FAIL (Connection Refused)** — Docker container `forgestudio-postgres` is offline.
- **MySQL (`localhost:3307`)**: **FAIL (Connection Refused)** — Docker container `forgestudio-mysql` is offline.

Because WordPress, MySQL, and PostgreSQL containers are not currently active on the host, live runtime execution of features F-484 through F-508 cannot occur without fabricating data (which is strictly forbidden).

---

## 2. Infrastructure Fixes Implemented in `bootstrap.ps1`

1. **Fixed MySQL Container Port Forwarding**:
   - Corrected container port mapping from `-p 3307:3307` to `-p 3307:3306` so host port 3307 correctly reaches internal MySQL port 3306.
2. **Fixed Prisma Schema P3005 Migration Issue**:
   - Added automatic fallback to `npx prisma db push --skip-generate` when `prisma migrate deploy` encounters pre-existing database tables.
3. **Automated Connector Plugin Activation**:
   - Added automated copy of `forgestudio-connector.php` to `/var/www/html/wp-content/mu-plugins/` for instant activation of REST namespace `/wp-json/forgestudio/v1/` upon WordPress startup.

---

## 3. Real Runtime Scorecard (F-484 → F-508)

| ID | Feature | Runtime | Backend | Frontend | DB | WordPress | Security | Evidence | Result |
|---|---|---|---|---|---|---|---|---|---|
| **F-484** | WordPress Connector Plugin | BLOCKED | PASS (Static) | N/A | N/A | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-485** | Site Connection | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-486** | Connection Verification | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-487** | Connection Disconnect | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-488** | Site Information | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-489** | Site Health | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-490** | Page CRUD | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-491** | Page Duplicate | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-492** | Page Reorder | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-493** | Media Upload | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-494** | Media Management | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-495** | Publish | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-496** | Publish Status | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-497** | Publish Rollback | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-498** | Publishing Jobs | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-499** | HTML Publishing | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-500** | Gutenberg Block Publishing | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-501** | Forms API | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-502** | SEO API | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-503** | Analytics API | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-504** | Menus API | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-505** | Webhooks API | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-506** | Plugins API | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-507** | Themes API | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |
| **F-508** | Cache API | BLOCKED | PASS (Static) | PASS (Static) | OFFLINE | OFFLINE | N/A | Connection Refused | **BLOCKED** |

---

## 4. Final Certification Level

```
RUNTIME CERTIFICATION BLOCKED
```

**Reason**: Live WordPress (`http://localhost:8000/wp-json/`), PostgreSQL (`localhost:5432`), and MySQL (`localhost:3307`) containers are offline.

---

## 5. Developer Action to Unblock Live Certification

Run in host **Windows PowerShell**:

```powershell
Set-Location -Path "C:\forgestudio-backup-devnew"
.\bootstrap.ps1
```

Once `bootstrap.ps1` finishes and `http://localhost:8000/wp-json/` returns `HTTP 200 OK`, rerun certification to record live execution evidence and screenshots for all 25 features.
