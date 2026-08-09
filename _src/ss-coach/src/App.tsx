import { useEffect } from "react";
import { useRoute, navigate, type Route } from "./router";
import { useStore } from "./store";
import { TabIcon } from "./components/ui";
import Onboarding from "./screens/Onboarding";
import Today from "./screens/Today";
import Session from "./screens/Session";
import TestDay from "./screens/TestDay";
import Plan from "./screens/Plan";
import History from "./screens/History";
import Learn from "./screens/Learn";
import Settings from "./screens/Settings";

const TABS: { route: Route; label: string }[] = [
  { route: "today", label: "Today" },
  { route: "plan", label: "Plan" },
  { route: "history", label: "History" },
  { route: "learn", label: "Learn" },
  { route: "settings", label: "Settings" },
];

export default function App() {
  const route = useRoute();
  const { state, saveIssue, recoveredFromCorruption } = useStore();

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
  }, [state.settings.theme]);

  // First run: everything routes to onboarding until a profile exists.
  const needsOnboarding = state.profile === null;
  useEffect(() => {
    if (needsOnboarding && route !== "onboarding") navigate("onboarding");
    if (!needsOnboarding && route === "onboarding") {
      /* allowed: user can revisit onboarding from settings */
    }
  }, [needsOnboarding, route]);

  const fullscreen =
    route === "session" || route === "test" || route === "onboarding" || needsOnboarding;

  let screen: JSX.Element;
  if (needsOnboarding || route === "onboarding") screen = <Onboarding />;
  else if (route === "session") screen = <Session />;
  else if (route === "test") screen = <TestDay />;
  else if (route === "plan") screen = <Plan />;
  else if (route === "history") screen = <History />;
  else if (route === "learn") screen = <Learn />;
  else if (route === "settings") screen = <Settings />;
  else screen = <Today />;

  return (
    <>
      <main className={`app-main${fullscreen ? " fullscreen" : ""}`}>
        {recoveredFromCorruption && (
          <div className="banner warn" role="alert" style={{ marginBottom: "1rem" }}>
            Stored data couldn't be read, so the app started fresh. The old
            payload was kept aside — if you have a JSON backup, import it in
            Settings.
          </div>
        )}
        {saveIssue && (
          <div className="banner warn" role="alert" style={{ marginBottom: "1rem" }}>
            {saveIssue === "quota"
              ? "Device storage is full — recent changes may not persist. Export a backup, then clear old browser data."
              : "Saving to this device failed. Changes may not persist — export a backup soon."}
          </div>
        )}
        {screen}
      </main>
      {!fullscreen && (
        <nav className="tabbar" aria-label="Main">
          {TABS.map((t) => (
            <button
              key={t.route}
              type="button"
              aria-current={route === t.route ? "page" : undefined}
              onClick={() => navigate(t.route)}
            >
              <TabIcon name={t.route} />
              {t.label}
            </button>
          ))}
        </nav>
      )}
    </>
  );
}
