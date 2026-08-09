import { useEffect, useState } from "react";

export type Route =
  | "today"
  | "onboarding"
  | "session"
  | "test"
  | "plan"
  | "history"
  | "learn"
  | "settings";

function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  switch (h) {
    case "onboarding":
    case "session":
    case "test":
    case "plan":
    case "history":
    case "learn":
    case "settings":
      return h;
    default:
      return "today";
  }
}

export function navigate(route: Route): void {
  window.location.hash = route === "today" ? "/" : `/${route}`;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash);
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}
