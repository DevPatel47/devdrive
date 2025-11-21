import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardApp from "../features/dashboard/DashboardApp.jsx";
import { SessionProvider } from "./providers/SessionProvider.jsx";

/**
 * Top-level router shell that wires the session provider into the dashboard routes.
 * @returns {JSX.Element}
 */
const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/*"
          element={
            <SessionProvider>
              <DashboardApp />
            </SessionProvider>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
