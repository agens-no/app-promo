# app-promo

An agent skill for Claude Code (and other skill-aware agents) that makes polished, vertical promo videos for iOS apps:

- **Apple's real 3D iPhone model**, animated in Remotion with three.js
- **Real app UI**: screenshots, cut-outs and screen recordings from the iOS Simulator, never HTML copies
- **Motion graphics** on a beat sheet: kinetic titles, focus zooms, elements lifting out of the screen, varied transitions
- **Generated music and sound effects** from the same timeline, with no licensed audio

The agent interviews you briefly (length, language, how much 3D, ending), reads your app, captures its states in a dedicated simulator, builds the video, checks it frame by frame for consistency, and delivers an MP4 plus a short share text.

## Showcase

<table>
  <tr>
    <td align="center" width="33%"><img src="docs/unblock-hook.gif" width="240" alt="Tiles drop onto a floating board, then the phone builds itself around it"></td>
    <td align="center" width="33%"><img src="docs/unblock-hero.gif" width="240" alt="The hero tile lifts out of the screen and flies into the camera"></td>
    <td align="center" width="33%"><img src="docs/unblock-logo.gif" width="240" alt="The logo assembles from 3D tiles"></td>
  </tr>
  <tr>
    <td align="center"><sub><b>Hook and reveal</b><br>the phone builds around the app's own pieces</sub></td>
    <td align="center"><sub><b>Hero moment</b><br>one element lifts out of the screen</sub></td>
    <td align="center"><sub><b>Logo lockup</b><br>built from the app's elements</sub></td>
  </tr>
</table>

### Raw recording vs. promo

<p align="center">
  <img src="docs/kjop-raw-vs-promo.gif" width="640" alt="Left: the raw simulator recording of typing an item into a shopping list. Right: the same frames in the promo, zoomed in on the field and then on the sorted list">
</p>

The same simulator recording, frame for frame. The skill puts it in the real iPhone, moves the camera to what matters and keeps everything on the beat. It works as well for a plain shopping list as for a game. Every video also gets its own generated soundtrack.

## Install

As a skill:

```sh
npx skills add agens-no/app-promo
```

As a Claude Code plugin:

```
/plugin marketplace add agens-no/app-promo
/plugin install app-promo@app-promo
```

Then ask for a promo video for your app, or run `/app-promo`. The skill answers in the language you write in.

## How it works

The agent starts with a short interview and suggests a default for every question, so you can just answer "default":

- **Length and format:** 20–60 s (default ~30 s), 9:16 vertical at 60 fps, optionally square or landscape
- **Language** of the text in the video (the agent itself answers in the language you write in)
- **Where it will be shown:** private sharing, social media or App Store preview
- **How much 3D:** *none* (real recordings, focus zooms and the app's own transitions only), *subtle* (one hero moment), *medium* or *full* (UI elements lift out of the screen as solid 3D objects)
- **Which 3–5 features** to show, and the app's hero element or moment
- **The ending:** a logo built from the app's own elements, or the home screen with a slogan
- **Music:** generated in code with its own sound palette per app (default, no licence needed), or your own track
- **Phone colour** to match the app, and whether the agent may come up with the concept itself

It then finds debug states or fixtures in your app, records and screenshots it in a dedicated simulator, builds the video on a beat sheet, generates the soundtrack, checks transitions frame by frame, and shows you the first seconds before finishing.

## Requirements

- macOS on Apple silicon with Xcode and an iOS Simulator runtime
- [baguette](https://tddworks.github.io/baguette/) for headless taps, UI trees, screenshots and the device models
- [Blender](https://www.blender.org/) to convert the iPhone model to GLB
- Node 22 and [Remotion](https://www.remotion.dev/)
- Python 3 with Pillow, and ffmpeg

You don't have to set these up by hand. The agent checks the toolchain first, lists what is missing and offers to install it (Homebrew, nvm or pip). It only installs after you say yes.

## What's inside

```
skills/app-promo/
  SKILL.md              the workflow the agent follows
  references/           techniques, transitions, sound, recording, consistency checklist
  templates/            reusable Remotion components (Phone, Sprite, Lifted, Title …) and prep tools
  examples/             four complete promos: Unblock (dark, lots of 3D), Talljakt (light, cards and zooms),
                        Quiz (one continuous screen recording, speed ramps, speech bubbles),
                        Kjop (low-key: a plain list, focus zooms and the app's own transitions)
```

The examples come from real apps; their on-screen copy is in Norwegian. Images, fonts, models and recordings are not included, so the examples are reference code rather than projects you can render as-is.

## Licences and assets

- The skill and code are MIT licensed.
- **Remotion** is free for individuals and companies of up to three people; larger companies need a [company licence](https://www.remotion.dev/license).
- **The iPhone model** comes from baguette's bundled Apple device models, and **SF Pro** fonts are Apple's. Neither is included here, and neither should be committed to your project. Using Apple product imagery in marketing is subject to Apple's [marketing guidelines](https://developer.apple.com/app-store/marketing/guidelines/).
- App Store previews must be real recordings without invented effects; this method is aimed at social and private sharing.
