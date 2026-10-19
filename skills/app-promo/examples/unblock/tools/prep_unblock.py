# prep_unblock.py — app-promo
# Cuts the real block sprites out of an app screenshot and paints an empty board behind them.
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent / "public" / "unblock"
SCALE = 3
ORIGIN = (43.62376237623762, 262.6237623762376)
PITCH = 53.366336633663366
SLOT = 47.92079207920793

# (id, horizontal, row, col, length) read from describe-ui on today's daily board.
BLOCKS = [
    ("b5", True, 0, 1, 3), ("b7", True, 1, 1, 2), ("b1", True, 1, 3, 3),
    ("b2", False, 2, 0, 2), ("target", True, 2, 1, 2), ("b6", False, 2, 3, 2),
    ("b4", False, 2, 5, 2), ("b3", False, 4, 0, 2), ("b8", True, 4, 4, 2),
]


def px(v):
    return round(v * SCALE)


def cell_rect(row, col):
    x = ORIGIN[0] + col * PITCH - (PITCH - SLOT) / 2
    y = ORIGIN[1] + row * PITCH - (PITCH - SLOT) / 2
    return (px(x), px(y), px(x + PITCH), px(y + PITCH))


def inpaint(image, box):
    """Fill a rectangle by blending its left and right edge columns, row by row."""
    x0, y0, x1, y1 = box
    for y in range(y0, y1):
        left, right = image.getpixel((x0 - 1, y)), image.getpixel((x1, y))
        for x in range(x0, x1):
            t = (x - x0 + 1) / (x1 - x0 + 1)
            image.putpixel((x, y), tuple(round(a + (b - a) * t) for a, b in zip(left, right)))


def paper_fill(image, box):
    """Fill a rectangle with the plain paper color found in the screen margins on the same row."""
    x0, y0, x1, y1 = box
    for y in range(y0, y1):
        samples = sorted(image.getpixel((x, y)) for x in list(range(4, 40)) + list(range(1170, 1202)))
        color = samples[len(samples) // 2]
        for x in range(x0, x1):
            image.putpixel((x, y), color)


def keyed(image, box, background):
    """Cut a flat-colored UI element off the paper background."""
    crop = image.crop(box).convert("RGBA")
    alpha = Image.new("L", crop.size)
    for y in range(crop.height):
        for x in range(crop.width):
            r, g, b, _ = crop.getpixel((x, y))
            distance = abs(r - background[0]) + abs(g - background[1]) + abs(b - background[2])
            alpha.putpixel((x, y), max(0, min(255, (distance - 12) * 6)))
    crop.putalpha(alpha)
    return crop


def result_assets():
    shot = Image.open(ROOT / "result.png").convert("RGB")
    stars = (500, 1105, 708, 1172)
    card = (66, 1240, 1140, 1548)
    background = shot.getpixel((480, 1140))
    for index, x in enumerate((500, 571, 641)):
        keyed(shot, (x, stars[1], x + 66, stars[3]), background).save(ROOT / f"star-{index}.png")
    sprite = shot.crop(card).convert("RGBA")
    mask = Image.new("L", (sprite.width * 2, sprite.height * 2), 0)
    ImageDraw.Draw(mask).rounded_rectangle((12, 12, mask.width - 12, mask.height - 12), radius=150, fill=255)
    sprite.putalpha(mask.resize(sprite.size, Image.LANCZOS))
    sprite.save(ROOT / "result-card.png")
    empty = shot.copy()
    inpaint(empty, stars)
    inpaint(empty, card)
    empty.save(ROOT / "result-empty.png")
    return {"stars": [[x, stars[1], 66, stars[3] - stars[1]] for x in (500, 571, 641)],
            "card": [card[0], card[1], card[2] - card[0], card[3] - card[1]]}


def rounded(sprite, radius, inset=0):
    mask = Image.new("L", (sprite.width * 2, sprite.height * 2), 0)
    ImageDraw.Draw(mask).rounded_rectangle((inset * 2, inset * 2, mask.width - 1 - inset * 2, mask.height - 1 - inset * 2), radius=radius * 2, fill=255)
    sprite = sprite.convert("RGBA")
    sprite.putalpha(mask.resize(sprite.size, Image.LANCZOS))
    return sprite


def rect(box):
    return [box[0], box[1], box[2] - box[0], box[3] - box[1]]


def home_assets():
    home = Image.open(ROOT / "home.png").convert("RGB")
    card, seg, desc, spill = (72, 1129, 1134, 1704), (72, 1962, 1134, 2196), (60, 2226, 1146, 2304), (72, 2334, 1134, 2498)
    rounded(home.crop(card), 84).save(ROOT / "daily-card.png")
    done = Image.open(ROOT / "home-daily-complete.png").convert("RGB")
    rounded(done.crop(card), 84).save(ROOT / "daily-card-done.png")
    pills = [(124, 1396, 275, 1438), (275, 1396, 423, 1438), (423, 1396, 571, 1438), (571, 1396, 719, 1438), (719, 1396, 870, 1438)]
    for i, box in enumerate(pills):
        done.crop(box).save(ROOT / f"daily-pill-{i}.png")
    background = home.getpixel((40, 2260))
    for name in ("serie", "rolig", "utfordring", "krevende"):
        shot = Image.open(ROOT / f"home-{name}.png").convert("RGB")
        rounded(shot.crop(seg), 72, inset=1).save(ROOT / f"seg-{name}.png")
        keyed(shot, desc, background).save(ROOT / f"desc-{name}.png")
    rounded(home.crop(spill), 54).save(ROOT / "spill.png")
    empty = home.copy()
    for box in (card, seg, desc, spill):
        paper_fill(empty, (box[0] - 30, box[1] - 20, box[2] + 30, min(2621, box[3] + 50)))
    empty.save(ROOT / "home-empty.png")
    return {"card": rect(card), "pills": [rect(b) for b in pills], "seg": rect(seg), "desc": rect(desc), "spill": rect(spill)}


def summary_assets():
    shot = Image.open(ROOT / "summary.png").convert("RGB")
    card, share = (72, 1062, 1134, 1480), (72, 2290, 1134, 2464)
    rows = [(72, 1554 + i * 133, 1134, 1687 + i * 133) for i in range(5)]
    blank = shot.copy()
    inpaint(blank, (330, 1150, 880, 1320))
    rounded(blank.crop(card), 84).save(ROOT / "score-card.png")
    font = ImageFont.truetype("/Library/Fonts/SF-Pro-Rounded-Regular.otf", 188)
    values = sorted({round(5000 * (1 - (1 - i / 30) ** 3) / 10) * 10 for i in range(31)})
    for value in values:
        image = Image.new("RGBA", (card[2] - card[0], 220), (0, 0, 0, 0))
        ImageDraw.Draw(image).text((image.width / 2, 1305 - 1150), f"{value:,}".replace(",", "\u2009"), font=font, fill=(0x21, 0x3D, 0x34, 255), anchor="ms")
        image.save(ROOT / f"score-{value}.png")
    for i, box in enumerate(rows):
        rounded(shot.crop(box), 40).save(ROOT / f"row-{i}.png")
    rounded(shot.crop(share), 54).save(ROOT / "share.png")
    empty = shot.copy()
    for box in [card, share, (72, 1550, 1134, 2224)]:
        paper_fill(empty, (box[0] - 30, box[1] - 20, box[2] + 30, box[3] + 50))
    empty.save(ROOT / "summary-empty.png")
    return {"card": rect(card), "number": [card[0], 1150, card[2] - card[0], 220], "values": values,
            "rows": [rect(b) for b in rows], "share": rect(share)}


def logo_assets():
    """The UNBLOCK logo rebuilt from real block faces, so it can be assembled tile by tile."""
    cell, gap, rim = 176, 18, 44
    side = rim * 2 + cell * 3 + gap * 4
    tray = Image.new("RGBA", (side * 2, side * 2), (0, 0, 0, 0))
    draw = ImageDraw.Draw(tray)
    for i in range(rim * 2):
        t = i / (rim * 2)
        color = tuple(round(a + (b - a) * t) for a, b in zip((0x9D, 0xB0, 0xA3), (0x5F, 0x7B, 0x6C)))
        draw.rounded_rectangle((i // 2, i // 2, side * 2 - 1 - i // 2, side * 2 - 1 - i // 2), radius=150 - i // 2, outline=color + (255,), width=2)
    draw.rounded_rectangle((rim * 2, rim * 2, side * 2 - rim * 2, side * 2 - rim * 2), radius=90, fill=(0x1C, 0x30, 0x27, 255))
    tray = tray.resize((side, side), Image.LANCZOS)
    board = Image.open(ROOT / "board-empty.png").convert("RGB")
    slot = board.crop(cell_rect(5, 2)).resize((cell + gap, cell + gap), Image.LANCZOS)
    for r in range(3):
        for c in range(3):
            tray.paste(slot, (rim + gap // 2 + c * (cell + gap), rim + gap // 2 + r * (cell + gap)))
    tray.save(ROOT / "logo-tray.png")

    def face(source):
        sprite = Image.open(ROOT / source)
        h = sprite.height
        half = sprite.crop((0, 0, h // 2, h))
        square = Image.new("RGBA", (h // 2 * 2, h))
        square.paste(half, (0, 0))
        square.paste(half.transpose(Image.FLIP_LEFT_RIGHT), (h // 2, 0))
        return square

    heavy = ImageFont.truetype(str(ROOT.parent / "fonts" / "SF-Pro-Rounded-Heavy.otf"), 112)
    letters = {"U": (0, 0), "N": (0, 1), "B": (1, 0), "L": (1, 1), "O": (1, 2), "C": (2, 1), "K": (2, 2)}
    for letter in letters:
        tile = face("block-target.png" if letter == "B" else "block-b5.png")
        ink = (0x4F, 0x34, 0x13, 255) if letter == "B" else (0x21, 0x3D, 0x34, 255)
        ImageDraw.Draw(tile).text((tile.width / 2, tile.height / 2 - 4), letter, font=heavy, fill=ink, anchor="mm")
        tile.save(ROOT / f"logo-{letter}.png")
    return {"side": side, "cell": cell, "gap": gap, "rim": rim, "letters": {k: list(v) for k, v in letters.items()}}


def main():
    shot = Image.open(ROOT / "board.png").convert("RGB")
    occupied = set()
    for _, horizontal, row, col, length in BLOCKS:
        for i in range(length):
            occupied.add((row, col + i) if horizontal else (row + i, col))

    empty = shot.copy()
    for row, col in occupied:
        candidates = [(r, c) for r in range(6) for c in range(6) if (r, c) not in occupied]
        source = min(candidates, key=lambda rc: (rc[0] != row) * 10 + abs(rc[0] - row) * 3 + abs(rc[1] - col))
        empty.paste(shot.crop(cell_rect(*source)), cell_rect(row, col)[:2])
    empty.save(ROOT / "board-empty.png")

    frame = (72, 727, 1134, 1791)
    tray = empty.crop(frame).convert("RGBA")
    mask = Image.new("L", (tray.width * 2, tray.height * 2), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, mask.width - 1, mask.height - 1), radius=130, fill=255)
    tray.putalpha(mask.resize(tray.size, Image.LANCZOS))
    tray.save(ROOT / "board-tray.png")

    meta = []
    pad, lip = 1.5, 1.8
    for name, horizontal, row, col, length in BLOCKS:
        w = SLOT + (length - 1) * PITCH if horizontal else SLOT
        h = SLOT if horizontal else SLOT + (length - 1) * PITCH
        x, y = ORIGIN[0] + col * PITCH, ORIGIN[1] + row * PITCH
        box = (px(x - pad), px(y - pad), px(x + w + pad), px(y + h + lip))
        sprite = shot.crop(box).convert("RGBA")
        mask = Image.new("L", (sprite.width * 4, sprite.height * 4), 0)
        inset = round(pad * SCALE * 4)
        ImageDraw.Draw(mask).rounded_rectangle((inset, inset, mask.width - inset, mask.height - 2), radius=26 * 4, fill=255)
        sprite.putalpha(mask.resize(sprite.size, Image.LANCZOS))
        sprite.save(ROOT / f"block-{name}.png")
        meta.append({"id": name, "horizontal": horizontal, "row": row, "col": col, "length": length,
                     "rect": [box[0], box[1], box[2] - box[0], box[3] - box[1]]})

    # Move counter: erase the digit row by row and redraw it in the app's font.
    box = (904, 436, 970, 510)
    patch = shot.crop(box)
    clean = patch.copy()
    for y in range(patch.height):
        left, right = patch.getpixel((0, y)), patch.getpixel((patch.width - 1, y))
        for x in range(patch.width):
            t = x / (patch.width - 1)
            clean.putpixel((x, y), tuple(round(a + (b - a) * t) for a, b in zip(left, right)))
    font = ImageFont.truetype(str(ROOT.parent / "fonts" / "SF-Pro-Rounded-Heavy.otf"), 84)
    for digit in range(10):
        image = clean.copy()
        ImageDraw.Draw(image).text((936.5 - box[0], 503 - box[1]), str(digit), font=font, fill=(0x21, 0x3D, 0x34), anchor="ms")
        image.save(ROOT / f"counter-{digit}.png")

    json.dump({"home": home_assets(), "summary": summary_assets(), "logo": logo_assets(), "tray": [72, 727, 1062, 1064], "result": result_assets(), "counter": list(box), "screen": list(shot.size), "scale": SCALE, "origin": [px(ORIGIN[0]), px(ORIGIN[1])],
               "pitch": PITCH * SCALE, "slot": SLOT * SCALE, "blocks": meta},
              open(ROOT / "board.json", "w"), indent=1)


if __name__ == "__main__":
    sys.exit(main())
