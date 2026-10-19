# Consistency check: the screen and what is highlighted must agree

Viewers notice when what is on the phone screen doesn't match what is shown outside it. They may not notice consciously, but it lowers the quality and looks like an AI artefact. Go through everything below before delivering, and say in the report if something was not checked.

## The same state everywhere
- [ ] **Counters, clocks and scores:** if a value is both on the screen and outside it (a chip, a title), both change at the same time. Make variants of the number on the screen (`text_variants`) instead of leaving the screenshot frozen. Talljakt: the "0:59 left" chip counted down while the navigation bar stayed on 0:55.
- [ ] **Lifted elements:** if a lifted element shows a different state from the screen behind it (selected level, progress, result), the screen must update too, or the hole must be empty.
- [ ] **Data that belongs together:** the numbers on share cards, result cards and solution cards belong to the same task as the game that was shown.
- [ ] **The app's behaviour:** a button press leads to what the app really does (the right screen afterwards, the right selected state). Don't show states the app cannot have.
- [ ] **Several devices or users:** should they show something different (different scores or choices)? Identical screens look like a copy, unless the point is that they are shared.
- [ ] **What is said outside the phone matches the app:** a speech bubble with the right answer must match the revealed answer, and the button it presses must be the one that lights up in the recording.

- [ ] **Animated fields in the app** (random examples, clocks, counters): screenshots taken at different moments show different values. Build all states of one screen on **one base image** and paste in only the area that changes. Talljakt: the home screen's "25 × 4 + 8 = ?" showed 108, 374 and 521 in three screenshots.

- [ ] **Interactive sequences are played for real in the app.** When you show an action (a move, filling in a form, a choice), perform it with `baguette tap` in the simulator and take a screenshot after **every** tap, or record the whole flow in one take. Use those images for each step and blank only the elements animated in 3D. Instructions, enabled buttons, history and counters then follow the app's actual behaviour automatically. Talljakt v1 had frozen operators, "Pick a number to start" throughout the solution, and an empty move history.

## Transitions without ghosts
- [ ] **No crossfades between offset copies.** When a copy outside the screen and the original on the screen meet, the copy is in place before the original shows. Then switch instantly, since the pixels are the same. Talljakt: "642" slid into place while the screen faded in and gave a double shadow.
- [ ] **Pulses or lifts over an on-screen element:** the copy covers the original completely, or the original is removed from the screenshot.
- [ ] **Screen changes:** switch the texture instantly at a natural moment (mid-spin, when the app itself would update), not with a rectangular overlay.

## The device itself
- [ ] **The back in spins:** check that the back glass and camera plateau match the chosen finish. Tinting over a texture gives the wrong colour (deep-blue came out brown).

## Depth and order
- [ ] **Overlapping transparent planes** (card fans, overlays) sort by distance and can swap places mid-move. Give them a fixed `renderOrder`. Talljakt: the top solution card popped through its neighbour.
- [ ] **Fading the phone in:** fade the phone in as **one flat layer**. Put the phone (with its screen) on its own `ThreeCanvas` inside `<AbsoluteFill style={{opacity}}>`, and the elements that stay visible on a canvas above it, with `<Phone body={false}>` and the same rig. Translucent 3D materials (`Phone opacity`) show side buttons and the camera plateau through the body, even with clipping planes. Don't let the frame pop in at the end.
- [ ] **Two layers with "the same" graphic overlapping:** if a copy (drawn cleanly) and the original (screenshot) are visible at the same time, they must be pixel-identical. Measure the ink position per glyph in the original and place the copy accordingly, or draw the same copy in both layers.

- [ ] **No stepped changes in continuous motion.** Float, shake and drift ramp in and out, never switch off with `frame > X ? a : b`. Talljakt: the float was reduced in one frame and gave a visible jump down.

## Geometry
- [ ] **Overlays covering the whole screen** (dimming, sheets, a new screen) have the screen's rounded corners (iPhone 17 Pro: radius ≈ 186 px, or 62 pt). Square overlays stick out at the corners.
- [ ] **Sheets sliding up** have rounded corners both at the top (the sheet's radius) and the bottom (the screen's radius).
- [ ] **Close-ups:** check that foreground elements don't cut through the phone, and that titles don't cover what the camera zooms in on.
- [ ] **Recording frames past the end:** a 60 fps working copy may end a few frames earlier than the log suggests. Clamp source frames to the last extracted frame.

## How to check
1. List every event in `timeline.json` (switches, lifts, moves, transitions).
2. Run `tools/sheet.sh` with frames f−2, f, f+2 and f+10 for each event, or extract them from the render with ffmpeg `select`. Look at them at full size around the phone screen (crop), not just as small contact sheets.
3. Note and fix. Repeat for the frames that changed.
