import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import "./App.css";
import Home from "./Home";
import { RequireAuth, RequireRole } from "./portal/auth/guards";
import PageSpinner from "./portal/components/PageSpinner";

// Portal pages load only when someone visits them, so the public page stays light
const Login = lazy(() => import("./portal/pages/Login"));
const PortalLayout = lazy(() => import("./portal/layouts/PortalLayout"));
const ChangePassword = lazy(() => import("./portal/pages/ChangePassword"));
const AdminDashboard = lazy(() => import("./portal/pages/AdminDashboard"));
const TeacherDashboard = lazy(() => import("./portal/pages/TeacherDashboard"));
const StudentDashboard = lazy(() => import("./portal/pages/StudentDashboard"));
const PaymentCallback = lazy(() => import("./portal/pages/PaymentCallback"));

export default function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        <Route element={<RequireAuth />}>
          <Route element={<PortalLayout />}>
            <Route element={<RequireRole role="admin" />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
            <Route element={<RequireRole role="teacher" />}>
              <Route path="/teacher" element={<TeacherDashboard />} />
            </Route>
            <Route element={<RequireRole role="student" />}>
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/payment/callback" element={<PaymentCallback />} />
            </Route>
            <Route path="/change-password" element={<ChangePassword />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
