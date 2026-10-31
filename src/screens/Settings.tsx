import { useRef, useState } from "react";
import {
  clearSavedData,
  defaultSave,
  mergeSaves,
  parseSave,
} from "../engine/storage";
import type { Save, Settings } from "../engine/types";

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
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Your backup has been downloaded. Keep it somewhere safe.");
    } catch {
      setMessage(
        "The backup could not be downloaded in this browser. Please try again.",
      );
    }
  };
  const importData = async (file?: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setMessage(
        "This backup is too large. Choose a Loophole JSON backup smaller than 8 MB.",
      );
      return;
    }
    try {
      const imported = parseSave(await file.text());
      onChange(mergeSaves(save, imported));
      setMessage(
        "Backup restored. Existing progress has been kept and combined with your backup.",
      );
    } catch {
      setMessage(
        "That file is not a valid Loophole backup. Your current progress has not changed.",
      );
    }
    if (fileInput.current) fileInput.current.value = "";
  };
  return (
    <section className="stack" aria-labelledby="settings-heading">
      <header className="page-heading">
        <p className="eyebrow">MAKE YOURSELF AT HOME</p>
        <h1 id="settings-heading">Your kind of quiet.</h1>
        <p className="muted">
          Settle the page to suit you. Preferences are saved on this device.
        </p>
      </header>
      <section className="panel stack">
        <h2>Look & feel</h2>
        <div className="settings-row">
          <label htmlFor="theme-choice">
            Page theme
            <span className="muted">
              Follow your device, or pick a favourite.
            </span>
          </label>
          <select
            id="theme-choice"
            value={save.settings.theme}
            onChange={(event) =>
              update({ theme: event.target.value as Settings["theme"] })
            }
          >
            <option value="system">Device setting</option>
            <option value="light">Light paper</option>
            <option value="dark">Midnight ink</option>
          </select>
        </div>
        <label className="settings-row">
          <span>
            Higher contrast
            <span className="muted">
              Stronger text and borders. Symbols always accompany rule feedback.
            </span>
          </span>
          <input
            type="checkbox"
            checked={save.settings.contrast}
            onChange={(event) => update({ contrast: event.target.checked })}
          />
        </label>
        <label className="settings-row">
          <span>
            Gentle motion
            <span className="muted">
              Short transitions and rule reveals. Your device’s reduced-motion
              preference takes priority.
            </span>
          </span>
          <input
            type="checkbox"
            checked={save.settings.motion}
            onChange={(event) => update({ motion: event.target.checked })}
          />
        </label>
        <label className="settings-row">
          <span>
            Sound effects
            <span className="muted">
              A small note on submission. The game is fully playable in silence.
            </span>
          </span>
          <input
            type="checkbox"
            checked={save.settings.sound}
            onChange={(event) => update({ sound: event.target.checked })}
          />
        </label>
      </section>
      <section className="panel stack">
        <h2>Keep your notebook</h2>
        <p>
          Your progress lives only in this browser. It is not synced between
          devices. Clearing browser data can erase it; a backup lets you bring
          it along.
        </p>
        <div className="field-row">
          <button className="button" onClick={exportData}>
            Export progress
          </button>
          <button
            className="button secondary"
            onClick={() => fileInput.current?.click()}
          >
            Import a backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            aria-label="Choose a Loophole backup"
            onChange={(event) => {
              void importData(event.target.files?.[0]);
            }}
          />
        </div>
        <p className="muted">
          Imports merge saved rounds and achievements with the progress already
          on this device.
        </p>
      </section>
      <section className="panel stack">
        <h2>A fresh page</h2>
        <p>
          Reset all local progress, statistics, achievements, and preferences.
          Export a backup first if you might want them back.
        </p>
        {confirmReset ? (
          <div
            className="inline-confirm"
            role="group"
            aria-label="Confirm saved data reset"
          >
            <p>
              <strong>Delete all Loophole data on this device?</strong> This
              cannot be undone without a backup.
            </p>
            <div className="field-row">
              <button
                className="button danger"
                onClick={() => {
                  const cleared = clearSavedData();
                  onChange(defaultSave());
                  setConfirmReset(false);
                  setMessage(
                    cleared
                      ? "Local progress, preferences, and recovery copies have been reset."
                      : "This session has been reset, but browser storage could not be cleared. Check your browser’s site-data settings.",
                  );
                }}
              >
                Yes, delete local data
              </button>
              <button
                className="button secondary"
                onClick={() => setConfirmReset(false)}
              >
                Keep my progress
              </button>
            </div>
          </div>
        ) : (
          <button
            className="button secondary"
            onClick={() => setConfirmReset(true)}
          >
            Reset saved data…
          </button>
        )}
      </section>
      <p className="notice" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
