# Loophole

A daily word puzzle game where one word must satisfy multiple rules.

**Any accepted English word that satisfies every rule wins.** There is no hidden target word. Loophole is a static React + TypeScript game built with Vite, with no account, API key, database, advertising, or tracking.

Play at **https://meerq1.github.io/Loophole/** once the Pages deployment succeeds.

## How to play

The Daily Run has three rounds: **Warm-Up** (three rules), **The Stretch** (four rules), and **The Loophole** (five rules). Enter a word of 3–12 English letters and press Enter or submit. Only legitimate, previously unused dictionary words consume one of six attempts. Feedback appears after submission; typing does not reveal whether rules pass. Any word satisfying every rule completes the round. After six unsuccessful valid guesses, verified examples are shown and you can continue.

Vowels mean **A, E, I, O, U**. Y is a consonant. Repeated letters need not be adjacent; an adjacent pair specifically means neighboring identical letters. Displayed letter positions start at one. All engine evaluation uses lowercase words.

A **Nudge** reveals the starting letter of one possible common answer. It never requires that particular answer. One Nudge is allowed per round; its penalty is shown before activation.

| Round | First-guess maximum | Per earlier valid guess | Nudge penalty | Successful minimum |
| --- | ---: | ---: | ---: | ---: |
| Warm-Up | 100 | 12 | 25 | 20 |
| The Stretch | 150 | 18 | 35 | 25 |
| The Loophole | 250 | 30 | 60 | 40 |

Failed rounds earn zero. A perfect Daily Run earns 500.

## Modes and local progress

- **Daily Run:** the same three puzzles for everyone, changing at 00:00 UTC. Partially completed runs are saved. Completing all three rounds, including failures, counts toward the consecutive-day completion streak; fully solved runs are tracked separately.
- **Practice:** unlimited easy, medium, hard, or mixed puzzles with separate results. Practice never extends the daily streak.
- **Create Challenge:** compose rules, check common solutions, and copy a versioned hash URL for a friend. Links describe the rules, not a required answer. Recipients can play and share their own results without an account.
- **Archive:** replay previous daily sets with separate progress; archive play never overwrites official daily results or extends the streak.
- **Statistics and achievements:** real results from this device, with achievement unlock dates. There are no global rankings.
- **Settings:** themes, contrast, motion, sound, and local data backup/restore controls.

Result sharing omits answers and rules. Text can be copied or shared through supported browser sharing APIs; a branded image card can be downloaded.

## Run locally

Install **Node.js 24** and npm. In the repository folder:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, with `/Loophole/` as its path. Production assets intentionally use this repository-specific base path. Hash routes support refreshes and shared challenge links on GitHub Pages.

```sh
npm run typecheck       # TypeScript verification
npm run lint            # ESLint
npm test                # Engine, content, gameplay, persistence tests
npm run validate:puzzles # Validate the checked-in daily content bank
npm run build           # Type-check and produce dist/
npx playwright install chromium
npm run test:browser     # Real Chromium gameplay and responsive journeys
npm run preview         # Serve the production build locally
```

On Linux, `npx playwright install --with-deps chromium` also installs browser system dependencies. The browser test configuration starts its own web server; there is no separate backend to start.

## Puzzle content and dictionary

The broad accepted dictionary and the smaller common-word quality dictionary are separate offline datasets. A submitted answer is checked against the accepted dictionary and the shared rule evaluator, never only against precomputed example answers. Alphabetic entries are normalized to lowercase and restricted to the supported length range. Proper-name handling, word-source licenses, and curation are documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The engine supports length, letter placement, inclusion and exclusion, two-letter sequences, vowels, repeated and distinct letters, and relationships between first and last letters. The same typed definitions and evaluator are used in gameplay, generation, challenge creation, and tests.

The daily bank is checked in so released dates stay stable. Each date maps to a deterministic easy/medium/hard set. Puzzles originate from verified solutions, are measured against common vocabulary, and are checked for invalid or redundant rules. A deterministic fallback keeps dates outside the stored schedule playable.

```sh
npm run generate:puzzles
npm run validate:puzzles
npm test
```

Treat published dates as immutable: generation must append future content rather than replace released entries. Review generated data changes and run the full validation before deployment. For example, `PUZZLE_DAYS=732 npm run generate:puzzles` appends a second year while preserving existing puzzle entries. Do not hand-edit hundreds of puzzle entries or change evaluator semantics without versioning content and challenge formats.

## Architecture

| Location | Purpose |
| --- | --- |
| `src/engine/types.ts` | Stable, shared rules and game-state types |
| `src/engine/rules.ts` | Authoritative descriptions and evaluation |
| `src/engine/dictionary.ts` | Offline word normalization and lookup |
| `src/engine/puzzles.ts` | Daily schedule, practice selection, UTC identity |
| `src/engine/challenges.ts` | Validated, bounded, versioned share URLs |
| `src/engine/game.ts` | Guesses, attempts, hints, scoring and progression |
| `src/engine/storage.ts` | Versioned persistence, validation and migration |
| `src/engine/stats.ts` | Honest local statistics and achievements |
| `src/engine/sharing.ts` | Spoiler-free sharing and image cards |
| `src/components`, `src/screens` | Accessible, responsive application interface |
| `src/data` | Versioned word and puzzle content |
| `scripts` | Reproducible content generation and validation |
| `tests` | Logic and real browser tests |
| `pwa.ts`, `src/pwa.ts` | Release-wide offline caching and user-controlled updates |

## Offline installation and updates

The web app manifest and service worker are scoped to `/Loophole/`. In supported browsers, use the browser's install/add-to-home-screen command. After the first complete online load, the service worker caches the application, dictionary, and puzzle bank so Daily Runs and Practice can work offline. Installation is browser-dependent; ordinary browser play works without installation.

A new service worker waits rather than interrupting an ongoing puzzle. The interface offers an update action when a newer release is ready. Taking that action reloads the application while keeping versioned local progress. Development mode does not register the service worker. If troubleshooting cached production assets, use browser developer tools → Application → Service Workers; avoid clearing site data unless you have exported a backup.

## Data and privacy

Progress and preferences live in this browser's `localStorage`, with a versioned format and defensive loading. Damaged raw saves are retained under `loophole.save.v2.recovery` (and numbered recovery keys) rather than silently overwritten. A confirmed reset removes active, legacy, and recovery saves. There is no automatic synchronization between devices. Export a backup before clearing browser/site data, and use import to restore it. Private browsing, browser cleanup, quota limits, or disabled storage can prevent durable saves; the application remains playable but cannot promise retention when the browser refuses storage.

Challenge URLs are validated as data: known rule kinds, bounded numeric parameters, supported versions, and payload size limits. They never execute code. As a client-only game, local results are not tamper-proof and are not presented as verified competitive rankings.

## GitHub Pages deployment

The workflow in `.github/workflows/ci.yml` checks every branch push and pull request. It installs dependencies, type-checks, lints, runs unit tests and the full content validator, builds production assets, and executes essential Chromium journeys. Only a successful `main` run uploads and deploys the site using the official Pages actions.

**One-time repository setting:** under **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**, rather than **Deploy from a branch**. The repository initially used branch-based publishing from `main` at `/`; the workflow requires Actions publishing. Repository administrators may need to enable Pages or approve the `github-pages` environment, depending on repository policy.

After pushing, check the Actions run and its deployment job before assuming the site is live. Open `https://meerq1.github.io/Loophole/`, exercise a Daily Run and challenge link, and inspect console/network errors. Local test success alone does not verify the live deployment.

To roll back, revert the problematic commit on `main` and push the revert. CI will rebuild and redeploy the previous behavior; avoid rewriting history. Preserve released puzzle-bank entries and storage migrations during rollback. Existing users receive the replacement release through the update prompt.

## Releases

Update `package.json` and the lockfile version together, record meaningful changes in `docs/releases/vX.Y.Z.md` and the changelog, then create a matching semantic version tag:

```sh
npm version 1.0.1 --no-git-tag-version
git add package.json package-lock.json
git commit -m "Release 1.0.1"
git push origin main
git tag v1.0.1
git push origin v1.0.1
```

`.github/workflows/release.yml` verifies that the tag matches the package version and repeats all mandatory tests before publishing a GitHub Release. It attaches a versioned `dist` archive and combines required versioned release notes with generated repository history. Tags containing a prerelease suffix create prereleases. If any mandatory check fails, publication stops; do not manually label a failing version stable.

Tagging does not itself deploy a different Pages version; the deployment tracks successful pushes to `main`. Review generated release notes after publication and add concrete player-facing changes when useful.

## Limitations

The bundled offline lexicon and puzzle content currently produce about 840 KB of compressed core JavaScript, plus small lazy-loaded screens. This trades a larger first visit for self-contained offline play. English word lists can disagree on rare words and regional inflections; the documented offline accepted list is authoritative for this release. Local progress is device-specific. Native sharing, PWA installation, sound autoplay permissions, and clipboard availability depend on browser capabilities. No global leaderboard, server account, cross-device sync, or multiplayer service is implied.

Third-party word-list attribution is in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The visual mark, icon, and social artwork in `public/` are original project assets. Interface typography uses local/system fallbacks and does not require a third-party font request to play.
