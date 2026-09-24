# ForgeStudio Port 3307 Diagnostic Script
# PowerShell 5.1 / 7+ Compatible

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host " FORGESTUDIO — PORT 3307 & 3306 DIAGNOSTIC SUITE " -ForegroundColor Cyan
Write-Host "=================================================`n" -ForegroundColor Cyan

# 1. Inspect Port 3306
Write-Host "[1/4] Inspecting Host Port 3306..." -ForegroundColor Yellow
$conn3306 = Get-NetTCPConnection -LocalPort 3306 -ErrorAction SilentlyContinue
if ($conn3306) {
    foreach ($c in $conn3306) {
        $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
        Write-Host "  -> Port 3306 in state '$($c.State)' owned by PID $($c.OwningProcess) ($($proc.ProcessName))" -ForegroundColor White
    }
} else {
    Write-Host "  -> Port 3306 is FREE on host." -ForegroundColor Green
}

# 2. Inspect Port 3307
Write-Host "`n[2/4] Inspecting Host Port 3307..." -ForegroundColor Yellow
$conn3307 = Get-NetTCPConnection -LocalPort 3307 -ErrorAction SilentlyContinue
if ($conn3307) {
    foreach ($c in $conn3307) {
        $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
        Write-Host "  -> Port 3307 in state '$($c.State)' owned by PID $($c.OwningProcess) ($($proc.ProcessName))" -ForegroundColor Red
    }
} else {
    Write-Host "  -> Port 3307 is FREE on host." -ForegroundColor Green
}

# 3. Inspect Docker Containers & Port Bindings
Write-Host "`n[3/4] Inspecting Docker Containers & Port Bindings..." -ForegroundColor Yellow
$dockerPs = docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>&1
Write-Host $dockerPs -ForegroundColor White

Write-Host "`n[4/4] Inspecting 'forgestudio-mysql' Container Ports..." -ForegroundColor Yellow
$mysqlInspect = docker inspect forgestudio-mysql --format '{{json .HostConfig.PortBindings}}' 2>$null
if ($mysqlInspect) {
    Write-Host "  -> forgestudio-mysql PortBindings: $mysqlInspect" -ForegroundColor White
} else {
    Write-Host "  -> Container 'forgestudio-mysql' does not exist." -ForegroundColor Yellow
}

Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host " DIAGNOSTIC SUMMARY & RECOMMENDATIONS " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

if ($conn3307) {
    $pPids = $conn3307 | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($p in $pPids) {
        $pName = (Get-Process -Id $p -ErrorAction SilentlyContinue).ProcessName
        if ($pName -eq "docker-proxy" -or $pName -eq "com.docker.backend") {
            Write-Host "OWNER IDENTIFIED: Docker Proxy (PID $p)" -ForegroundColor Yellow
            Write-Host "CAUSE: An existing Docker container or lingering docker-proxy process holds port 3307." -ForegroundColor Yellow
            Write-Host "ACTION: Run 'docker stop forgestudio-mysql; docker rm forgestudio-mysql' (without -v to preserve data volume)." -ForegroundColor Green
        } elseif ($pName -eq "mysqld" -or $pName -eq "mysql") {
            Write-Host "OWNER IDENTIFIED: Host Windows MySQL Instance (PID $p, $pName.exe)" -ForegroundColor Red
            Write-Host "CAUSE: Host Windows MySQL service is already using port 3307." -ForegroundColor Red
            Write-Host "STATUS: MYSQL_HOST_PORT_3307_ALREADY_IN_USE" -ForegroundColor Red
            Write-Host "ACTION: Reconfigure ForgeStudio Docker host port to 3308 (-p 3308:3306) in bootstrap.ps1." -ForegroundColor Green
        } else {
            Write-Host "OWNER IDENTIFIED: Application '$pName' (PID $p)" -ForegroundColor Red
            Write-Host "ACTION: Inspect application '$pName' before modifying port bindings." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "Host Port 3307 is FREE!" -ForegroundColor Green
}
Write-Host "=================================================`n" -ForegroundColor Cyan
