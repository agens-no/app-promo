---
name: app-promo
description: Make a polished vertical promo video for an iOS app with Apple's real 3D iPhone model, real app UI captured from the simulator, motion graphics and generated music and sound, in Remotion. Use when someone wants a promo video, launch video, ad, App Store preview-style clip or "brag video" for their app, or says /app-promo.
---

# App promo video (Remotion + real iPhone + real UI)

This method was developed on four small iOS apps (Unblock, Talljakt, Georama and Quiz) and is written so it can be repeated for any app. Everything app-specific lives in `examples/`. Reusable parts live in `templates/`. Detailed techniques, pitfalls and tunable variables are in `references/techniques.md`. Read it before building.

**Language:** talk to the user in the language they use. If they start in Norwegian, answer in Norwegian. The language of the text in the video is a separate choice (question 3 below).

## 0. Interview first (short)

Ask these together (AskUserQuestion or one message). Suggest defaults so the user can just answer "default":

1. **Length:** 20–60 s. Default ~30 s.
2. **Format:** 9:16 vertical 1080×1920. Default 60 fps. Also 1:1 or 16:9?
3. **Language of on-screen text.**
4. **Use:** private sharing, social (Reels/TikTok, safe zones) or App Store preview. App Store previews must be real recordings, max 30 s, without invented 3D effects, so this method fits them poorly.
5. **How much UI lifts out of the screen:** *subtle* (one or two hero moments), *medium* or *full* (everything lifts out). Default is **subtle to medium**. Full suits apps whose pieces are naturally physical objects (game tiles); for ordinary apps (lists, forms, cards), lift only 1–3 key elements and keep the rest on the screen.
6. **Creative freedom:** should the agent come up with the concept?
7. **Music:** generated in code (default, no licence needed) or their own track? Give **each app its own sound palette** so two videos never sound alike (see `references/techniques.md#sound`).
8. **Which features to show** (3–5), and what is the app's "hero" element or moment?
9. **Ending:** two proven options; pick by app and ask if unclear. (a) A logo lockup built from the app's own elements (Unblock: the logo assembles from 3D tiles, the brass tile lands last). (b) The home screen on the phone with a slogan above, where icon + name is the last line (Talljakt: "Six numbers. / One target. / [icon] Talljakt.").
10. **Phone colour:** cosmic-orange, deep-blue or silver. Pick the one that matches the app's accent colour.

The answers mostly steer the concept, how much lifts out of the screen, tempo (bpm) and colours.

## 0b. Delivery folder (once per Mac)

Finished videos are delivered to a fixed folder on the machine, not only the project's `out/`. The choice is stored per Mac in `~/.config/app-promo/destination` (one line, full path).

- Read the file at start. If it exists, use the folder without asking.
- If it is missing, ask once (AskUserQuestion): **`~/Movies/App Promos`** (recommended), the project's `out/` folder, the Desktop, or a custom path. Create the folder and write the path to `~/.config/app-promo/destination`.
- The user can change it any time by asking; update the file.

## 1. Workflow

1. **Read the app.** README, colour tokens (search `Color(`, `hex`, theme structs), fonts, copy. Use the app's own copy in the video where it is good.
2. **Find debug entry points** to show states without playing: launch arguments (`--design-*`), URL schemes (`myapp://design-home?state=…`) or fixtures. If there are none, ask before adding DEBUG-only hooks to the app.
3. **Build and install on a dedicated iPhone 17 Pro simulator.** Screenshots must be 1206×2622 or they won't match the phone model's screen. See `references/techniques.md#simulator`.
3b. **For real screen recordings:** read [references/recording.md](references/recording.md). Prepare the scene and tap points first, record short takes without UI inspection, builds or video analysis while recording, and check the raw timing before Remotion. A single continuous take of a whole flow (as in `examples/quiz`) keeps every number, progress bar and history entry consistent.
4. **Take screenshots** of each state. For still/cut-out sequences, play them with real taps and screenshot after every tap (see `references/consistency.md`). For video, do that inspection in a separate rehearsal, never during the final take. Lock the status bar (9:41, 100 %, discharging, or a green charging indicator shows). Get element frames with `baguette describe-ui`.
5. **Cut out UI elements** with an app-specific `tools/prep_<app>.py` that uses `templates/tools/prep_helpers.py`: sprites, empty backgrounds and a JSON of rectangles. Check each set visually (composite on magenta).
6. **Convert the iPhone model** from baguette (USDZ) to GLB with Blender (`templates/tools/convert_model.py`).
7. **Set up the Remotion project**, or reuse one: copy `templates/src/three/*`, `Title.tsx`, `brand.ts`, `remotion.config.ts`, `tools/sheet.sh` and `tools/prep_helpers.py`.
8. **Write a beat sheet** (`timeline.json`) in frames on a bpm grid (120 bpm at 60 fps = 30 frames per beat). Picture and sound both read this file.
9. **Build the scenes as one continuous "one-take":** the camera stays still and the phone rig moves. Screen changes are hidden by a transition: a spin, the app's own navigation, a zoom or wipe from an element, a push, flip, whip pan, match cut or fast-forward. Vary them, max two spins per video. See `references/techniques.md#transitions`.
10. **Iterate with contact sheets** (`tools/sheet.sh f1 f2 …`) of key frames. Look at them. Render the full video (fast: ~1–2 min for 30 s).
11. **Checkpoint:** show the user the first ~12 s before building the rest.
12. **Generate the soundtrack** (`tools/<app>_audio.mjs`, copied from an example) from the same timeline. Render, measure loudness (`ffmpeg -af ebur128`, aim for −14 to −16 LUFS) and open the file for the user.

12b. **Consistency check (required before delivery).** A mismatch between what is on the phone screen and what is highlighted outside it looks like an AI artefact. Go through `references/consistency.md` and render contact sheets ±2 frames around every transition, screen change and lift.
13. **Share text:** write a short text to paste wherever the video is shared, saved as `out/<app>-share.txt`. Format below.
14. **Deliver:** copy the latest approved render to the delivery folder (0b) as `<App> promo.mp4`, with the share text as `<App> promo.txt` beside it. Overwrite the previous delivery for the same app; the version history (`-v2`, `-v3` …) stays in `out/`. Give the path of the delivered file in the reply.

### Share text format

The text is usually posted in Slack, so use Slack formatting (mrkdwn): a bold title with *single asterisks* and bullets with "• " (a pasted "- " does not become a list). Write it in the video's language.

```
*<App> – <Tagline in 2–4 short sentences/words, ideally the one from the video>.*
<One sentence: what the app is, for whom or what.>

• <Point: the core action, concrete and active>
• <Point: the choices the app gives (topics, modes, area, pace …)>
• <Point: …>
• <Point: reward/sharing/what makes it special>
```

Rules: 4–5 points, no full stop at the end of points, address the reader directly, concrete verbs, no marketing clichés. Start with how the app is actually used: the first 2–3 points explain the mechanic concretely before options and extras. Then describe what the app lets you do, not just what the video shows: group the options per point ("Practise countries, capitals or flags") so the reader sees the range. Use the app's own names for things, and check in the code what each mode really does (READMEs go stale). See `examples/*/share.txt`.

## 2. A concept template that worked

One hero, one motion that ties it all together, the app's own copy:

| Part | Unblock | General |
|---|---|---|
| Hook 0–2.5 s | Tiles drop onto a board floating in the dark, no phone. "Stuck." | The problem the app solves, shown with the app's own elements, without the phone |
| Reveal | The phone builds itself around the board as the camera pulls back | The same element turns out to be inside the app |
| Core loop | 4 moves on the beat, a counter outside the screen | The main action in 3–4 beats |
| Hero moment | The hero lifts out of the screen and flies into the camera, brass flash | ONE big moment (an out-of-screen effect, or the app's own best animation in slow motion) |
| Payoff | Result screen, 3D stars bounce out | The reward or result |
| Features (varied transitions between) | Level picker, daily card, score | 2–3 features, each with one highlighted element |
| Outro | Logo built from 3D tiles, tagline | Logo lockup from the app's elements, or the home screen with slogan + name |

If the app has one genuinely good animation of its own (Quiz: the "Show answer" button tearing into Wrong/Right), make that the hero: zoom in close, slow it down with a speed ramp, give it its own sound, and don't caption it.

## 2b. Visual devices from good app promos

Good references *use the screen and the content*, not just the layout. Plan at least 3–4 of these per video:

- **Crop the screen:** go close enough that only one part shows (a timer, a button row, an equation). The phone is cut by the frame edge. Use `focus` poses.
- **Content cards beside or in front of the phone:** real cards or posters from the app (share card, result card, suggestion) as flat, slightly rotated planes behind or in front of the phone.
- **Several content cards at once:** fan out 3–5 variants (pages, solutions, posters).
- **Several devices:** two phones side by side when the story is sharing or "the same for everyone", with name chips above. Phone + Watch/iPad if the app supports it (baguette has iPad and Watch models).
- **The app's elements as decor:** real tiles, buttons, chips or icons drifting in the background (blurred = far away), or enlarged into typography above the phone. One themed motif (pulse line, crayon stroke, graph paper).
- **What the app makes, as an object:** the print, the poster, the card, ideally without the phone.
- **Speech or thought bubbles** for things that happen off the phone (Quiz: the spoken answer pops out beside the card, then drops onto the Right/Wrong button to "press" it).

## 2c. Text and framing

- **Large centred titles at the top carry the message:** 2–4 words per line, max two lines, the second line or key word in the accent colour.
- **Small captions at the bottom, sparingly**, only when the title needs clarifying (2–3 times in a 30 s video). They must be readable: at least ~50 px, in a chip with a light background and shadow (not loose text), placed low so they never cross the phone's frame, visible for at least 2 s.
- **Only claim what the app actually does.** Check what a feature really is before writing about it.
- **Full-screen text cards** are supported: a coloured surface (the app's primary colour) with a large centred two-line title, wiped in from the element last in focus and out by sliding away to the next scene. Use one as a breather or bridge before the ending, ideally a question that challenges the viewer ("Can you find it in time?"). Don't jump straight from intense action to the end screen. See `QuestionCard` in `examples/talljakt` and `examples/quiz`.
- **No fixed app icon and name in a corner.** Show the name only at the end, in the logo or as the last line of the slogan.
- Keep the frame clean: one idea per scene. If a feature has little to show (a setting), work it in as a caption or a short focus in another scene rather than giving it a scene of its own. Avoid title + zoomed phone + a row of elements + caption at the same time.
- **Tempo: no dead time.** Every scene has an event within ~1 s of starting, and no title sits over a static screen for more than ~1.5 s. Steps that repeat (questions 2–13 of a quiz) can be fast-forwarded.
- **Show choices as action, not text.** If the app has modes or settings, show the default being selected (the card lifts a little), a tap on the alternative (it lifts, the screen changes state), then a tap on start that leads into that mode.
- Interactions that would otherwise be unclear (open a menu, pick an option) get a **tap indicator** (a circle that presses in and ripples out) on what the app actually responds to.

## 3. Principles

- **Real UI beats recreated UI.** Use screenshots, recordings and cut-outs, not HTML copies of the app. Text that must change (counters, scores) is drawn in the app's font with PIL and verified against the original.
- **Dose "out of the screen".** It is seasoning. The default is one hero moment and 1–2 lifted features.
- **Zoom and focus are the main tool for emphasis.** Move the camera onto the part of the screen that matters right now and back out, without making a 3D object of it. Use `focus: [px, py]` in the rig poses (screen pixels → the rig centres that point), scale 1.8–2.6 for close-ups, 1.1–1.4 for overviews. Alternate close-up and overview with the music.
- **Everything on the beat.** Landings, moves and titles on beats or eighths. Sound and picture from the same `timeline.json`.
- **One continuous motion.** Avoid hard cuts. Choose the transition by what the change means, and vary (see `references/techniques.md#transitions`).
- **Show the key screens clearly.** The main screen should sit calmly, almost straight on, for at least ~1.5 s once, without lifted elements covering it. If the video ends on the phone, use the home screen straight on with little motion, so viewers recognise it when they open the app.
- **Look at frames yourself** before showing the user anything. Say clearly that you have not watched the video in real time or heard the sound.

## 4. Files

- `references/techniques.md`: techniques, limits, variables, transitions, sound and pitfalls (read it!)
- `references/recording.md`: low-overhead simulator recording
- `references/consistency.md`: the pre-delivery checklist
- `templates/src/three/`: `Phone.tsx` (real iPhone, screen coordinates in px, fade, live texture), `Sprite.tsx` (Sprite, Slab, StudioLights), `Lifted.tsx` (UI element lifting off with overlays), `Star.tsx`, `assets.ts` (Suspense loading), `useFrameTexture.ts` (recording frames as screen texture)
- `templates/src/Title.tsx`, `brand.ts`: kinetic typography and font loading
- `templates/tools/`: `prep_helpers.py`, `convert_model.py`, `sheet.sh`
- `templates/remotion.config.ts`: ANGLE GL, required for three.js in headless rendering
- `examples/unblock/`: dark style, lots of 3D out of the screen, ends on a logo lockup
- `examples/talljakt/`: light style, focus zooms, several cards, two phones, app elements as decor, ends on the home screen
- `examples/quiz/`: one continuous simulator recording of a whole flow, speed ramps, speech bubbles, fast-forward, result and history, no spins
