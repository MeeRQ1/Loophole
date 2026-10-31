import { useMemo, useState } from "react";
import { encodeChallenge, validateChallenge } from "../engine/challenges";
import { RULE_TYPES } from "../engine/types";
import type { Puzzle, Rule, RuleType } from "../engine/types";

const labels: Record<RuleType, string> = {
  length: "Exactly",
  minLength: "At least",
  maxLength: "At most",
  starts: "Starts with",
  ends: "Ends with",
  position: "Letter at position",
  contains: "Contains",
  excludes: "Does not contain",
  sequence: "Contains sequence",
  noSequence: "Excludes sequence",
  vowels: "Exactly N vowels",
  minVowels: "At least N vowels",
  hasVowel: "Contains vowel",
  noVowel: "Excludes vowel",
  adjacent: "A double letter",
  unique: "No repeated letters",
  repeated: "A repeated letter",
  distinct: "Distinct letters",
  differentEnds: "Different first & last",
  startsVowel: "Starts with a vowel",
  endsConsonant: "Ends with a consonant",
  distinctVowels: "Distinct vowels",
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
      value: ["distinctVowels", "vowels", "minVowels"].includes(type) ? 2 : 5,
    };
  if (letters.has(type))
    return {
      type,
      value: ["sequence", "noSequence"].includes(type)
        ? "er"
        : ["hasVowel", "noVowel"].includes(type)
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
    { type: "length", value: 5 },
    { type: "starts", value: "b" },
    { type: "contains", value: "r" },
  ]);
  const [message, setMessage] = useState("");
  const [linkVisible, setLinkVisible] = useState(false);
  const validation = useMemo(() => validateChallenge(rules), [rules]);
  const encoded = useMemo(
    () => (validation.valid ? encodeChallenge(rules) : ""),
    [rules, validation.valid],
  );
  const url = encoded
    ? `${location.origin}${import.meta.env.BASE_URL}#/challenge/${encoded}`
    : "";
  const update = (index: number, rule: Rule) => {
    setMessage("");
    setLinkVisible(false);
    setRules((current) =>
      current.map((item, i) => (i === index ? rule : item)),
    );
  };
  const copy = async () => {
    setLinkVisible(true);
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Challenge link copied. Send it to a friend.");
    } catch {
      setMessage(
        "Select and copy the challenge link below. Clipboard access is unavailable in this browser.",
      );
    }
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "A Loophole challenge for you",
          text: "One word. Every rule. Find a way through.",
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
    <section
      className="quiet-page creator-page"
      aria-labelledby="creator-heading"
    >
      <header className="quiet-heading">
        <p className="eyebrow">MAKE A PUZZLE FOR A FRIEND</p>
        <h1 id="creator-heading">Your rules.</h1>
        <p className="editorial">
          Build something fair, then send it to someone.
        </p>
      </header>
      <div className="creator-layout">
        <section className="creator-editor" aria-label="Challenge rule editor">
          <h2 className="eyebrow creator-section-label">YOUR CONSTRAINTS</h2>
          <ol className="creator-rules">
            {rules.map((rule, index) => (
              <li className="creator-rule" key={index}>
                <span className="rule-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <label className="rule-type">
                  <span className="sr-only">Rule {index + 1} type</span>
                  <select
                    value={rule.type}
                    onChange={(event) =>
                      update(index, initialRule(event.target.value as RuleType))
                    }
                  >
                    {RULE_TYPES.map((type) => (
                      <option value={type} key={type}>
                        {labels[type]}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="rule-parameters">
                  {numeric.has(rule.type) && (
                    <label className="rule-parameter numeric-parameter">
                      <span className="sr-only">Rule {index + 1} number</span>
                      <input
                        type="number"
                        min={
                          ["vowels", "minVowels"].includes(rule.type)
                            ? 0
                            : ["length", "minLength", "maxLength"].includes(
                                  rule.type,
                                )
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
                      <span aria-hidden="true">
                        {[
                          "length",
                          "minLength",
                          "maxLength",
                          "distinct",
                        ].includes(rule.type)
                          ? "letters"
                          : "vowels"}
                      </span>
                    </label>
                  )}
                  {letters.has(rule.type) &&
                    (["hasVowel", "noVowel"].includes(rule.type) ? (
                      <label className="rule-parameter">
                        <span className="sr-only">Rule {index + 1} vowel</span>
                        <select
                          value={rule.value}
                          onChange={(event) =>
                            update(index, {
                              ...rule,
                              value: event.target.value,
                            })
                          }
                        >
                          {["a", "e", "i", "o", "u"].map((v) => (
                            <option value={v} key={v}>
                              {v.toUpperCase()}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <label className="rule-parameter">
                        <span className="sr-only">
                          Rule {index + 1}{" "}
                          {["sequence", "noSequence"].includes(rule.type)
                            ? "sequence"
                            : "letter"}
                        </span>
                        <input
                          value={rule.value ?? ""}
                          maxLength={
                            ["sequence", "noSequence"].includes(rule.type)
                              ? 2
                              : 1
                          }
                          autoCapitalize="characters"
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
                    <label className="rule-parameter position-parameter">
                      <span className="sr-only">Rule {index + 1} position</span>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={rule.position ?? 1}
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
                <button
                  className="remove-rule text-button"
                  aria-label={`Remove rule ${index + 1}`}
                  disabled={rules.length <= 3}
                  onClick={() => {
                    setLinkVisible(false);
                    setRules((current) =>
                      current.filter((_, i) => i !== index),
                    );
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
          <button
            className="text-button add-rule"
            disabled={rules.length >= 5}
            onClick={() => {
              setLinkVisible(false);
              setRules((current) => [...current, initialRule("contains")]);
            }}
          >
            ＋ Add another rule
          </button>
          <p className="creator-guidance">
            Choose 3–5 rules. A, E, I, O, U are vowels; Y is a consonant.
          </p>
        </section>
        <aside className="creator-check">
          <h2 className="eyebrow creator-section-label">PUZZLE CHECK</h2>
          <div className="creator-check-content">
            <div
              className="creator-check-section"
              role="status"
              aria-live="polite"
            >
              <h3>
                {validation.valid
                  ? "This challenge works."
                  : "A little adjustment."}
              </h3>
              <p>
                {validation.valid
                  ? `${validation.difficulty[0].toUpperCase() + validation.difficulty.slice(1)} difficulty`
                  : validation.message}
              </p>
            </div>
            {validation.valid && (
              <>
                <div className="creator-check-section common-count">
                  <p>Common valid words</p>
                  <strong>{validation.commonCount} possibilities</strong>
                </div>
                <div className="creator-check-section creator-examples">
                  <p>Example answers</p>
                  <div>
                    {validation.solutions.slice(0, 3).map((word) => (
                      <span key={word}>{word.toUpperCase()}</span>
                    ))}
                  </div>
                </div>
              </>
            )}
            <button
              className="button creator-share"
              disabled={!validation.valid}
              onClick={() => void copy()}
            >
              Create shareable link
            </button>
            {validation.valid && (
              <details
                className="quiet-details challenge-link-details"
                open={linkVisible}
                onToggle={(event) => setLinkVisible(event.currentTarget.open)}
              >
                <summary>Link & play options</summary>
                <label className="form-field">
                  <span>Challenge link</span>
                  <input
                    readOnly
                    value={url}
                    onFocus={(event) => event.target.select()}
                  />
                </label>
                <div className="field-row">
                  <button className="secondary" onClick={() => void copy()}>
                    Copy link
                  </button>
                  <button className="secondary" onClick={() => void share()}>
                    Share link
                  </button>
                  <button
                    className="secondary"
                    onClick={() =>
                      onPlay({
                        id: `challenge:${encoded}`,
                        rules,
                        difficulty: validation.difficulty,
                        solutions: validation.solutions,
                        commonCount: validation.commonCount,
                      })
                    }
                  >
                    Play challenge
                  </button>
                </div>
              </details>
            )}
            <p className="inline-message" role="status">
              {message}
            </p>
          </div>
        </aside>
      </div>
      <p className="supporting-nav">
        Rules must have valid solutions. Any accepted word that fits wins.
      </p>
    </section>
  );
}
