# prep_helpers.py — app-promo
# Building blocks for cutting real app UI out of simulator screenshots (1206 × 2622 px, iPhone 17 Pro @3x).
# Import from an app-specific prep script, e.g. tools/prep_<app>.py, and write sprites + a JSON of rects to public/<app>/.
from PIL import Image, ImageDraw, ImageFont

SCALE = 3  # points → pixels on iPhone 17 Pro


def px(points):
    return round(points * SCALE)


def frame_px(frame):
    """describe-ui frame dict (points) → (x0, y0, x1, y1) pixel box."""
    return (px(frame["x"]), px(frame["y"]), px(frame["x"] + frame["width"]), px(frame["y"] + frame["height"]))


def rect(box):
    """(x0, y0, x1, y1) → [x, y, width, height], the format the Remotion components take."""
    return [box[0], box[1], box[2] - box[0], box[3] - box[1]]


def rounded(sprite, radius, inset=0):
    """Give a rectangular crop the element's rounded corners (alpha mask, 2× supersampled)."""
    mask = Image.new("L", (sprite.width * 2, sprite.height * 2), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (inset * 2, inset * 2, mask.width - 1 - inset * 2, mask.height - 1 - inset * 2), radius=radius * 2, fill=255
    )
    sprite = sprite.convert("RGBA")
    sprite.putalpha(mask.resize(sprite.size, Image.LANCZOS))
    return sprite


def inpaint(image, box):
    """Erase a small area (a digit, an icon) by blending its left and right edge columns row by row.
    Good for narrow boxes on smooth backgrounds; leaves visible bands on wide boxes with shadows."""
    x0, y0, x1, y1 = box
    for y in range(y0, y1):
        left, right = image.getpixel((x0 - 1, y)), image.getpixel((x1, y))
        for x in range(x0, x1):
            t = (x - x0 + 1) / (x1 - x0 + 1)
            image.putpixel((x, y), tuple(round(a + (b - a) * t) for a, b in zip(left, right)))


def paper_fill(image, box, margins=(range(4, 40), range(1170, 1202))):
    """Erase a large element (card, button) by filling each row with the median color of the screen margins.
    Pad the box ~30 px sideways and ~50 px below so the element's drop shadow goes too."""
    x0, y0, x1, y1 = box
    for y in range(y0, y1):
        samples = sorted(image.getpixel((x, y)) for r in margins for x in r)
        color = samples[len(samples) // 2]
        for x in range(x0, x1):
            image.putpixel((x, y), color)


def keyed(image, box, background, threshold=12, gain=6):
    """Cut a flat-colored glyph (star, icon) off a plain background by color distance.
    Unreliable for text over decorated backgrounds; render such text in HTML/PIL instead."""
    crop = image.crop(box).convert("RGBA")
    alpha = Image.new("L", crop.size)
    for y in range(crop.height):
        for x in range(crop.width):
            r, g, b, _ = crop.getpixel((x, y))
            distance = abs(r - background[0]) + abs(g - background[1]) + abs(b - background[2])
            alpha.putpixel((x, y), max(0, min(255, (distance - threshold) * gain)))
    crop.putalpha(alpha)
    return crop


def text_variants(shot, box, values, font_path, size, color, anchor_xy, out, anchor="ms"):
    """Make a patch per value (move counter, score) so a number on screen can change.
    Measure the original glyph bbox first and pick size so the rendered '0' diffs to nothing."""
    patch = shot.crop(box)
    clean = patch.copy()
    inpaint(clean, (1, 0, clean.width - 1, clean.height))
    font = ImageFont.truetype(font_path, size)
    for value in values:
        image = clean.copy()
        ImageDraw.Draw(image).text((anchor_xy[0] - box[0], anchor_xy[1] - box[1]), str(value), font=font, fill=color, anchor=anchor)
        image.save(out(value))


def glyph_bbox(image, box, threshold=120):
    """Bounding box of dark pixels inside box: use it to place and size text_variants."""
    gray = image.convert("L")
    xs, ys = [], []
    for x in range(box[0], box[2]):
        for y in range(box[1], box[3]):
            if gray.getpixel((x, y)) < threshold:
                xs.append(x)
                ys.append(y)
    return min(xs), min(ys), max(xs), max(ys)


def edges(image, axis, at, start, end, threshold=40):
    """Positions along a row (axis='x') or column (axis='y') where brightness jumps: finds card and button edges."""
    get = (lambda i: image.getpixel((i, at))) if axis == "x" else (lambda i: image.getpixel((at, i)))
    values = [sum(get(i)[:3]) for i in range(start, end)]
    return [start + i for i in range(1, len(values)) if abs(values[i] - values[i - 1]) > threshold]
