#!/bin/bash
# sheet.sh — app-promo. Renders the given frames at 40 % and tiles them into out/sheet.png.
set -e
cd "$(dirname "$0")/.."
source ~/.nvm/nvm.sh >/dev/null; nvm use 22 >/dev/null
COMP=${COMP:-UnblockPromo}
inputs=()
for f in "$@"; do
  npx remotion still "$COMP" "out/f$f.png" --frame="$f" --scale=0.4 --log=error
  inputs+=(-i "out/f$f.png")
done
if [ $# -eq 1 ]; then cp "out/f$1.png" out/sheet.png; else ffmpeg -v error -y "${inputs[@]}" -filter_complex "hstack=$#" out/sheet.png; fi
