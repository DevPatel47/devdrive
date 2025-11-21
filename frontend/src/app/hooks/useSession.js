import { useContext } from "react";
import SessionContext from "../providers/SessionProvider.jsx";

/**
 * Returns the current session state and helpers from context.
 * @returns {import("../providers/SessionProvider.jsx").SessionContextValue}
 */
export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};

export default useSession;
