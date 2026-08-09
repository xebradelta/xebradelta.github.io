import { useRef, useState } from "react";
import { useStore } from "../store";
import { Segmented, Sheet } from "../components/ui";
import { downloadBackup, parseBackup } from "../lib/backup";
import { defaultState, wipeAll } from "../lib/storage";
import { navigate } from "../router";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Settings() {
  const { state, update, replace } = useStore();
  const { settings } = state;
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetPhrase, setResetPhrase] = useState("");

  const setSettings = (patch: Partial<typeof settings>) =>
    update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

  async function onImportFile(file: File) {
    const text = await file.text();
    const result = parseBackup(text);
    if (result.ok) {
      replace(result.state);
      setImportMsg({
        ok: true,
        text: `Backup restored: ${result.sessionCount} sessions and all settings.`,
      });
    } else {
      setImportMsg({ ok: false, text: result.error });
    }
  }

  return (
    <div className="stack" style={{ gap: "1.1rem" }}>
      <header>
        <span className="kicker">Settings</span>
        <h1>Settings</h1>
      </header>

      <section className="card stack" aria-label="Display">
        <h2>Display</h2>
        <div className="field">
          <label>Units</label>
          <Segmented
            label="Units"
            options={[
              { value: "kg", label: "Kilograms" },
              { value: "lb", label: "Pounds" },
            ]}
            value={settings.units}
            onChange={(units) => setSettings({ units })}
          />
          <p className="faint small">
            Bells are always the standard kg sizes — pounds are display only.
          </p>
        </div>
        <div className="field">
          <label>Theme</label>
          <Segmented
            label="Theme"
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
            ]}
            value={settings.theme}
            onChange={(theme) => setSettings({ theme })}
          />
        </div>
      </section>

      <section className="card stack" aria-label="Session cues">
        <h2>Session cues</h2>
        <label className="row between" style={{ minHeight: "44px", cursor: "pointer" }}>
          <span className="dim">Sound cues</span>
          <input
            type="checkbox"
            checked={settings.sound}
            onChange={(e) => setSettings({ sound: e.target.checked })}
            style={{ width: "28px", minHeight: "28px" }}
          />
        </label>
        <label className="row between" style={{ minHeight: "44px", cursor: "pointer" }}>
          <span className="dim">Vibration</span>
          <input
            type="checkbox"
            checked={settings.vibration}
            onChange={(e) => setSettings({ vibration: e.target.checked })}
            style={{ width: "28px", minHeight: "28px" }}
          />
        </label>
      </section>

      <section className="card stack" aria-label="Training days">
        <h2>Training days</h2>
        <p className="faint small">
          The program wants 5–6 days a week. Pick yours — it's a plan, not a
          contract.
        </p>
        <div className="chips" role="group" aria-label="Weekly training days">
          {DAY_LABELS.map((d, i) => (
            <button
              key={d}
              type="button"
              className="chip"
              aria-pressed={settings.trainingDays.includes(i)}
              onClick={() =>
                setSettings({
                  trainingDays: settings.trainingDays.includes(i)
                    ? settings.trainingDays.filter((x) => x !== i)
                    : [...settings.trainingDays, i].sort(),
                })
              }
            >
              {d}
            </button>
          ))}
        </div>
      </section>

      <section className="card stack" aria-label="Backup">
        <h2>Backup &amp; transfer</h2>
        <p className="faint small">
          All data lives in this browser. Export a JSON file to back up or to
          move to another device, then import it there.
        </p>
        <button className="btn" onClick={() => downloadBackup(state)}>
          Export backup (JSON)
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          Import backup…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          aria-label="Choose backup file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImportFile(f);
            e.target.value = "";
          }}
        />
        {importMsg && (
          <div className={`banner ${importMsg.ok ? "good" : "warn"} small`} role="status">
            {importMsg.text}
          </div>
        )}
      </section>

      <section className="card stack" aria-label="Danger zone">
        <h2>Danger zone</h2>
        <button className="btn" onClick={() => navigate("onboarding")}>
          Re-run onboarding
        </button>
        <button className="btn danger" onClick={() => setConfirmReset(true)}>
          Erase all data…
        </button>
      </section>

      <p className="faint small" style={{ textAlign: "center" }}>
        S&amp;S Coach · your data never leaves this device.
        <br />
        Based on the Simple &amp; Sinister program — buy the book, it's short
        and superb.
      </p>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} label="Confirm erase">
        <div className="stack">
          <h2>Erase everything?</h2>
          <p className="dim small">
            This deletes your profile, progression, and every logged session
            from this device. There is no undo. Export a backup first if in
            doubt.
          </p>
          <div className="field">
            <label htmlFor="reset-phrase">
              Type <strong>ERASE</strong> to confirm
            </label>
            <input
              id="reset-phrase"
              value={resetPhrase}
              onChange={(e) => setResetPhrase(e.target.value)}
              autoComplete="off"
            />
          </div>
          <button
            className="btn danger"
            disabled={resetPhrase !== "ERASE"}
            onClick={() => {
              wipeAll();
              replace(defaultState());
              setConfirmReset(false);
              setResetPhrase("");
              navigate("onboarding");
            }}
          >
            Erase all data
          </button>
          <button className="btn subtle" onClick={() => setConfirmReset(false)}>
            Cancel
          </button>
        </div>
      </Sheet>
    </div>
  );
}
