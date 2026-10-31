import { useMemo, useState } from "react";
import { encodeChallenge, validateChallenge } from "../engine/challenges";
import { describeRule } from "../engine/rules";
import { RULE_TYPES } from "../engine/types";
import type { Puzzle, Rule, RuleType } from "../engine/types";

const labels: Record<RuleType, string> = {
  length: "Exactly N letters",
  minLength: "At least N letters",
  maxLength: "At most N letters",
  starts: "Starts with a letter",
  ends: "Ends with a letter",
  position: "Letter at a position",
  contains: "Contains a letter",
  excludes: "Excludes a letter",
  sequence: "Contains two-letter sequence",
  noSequence: "Excludes two-letter sequence",
  vowels: "Exactly N vowels",
  minVowels: "At least N vowels",
  hasVowel: "Contains a vowel",
  noVowel: "Excludes a vowel",
  adjacent: "Adjacent identical letters",
  unique: "No repeated letters",
  repeated: "A letter occurs more than once",
  distinct: "Exactly N distinct letters",
  differentEnds: "First and last letters differ",
  startsVowel: "Starts with a vowel",
  endsConsonant: "Ends with a consonant",
  distinctVowels: "At least N distinct vowels",
};
const numeric = new Set<RuleType>([
  "length",
  "minLength",
  "maxLength",
  "vowels",
  "minVowels",
  "distinct",
  "distinctVowels",
]);
const letters = new Set<RuleType>([
  "starts",
  "ends",
  "contains",
  "excludes",
  "position",
  "hasVowel",
  "noVowel",
  "sequence",
  "noSequence",
]);
function initialRule(type: RuleType): Rule {
  if (numeric.has(type))
    return {
      type,
      value:
        type === "distinctVowels" || type === "vowels" || type === "minVowels"
          ? 2
          : 6,
    };
  if (letters.has(type))
    return {
      type,
      value:
        type === "sequence" || type === "noSequence"
          ? "er"
          : type === "hasVowel" || type === "noVowel"
            ? "a"
            : "s",
      ...(type === "position" ? { position: 2 } : {}),
    };
  return { type };
}

export function CreatorScreen({
  onPlay,
}: {
  onPlay: (puzzle: Puzzle) => void;
}) {
  const [rules, setRules] = useState<Rule[]>([
    { type: "length", value: 6 },
    { type: "vowels", value: 2 },
    { type: "ends", value: "r" },
  ]);
  const [message, setMessage] = useState("");
  const validation = useMemo(() => validateChallenge(rules), [rules]);
  const encoded = validation.valid ? encodeChallenge(rules) : "";
  const url = encoded
    ? `${location.origin}${import.meta.env.BASE_URL}#/challenge/${encoded}`
    : "";
  const update = (index: number, rule: Rule) => {
    setMessage("");
    setRules((current) =>
      current.map((item, i) => (i === index ? rule : item)),
    );
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage(
        "Challenge link copied. Send it to someone with a way with words.",
      );
    } catch {
      setMessage(
        "Clipboard access is unavailable. Select and copy the challenge link below.",
      );
    }
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "A Loophole challenge for you",
          text: "One word. All the rules. Can you find a way through?",
          url,
        });
        setMessage("Challenge shared.");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          setMessage("Sharing was unavailable. You can copy the link instead.");
      }
    } else await copy();
  };
  return (
    <section className="stack" aria-labelledby="creator-heading">
      <header className="page-heading">
        <p className="eyebrow">SET A LITTLE TRAP</p>
        <h1 id="creator-heading">Make a friend think.</h1>
        <p className="muted">
          Choose three to five rules. We check the common-word dictionary so
          every shared challenge has a fair way through.
        </p>
      </header>
      <div className="creator-layout">
        <section className="panel stack" aria-label="Challenge rule editor">
          <h2>Your rulebook</h2>
          {rules.map((rule, index) => (
            <div className="rule-editor stack" key={index}>
              <div className="field-row">
                <label className="form-field">
                  <span>Rule {index + 1}</span>
                  <select
                    aria-label={`Rule ${index + 1} type`}
                    value={rule.type}
                    onChange={(event) =>
                      update(index, initialRule(event.target.value as RuleType))
                    }
                  >
                    {RULE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {labels[type]}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="button secondary"
                  aria-label={`Remove rule ${index + 1}`}
                  disabled={rules.length <= 3}
                  onClick={() =>
                    setRules((current) => current.filter((_, i) => i !== index))
                  }
                >
                  Remove
                </button>
              </div>
              {numeric.has(rule.type) && (
                <label className="form-field">
                  <span>Number</span>
                  <input
                    aria-label={`Rule ${index + 1} number`}
                    type="number"
                    min={
                      rule.type === "vowels" || rule.type === "minVowels"
                        ? 0
                        : rule.type === "length" ||
                            rule.type === "minLength" ||
                            rule.type === "maxLength"
                          ? 3
                          : 1
                    }
                    max={rule.type === "distinctVowels" ? 5 : 12}
                    value={rule.value ?? ""}
                    onChange={(event) =>
                      update(index, {
                        ...rule,
                        value:
                          event.target.value === ""
                            ? 0
                            : Number(event.target.value),
                      })
                    }
                  />
                </label>
              )}
              {letters.has(rule.type) &&
                (rule.type === "hasVowel" || rule.type === "noVowel" ? (
                  <label className="form-field">
                    <span>Vowel</span>
                    <select
                      value={rule.value}
                      onChange={(event) =>
                        update(index, { ...rule, value: event.target.value })
                      }
                    >
                      {["a", "e", "i", "o", "u"].map((vowel) => (
                        <option value={vowel} key={vowel}>
                          {vowel.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="form-field">
                    <span>
                      {rule.type === "sequence" || rule.type === "noSequence"
                        ? "Two consecutive letters"
                        : "Letter"}
                    </span>
                    <input
                      aria-label={`Rule ${index + 1} ${rule.type === "sequence" || rule.type === "noSequence" ? "sequence" : "letter"}`}
                      value={rule.value ?? ""}
                      maxLength={
                        rule.type === "sequence" || rule.type === "noSequence"
                          ? 2
                          : 1
                      }
                      autoCapitalize="none"
                      autoComplete="off"
                      spellCheck={false}
                      onChange={(event) =>
                        update(index, {
                          ...rule,
                          value: event.target.value
                            .toLowerCase()
                            .replace(/[^a-z]/g, ""),
                        })
                      }
                    />
                  </label>
                ))}
              {rule.type === "position" && (
                <label className="form-field">
                  <span>Position (count from 1)</span>
                  <input
                    aria-label={`Rule ${index + 1} position`}
                    type="number"
                    value={rule.position ?? 1}
                    min={1}
                    max={12}
                    onChange={(event) =>
                      update(index, {
                        ...rule,
                        position: Number(event.target.value),
                      })
                    }
                  />
                </label>
              )}
            </div>
          ))}
          <button
            className="button secondary"
            disabled={rules.length >= 5}
            onClick={() =>
              setRules((current) => [...current, initialRule("contains")])
            }
          >
            + Add a rule
          </button>
          <p className="muted">
            A, E, I, O, U are vowels. Y is a consonant. Words contain 3–12
            letters.
          </p>
        </section>
        <aside className="stack">
          <section className="panel stack">
            <p className="eyebrow">THE FRIEND’S VIEW</p>
            <h2>One word. Every rule.</h2>
            <ol className="stack">
              {rules.map((rule, index) => (
                <li key={index}>{describeRule(rule)}</li>
              ))}
            </ol>
            <p>Six valid guesses · One optional Nudge</p>
            <div
              className={`notice ${validation.valid ? "success" : ""}`}
              role="status"
              aria-live="polite"
            >
              <strong>
                {validation.valid
                  ? "A fair challenge, ready to share."
                  : "A little adjustment needed."}
              </strong>
              <p>
                {validation.valid
                  ? `${validation.commonCount} common solutions · Estimated ${validation.difficulty} difficulty`
                  : validation.message}
              </p>
            </div>
            <div className="field-row">
              <button
                className="button"
                disabled={!validation.valid}
                onClick={() => {
                  if (validation.valid)
                    onPlay({
                      id: `challenge:${encoded}`,
                      rules,
                      difficulty: validation.difficulty,
                      solutions: validation.solutions,
                      commonCount: validation.commonCount,
                    });
                }}
              >
                Play challenge
              </button>
              <button
                className="button secondary"
                disabled={!validation.valid}
                onClick={() => {
                  void share();
                }}
              >
                Share link →
              </button>
            </div>
            {validation.valid && (
              <>
                <label className="form-field">
                  <span>Challenge link</span>
                  <input
                    readOnly
                    value={url}
                    onFocus={(event) => event.target.select()}
                  />
                </label>
                <button
                  className="button secondary"
                  onClick={() => {
                    void copy();
                  }}
                >
                  Copy challenge link
                </button>
              </>
            )}
            <p className="notice" role="status">
              {message}
            </p>
          </section>
          <p className="muted">
            The link contains only the rules, never a required answer. Anyone
            can win with any accepted English word that satisfies them all.
          </p>
        </aside>
      </div>
    </section>
  );
}
