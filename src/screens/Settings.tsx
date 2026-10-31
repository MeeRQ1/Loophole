import { useRef, useState } from "react";
import {
  clearSavedData,
  defaultSave,
  mergeSaves,
  parseSave,
} from "../engine/storage";
import type { Save, Settings } from "../engine/types";

function PreferenceSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="settings-row">
      <span>{label}</span>
      <span className="preference-switch">
        <span className={!checked ? "active" : ""} aria-hidden="true">
          Off
        </span>
        <span aria-hidden="true">/</span>
        <span className={checked ? "active" : ""} aria-hidden="true">
          On
        </span>
        <input
          className="sr-only"
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
      </span>
    </label>
  );
}
export function SettingsScreen({
  save,
  onChange,
}: {
  save: Save;
  onChange: (save: Save) => void;
}) {
  const [message, setMessage] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const update = (patch: Partial<Settings>) =>
    onChange({ ...save, settings: { ...save.settings, ...patch } });
  const exportData = () => {
    try {
      const blob = new Blob([JSON.stringify(save, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `loophole-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Your saved progress has been exported.");
    } catch {
      setMessage("This browser could not export a backup. Please try again.");
    }
  };
  const importData = async (file?: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setMessage("Choose a Loophole backup smaller than 8 MB.");
      return;
    }
    try {
      onChange(mergeSaves(save, parseSave(await file.text())));
      setMessage(
        "Saved progress imported. Your existing records have been kept and combined.",
      );
    } catch {
      setMessage(
        "That file is not a valid Loophole backup. Your current progress is unchanged.",
      );
    }
    if (fileInput.current) fileInput.current.value = "";
  };
  return (
    <section
      className="quiet-page settings-page"
      aria-labelledby="settings-heading"
    >
      <header className="quiet-heading">
        <p className="eyebrow">MAKE IT YOURS</p>
        <h1 id="settings-heading">Settings.</h1>
        <p className="editorial">
          Keep things simple, however you like to play.
        </p>
      </header>
      <div className="settings-list">
        <div className="settings-row">
          <span id="theme-label">Theme</span>
          <fieldset className="segmented-control" aria-labelledby="theme-label">
            <legend className="sr-only">Page theme</legend>
            {(
              [
                ["dark", "Dark"],
                ["light", "Light"],
                ["system", "System"],
              ] as const
            ).map(([value, label], i) => (
              <label
                className={save.settings.theme === value ? "active" : ""}
                key={value}
              >
                {i > 0 && (
                  <span aria-hidden="true" className="segment-divider">
                    /
                  </span>
                )}
                <input
                  className="sr-only"
                  type="radio"
                  name="theme"
                  value={value}
                  checked={save.settings.theme === value}
                  onChange={() => update({ theme: value })}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
        </div>
        <PreferenceSwitch
          label="Sound"
          checked={save.settings.sound}
          onChange={(sound) => update({ sound })}
        />
        <PreferenceSwitch
          label="Reduced motion"
          checked={!save.settings.motion}
          onChange={(reduced) => update({ motion: !reduced })}
        />
        <PreferenceSwitch
          label="High contrast"
          checked={save.settings.contrast}
          onChange={(contrast) => update({ contrast })}
        />
      </div>
      <section className="settings-data" aria-labelledby="your-data-heading">
        <h2 id="your-data-heading" className="eyebrow">
          YOUR DATA
        </h2>
        <div className="settings-data-actions">
          <button className="text-button" onClick={exportData}>
            Export saved progress
          </button>
          <button
            className="text-button"
            onClick={() => fileInput.current?.click()}
          >
            Import saved progress
          </button>
          <button
            className="text-button danger"
            onClick={() => setConfirmReset(true)}
          >
            Clear all data
          </button>
          <input
            hidden
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            aria-label="Choose a Loophole backup"
            onChange={(event) => void importData(event.target.files?.[0])}
          />
        </div>
        <p className="editorial settings-storage-note">
          Progress is stored locally on this device.
        </p>
        <details className="quiet-details">
          <summary>About saved progress</summary>
          <p>
            Progress is not synced between devices. Export a backup before
            clearing browser data. Importing combines valid saved games and
            achievements with your existing progress. Your device’s
            reduced-motion preference always takes priority.
          </p>
        </details>
        {confirmReset && (
          <div
            className="inline-confirm"
            role="group"
            aria-label="Confirm saved data reset"
          >
            <p>
              <strong>Delete all Loophole data on this device?</strong> Export a
              backup first if you want to keep it. This clears saved rounds,
              statistics, achievements, preferences, and recovery copies.
            </p>
            <div className="field-row">
              <button
                className="danger"
                onClick={() => {
                  const cleared = clearSavedData();
                  onChange(defaultSave());
                  setConfirmReset(false);
                  setMessage(
                    cleared
                      ? "Your local data has been cleared."
                      : "This session has been reset, but browser storage could not be cleared. Check your browser’s site-data settings.",
                  );
                }}
              >
                Yes, delete local data
              </button>
              <button
                className="secondary"
                onClick={() => setConfirmReset(false)}
              >
                Keep my progress
              </button>
            </div>
          </div>
        )}
      </section>
      <p className="inline-message" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
