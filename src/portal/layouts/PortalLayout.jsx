import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { homeFor } from "../auth/roles";
import { SCHOOL_NAME } from "../config";
import "../portal.css";

// Add each new page here as we build it
const NAV = {
  admin: [{ to: "/admin", label: "Dashboard", end: true }],
  teacher: [{ to: "/teacher", label: "Dashboard", end: true }],
  student: [{ to: "/student", label: "Dashboard", end: true }],
};

export default function PortalLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const links = NAV[user.role] ?? [];
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar navbar-expand-md navbar-dark portal-navbar">
        <div className="container">
          <Link className="navbar-brand fw-bold" to={homeFor(user.role) ?? "/"}>
            {SCHOOL_NAME}
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="navbar-toggler-icon" />
          </button>
          <button type="button" className="btn btn-sm btn-outline-light ms-2" onClick={logout}>
            Log out
          </button>
          <div className={`collapse navbar-collapse${open ? " show" : ""}`}>
            <ul className="navbar-nav me-auto">
              {links.map((l) => (
                <li className="nav-item" key={l.to}>
                  <NavLink
                    to={l.to}
                    end={l.end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
                  >
                    {l.label}
                  </NavLink>
                </li>
              ))}
              <li className="nav-item">
                <Link className="nav-link" to="/">School website</Link>
              </li>
            </ul>
            <div className="d-flex flex-wrap align-items-center gap-3 text-white">
              <span>
                {name} <span className="badge text-bg-warning text-capitalize">{user.role}</span>
              </span>
              <NavLink to="/change-password" className="link-light small">
                Change password
              </NavLink>
            </div>
          </div>
        </div>
      </nav>
      <main className="container py-4">
        <Outlet />
      </main>
    </div>
  );
}
