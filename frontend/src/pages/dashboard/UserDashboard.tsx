import { lazy } from "react";
import { useSearchParams } from "react-router-dom";
const StudioDashboard = lazy(() => import("../../features/studio/StudioDashboard"));
const LegacyUserDashboard = lazy(() => import("./LegacyUserDashboard"));

export default function UserDashboard() {
  const [params] = useSearchParams();
  return params.get("legacy") === "1" ? <LegacyUserDashboard /> : <StudioDashboard />;
}
