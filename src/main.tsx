import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import BackendDashboard from "./components/BackendDashboard";
import "./index.css";

import { Analytics } from "@vercel/analytics/react";

const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
const RootView = pathname === "/backend" ? BackendDashboard : App;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootView />
    <Analytics />
  </StrictMode>
);
