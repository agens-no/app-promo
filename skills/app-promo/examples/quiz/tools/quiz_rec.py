#!/usr/bin/env python3
# quiz_rec.py — app-promo. Records the Quiz card flow on the "Quiz Promo QA" simulator (design-preview fixtures).
# Nothing inspects the app while the recorder runs; tap points come from an earlier describe-ui of the card screen.
# usage: quiz_rec.py <take> <out.mp4>
import json, os, subprocess, sys, time

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
REC = f"{ROOT}/rec/quiz"
UDID = open(f"{REC}/udid").read().strip()
CONFIG = open(f"{REC}/config").read().strip()
BUNDLE = "com.example.quiz"  # the app's bundle id
W, H = 402, 874
REVEAL = (201, 799)
WRONG = (112, 799)
RIGHT = (290, 799)

def run(*args):
    return subprocess.run(args, check=True, capture_output=True, text=True)

def launch(screen):
    subprocess.run(["xcrun", "simctl", "terminate", UDID, BUNDLE], capture_output=True)
    run("xcrun", "simctl", "launch", UDID, BUNDLE, "--design-preview", screen, "--design-data", CONFIG)
    time.sleep(3)

class Finger:
    def __init__(self):
        self.p = subprocess.Popen(["baguette", "input", "--udid", UDID], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)

    def send(self, phase, x, y):
        self.p.stdin.write(json.dumps({"type": "touch1-" + phase, "x": x, "y": y, "width": W, "height": H}) + "\n")
        self.p.stdin.flush()
        response = json.loads(self.p.stdout.readline())
        assert response.get("ok"), response

    def tap(self, point):
        self.send("down", *point)
        time.sleep(0.08)
        self.send("up", *point)

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

TAKES = {
    # Reveal and mark three cards; marking slides on to the next card by itself.
    "cards": ("card", [
        ("wait", 1.2),
        ("reveal1", lambda f: f.tap(REVEAL)), ("wait", 1.2),
        ("right1", lambda f: f.tap(RIGHT)), ("wait", 1.6),
        ("reveal2", lambda f: f.tap(REVEAL)), ("wait", 1.2),
        ("wrong2", lambda f: f.tap(WRONG)), ("wait", 1.6),
        ("reveal3", lambda f: f.tap(REVEAL)), ("wait", 1.2),
        ("right3", lambda f: f.tap(RIGHT)), ("wait", 1.6),
    ]),
    # The whole quiz: card 1 right, 2–13 quickly (4, 8 and 11 wrong), 14 wrong, the result, then Ferdig to home: 10/14.
    "full": ("card", [
        ("wait", 1.0),
        ("reveal1", lambda f: f.tap(REVEAL)), ("wait", 1.4),
        ("right1", lambda f: f.tap(RIGHT)), ("wait", 1.2),
        *[step for n in range(2, 14) for step in (
            (f"reveal{n}", lambda f: f.tap(REVEAL)), ("wait", 0.55),
            (f"{'wrong' if n in (4, 8, 11) else 'right'}{n}", (lambda f, w=n in (4, 8, 11): f.tap(WRONG if w else RIGHT))), ("wait", 1.0),
        )],
        ("wait", 0.6),
        ("reveal14", lambda f: f.tap(REVEAL)), ("wait", 1.4),
        ("wrong14", lambda f: f.tap(WRONG)), ("wait", 3.0),
        ("done", lambda f: f.tap(REVEAL)), ("wait", 2.5),
    ]),
    # Card 1 marked right slides to card 2; a slow held swipe back and forth morphs the buttons with the finger.
    "morph": ("revealed", [
        ("wait", 1.0),
        ("right", lambda f: f.tap(RIGHT)), ("wait", 1.6),
        ("back", lambda f: f.swipe(60, 370, 2.4)), ("wait", 1.0),
        ("forward", lambda f: f.swipe(340, 30, 2.4)), ("wait", 1.0),
    ]),
}

if __name__ == "__main__":
    take, out = sys.argv[1], sys.argv[2]
    screen, actions = TAKES[take]
    launch(screen)
    record(out, actions)
