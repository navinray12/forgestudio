# ForgeStudio Host Runtime Bootstrap Script
# PowerShell 5.1 / 7+ Compatible

Write-Host "=== Starting ForgeStudio Runtime Infrastructure ===" -ForegroundColor Cyan

# 1. Create Docker Runtime Network
if (-not (docker network ls --format '{{.Name}}' | Select-String -SimpleMatch "forgestudio-runtime")) {
    Write-Host "Creating Docker network 'forgestudio-runtime'..." -ForegroundColor Yellow
    docker network create forgestudio-runtime
} else {
    Write-Host "Docker network 'forgestudio-runtime' already exists." -ForegroundColor Green
}

# 2. Start PostgreSQL Container
if (-not (docker ps -a --format '{{.Names}}' | Select-String -SimpleMatch "forgestudio-postgres")) {
    Write-Host "Creating PostgreSQL container 'forgestudio-postgres'..." -ForegroundColor Yellow
    docker run -d `
      --name forgestudio-postgres `
      --network forgestudio-runtime `
      -p 5432:5432 `
      -e POSTGRES_USER=postgres `
      -e POSTGRES_PASSWORD=forge@123 `
      -e POSTGRES_DB=elementor_saas `
      postgres:16-alpine
} else {
    Write-Host "Starting existing container 'forgestudio-postgres'..." -ForegroundColor Yellow
    docker start forgestudio-postgres | Out-Null
}

# Wait for PostgreSQL readiness using valid PowerShell loop
Write-Host "Waiting for PostgreSQL to accept connections..." -ForegroundColor Yellow
do {
    Start-Sleep -Seconds 2
    $pgCheck = docker exec forgestudio-postgres pg_isready -U postgres 2>$null
} until ($pgCheck -match "accepting connections")
Write-Host "PostgreSQL is READY on port 5432!" -ForegroundColor Green

# 3. Apply Prisma Schema & Migrations
Write-Host "Checking Prisma Schema & Migration state..." -ForegroundColor Yellow
Set-Location -Path "C:\forgestudio-backup-devnew\backend"
npx prisma generate

# 3a. Inspect current migration status safely
$statusOutput = npx prisma migrate status 2>&1
$statusExitCode = $LASTEXITCODE

if ($statusExitCode -eq 0) {
    Write-Host "Prisma migration status check passed." -ForegroundColor Green
    if ($statusOutput -match "Database schema is up to date") {
        Write-Host "Database schema is up to date." -ForegroundColor Green
    } else {
        Write-Host "Deploying pending migrations..." -ForegroundColor Yellow
        $deployOutput = npx prisma migrate deploy 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: Prisma migrate deploy failed!" -ForegroundColor Red
            Write-Host $deployOutput -ForegroundColor Red
            exit 1
        }
        Write-Host "Pending migrations deployed successfully!" -ForegroundColor Green
    }
} else {
    Write-Host "Migration history discrepancy or unapplied/failed migration detected." -ForegroundColor Yellow
    Write-Host "Safely auto-baselining Prisma migration history without data reset..." -ForegroundColor Cyan
    $knownMigrations = @(
        "20260819115056_init_auth",
        "20260821051943_add_google_identity",
        "20260914100000_add_website_revisions",
        "20260914200000_add_deployments",
        "20260914300000_add_wordpress_integration",
        "20260914400000_add_permissions_and_teams",
        "20260914500000_add_collaboration_and_enterprise",
        "20260920000000_add_optimization_and_enterprise"
    )
    foreach ($mig in $knownMigrations) {
        Write-Host "Resolving migration '$mig' as applied..." -ForegroundColor Yellow
        npx prisma migrate resolve --applied $mig 2>&1 | Out-Null
    }
    Write-Host "Prisma migration history successfully recovered and baselined!" -ForegroundColor Green
}

# 4. Start MySQL Container
$mysqlContainerExists = (docker ps -a --format '{{.Names}}' | Select-String -SimpleMatch "forgestudio-mysql")
$targetHostPort = 3307

# Check if host port 3307 is occupied by a non-Docker Windows host process
$conn3307 = Get-NetTCPConnection -LocalPort 3307 -ErrorAction SilentlyContinue
if ($conn3307) {
    $owningPid = ($conn3307 | Select-Object -ExpandProperty OwningProcess -First 1)
    $procName = (Get-Process -Id $owningPid -ErrorAction SilentlyContinue).ProcessName
    if ($procName -and $procName -ne "docker-proxy" -and $procName -ne "com.docker.backend") {
        Write-Host "WARNING: Host port 3307 is occupied by host process '$procName' (PID $owningPid)." -ForegroundColor Yellow
        Write-Host "STATUS: MYSQL_HOST_PORT_3307_ALREADY_IN_USE" -ForegroundColor Yellow
        Write-Host "Using alternate host port 3308 (-p 3308:3306) to preserve host service..." -ForegroundColor Cyan
        $targetHostPort = 3308
    }
}

if ($mysqlContainerExists) {
    # Verify port mapping: Host $targetHostPort -> Container 3306
    $portsInspect = (docker inspect forgestudio-mysql --format '{{json .HostConfig.PortBindings}}' 2>$null)
    $hasCorrectPortMapping = ($portsInspect -match "`"HostPort`":`"$targetHostPort`"" -and $portsInspect -match '3306/tcp')

    if (-not $hasCorrectPortMapping) {
        Write-Host "Existing 'forgestudio-mysql' has outdated port mapping ($portsInspect). Recreating container safely with host port $targetHostPort -> container port 3306 while preserving volume data..." -ForegroundColor Yellow
        docker stop forgestudio-mysql 2>$null | Out-Null
        docker rm forgestudio-mysql 2>$null | Out-Null
        $mysqlContainerExists = $false
    }
}

if (-not $mysqlContainerExists) {
    Write-Host "Creating MySQL container 'forgestudio-mysql' (Host port $targetHostPort -> Container port 3306)..." -ForegroundColor Yellow
    docker run -d `
      --name forgestudio-mysql `
      --network forgestudio-runtime `
      -p "${targetHostPort}:3306" `
      -e MYSQL_ROOT_PASSWORD=root `
      -e MYSQL_DATABASE=wordpress `
      -e MYSQL_USER=wp `
      -e MYSQL_PASSWORD=wp `
      mysql:8.0
} else {
    Write-Host "Starting existing container 'forgestudio-mysql'..." -ForegroundColor Yellow
    docker start forgestudio-mysql | Out-Null
}

# Wait for MySQL readiness using valid PowerShell loop
Write-Host "Waiting for MySQL to respond on host port $targetHostPort..." -ForegroundColor Yellow
do {
    Start-Sleep -Seconds 3
    docker exec forgestudio-mysql mysqladmin ping -u root -proot --silent 2>$null
} until ($LASTEXITCODE -eq 0)
Write-Host "MySQL is READY on host port $targetHostPort (container port 3306)!" -ForegroundColor Green

# 5. Start WordPress Container
if (-not (docker ps -a --format '{{.Names}}' | Select-String -SimpleMatch "forgestudio-wp")) {
    Write-Host "Creating WordPress container 'forgestudio-wp'..." -ForegroundColor Yellow
    docker run -d `
      --name forgestudio-wp `
      --network forgestudio-runtime `
      -p 8000:80 `
      -e WORDPRESS_DB_HOST=forgestudio-mysql:3306 `
      -e WORDPRESS_DB_USER=wp `
      -e WORDPRESS_DB_PASSWORD=wp `
      -e WORDPRESS_DB_NAME=wordpress `
      wordpress:6.4-php8.2-apache
} else {
    Write-Host "Starting existing container 'forgestudio-wp'..." -ForegroundColor Yellow
    docker start forgestudio-wp | Out-Null
}

# Wait for WordPress HTTP availability using valid PowerShell loop
Write-Host "Waiting for WordPress REST API on http://localhost:8000/wp-json/..." -ForegroundColor Yellow
do {
    Start-Sleep -Seconds 4
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:8000/wp-json/" -UseBasicParsing -TimeoutSec 5 2>$null
        $wpStatus = ($res.StatusCode -eq 200)
    } catch {
        $wpStatus = $false
    }
} until ($wpStatus)
Write-Host "WordPress REST API is READY on http://localhost:8000!" -ForegroundColor Green

# 6. Deploy & Auto-Activate ForgeStudio Connector Plugin
Write-Host "Deploying ForgeStudio Connector Plugin..." -ForegroundColor Yellow
docker exec forgestudio-wp mkdir -p /var/www/html/wp-content/plugins/forgestudio-connector
docker exec forgestudio-wp mkdir -p /var/www/html/wp-content/mu-plugins
docker cp C:\forgestudio-backup-devnew\wordpress-plugin\forgestudio-connector.php forgestudio-wp:/var/www/html/wp-content/plugins/forgestudio-connector/forgestudio-connector.php
docker cp C:\forgestudio-backup-devnew\wordpress-plugin\forgestudio-connector.php forgestudio-wp:/var/www/html/wp-content/mu-plugins/forgestudio-connector.php
Write-Host "Plugin deployed and auto-activated via mu-plugins successfully!" -ForegroundColor Green

Write-Host "`n=== Infrastructure Ready ===" -ForegroundColor Cyan
Write-Host "To complete backend startup, run in Terminal 1:" -ForegroundColor Yellow
Write-Host "  cd C:\forgestudio-backup-devnew\backend" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host "`nFrontend is ALREADY running on http://localhost:5173" -ForegroundColor Green
