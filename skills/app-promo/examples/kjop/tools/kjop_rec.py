#!/usr/bin/env python3
# quiz_rec.py — app-promo. Records the Quiz card flow on the "Quiz Promo QA" simulator (design-preview fixtures).
# Nothing inspects the app while the recorder runs; tap points come from an earlier describe-ui of the card screen.
# usage: quiz_rec.py <take> <out.mp4>
import json, os, subprocess, sys, time

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
REC = f"{ROOT}/rec/kjop"
UDID = open(f"{REC}/udid").read().strip()
BUNDLE = open(f"{REC}/bundle").read().strip()
W, H = 402, 874
FIELD = (201, 738)
ADD = (362, 804)  # with the hardware keyboard the focused field sits at the bottom
START = (201, 803)
SWEEP = (357, 795)
FINISH = (201, 795)

def run(*args):
    return subprocess.run(args, check=True, capture_output=True, text=True)

def launch(*extra):
    subprocess.run(["xcrun", "simctl", "terminate", UDID, BUNDLE], capture_output=True)
    run("xcrun", "simctl", "launch", UDID, BUNDLE, "--demo", "--promo", *extra)
    time.sleep(3)

def type_text(text):
    run("baguette", "type", "--udid", UDID, "--text", text)

class Finger:
    def __init__(self):
        self.p = subprocess.Popen(["baguette", "input", "--udid", UDID], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)

    def send(self, phase, x, y):
        self.p.stdin.write(json.dumps({"type": "touch1-" + phase, "x": x, "y": y, "width": W, "height": H}) + "\n")
        self.p.stdin.flush()
        response = json.loads(self.p.stdout.readline())
        assert response.get("ok"), response

    def tap(self, point):
        # Single taps go through `baguette tap`; the touch stream dropped taps while the keyboard was up.
        run("baguette", "tap", "--udid", UDID, "--x", str(point[0]), "--y", str(point[1]), "--width", str(W), "--height", str(H))

    def swipe(self, a, b, duration, y=450, steps=40):
        self.send("down", a, y)
        for i in range(1, steps + 1):
            # Ease in and out like a relaxed thumb.
            t = i / steps
            e = t * t * (3 - 2 * t)
            self.send("move", a + (b - a) * e, y)
            time.sleep(duration / steps)
        self.send("up", b, y)

    def close(self):
        self.p.stdin.close()
        self.p.wait(timeout=5)

def record(out, actions):
    proc = subprocess.Popen(["xcrun", "simctl", "io", UDID, "recordVideo", "--codec=h264", out], stderr=subprocess.PIPE, text=True)
    events = []
    try:
        start = time.monotonic() + 15
        while True:
            line = proc.stderr.readline()
            if not line:
                raise SystemExit("recorder exited before starting")
            if "Recording started" in line:
                break
            if time.monotonic() > start:
                raise SystemExit("recorder did not start")
        t0 = time.monotonic()
        finger = Finger()
        for name, action in actions:
            if isinstance(action, (int, float)):
                time.sleep(action)
                continue
            events.append((name, round(time.monotonic() - t0, 3)))
            action(finger)
        finger.close()
    finally:
        proc.send_signal(2)
        proc.wait(timeout=20)
    json.dump(events, open(out.replace(".mp4", ".json"), "w"), indent=1)
    print(out, events)

# Two takes. A adds "6 bananer". The simulator's hardware keyboard never lets the field lose focus (the Ferdig
# toolbar belongs to the software keyboard), so B relaunches with --promo-trip, which seeds the same list with the
# bananas already on it, and runs the whole trip: start, tick six rows, sweep, tick the last two, finish.
ROWS = [209, 259, 309, 431, 603, 653]
TAKES = {
    "a": [
        ("wait", 1.2),
        ("field", lambda f: f.tap(FIELD)), ("wait", 0.8),
        ("type", lambda f: type_text("6 bananer")), ("wait", 0.9),
        ("add", lambda f: f.tap(ADD)), ("wait", 1.4),
    ],
    "b": [
        ("wait", 1.0),
        ("start", lambda f: f.tap(START)), ("wait", 1.4),
        *[step for i, y in enumerate(ROWS) for step in ((f"tick{i + 1}", lambda f, y=y: f.tap((200, y))), ("wait", 0.5))],
        ("wait", 0.6),
        ("sweep", lambda f: f.tap(SWEEP)), ("wait", 1.4),
        ("tick7", lambda f: f.tap((200, 209))), ("wait", 0.7),
        ("tick8", lambda f: f.tap((200, 331))), ("wait", 2.8),
        ("finish", lambda f: f.tap(FINISH)), ("wait", 2.5),
    ],
}

if __name__ == "__main__":
    take, out = sys.argv[1], sys.argv[2]
    launch(*(["--promo-trip"] if take == "b" else []))
    # A throwaway touch on empty space, so the first real tap isn't swallowed.
    run("baguette", "tap", "--udid", UDID, "--x", "201", "--y", "40", "--width", str(W), "--height", str(H))
    time.sleep(0.6)
    record(out, TAKES[take])
