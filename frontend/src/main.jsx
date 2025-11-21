import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.jsx";
import "./styles/global.css";

/**
 * Hydrates the root DOM node with the DevDrive React application.
 */

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
