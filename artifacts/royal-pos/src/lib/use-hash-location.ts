import { useState, useEffect, useCallback } from "react";

const currentLoc = () => window.location.hash.replace(/^#/, "") || "/";

export const useHashLocation = () => {
  const [loc, setLoc] = useState(currentLoc());

  useEffect(() => {
    const handler = () => setLoc(currentLoc());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);

  return [loc, navigate] as [string, (to: string) => void];
};
