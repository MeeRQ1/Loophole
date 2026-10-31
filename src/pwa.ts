let waitingWorker: ServiceWorker | null = null;

/** Updates wait until the player chooses to reload; current games stay intact. */
export function registerPWA(onUpdate: () => void): () => void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator))
    return () => undefined;
  let closed = false;
  const check = () =>
    void navigator.serviceWorker
      .getRegistration(import.meta.env.BASE_URL)
      .then((registration) => registration?.update())
      .catch(() => undefined);
  void navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    })
    .then((registration) => {
      const notify = () => {
        if (
          !closed &&
          registration.waiting &&
          navigator.serviceWorker.controller
        ) {
          waitingWorker = registration.waiting;
          onUpdate();
        }
      };
      notify();
      registration.addEventListener("updatefound", () => {
        registration.installing?.addEventListener("statechange", notify);
      });
    })
    .catch(() => {
      /* Gameplay also works without offline installation. */
    });
  const visibility = () => {
    if (document.visibilityState === "visible") check();
  };
  document.addEventListener("visibilitychange", visibility);
  return () => {
    closed = true;
    document.removeEventListener("visibilitychange", visibility);
  };
}

export function applyUpdate(): void {
  if (!waitingWorker) return;
  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => location.reload(),
    { once: true },
  );
  waitingWorker.postMessage("ACTIVATE_UPDATE");
}
