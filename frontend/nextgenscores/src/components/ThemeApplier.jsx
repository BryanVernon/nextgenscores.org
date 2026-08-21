import { useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { getThemeVariables } from "../teamThemes";

export default function ThemeApplier({ children }) {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const variables = getThemeVariables(user?.theme);
    Object.entries(variables).forEach(([name, value]) => {
      document.documentElement.style.setProperty(name, value);
    });
  }, [user?.theme]);

  return children;
}
