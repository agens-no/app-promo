# Real simulator recordings with low overhead

Read this when the video should contain real app motion, or when simulator recordings stutter. The method is **prepare → record → analyse**, with as little agent work as possible during the recording itself. It does not replace the creative brief or the rest of the promo workflow.

## Choosing how to record

- Start with Xcode's built-in `xcrun simctl io <UDID> recordVideo`. It captures the simulator's display directly, without a Mac window frame. Use an explicit UDID; `booted` is ambiguous when several simulators run.
- Simulator's Record Screen is a practical alternative. Don't assume a new GUI or MCP tool gives a higher real frame rate; test the same scene before switching.
- Apple documents recording without a Simulator.app window. That may reduce host window work; it is not a promised performance gain. Check in a rehearsal that the app's scene is active, animations run and the same taps and drags work.
- Don't quit Simulator.app carelessly: its preferences can shut devices down when the window closes. Don't change global CoreSimulator preferences, disable system services or stop other projects' simulators to "optimise".
- If the simulator still stutters: compare a short sequence from a physical iPhone before reducing graphics quality. Phone recordings must be judged separately; a good simulator FPS or a 60 fps export is not proof of performance on a device.

## 1. Prepare and rehearse without recording

1. Build and install once, ideally an optimised arm64 build on Apple silicon. Don't build, index or run tests while recording. If you need DEBUG fixtures, say so; don't claim Debug is representative of Release performance.
2. Launch without a debugger, Metal API/shader validation, GPU capture or a continuous log stream when the goal is clean promo footage. Turn those on in a separate diagnostic run if something fails.
3. Use one known recording device and app build. Identify other active jobs; coordinate before stopping anything that isn't part of this task. Avoid Remotion/Blender renders, ffmpeg decoding, screen sharing and a second recorder at the same time.
4. Lock language, appearance, orientation, status bar and keyboard state before recording. Check that Slow Animations is off.
5. Text fields: the simulator uses the Mac's hardware keyboard, so no iOS keyboard appears and a focused field may never lose focus (the "Done" button of a keyboard toolbar never shows). Find the focused layout in the rehearsal (the field may sit lower), and if the flow needs the field unfocused afterwards, end the take there and start the next take from a fixture with the typed item already in place; join the two takes in a close-up where both look identical.
6. Prepare a specific question, answer or data set with an existing seed, deep link or fixture where possible. Find tap points and timing with `describe-ui` and screenshots now. Coordinates only apply to this layout and device. Rehearse the sequence before recording.
7. Let textures, fonts and the first animation finish. Check visually that the right app is in front; a valid MP4 only proves that a display was recorded.
8. Plan short takes, e.g. 5–15 s per action with some margin, or **one continuous take of the whole flow** when state must carry across screens (a quiz from first question to result and home). Use a predetermined sequence and a monotonic clock; don't let the agent's thinking pauses drive the footage. Long holds can be shortened later with knots in Remotion.

## 2. Recording: only the actions to be filmed

During the recording: no `describe-ui`, accessibility snapshots, screenshots, pixel checks, OCR, tree dumps, searching for the right question or repeated polling. The needed taps and drags are of course fine; input tools have overhead too, so test them in the rehearsal. If the sequence needs new inspection or fails, stop and finalise the take, investigate, and record a new short take. Don't carry the "debugging" into the hero take.

Use options supported by the installed Xcode:

```sh
xcrun simctl io help
xcrun simctl io "$record_udid" recordVideo --codec=h264 "$record_path"
```

`record_udid` is the verified device and `record_path` a new file path. Don't use `--force` by default; keep the raw takes. H.264 is a useful compatibility choice; HEVC is the default in recent Xcode. Pick the codec explicitly for reproducibility, and run short A/B takes of the same scene if the codec is suspected. Don't invent `--fps` or bitrate flags; `recordVideo` has none.

For an agent-driven recording process (see `examples/quiz/tools/quiz_rec.py`):

- Start one recorder, keep its PID/handle and read stderr until the actual `Recording started` (first frame processed). Use a bounded start timeout. EOF or a process error is a failure, never a synonym for "recording started".
- Define t0 at the confirmed start. Perform only the planned actions, and log their real monotonic times in a small local log next to the take.
- In `finally`: send SIGINT to exactly the recorder process and wait for it to exit and finalise the file, with a timeout. Don't use killall or SIGKILL as a normal stop.
- Analyse and convert only after the recorder has exited. One recording at a time.

Masking: `--mask=alpha` does not give transparent video in current Xcode; the help says it turns black. Keep 1206×2622 for the iPhone 17 Pro template; a lower simulator geometry needs updated crops and coordinates.

## 3. Check the raw take before Remotion

Run after recording:

```sh
ffprobe -v error -select_streams v:0 \
  -show_entries stream=codec_name,width,height,avg_frame_rate,r_frame_rate,nb_frames,duration \
  -of json "$record_path"
ffprobe -v error -select_streams v:0 \
  -show_entries frame=best_effort_timestamp_time -of json "$record_path"
```

Look at the intervals between frames (median, 95th percentile, maximum), especially during the motion you will use (`examples/quiz/tools/quiz_frames.py` prints them around each logged event). Variable frame rate is normal: a long interval on static UI is not stutter. A high average FPS can also hide big pauses. Inspect the content at large gaps; metadata alone does not count unique motion frames. Watch the take in real time when possible and check contact sheets for the right action, text and app. Be clear if only stills and timestamps were checked.

A 60 fps file is not 60 new app frames. `fps=60` conversion can repeat source frames. Remotion can still animate the phone and typography at 60 fps around a 30 fps screen clip. Aim for a smooth real source, not the highest metadata number. Don't use optical flow as the default repair: text, glass, keyboards and map edges deform.

When extracting: sample a variable-frame-rate take by timestamps. Don't assume frame number `t*60` corresponds to time `t` unless an explicit 60 fps working copy was made. Keep the original and note how the working copy was resampled.

## When the flow still stutters

Change one factor at a time, repeat a baseline, and keep the scene identical. Priority: remove inspection during recording → avoid parallel heavy jobs → check Release/diagnostics → try windowed vs. headless if the app behaves the same → compare codecs → consider a physical recording. Reduce app graphics only if the same scene actually gets smoother.

For decorative 3D scenes, offline rendering in Remotion or Blender gives deterministic frames. An exact offline export of a real app with SwiftUI, Metal, keyboard and clock needs its own control of time and state; that is a separate project, not something `recordVideo` does.

## Related tools

| Resource | Useful for | Caveat |
|---|---|---|
| [Apple simctl / WWDC20](https://developer.apple.com/videos/play/wwdc2020/10647/) | Direct recording, also without a Simulator.app window | The app's activity and input must be checked |
| [baguette](https://tddworks.github.io/baguette/) | Headless taps, touch streams, UI trees, screenshots, device models | Input has overhead too; rehearse |
| [Maestro startRecording](https://docs.maestro.dev/reference/commands-available/startrecording.md) | A repeatable sequence with explicit start/stop | UI-test synchronisation can add overhead; do heavy asserts before/after the usable take |
| [RocketSim](https://www.rocketsim.app/) | Recording, touch display and post-processing | Test on the app; advertised high-FPS output is not proof of unique frames |
| [idb](https://fbidb.io/idb/commands/) | CLI for recording and video streaming | Its own companion and version compatibility |

Measured example (October 2026, one Mac, varying load): short takes without inspection gave ~25–30 video frames per second on a heavy Metal app, and close to 60 fps during simple SwiftUI animations. HEVC vs. H.264 was 29.5 vs. 25.7 fps in one comparison. Treat these as hints for an A/B test, not guarantees.
