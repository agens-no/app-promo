# prep_talljakt.py — app-promo
# Builds Talljakt sprites from simulator screenshots and the app's own tile styling (TalljaktApp.swift tileButton).
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# prep_helpers.py from templates/tools is copied next to this script.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from prep_helpers import inpaint, keyed, paper_fill, rect, rounded  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent / "public" / "talljakt"
# The app's bundled fonts. Adjust to where the app lives.
FONTS = Path(__file__).resolve().parents[2] / "apps" / "Talljakt" / "Fonts"
S = 3

TILE_X = [16, 142.667, 269.333]
TILE_Y = [440, 528]
TILE_W, TILE_H, LIP = 116.667, 78, 5
EQ = {"left": (90, 834, 350, 978), "op": (374, 834, 482, 978), "right": (506, 834, 767, 978), "result": (856, 834, 1116, 978)}

COLORS = {
    "cyan": (0xBD, 0xE7, 0xF0), "teal": (0x23, 0x67, 0x7B), "amber": (242, 180, 90),
    "tileShadow": (0x8E, 0xBB, 0xC7), "tealShadow": (0x12, 0x3C, 0x48), "amberShadow": (0xB0, 0x7F, 0x36),
    "tileInk": (18, 32, 41), "goalInk": (26, 20, 8),
}


def rubik(points, weight=800):
    font = ImageFont.truetype(str(FONTS / "Rubik.ttf"), round(points * S))
    font.set_variation_by_axes([weight])
    return font


def figtree(points, weight=600):
    font = ImageFont.truetype(str(FONTS / "Figtree.ttf"), round(points * S))
    font.set_variation_by_axes([weight])
    return font


def tile_box(row, col):
    x, y = TILE_X[col] * S, TILE_Y[row] * S
    return (round(x), round(y), round(x + TILE_W * S), round(y + (TILE_H + LIP + 2) * S))


def tile(value, state="plain", origin=None):
    """One number tile, drawn like tileButton: radius 20, hard shadow below, heavy Rubik, optional origin line."""
    w, h = round(TILE_W * S), round(TILE_H * S)
    pad = 4 * S
    image = Image.new("RGBA", ((w + pad * 2) * 2, (h + (LIP + 2) * S + pad * 2) * 2), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    fill, shadow, ink = {
        "plain": ("cyan", "tileShadow", "tileInk"),
        "selected": ("teal", "tealShadow", None),
        "hit": ("amber", "amberShadow", "goalInk"),
    }[state]
    drop = (1 if state == "selected" else LIP) * S
    shift = 4 * S if state == "selected" else 0
    r = 20 * S * 2
    x0, y0 = pad * 2, (pad + shift) * 2
    draw.rounded_rectangle((x0, y0 + drop * 2, x0 + w * 2, y0 + h * 2 + drop * 2), radius=r, fill=COLORS[shadow])
    draw.rounded_rectangle((x0, y0, x0 + w * 2, y0 + h * 2), radius=r, fill=COLORS[fill])
    if state == "selected":
        draw.rounded_rectangle((x0, y0, x0 + w * 2, y0 + h * 2), radius=r, outline=(255, 255, 255, 217), width=round(2.5 * S * 2))
    image = image.resize((image.width // 2, image.height // 2), Image.LANCZOS)
    draw = ImageDraw.Draw(image)
    color = (255, 255, 255) if state == "selected" else COLORS[ink]
    size = (40 if value < 100 else 34) if origin is None else (34 if value < 100 else 30)
    cx, cy = pad + w / 2, pad + shift + h / 2
    number = rubik(size)
    if origin:
        # Measured on the history screen: number sits 12 px above centre, the origin line 58 px below.
        draw.text((cx, cy - 12), str(value), font=number, fill=color, anchor="mm")
        draw.text((cx, cy + 58), origin, font=figtree(10), fill=color + (191,), anchor="mm")
        dot = 7 * S
        dx, dy = pad + w - 10 * S - dot, pad + shift + 10 * S
        draw.ellipse((dx, dy, dx + dot, dy + dot), fill=color + (115,))
    else:
        draw.text((cx, cy), str(value), font=number, fill=color, anchor="mm")
    return image


def pill(shot, box, value, kind):
    """An equation slot filled with a value, drawn on a blank slot cut from the hit screen."""
    blank = shot.crop(box).convert("RGB")
    inpaint(blank, (14, 30, blank.width - 14, blank.height - 30))
    color = (255, 255, 255) if kind == "op" else COLORS["goalInk"] if kind == "hit" else COLORS["tileInk"]
    if kind == "hit":
        amber = Image.new("RGB", blank.size, COLORS["amber"])
        blank = amber
    draw = ImageDraw.Draw(blank)
    draw.text((blank.width / 2, blank.height / 2 + 2), value, font=rubik(26), fill=color, anchor="mm")
    return rounded(blank, 16 * S, inset=0)


def text_top(font):
    probe = Image.new("L", (900, 400), 0)
    ImageDraw.Draw(probe).text((0, 0), "642", font=font, fill=255)
    return probe.point(lambda v: 255 if v > 128 else 0).getbbox()[1]


def target_sprite(box, ink=(0x17, 0x36, 0x43)):
    """MÅLTALL 642 as targetDisplay draws it: heavy 92 pt, tracking −2.8 pt, amber capsule tilted −1.5° behind."""
    w, h = box[2] - box[0], box[3] - box[1]
    bar = Image.new("RGBA", (w * 2, h * 2), (0, 0, 0, 0))
    ImageDraw.Draw(bar).rounded_rectangle((40, 472, 1116, 568), radius=48, fill=COLORS["amber"] + (230,))
    bar = bar.rotate(1.5, resample=Image.BICUBIC, center=(578, 520)).resize((w, h), Image.LANCZOS)
    # Each digit's left ink edge is placed where it sits on the real screen (measured on play.png).
    font = rubik(92)
    placed = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(placed)
    for digit, left in zip("642", (29, 203, 390)):
        probe = Image.new("L", (w, h), 0)
        ImageDraw.Draw(probe).text((100, 0), digit, font=font, fill=255)
        ink_left, _, _, _ = probe.point(lambda v: 255 if v > 128 else 0).getbbox()
        draw.text((left - (ink_left - 100), 23 - text_top(font)), digit, font=font, fill=ink + (255,))
    return Image.alpha_composite(bar, placed)


def main():
    play = Image.open(ROOT / "play.png").convert("RGB")
    history = Image.open(ROOT / "history.png").convert("RGB")
    hit = Image.open(ROOT / "hit.png").convert("RGB")

    slot = history.crop(tile_box(0, 0))
    play_base = play.copy()
    for row in range(2):
        for col in range(3):
            play_base.paste(slot, tile_box(row, col)[:2])
    play_base.save(ROOT / "play-base.png")
    # Real app states, one screenshot after every tap of the solution (steps/m{move}{a|o|r}.png).
    # Tiles are animated in 3D on top, so every tile position is blanked to an empty slot.
    for move in range(1, 5):
        for phase in "aor":
            shot = Image.open(ROOT / "steps" / f"m{move}{phase}.png").convert("RGB")
            for row in range(2):
                for col in range(3):
                    shot.paste(slot, tile_box(row, col)[:2])
            shot.save(ROOT / "steps" / f"m{move}{phase}-base.png")
    hit_base = hit.copy()
    for row, col in [(0, 1), (1, 2)]:
        hit_base.paste(slot, tile_box(row, col)[:2])
    hit_base.save(ROOT / "hit-base.png")

    tiles = {
        "75": (75, "plain", None), "75-sel": (75, "selected", None), "25": (25, "plain", None), "8": (8, "plain", None),
        "6": (6, "plain", None), "6-sel": (6, "selected", None), "3": (3, "plain", None), "3-sel": (3, "selected", None),
        "2": (2, "plain", None), "2-sel": (2, "selected", None), "8-sel": (8, "selected", None),
        "81": (81, "plain", "75 + 6"), "81-sel": (81, "selected", "75 + 6"), "648": (648, "plain", "81 × 8"),
        "648-sel": (648, "selected", "81 × 8"), "6b": (6, "plain", "3 × 2"), "6b-sel": (6, "selected", "3 × 2"),
        "642": (642, "hit", "648 − 6"),
    }
    for name, args in tiles.items():
        tile(*args).save(ROOT / f"tile-{name}.png")

    pills = {"75": "num", "6": "num", "81": "num", "8": "num", "648": "num", "3": "num", "2": "num", "642": "hit",
             "+": "op", "×": "op", "−": "op"}
    for value, kind in pills.items():
        box = EQ["op"] if kind == "op" else EQ["result"] if kind == "hit" else EQ["left"]
        name = {"+": "plus", "×": "times", "−": "minus"}.get(value, value)
        pill(hit, box, value, kind).save(ROOT / f"pill-{name}.png")

    target = (40, 470, 620, 770)
    target_sprite(target).save(ROOT / "target.png")
    target_sprite(target, ink=(0xEE, 0xF5, 0xFB)).save(ROOT / "target-light.png")
    ring = Image.new("RGBA", (800, 800), (0, 0, 0, 0))
    ImageDraw.Draw(ring).ellipse((40, 40, 760, 760), outline=COLORS["amber"] + (255,), width=36)
    ring.save(ROOT / "ring.png")

    result = Image.open(ROOT / "result.png").convert("RGB")
    sheet = (0, 180, 1206, 2622)
    mask = Image.new("L", (1206 * 2, (2622 - 180) * 2), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, mask.width, mask.height + 400), radius=230, fill=255)
    sheet_image = result.crop(sheet).convert("RGBA")
    sheet_image.putalpha(mask.resize(sheet_image.size, Image.LANCZOS))
    sheet_image.save(ROOT / "result-sheet.png")
    score = (798, 330, 1146, 678)
    rounded(result.crop(score), 174).save(ROOT / "score.png")
    result_base = result.copy()
    inpaint(result_base, (score[0] - 6, score[1] - 6, score[2] + 6, score[3] + 10))
    result_base.save(ROOT / "result-base.png")

    solutions = Image.open(ROOT / "solutions.png").convert("RGB")
    card = (78, 830, 1128, 2312)
    rounded(solutions.crop(card), 84).save(ROOT / "solution-card.png")
    for page in (2, 3, 4):
        shot = Image.open(ROOT / f"solutions-{page}.png").convert("RGB")
        rounded(shot.crop(card), 84).save(ROOT / f"solution-card-{page}.png")
    share = Image.open(ROOT / "share-preview.png").convert("RGB")
    rounded(share.crop((0, 196, 1206, 1940)), 90).save(ROOT / "share-card.png")
    solutions_base = solutions.copy()
    paper_fill(solutions_base, (card[0] - 20, card[1] - 14, card[2] + 20, card[3] + 40))
    solutions_base.save(ROOT / "solutions-base.png")

    home = Image.open(ROOT / "home-fresh.png").convert("RGB")
    daily = (60, 936, 1146, 1158)
    rounded(home.crop(daily), 66).save(ROOT / "daily-card.png")
    home_base = home.copy()
    paper_fill(home_base, (daily[0] - 20, daily[1] - 12, daily[2] + 20, daily[3] + 36))
    home_base.save(ROOT / "home-base.png")

    # Mot klokka: the nav clock has to tick with the countdown chip.
    sprint = Image.open(ROOT / "sprint.png").convert("RGB")
    clock = (552, 286, 654, 326)
    blank = sprint.crop(clock)
    inpaint(blank, (1, 0, blank.width - 1, blank.height))
    for seconds in range(50, 61):
        image = blank.copy()
        ImageDraw.Draw(image).text((602.5 - clock[0], 318 - clock[1]), f"{seconds // 60}:{seconds % 60:02d}", font=figtree(12, 800), fill=(82, 112, 123), anchor="ms")
        image.save(ROOT / f"clock-{seconds}.png")

    # Screen-shaped overlays must keep the display's rounded corners (≈ 62 pt).
    corner = 186
    dim = Image.new("L", (1206, 2622), 0)
    ImageDraw.Draw(dim).rounded_rectangle((0, 0, 1205, 2621), radius=corner, fill=255)
    black = Image.new("RGBA", (1206, 2622), (0, 0, 0, 255))
    black.putalpha(dim)
    black.save(ROOT / "screen-dim.png")
    sheet_mask = Image.new("L", sheet_image.size, 0)
    draw = ImageDraw.Draw(sheet_mask)
    draw.rounded_rectangle((0, 0, 1205, sheet_image.height + 400), radius=115, fill=255)
    bottom = Image.new("L", sheet_image.size, 0)
    ImageDraw.Draw(bottom).rounded_rectangle((0, -400, 1205, sheet_image.height - 1), radius=corner, fill=255)
    from PIL import ImageChops
    sheet_image.putalpha(ImageChops.multiply(sheet_mask, bottom))
    sheet_image.save(ROOT / "result-sheet.png")

    # Tiles for the Store tall sets that float above the phone.
    for value in (100, 75, 50, 25, 9, 7, 5, 4, 3, 1, 10):
        tile(value).save(ROOT / f"tile-{value}.png")

    # The home screen animates its sample sum, so screenshots disagree on it. Build every home state
    # on one base and paste in only the region that changes.
    base = Image.open(ROOT / "home-fresh.png").convert("RGB")
    menu = base.copy()
    menu.paste(Image.open(ROOT / "home-menu.png").convert("RGB").crop((300, 1180, 1140, 2060)), (300, 1180))
    menu.save(ROOT / "home-menu-c.png")
    big4 = base.copy()
    big4.paste(Image.open(ROOT / "home-big4.png").convert("RGB").crop((40, 1880, 1166, 2170)), (40, 1880))
    big4.save(ROOT / "home-big4-c.png")

    # Mode cards: "I eget tempo" selected on the base, "Mot klokka" selected after the tap.
    sprint_home = base.copy()
    sprint_home.paste(Image.open(ROOT / "home-sprint-raw.png").convert("RGB").crop((40, 1490, 1166, 1860)), (40, 1490))
    sprint_home.save(ROOT / "home-sprint.png")
    tempo_card, clock_card = (60, 1511, 588, 1830), (618, 1510, 1146, 1831)
    rounded(base.crop(tempo_card), 66).save(ROOT / "card-tempo.png")
    rounded(sprint_home.crop(clock_card), 66).save(ROOT / "card-clock.png")

    # Touch indicator, like a screen recording with "show touches" on.
    tap = Image.new("RGBA", (400, 400), (0, 0, 0, 0))
    ImageDraw.Draw(tap).ellipse((60, 60, 340, 340), fill=(255, 255, 255, 150), outline=(0x17, 0x36, 0x43, 200), width=10)
    tap.save(ROOT / "tap.png")

    pad = 4 * S
    meta = {
        "tiles": [[rect(tile_box(r, c))[0] - pad, rect(tile_box(r, c))[1] - pad] for r in range(2) for c in range(3)],
        "tileSize": list(tile(75).size),
        "eq": {k: rect(v) for k, v in EQ.items()},
        "target": rect(target),
        "sheet": rect(sheet),
        "score": rect(score),
        "card": rect(card),
        "daily": rect(daily),
        "clock": rect(clock),
        "tempoCard": rect(tempo_card),
        "clockCard": rect(clock_card),
    }
    json.dump(meta, open(ROOT / "talljakt.json", "w"), indent=1)


if __name__ == "__main__":
    main()
