# Quiet interface visual verification

The 18 full-resolution PNG exports in the supplied Figma ZIP were reviewed before implementation and compared with actual browser screenshots afterward. Direct access to the Figma design URL was blocked by the execution environment, so node inspection and measurements inside Figma were unavailable. The exported designs, rather than an independently invented style, were the visual authority.

The implementation uses self-hosted DM Sans and Instrument Serif, the approved deep neutral background, thin separators, restrained rule numbering, light primary actions, narrow puzzle stages, and the mobile full-page menu. The removed orange homepage ornament has no replacement. Rule feedback still uses symbols and screen-reader text in addition to color.

Desktop screenshots use **1360 × 850 CSS pixels at 2× scale**, matching the exports’ 2720-pixel width. Mobile screenshots use **390 × 844 CSS pixels at 2× scale**, matching their 780-pixel width. Full-page captures preserve additional functional content below the viewport, so some image heights exceed the illustrative mockups. Responsive checks also cover 320, 375, 768, and 1360 pixels.

| Figma reference | Implemented screenshot | Verification |
| --- | --- | --- |
| 01 Home / quiet puzzle stage | [Desktop home](../reports/visual/01-home.png) | Centered identity, short example rows, intentional blank space, paired actions; no orange decoration. |
| 02 Daily / Warm-Up | [Daily Warm-Up](../reports/visual/02-daily-warm-up.png) | Narrow rule stage, clear heading, integrated input, submit, attempts and optional hint. |
| 03 Round completed | [Accepted answer](../reports/visual/03-round-completed.png) | Quiet accepted-word surface, individual checks, real score and immediate next action. |
| 04 Daily results | [Daily results](../reports/visual/04-daily-results.png) | Restrained round ledger, actual points, streak, sharing and onward actions. |
| 05 Practice | [Practice](../reports/visual/05-practice.png) | Same puzzle components with segmented difficulty and practice actions. |
| 06 Challenge creator | [Desktop creator](../reports/visual/06-create-challenge.png) | Numbered editable rows and desktop validation aside; every supported rule remains available. |
| 07 Friend challenge | [Shared puzzle](../reports/visual/07-friend-challenge.png) | Same gameplay hierarchy with the real shared constraints. No fabricated friend name. |
| 08 Statistics | [Statistics](../reports/visual/08-statistics.png) | Four prominent totals, real calculated daily-score bars, solve rate and average attempts. |
| 09 Achievements | [Milestones](../reports/visual/09-achievements.png) | Simple earned/locked rows with actual requirements, progress and unlock dates. |
| 10 Archive | [Archive](../reports/visual/10-archive.png) | Date ledger and selected-day detail with independent replay. |
| 11 How to play | [Tutorial](../reports/visual/11-how-to-play.png) | Four-letter STAR example; alternate words demonstrate the same authoritative evaluator. |
| 12 Settings | [Preferences](../reports/visual/12-settings.png) | Slim theme/toggle rows and local-data actions; export/import/reset remain functional. |
| 13 Unsuccessful round | [Failed round](../reports/visual/13-round-unsuccessful.png) | Calm failure state, verified answers, honest zero points and continuation. |
| 14 Invalid challenge | [Recovery](../reports/visual/14-invalid-challenge.png) | Minimal recovery composition and working navigation. |
| 15 Mobile home | [Mobile home](../reports/visual/15-mobile-home.png) | Two-line title, readable example rows and comfortable stacked actions. |
| 16 Mobile Daily | [Mobile gameplay](../reports/visual/16-mobile-daily.png) | Single-column input/submit, visible attempt count and hint. |
| 17 Mobile creator | [Mobile rule builder](../reports/visual/17-mobile-creator.png) | Editable rule rows, stacked validation, working sharing; no clipped controls. |
| 18 Mobile navigation | [Mobile menu](../reports/visual/18-mobile-navigation.png) | Full-height quiet navigation, large links, clear close action and preserved destinations. |

## Comparison findings and corrections

The desktop Home rule column initially sat left of the headline and actions; its margins were corrected to center it. A tablet overflow came from negative margins on daily information and was removed without hiding content. Home example wording now follows the concise reference copy. Repeated practice navigation was reduced to the relevant practice actions. Light-theme version text initially lost contrast through opacity; the opacity was removed and the accessibility scan rerun.

The final screens follow the approved composition, fonts, geometry, palette, alignment and restrained treatment. This is a visual implementation comparison, not a claim of exact pixel equality: real words, dates, scores, solution counts and achievement records differ intentionally from illustrative data. Existing attempt history, backup/restore, accessibility options, extra supported rule parameters and sharing fallbacks remain available in the same language, sometimes through expandable details. Text contrast and comfortable controls take priority over reproducing tiny or low-contrast reference text.

## Reproduce the captures

```sh
npm run build
npm run preview -- --port 4182 --strictPort
CAPTURE_BASE=http://127.0.0.1:4182/Loophole/ npx tsx scripts/capture-ui.ts
```

The capture script uses November 1, 2026 as a test clock to exercise the calibrated future schedule. All puzzle and result states are constructed with the real rule/game engine. The statistics image contains calculated outcomes from 14 clearly scoped fixture runs, not invented audience metrics. The script writes all 18 screenshots and a state manifest to `reports/visual/`; it does not change any production player save.

The final local production run passed **all 18 browser and accessibility checks**. Run the browser suite with `npm run test:browser`. It covers complete and failed Daily Runs, invalid/duplicate words, hint persistence and scoring, practice controls, friend links and replays, settings, copying/image export, keyboard submission, all five responsive widths, offline assets/fonts, cross-tab attempts, UTC rollover, archive isolation and pre-update saves. Automated accessibility checks exercise the principal screens in both themes. Browser viewport testing is not a physical-device or human difficulty playtest, and automated accessibility scanning is not a complete WCAG certification.

## Installed-update regression

The first live old-session check exposed stale HTTP-cached HTML after the update prompt was accepted. Installation now revalidates HTTP cache entries, and the cache revision also includes the worker implementation. A two-release browser regression uses the real generated service worker, a deliberately long-lived HTTP cache, explicit update activation, and persisted progress. The corrected test passes; removing revalidation reproduced the old-HTML failure. This is separate from the fresh-install offline checks.
