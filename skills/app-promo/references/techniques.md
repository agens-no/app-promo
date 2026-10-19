# Techniques, limits and variables

## Setup

```bash
# Remotion project (in the repo root, e.g. promo/; reuse it if it exists)
nvm use 22
npx create-video@latest --yes --blank --no-tailwind promo && cd promo && npm i
npx remotion add @remotion/three @remotion/media @remotion/transitions @remotion/fonts @remotion/noise
npm i three @react-three/fiber @types/three
npx skills add remotion-dev/skills -g -a claude-code -s '*' -y   # Remotion's own agent skills (optional)
```

- `remotion.config.ts`: `Config.setChromiumOpenGlRenderer("angle")`. Without it three.js does not render headless.
- `.gitignore`: `public/fonts/`, `public/models/`, `out/`, recordings and extracted frames. Apple's fonts and models must not be committed or shared.
- Fonts: copy the app's bundled fonts (or `/Library/Fonts/SF-Pro-Rounded-*.otf` if the app uses SF Pro Rounded) to `public/fonts/` and load them with `@remotion/fonts` + `delayRender`.
- Remotion licence: free for individuals and companies of up to three people; larger companies need a company licence (remotion.dev/license).

## The iPhone model (Apple's own)

- baguette (Homebrew, `brew install baguette`) ships USDZ models: `$(brew --prefix)/Cellar/baguette/<ver>/libexec/Baguette_Baguette.bundle/Contents/Resources/Models3D/<id>/device.usdz` + `definition.json`. IDs: iphone-17-pro, iphone-17-pro-max, iphone-17, iphone-air, iPad Pro, Apple Watch.
- Convert: `/Applications/Blender.app/Contents/MacOS/Blender -b --python templates/tools/convert_model.py -- device.usdz public/models/iphone-17-pro.glb`
- The screen is the mesh with material `ScreenMaterial`. Its UVs cover the whole 1206×2622 screenshot with `texture.flipY = false`.
- Finishes: cosmic-orange is the default (baked into the GLB). Deep-blue and silver are tinted by overriding the materials in `finishMaterials` (from `definition.json`), see `Phone.tsx`. Drop `map` on the overridden materials, or the orange texture gets tinted and the back glass turns brown (visible in spins).
- `Phone.tsx` scales the model ×10, centres it and lays out `children` in **screen pixels** (origin top left, +y down, +z toward the camera), so sprites from a screenshot can be placed with their pixel rectangles. `texture` replaces the still screen with a live texture (a recording frame, see `useFrameTexture.ts`).
- **Fading the phone in:** a translucent body shows the camera plateau through the screen, and hiding the meshes behind did not help. Fade the phone as one flat layer instead (see `consistency.md`).
- `baguette render-3d --udid … --rotation x,y,z --size 1080x1920 --screen-glass -o x.png` makes finished stills with a transparent background. Useful for thumbnails and App Store images, too slow for animation (~3 s per frame).

## Simulator {#simulator}

- Use a dedicated iPhone 17 Pro simulator per app (`xcrun simctl create "<App> Promo QA" …`). Build with `ARCHS=arm64 ONLY_ACTIVE_ARCH=YES` if local Swift packages fail with "Unable to resolve module dependency" or "incompatible target" (x86_64 slice).
- Status bar: `xcrun simctl status_bar <udid> override --time 9:41 --batteryState discharging --batteryLevel 100 --cellularBars 4 --wifiBars 3 --dataNetwork wifi`
- `baguette screenshot`, `baguette describe-ui` (frames in points; ×3 = pixels), `baguette tap` and `baguette input` (a stdin stream of touch events for drags and holds) work headless.
- **Real recordings:** follow [recording.md](recording.md). Start from `simctl io recordVideo` and measure the raw clip's timestamps; metadata FPS is no guarantee of smooth motion.
- Use debug states for everything you need to show (finished streak, chosen level, a finished quiz). Taps work, so segmented controls and buttons can be set with `baguette tap`.

## Recordings in Remotion

- Make a 60 fps working copy and extract only the frames you use as JPEGs (`ffmpeg -i take.mp4 -vf fps=60 -q:v 3 frames/%d.jpg`), then load one per video frame with `useFrameTexture` + `<Redraw>`. Remotion's offthread video decoder returned stale frames under concurrency.
- Map video frames to recording frames with **knots** `[videoFrame, sourceFrame]` and linear interpolation between them. Holds, slow motion, speed-ups and catching up on a beat are all just knots. One segment can use an easing (a fast-forward with cubic in-out).
- Find the source frames of every event first: the tap event in the log is not when the screen reacts (Quiz: tap at 60, the button starts splitting at 74). Make strips of every other frame around each event and read them.
- Sprites cut from a recording frame (a card, a button) hand over seamlessly when they come to rest exactly on their rectangle and the texture switches to that same frame.

## Cutting out UI (prep script)

- Element rectangles: from `describe-ui`, or from edges with `edges()` (brightness jumps along a row or column).
- `rounded(crop, radius)`: rounded alpha mask. Radius in px ≈ corner radius in pt × 3. Use `inset=1–2` to drop the light fringe at the corners. Don't use brightness keying on elements with dark details (it punches holes).
- Tiles and cards with a "lip": include ~2 pt extra at the bottom, no more, or the shadow comes along.
- **Empty background** where elements lift out: `paper_fill` (median of the screen margins per row) with ~30 px padding to the sides and ~50 px below for the shadow. `inpaint` (row interpolation) only for narrow areas such as a digit.
- **Changing numbers:** `glyph_bbox` on the original → draw with the same font and size (cap height / 0.705 ≈ point size in px) → diff to check that "0" comes out identical. One PNG per value.
- Text over decorated backgrounds: don't key it out. Show it as an HTML overlay (chip/pill) in the app's style.
- Always composite check images on magenta and look at them.

## Remotion/three rules that bit

- **Asset loading must use Suspense** (`assets.ts`). ThreeCanvas only draws when the frame changes, so `useState` + `delayRender` gave an empty canvas.
- No `useFrame`. Everything is driven by `useCurrentFrame()`.
- The camera stays still (`fov 30, z 6`). Animate the rig's `position`, `rotation` and `scale`. Visible height at z=0 is ~3.2 units; the phone is ~1.5 units tall at scale 1.
- **Transparent layers sort by distance.** An overlay on a tilted card disappeared behind the card. Give overlays a fixed `renderOrder` above the surface (`Overlay layer`).
- Sprites have `depthWrite={false}`, so the Slab body (ExtrudeGeometry behind the sprite) gives thickness when the element lifts, and hides inside the phone when it rests.
- `<Phone screen=…>` can be switched in the middle of a 360° spin (rotation.y + 2π over 30 frames, switch at 50 %).
- zsh does not word-split `$VAR`. Use `"$@"` in scripts (`sheet.sh`), not loops over string variables.

## Zoom/focus on parts of the screen

- The rig can centre a screen point: local x = (px − 603) × 0.000553, local y = −(py − 1311) × 0.000553 (iPhone 17 Pro, model scale 10). Rig position = (−local x × scale, targetY − local y × scale, 0). See `place()` in the examples.
- Close-up (scale 1.8–2.6) for 1–2 beats, then back to an overview. Keep tilt small (≤ 0.1 rad) in close-ups, or perspective distorts the text.
- Combine freely: zoom in → an element lifts a little → zoom out. But most emphasis should be pure zoom.
- Leave room for titles: in shots with a title, keep the phone's top below the title (a top fade under the titles hides the rest); in close-ups without a title, fade that gradient out.

## Motion that looked good

- Drop: `fall` 1→0 over 15 frames with ease-in and a small bounce (0 → 0.018 → 0), a bit of random rotation per piece, staggered on sixteenths (7.5 frames at 120 bpm).
- Camera shake on landing: `amp * exp(-t/5) * sin(t*2.1)` added to the rig position.
- Glide: bezier(0.22, 1, 0.36, 1) and `lift += sin(πp) * 70` while the element moves (feels physical).
- Hero out of the screen, in two phases: (1) out of the phone with ease-out (dx, lift ~500, some rotation), (2) `scale` 1→16 with ease-in-cubic until it fills the frame, then a flash in the accent colour. A pure z move toward the camera missed because of perspective.
- Lifted UI elements: `back` easing bezier(0.34, 1.56, 0.64, 1), lift 400–800 px, dy toward the middle of the frame, scale 1.2–1.6, counter-rotation in x against the phone's tilt.
- Button press: raise 120 px, dip −100 and scale −5 %, release over 16 frames.
- Bubbles and small objects that "press" a button: hop in an arc (`sin(πp)` lift), squash on contact (scale x +18 %, y −28 %), then burst (scale up, fade out over ~9 frames).
- Titles: word by word (stagger 4 frames), blur 14→0, translateY, accent words in the accent colour. The next title starts only when the previous is gone (previous `to` ≈ next `from` − 20).
- Background: a gradient in the app's background colour + drifting soft glow + vignette + SVG grain (feTurbulence, seed every 2nd frame, opacity 0.05–0.09).

## Transitions between screens {#transitions}

The spin is fun and popular, but it should not be the only transition. **Vary:** max two spins per video, never the same transition twice in a row, and choose by what the change means. All of them stay inside the "one-take": the camera stays still, and the rig, the elements or colour fields do the work. The screen texture switches instantly at the moment the transition hides (see [consistency.md](consistency.md)). Each transition gets its own sound (whoosh, pop, tick) on the same frame in `timeline.json`.

| Transition | Fits when | How |
|---|---|---|
| **Spin** (default) | Jumping between different parts of the app (game → result → settings) | `rotation.y + 2π` over 30 frames with in-out, switch `screen` at 50 % (behind the phone). Unblock and Talljakt used three each; two is better |
| **The app's own navigation** | You have a real recording, and the change is something the app does itself (a card sliding on, the result after the last answer, Done → home) | Play the recording through the change and move the camera at the same time (zoom out, new `focus`). The most believable and nearly free. `examples/quiz` uses only this, no spins |
| **Zoom through an element** | The next scene is about that element (card → detail, icon → app) | Push `focus` + scale onto the element until it fills the frame (scale 6–10), switch screens when its colour covers everything, pull out on the new screen. The colour must match on both sides |
| **Wipe from an element** | Into a text card or a completely different mood | `clipPath: circle()` in the accent colour growing from the element last tapped (its position in the frame, not on the screen). Out again by sliding away. See `QuestionCard` |
| **Push between phones** | The same action on two devices, or "next day"/"next player" | Phone B enters from the side and pushes A out, both in the same canvas with their own groups |
| **Flip** | From one person or device to another, or before/after | The phone turns 180° around y; at 90° switch the phone (or screen) and the new state appears on the other side. Shorter and clearer than a full spin |
| **Whip pan** | Raising the tempo, a run of features | The rig is thrown sideways (x ±3 over 10–12 frames, hard in-out) with motion blur (`@remotion/motion-blur`, or two or three offset copies at low opacity). The new screen enters from the opposite side |
| **Match cut** | Two screens share an element of the same shape or colour (button → ring, card → card) | Scale/move the element from screen A to exactly the position of the matching element on screen B, switch screens when they overlap. Needs pixel-exact rectangles from both screenshots |
| **Fast-forward** | Many similar steps that don't need to be shown one by one (quiz questions 2–13) | A real recording with a speed ramp (cubic in-out, 6–10× at the peak) and light motion blur (`ffmpeg tmix=frames=3–7` on the working frames). One tick in the sound per step |

Speed ramps (slow motion into an important moment, then snapping out) are not a transition in themselves but give the same lift. Quiz: the app's own button morph at quarter speed while the button "stretches", then normal speed for the snap, with a rising rubbery creak and a pop.

## Sound (generated, no licence) {#sound}

**Give every app its own sound palette.** Two videos from the same generator with the same instruments sound like copies. Pick genre and instruments by the app's character:
- Physical/tactile game (Unblock): marimba, wood, brass bells, acoustic.
- Numbers/logic/digital (Talljakt): electro-pop, plucks (Karplus–Strong), saw pad with a filter sweep, 808 sub, snare, hi-hat rolls, FM blips.
- Cosy/social (Quiz): a swinging combo with Rhodes (FM), upright bass, brushes, finger snaps and music box.
- Fitness/energy: four-on-the-floor, sidechain pumping, bigger drums.
- Creative/kids: ukulele/glockenspiel, light percussion clicks, swing.
Also change key, groove (straight/swing, half-time) and sound effects (clicks vs. blips).

**Default to cheerful.** A minor-key trap version with distorted 808 and a harsh saw pad was disliked. What worked: major with I–V–vi–IV (or I–vi–ii–V with sevenths for a jazzier feel), a bouncy groove (kick on 1+3, claps/snaps on 2+4, offbeat hats or shaker), a soft sine bass with a pluck on top, FM bells (ratio 3.5, low index) as melody, gentle sidechain (down to 0.7) and no tanh drive above ~1.1 on single voices. Use minor or darker colours only when asked, or briefly as tension before a hit.

- `examples/*/…_audio.mjs`: instruments, foley, Schroeder reverb and mixing to WAV, all read from `timeline.json`.
- Structure: hook (pedal + ticks) → riser → groove → payoff hit with an open major chord → groove → breakdown → final chord on the last element of the ending.
- **Silence before the hero:** stop the band for 1–2 beats (a held chord and a ticking clock) so the hero moment lands.
- Foley from the picture: a clack per landing (pentatonic), a thud on collisions, a swish on glides, bells for rewards, ticks for counting, a whoosh on spins and transitions, syllable-like blips for speech bubbles, a "womp" for a wrong answer.
- Final level: −15 to −16.5 LUFS worked. Measure with `ffmpeg -i x.mp4 -af ebur128 -f null -`; raise it with more drive in the final `tanh` rather than a hard limiter.

## Variables to tune

| Variable | Where | Unblock |
|---|---|---|
| bpm, fps, all scene times | `timeline.json` | 120 bpm, 60 fps, 1980 frames |
| Out-of-screen intensity | `lift`/`scale`/`dy` in the scenes | full (recommended: subtle–medium) |
| Phone colour | `<Phone finish>` | cosmic-orange |
| Rig poses per scene | `poses[]` in the composition | see the example |
| Colours, font | `brand.ts` or the composition's palette | forest green, cream, brass; SF Pro Rounded |
| Title size and position | `<Title size top>` | 150 px, top 210 |
| Grain, vignette, glow | Backdrop/Grain/Vignette | 0.09 / 0.55 |
| Sound mix | gain arguments in `add()` | — |

## Limits

- Needs macOS with Xcode, a simulator, baguette, Blender and Node 22.
- Only the iPhone models baguette ships. Screenshots must match the model's `textureSize`.
- Stills and cut-outs show no in-app animation (transitions, spinners). Record real video for that (see `recording.md`).
- Rendering: ~1–2 min for 30 s on an M-series Mac (concurrency 4).
