import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardApp from "../features/dashboard/DashboardApp.jsx";
import { SessionProvider } from "./providers/SessionProvider.jsx";

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
