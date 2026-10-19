# compare.py — app-promo
# Raw recording frames next to the finished render, frame for frame:
# usage compare.py <list.txt> <render.mp4> <from> <length> <out.mp4> <labels.png>
# list.txt holds one recording frame path per video frame (from the composition's own time map).
import subprocess, sys
listing, render, start, length, out, labels = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5], sys.argv[6]
paths = open(listing).read().split()
concat = out + ".txt"
with open(concat, "w") as f:
    for p in paths[start:start + length]:
        f.write(f"file '{p}'\nduration {1/60:.6f}\n")
subprocess.run([
    "ffmpeg", "-v", "error", "-y",
    "-f", "concat", "-safe", "0", "-i", concat,
    "-ss", f"{start/60:.4f}", "-t", f"{length/60:.4f}", "-i", render,
    "-i", labels,
    "-filter_complex",
    "[0:v]fps=60,scale=440:-1,pad=540:1000:50:40:color=0xF4F1E9[raw];"
    "[1:v]fps=60,scale=540:960,pad=540:1000:0:40:color=0xF4F1E9[promo];"
    "[raw][promo]hstack=2[pair];[pair][2:v]overlay=0:0",
    "-frames:v", str(length), "-pix_fmt", "yuv420p", out,
], check=True)
