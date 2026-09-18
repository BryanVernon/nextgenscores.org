import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import { resolveTimeZone } from "./timeZone";

export default function useTimeZone() {
  const { user } = useContext(AuthContext);
  return resolveTimeZone(user ? user.timeZone : Intl.DateTimeFormat().resolvedOptions().timeZone);
}
