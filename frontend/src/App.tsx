import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminAuthProvider } from "./admin/AdminAuthContext";
import { AdminRouteGuard } from "./admin/AdminRouteGuard";
import { AdminLogin } from "./admin/AdminLogin";
import { AdminDashboard } from "./admin/AdminDashboard";
import { NewDemoForm } from "./admin/NewDemoForm";
import { DemoEditor } from "./admin/DemoEditor";
import { CreativeRegistry } from "./admin/CreativeRegistry";
import { DemoShell } from "./client/DemoShell";
import { CreativeIntakePage } from "./creativeIntake/CreativeIntakePage";

export function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <AdminRouteGuard>
                <AdminDashboard />
              </AdminRouteGuard>
            }
          />
          <Route
            path="/admin/demos/new"
            element={
              <AdminRouteGuard>
                <NewDemoForm />
              </AdminRouteGuard>
            }
          />
          <Route
            path="/admin/demos/:id"
            element={
              <AdminRouteGuard>
                <DemoEditor />
              </AdminRouteGuard>
            }
          />
          <Route
            path="/admin/creatives"
            element={
              <AdminRouteGuard>
                <CreativeRegistry />
              </AdminRouteGuard>
            }
          />

          {/* Public creative self-intake link (Sept 2026) — must come
              before the demo-ID catch-all below since "creative" would
              otherwise be swallowed as a (nonexistent) demo id. */}
          <Route path="/creative/:creativeId" element={<CreativeIntakePage />} />

          {/* Every other path is treated as a demo ID; DemoShell owns the
              nested /planner route itself once the demo is loaded. */}
          <Route path="/:demoId/*" element={<DemoShell />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}

function Landing() {
  return <Navigate to="/admin" replace />;
}
