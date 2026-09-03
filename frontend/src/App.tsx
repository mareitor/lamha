import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminAuthProvider } from "./admin/AdminAuthContext";
import { AdminRouteGuard } from "./admin/AdminRouteGuard";
import { AdminLogin } from "./admin/AdminLogin";
import { AdminDashboard } from "./admin/AdminDashboard";
import { NewDemoForm } from "./admin/NewDemoForm";
import { DemoEditor } from "./admin/DemoEditor";
import { DemoShell } from "./client/DemoShell";

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

          {/* Every other path is treated as a demo ID. */}
          <Route path="/:demoId" element={<DemoShell />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}

function Landing() {
  return <Navigate to="/admin" replace />;
}
