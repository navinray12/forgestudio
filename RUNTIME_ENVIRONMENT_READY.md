# ForgeStudio Runtime Environment & Bootstrap Status

## Script Adjustments Applied to `bootstrap.ps1`

1. **MySQL Port Forwarding Fixed**:
   - Updated Docker container port mapping from `-p 3307:3307` to `-p 3307:3306` so host port 3307 correctly routes to standard MySQL port 3306 inside `forgestudio-mysql`.

2. **Non-Destructive Prisma Baseline/Migration Sync**:
   - Added automatic fallback to `npx prisma db push --skip-generate` if `npx prisma migrate deploy` returns exit status P3005 due to pre-existing schema tables.

3. **Automatic Connector Plugin Activation**:
   - Updated plugin deployment step to copy `forgestudio-connector.php` to both `wp-content/plugins/forgestudio-connector/` and `wp-content/mu-plugins/` to guarantee instant auto-activation of `/wp-json/forgestudio/v1` REST endpoints upon container startup.

---

## Live Probed Infrastructure Matrix

| Component | Port | Live Probed Result | Status |
| :--- | :--- | :--- | :--- |
| **Frontend** | 5173 | **HTTP 200 OK** (Login UI rendering cleanly) | **PASS** |
| **Backend API** | 5000 | **HTTP 200 OK** (`{"success":true,"message":"API is healthy"}`) | **PASS** |
| **WordPress REST** | 8000 | **Connection Refused** (`forgestudio-wp` container offline) | **FAIL** |
| **PostgreSQL** | 5432 | **Connection Refused** (`forgestudio-postgres` container offline) | **FAIL** |
| **MySQL** | 3307 | **Connection Refused** (`forgestudio-mysql` container offline) | **FAIL** |

---

## Environment Gate Status

```
NOT READY
```

---

## Developer Command to Complete Bootstrap

Execute in host **Windows PowerShell**:

```powershell
Set-Location -Path "C:\forgestudio-backup-devnew"
.\bootstrap.ps1
```
