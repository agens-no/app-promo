# quiz_frames.py — app-promo. Frame-interval stats for a recording, overall and around each logged event.
import json, subprocess, sys
path = sys.argv[1]
out = subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "frame=best_effort_timestamp_time", "-of", "csv=p=0", path], text=True)
t = [float(l.strip().strip(",")) for l in out.splitlines() if l.strip().strip(",")]
def stats(ts):
    d = sorted(b - a for a, b in zip(ts, ts[1:]))
    return f"{len(ts)} frames median {d[len(d)//2]*1000:.0f} ms p95 {d[int(len(d)*.95)]*1000:.0f} ms max {d[-1]*1000:.0f} ms" if d else "-"
print("all", stats(t))
for name, at in json.load(open(path.replace(".mp4", ".json"))):
    print(name, stats([x for x in t if at - 0.05 <= x <= at + 0.7]))
