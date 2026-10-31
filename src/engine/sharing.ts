import type { Run } from "./types";
import { scoreRound, totalScore } from "./game";

export const PLAY_URL = "https://meerq1.github.io/Loophole/";
function shortId(value: string): string {
  let hash = 2166136261;
  for (const letter of value)
    hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}
export function shareText(run: Run, streak: number): string {
  const labels =
    run.rounds.length === 3
      ? ["Warm-Up", "The Stretch", "The Loophole"]
      : ["Puzzle"];
  const mode =
    run.mode === "daily"
      ? `DAILY · ${run.date}`
      : run.mode === "archive"
        ? `ARCHIVE · ${run.date}`
        : run.mode === "challenge"
          ? `FRIEND CHALLENGE · ${shortId(run.rounds[0].puzzle.id)}`
          : "PRACTICE";
  const maximum = run.rounds.reduce(
    (total, round) =>
      total + { easy: 100, medium: 150, hard: 250 }[round.puzzle.difficulty],
    0,
  );
  return [
    `LOOPHOLE — ${mode}`,
    "",
    ...run.rounds.map(
      (round, index) =>
        `${round.status === "solved" ? "🟩" : round.status === "failed" ? "⬛" : "⬜"} ${labels[index]}: ${round.status === "solved" ? round.guesses.length : round.status === "failed" ? "X" : "–"}/6${round.hint ? " · nudge" : ""}`,
    ),
    "",
    `Score: ${totalScore(run)}/${maximum}`,
    ...(run.mode === "daily"
      ? [`Streak: ${streak} ${streak === 1 ? "day" : "days"}`]
      : []),
    `Nudges: ${run.rounds.filter((round) => round.hint).length}`,
    PLAY_URL,
  ].join("\n");
}
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const previousFocus = document.activeElement;
  const field = document.createElement("textarea");
  field.value = text;
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  const success = document.execCommand("copy");
  field.remove();
  if (previousFocus instanceof HTMLElement) previousFocus.focus();
  if (!success)
    throw new Error(
      "Copy is unavailable in this browser. Try sharing instead.",
    );
}
export async function shareResults(
  run: Run,
  streak: number,
): Promise<"shared" | "copied"> {
  const text = shareText(run, streak);
  if (navigator.share) {
    await navigator.share({ title: "Loophole", text });
    return "shared";
  }
  await copyText(text);
  return "copied";
}
export function downloadCard(run: Run, streak: number): void {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 760;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image export is unavailable in this browser.");
  context.fillStyle = "#11191b";
  context.fillRect(0, 0, 1200, 760);
  context.strokeStyle = "#39484c";
  context.lineWidth = 2;
  context.strokeRect(36, 36, 1128, 688);
  context.fillStyle = "#e8eceb";
  context.font = '600 76px "DM Sans", sans-serif';
  context.fillText("loophole.", 88, 155);
  context.fillStyle = "#9db1b8";
  context.font = "23px monospace";
  context.fillText(`${run.mode.toUpperCase()} · ${run.date}`, 92, 210);
  const maximum = run.rounds.reduce(
    (total, round) =>
      total + { easy: 100, medium: 150, hard: 250 }[round.puzzle.difficulty],
    0,
  );
  context.fillStyle = "#e8eceb";
  context.font = '600 125px "DM Sans", sans-serif';
  context.fillText(String(totalScore(run)), 85, 410);
  context.font = '34px "DM Sans", sans-serif';
  context.fillText(`/ ${maximum} points`, 400, 400);
  context.font = '26px "DM Sans", sans-serif';
  run.rounds.forEach((round, index) => {
    const y = 478 + index * 49;
    context.fillStyle = round.status === "solved" ? "#a4c9a5" : "#c88982";
    context.fillText(
      `${index + 1}. ${round.status === "solved" ? "SOLVED" : round.status === "failed" ? "NOT SOLVED" : "IN PROGRESS"} · ${round.guesses.length}/6 guesses · ${scoreRound(round)} points${round.hint ? " · nudge used" : ""}`,
      92,
      y,
    );
  });
  context.fillStyle = "#e8eceb";
  context.font = "21px monospace";
  context.fillText(
    run.mode === "daily" ? `${streak} day streak` : "Any word. Every rule.",
    92,
    662,
  );
  context.textAlign = "right";
  context.fillText("meerq1.github.io/Loophole", 1105, 662);
  const link = document.createElement("a");
  link.download = `loophole-${run.mode}-${run.date}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
