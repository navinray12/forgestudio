const assert = {
  equal(actual: unknown, expected: unknown, message?: string) {
    if (actual !== expected) {
      throw new Error(
        `Assertion failed: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}. ${message || ""}`
      );
    }
  },
  ok(value: unknown, message?: string) {
    if (!value) {
      throw new Error(
        `Assertion failed: expected truthy value, got ${JSON.stringify(value)}. ${message || ""}`
      );
    }
  },
};

import {
  CANONICAL_GLOBAL_ROLES,
  ROLE_ALIASES,
  ALL_AUTHENTICATED_ROLES,
  STANDARD_DASHBOARD_ROLES,
  ADMIN_ROLES,
  normalizeRole,
  getDefaultDashboardPath,
  hasRoleAccess,
} from "../utils/roleNormalization";

console.log("Starting Frontend RoleRoute Normalization Tests...");

// 1. Verify Canonical Roles & Aliases
console.log("Testing role normalization mappings...");
assert.equal(CANONICAL_GLOBAL_ROLES.length, 7, "Should define exactly 7 canonical global roles");
assert.equal(ROLE_ALIASES.ADMIN, "PLATFORM_ADMIN", "ROLE_ALIASES.ADMIN should map to PLATFORM_ADMIN");
assert.equal(ROLE_ALIASES.USER, "CUSTOMER", "ROLE_ALIASES.USER should map to CUSTOMER");
assert.equal(normalizeRole("ADMIN"), "PLATFORM_ADMIN", "ADMIN should normalize to PLATFORM_ADMIN");
assert.equal(normalizeRole("admin"), "PLATFORM_ADMIN", "lowercase 'admin' should normalize to PLATFORM_ADMIN");
assert.equal(normalizeRole("  ADMIN  "), "PLATFORM_ADMIN", "whitespace trimmed 'ADMIN' should normalize to PLATFORM_ADMIN");
assert.equal(normalizeRole("USER"), "CUSTOMER", "USER should normalize to CUSTOMER");
assert.equal(normalizeRole("user"), "CUSTOMER", "lowercase 'user' should normalize to CUSTOMER");
assert.equal(normalizeRole("  user  "), "CUSTOMER", "whitespace trimmed 'user' should normalize to CUSTOMER");

assert.equal(normalizeRole("PLATFORM_ADMIN"), "PLATFORM_ADMIN");
assert.equal(normalizeRole("platform_admin"), "PLATFORM_ADMIN");
assert.equal(normalizeRole("SUPER_ADMIN"), "SUPER_ADMIN");
assert.equal(normalizeRole("CUSTOMER"), "CUSTOMER");
assert.equal(normalizeRole("DEVELOPER"), "DEVELOPER");
assert.equal(normalizeRole("TEAM_MEMBER"), "TEAM_MEMBER");
assert.equal(normalizeRole("SUPPORT_ADMIN"), "SUPPORT_ADMIN");
assert.equal(normalizeRole("AI_CONTENT_ADMIN"), "AI_CONTENT_ADMIN");

// Invalid or unknown roles fail closed
assert.equal(normalizeRole("HACKER"), "UNKNOWN", "Unknown roles should normalize to UNKNOWN");
assert.equal(normalizeRole("GUEST"), "UNKNOWN", "GUEST should normalize to UNKNOWN");
assert.equal(normalizeRole(null), "UNKNOWN", "null should normalize to UNKNOWN");
assert.equal(normalizeRole(undefined), "UNKNOWN", "undefined should normalize to UNKNOWN");
assert.equal(normalizeRole(""), "UNKNOWN", "empty string should normalize to UNKNOWN");

// 2. Default Dashboard Paths & Preventing Redirect Loops
console.log("Testing default dashboard paths & loop prevention...");
assert.equal(getDefaultDashboardPath("SUPER_ADMIN"), "/super-admin");
assert.equal(getDefaultDashboardPath("PLATFORM_ADMIN"), "/admin");
assert.equal(getDefaultDashboardPath("ADMIN"), "/admin", "Legacy ADMIN should route to /admin");
assert.equal(getDefaultDashboardPath("CUSTOMER"), "/dashboard");
assert.equal(getDefaultDashboardPath("USER"), "/dashboard", "Legacy USER should route to /dashboard");
assert.equal(getDefaultDashboardPath("DEVELOPER"), "/dashboard");
assert.equal(getDefaultDashboardPath("TEAM_MEMBER"), "/dashboard");
assert.equal(getDefaultDashboardPath("SUPPORT_ADMIN"), "/dashboard");
assert.equal(getDefaultDashboardPath("AI_CONTENT_ADMIN"), "/dashboard");

// Unknown/invalid roles fail closed to /login
assert.equal(getDefaultDashboardPath("UNKNOWN"), "/login");
assert.equal(getDefaultDashboardPath("HACKER"), "/login");
assert.equal(getDefaultDashboardPath(null), "/login");
assert.equal(getDefaultDashboardPath(undefined), "/login");
assert.equal(getDefaultDashboardPath(""), "/login");

// 3. hasRoleAccess: Route Guard access checks
console.log("Testing hasRoleAccess...");

// Admin Route: ADMIN_ROLES = ["SUPER_ADMIN", "PLATFORM_ADMIN"]
assert.equal(hasRoleAccess("PLATFORM_ADMIN", ADMIN_ROLES), true, "PLATFORM_ADMIN can access admin routes");
assert.equal(hasRoleAccess("SUPER_ADMIN", ADMIN_ROLES), true, "SUPER_ADMIN can access admin routes");
assert.equal(hasRoleAccess("ADMIN", ADMIN_ROLES), true, "Legacy ADMIN can access admin routes");
assert.equal(hasRoleAccess("CUSTOMER", ADMIN_ROLES), false, "CUSTOMER cannot access admin routes");
assert.equal(hasRoleAccess("USER", ADMIN_ROLES), false, "Legacy USER cannot access admin routes");
assert.equal(hasRoleAccess("DEVELOPER", ADMIN_ROLES), false, "DEVELOPER cannot access admin routes");
assert.equal(hasRoleAccess("TEAM_MEMBER", ADMIN_ROLES), false, "TEAM_MEMBER cannot access admin routes");
assert.equal(hasRoleAccess("UNKNOWN", ADMIN_ROLES), false, "UNKNOWN role cannot access admin routes");
assert.equal(hasRoleAccess(null, ADMIN_ROLES), false, "Unauthenticated cannot access admin routes");

// Super Admin Route: ["SUPER_ADMIN"]
assert.equal(hasRoleAccess("SUPER_ADMIN", ["SUPER_ADMIN"]), true, "SUPER_ADMIN can access super-admin routes");
assert.equal(hasRoleAccess("PLATFORM_ADMIN", ["SUPER_ADMIN"]), false, "PLATFORM_ADMIN cannot access super-admin routes");
assert.equal(hasRoleAccess("ADMIN", ["SUPER_ADMIN"]), false, "Legacy ADMIN cannot access super-admin routes");
assert.equal(hasRoleAccess("CUSTOMER", ["SUPER_ADMIN"]), false, "CUSTOMER cannot access super-admin routes");

// Customer/Standard Dashboard Route: ALL_AUTHENTICATED_ROLES
for (const role of ["CUSTOMER", "USER", "DEVELOPER", "TEAM_MEMBER", "PLATFORM_ADMIN", "ADMIN", "SUPER_ADMIN", "SUPPORT_ADMIN", "AI_CONTENT_ADMIN"]) {
  assert.equal(
    hasRoleAccess(role, ALL_AUTHENTICATED_ROLES),
    true,
    `${role} should have access to ALL_AUTHENTICATED_ROLES routes`
  );
}
assert.equal(hasRoleAccess("UNKNOWN", ALL_AUTHENTICATED_ROLES), false, "UNKNOWN role cannot access authenticated routes");
assert.equal(hasRoleAccess(null, ALL_AUTHENTICATED_ROLES), false, "null role cannot access authenticated routes");

// STANDARD_DASHBOARD_ROLES
assert.equal(hasRoleAccess("CUSTOMER", STANDARD_DASHBOARD_ROLES), true);
assert.equal(hasRoleAccess("USER", STANDARD_DASHBOARD_ROLES), true, "Legacy USER allowed on STANDARD_DASHBOARD_ROLES");
assert.equal(hasRoleAccess("DEVELOPER", STANDARD_DASHBOARD_ROLES), true);
assert.equal(hasRoleAccess("TEAM_MEMBER", STANDARD_DASHBOARD_ROLES), true);
assert.equal(hasRoleAccess("PLATFORM_ADMIN", STANDARD_DASHBOARD_ROLES), false);
assert.equal(hasRoleAccess("ADMIN", STANDARD_DASHBOARD_ROLES), false);

// 4. Verify Route Redirection Flow / No Redirect Loop Simulation
console.log("Testing simulated route protection logic against redirect loops...");

interface User {
  role?: string | null;
}

function simulateRouteCheck(
  currentPath: string,
  user: User | null,
  isAuthenticated: boolean,
  routeAllowedRoles?: string[]
): { allowed: boolean; redirectPath?: string } {
  if (!isAuthenticated || !user) {
    return { allowed: false, redirectPath: "/login" };
  }

  const normalizedUserRole = normalizeRole(user.role);
  if (normalizedUserRole === "UNKNOWN") {
    return { allowed: false, redirectPath: "/login" };
  }

  if (routeAllowedRoles && routeAllowedRoles.length > 0) {
    const isAllowed = hasRoleAccess(normalizedUserRole, routeAllowedRoles);
    if (!isAllowed) {
      const fallback = getDefaultDashboardPath(normalizedUserRole);
      const safeRedirect = fallback === currentPath ? "/login" : fallback;
      return { allowed: false, redirectPath: safeRedirect };
    }
  }

  return { allowed: true };
}

// Routes in App.tsx
const testRoutes = [
  { path: "/dashboard", allowed: ALL_AUTHENTICATED_ROLES },
  { path: "/subscriptions", allowed: ALL_AUTHENTICATED_ROLES },
  { path: "/editor/123", allowed: ALL_AUTHENTICATED_ROLES },
  { path: "/custom-post-types", allowed: ALL_AUTHENTICATED_ROLES },
  { path: "/admin", allowed: ADMIN_ROLES },
  { path: "/super-admin", allowed: ["SUPER_ADMIN"] },
];

const testRoles = [
  "PLATFORM_ADMIN",
  "ADMIN", // legacy alias
  "SUPER_ADMIN",
  "CUSTOMER",
  "USER", // legacy alias
  "DEVELOPER",
  "TEAM_MEMBER",
  "SUPPORT_ADMIN",
  "AI_CONTENT_ADMIN",
  "UNKNOWN",
  "attacker_role",
];

for (const role of testRoles) {
  for (const route of testRoutes) {
    let currentCheckPath = route.path;
    let hops = 0;
    const visitedPaths = new Set<string>();

    while (hops < 10) {
      visitedPaths.add(currentCheckPath);
      const matchedRoute = testRoutes.find((r) => r.path === currentCheckPath);
      const allowedRoles = matchedRoute?.allowed;

      const result = simulateRouteCheck(currentCheckPath, { role }, true, allowedRoles);
      if (result.allowed) {
        break;
      }

      const nextPath = result.redirectPath!;
      assert.ok(
        nextPath === "/login" || !visitedPaths.has(nextPath),
        `Redirect loop detected for role '${role}' from '${currentCheckPath}' to '${nextPath}'!`
      );

      if (nextPath === "/login") {
        break;
      }

      currentCheckPath = nextPath;
      hops++;
    }

    assert.ok(hops < 5, `Too many redirects (${hops}) for role '${role}' on route '${route.path}'`);
  }
}

// 5. Unauthenticated User Check
for (const route of testRoutes) {
  const result = simulateRouteCheck(route.path, null, false, route.allowed);
  assert.equal(result.allowed, false, "Unauthenticated user must not be allowed");
  assert.equal(result.redirectPath, "/login", "Unauthenticated user must be redirected to /login");
}

console.log("All Frontend RoleRoute Normalization Tests Passed Successfully!");
