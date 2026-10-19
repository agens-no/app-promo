# prep_quiz.py — app-promo
# Builds Quiz sprites from the simulator recordings (60 fps frames) and stills in rec/quiz.
import json
import os
import shutil
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# prep_helpers.py from templates/tools is copied next to this script.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from prep_helpers import paper_fill, rect, rounded  # noqa: E402

PROMO = Path(__file__).resolve().parent.parent
OUT = PROMO / "public" / "quiz"
REC = PROMO / "rec" / "quiz"
# The app project (fonts, app icon). Adjust to where the app lives.
APP = Path(os.environ.get("QUIZ_APP", Path.home() / "Quizleser"))
FRAMES = OUT / "frames" / "cards"

# Card 3 before the reveal, and after it once the split has settled (unmarked).
QUESTION = 420
REVEALED = 480
CARD = (48, 462, 1158, 2274)  # QuizSurface radius 32 pt
BUTTON = (72, 2310, 1134, 2484)  # 58 pt capsule
WRONG = (72, 2310, 585, 2484)  # (354 − 12) / 2 = 171 pt halves, 12 pt gap
RIGHT = (621, 2310, 1134, 2484)


def frame(n):
    return Image.open(FRAMES / f"{n}.jpg").convert("RGB")


def check(sprite, name):
    board = Image.new("RGBA", sprite.size, (255, 0, 255, 255))
    board.alpha_composite(sprite)
    board.convert("RGB").save(REC / f"check-{name}.png")


def main():
    question = frame(QUESTION)
    revealed = frame(REVEALED)

    card = rounded(question.crop(CARD), 96, inset=1)
    card.save(OUT / "card.png")
    check(card, "card")
    button = rounded(question.crop(BUTTON), 87, inset=1)
    button.save(OUT / "vis-svar.png")
    check(button, "vis-svar")
    for name, box in (("feil", WRONG), ("riktig", RIGHT)):
        half = rounded(revealed.crop(box), 87, inset=2)
        half.save(OUT / f"{name}.png")
        check(half, name)

    # The revealed screen with both halves gone, for while they hover over it.
    holes = revealed.copy()
    paper_fill(holes, (40, 2290, 1166, 2530))
    holes.save(OUT / "holes.png")
    # The question screen without the card and button, for the moment the phone builds around them.
    bare = question.copy()
    paper_fill(bare, (20, 440, 1186, 2530))
    bare.save(OUT / "bare.png")

    for name in ("home", "home-done", "result"):
        shutil.copy(REC / "stills" / f"{name}.png", OUT / f"{name}.png")
    # Score badges from the finished home screen, as backdrop decor.
    done = Image.open(REC / "stills" / "home-done.png").convert("RGB")
    badges = {"10": ((908, 1267, 1102, 1405), 45), "9": ((954, 1704, 1116, 1812), 36), "11": ((954, 1935, 1116, 2043), 36), "6": ((954, 2397, 1116, 2505), 36)}
    for name, (box, radius) in badges.items():
        badge = rounded(done.crop(box), radius, inset=1)
        badge.save(OUT / f"badge-{name}.png")
        check(badge, f"badge-{name}")
    Image.open(APP / "Assets.xcassets/AppIcon.appiconset/AppIcon.png").convert("RGB").resize((360, 360), Image.LANCZOS).save(OUT / "icon.png")

    # Touch indicator in the app's ink colour.
    size = 400
    tap = Image.new("RGBA", (size * 2, size * 2), (0, 0, 0, 0))
    draw = ImageDraw.Draw(tap)
    draw.ellipse((40, 40, size * 2 - 40, size * 2 - 40), fill=(43, 36, 32, 70), outline=(255, 253, 248, 230), width=22)
    tap.resize((size, size), Image.LANCZOS).save(OUT / "tap.png")

    full()
    json.dump({"card": rect(CARD), "button": rect(BUTTON), "wrong": rect(WRONG), "right": rect(RIGHT)}, open(OUT / "quiz.json", "w"), indent=1)


FULL = OUT / "frames" / "full"
FONT = APP / "Fonts" / "YoungSerif-Regular.ttf"


def bubble(lines, name, scale=2):
    """A speech bubble in the app's surface colour, tail at the lower left, soft shadow baked in."""
    font = ImageFont.truetype(str(FONT), 76 * scale)
    pad, gap, tail, shadow = 56 * scale, 14 * scale, 70 * scale, 60 * scale
    sizes = [font.getbbox(line) for line in lines]
    width = max(b[2] - b[0] for b in sizes) + pad * 2
    height = sum(b[3] - b[1] for b in sizes) + gap * (len(lines) - 1) + pad * 2
    image = Image.new("RGBA", (width + shadow * 2, height + tail + shadow * 2), (0, 0, 0, 0))
    shape = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(shape)
    x0, y0 = shadow, shadow
    draw.rounded_rectangle((x0, y0, x0 + width, y0 + height), radius=64 * scale, fill=255)
    draw.polygon([(x0 + 90 * scale, y0 + height - 10), (x0 + 200 * scale, y0 + height - 10), (x0 + 50 * scale, y0 + height + tail)], fill=255)
    shade = Image.new("RGBA", image.size, (60, 40, 20, 0))
    shade.putalpha(shape.filter(ImageFilter.GaussianBlur(22 * scale)).point(lambda v: v * 0.28))
    image.alpha_composite(shade, (0, 18 * scale))
    face = Image.new("RGBA", image.size, (255, 253, 248, 255))
    face.putalpha(shape)
    image.alpha_composite(face)
    text = ImageDraw.Draw(image)
    y = y0 + pad
    for line, box in zip(lines, sizes):
        text.text((x0 + pad - box[0], y - box[1]), line, font=font, fill=(42, 36, 32, 255))
        y += box[3] - box[1] + gap
    image.save(OUT / f"bubble-{name}.png")
    check(image, f"bubble-{name}")
    return [image.width // scale, image.height // scale]


def full():
    """Sprites from the whole-quiz take: card 1 with its photo before the reveal, and the home badges."""
    card1 = Image.open(FULL / "30.jpg").convert("RGB")
    rounded(card1.crop(CARD), 96, inset=1).save(OUT / "card1.png")
    check(Image.open(OUT / "card1.png"), "card1")
    bare = card1.copy()
    paper_fill(bare, (20, 440, 1186, 2530))
    bare.save(OUT / "bare1.png")
    home = Image.open(FULL / "1862.jpg").convert("RGB")
    badges = {"10": ((908, 1267, 1102, 1405), 45), "9": ((954, 1704, 1116, 1812), 36), "11": ((954, 1935, 1116, 2043), 36), "6": ((954, 2397, 1116, 2505), 36)}
    for name, (box, radius) in badges.items():
        rounded(home.crop(box), radius, inset=1).save(OUT / f"home-badge-{name}.png")
    sizes = {"bubble1": bubble(["Tre nøtter til", "Askepott!"], "1"), "bubble14": bubble(["Barcelona!"], "14")}
    json.dump(sizes, open(OUT / "bubbles.json", "w"))


if __name__ == "__main__":
    main()
