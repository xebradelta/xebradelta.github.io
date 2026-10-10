(function (root) {
  "use strict";
  const FP = (root.FP = root.FP || {});
  FP.VERSION = "1.0.0";
  FP.offline = {
    status: root.FLIP_STANDALONE
      ? "Portable edition · all files embedded"
      : "Offline setup incomplete",
    registration: null,
    listeners: [],
  };
  const notify = (status) => {
    FP.offline.status = status;
    FP.offline.listeners.forEach((fn) => fn(status));
  };
  function ask(worker) {
    return new Promise((resolve, reject) => {
      if (!worker) return reject(new Error("No active worker"));
      const channel = new MessageChannel(),
        timeout = setTimeout(
          () => reject(new Error("Cache verification timed out")),
          5000,
        );
      channel.port1.onmessage = (e) => {
        clearTimeout(timeout);
        resolve(e.data);
      };
      worker.postMessage({ type: "STATUS" }, [channel.port2]);
    });
  }
  FP.offline.check = async () => {
    if (root.FLIP_STANDALONE) return;
    try {
      const r = FP.offline.registration;
      if (!r) return;
      const result = await ask(r.active);
      notify(
        result.ready
          ? "Ready offline · " + result.version
          : "Offline setup incomplete · retry in Settings",
      );
    } catch {
      notify("Offline setup incomplete · retry in Settings");
    }
  };
  FP.offline.activate = () => {
    if (FP.offline.registration?.waiting)
      FP.offline.registration.waiting.postMessage({ type: "ACTIVATE" });
  };
  FP.offline.refresh = async () => {
    if (root.FLIP_STANDALONE) {
      notify("Portable edition · all files embedded");
      return;
    }
    notify("Checking offline files…");
    try {
      if (!navigator.onLine) throw new Error("Connect once to refresh");
      const r =
        FP.offline.registration ||
        (await navigator.serviceWorker.register("./sw.js"));
      FP.offline.registration = r;
      await r.update();
      if (r.active) {
        const channel = new MessageChannel();
        await new Promise((res, rej) => {
          const id = setTimeout(
            () => rej(new Error("Refresh timed out")),
            30000,
          );
          channel.port1.onmessage = (e) => {
            clearTimeout(id);
            e.data.ok ? res() : rej(new Error("Incomplete download"));
          };
          r.active.postMessage({ type: "REFRESH" }, [channel.port2]);
        });
      }
      await FP.offline.check();
    } catch {
      notify(
        "Offline setup incomplete · retry while online. Existing cached files retained.",
      );
    }
  };
  FP.offline.init = async () => {
    if (root.FLIP_STANDALONE) return;
    if (!("serviceWorker" in navigator) || !root.isSecureContext) {
      notify("Offline setup incomplete · use HTTPS or the portable file");
      return;
    }
    try {
      const r = await navigator.serviceWorker.register("./sw.js");
      FP.offline.registration = r;
      r.addEventListener("updatefound", () => {
        const worker = r.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed") {
            if (r.active) {
              notify("Update downloaded · applies outside a round");
              if (
                ![
                  "playing",
                  "paused",
                  "countdown",
                  "calibration",
                  "permission",
                ].includes(FP.round?.state)
              )
                FP.offline.activate();
            } else FP.offline.check();
          }
          if (worker.state === "redundant") {
            if (r.active) FP.offline.check();
            else notify("Offline setup incomplete · retry in Settings");
          }
        });
      });
      navigator.serviceWorker.addEventListener("controllerchange", () =>
        FP.offline.check(),
      );
      await navigator.serviceWorker.ready;
      await FP.offline.check();
    } catch {
      notify("Offline setup incomplete · retry in Settings");
    }
  };
})(globalThis);
