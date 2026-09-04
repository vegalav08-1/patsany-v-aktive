#!/usr/bin/env python3
"""Optional local asset preparation; production builds use the checked-in WebPs.

Run with Python 3 and Pillow. Source photo is never sent to an external service.
The points below are hand-reviewed source-pixel head outlines, including hair,
ears and chins. They are deliberately not rectangular face crops. No detail is
generated, retouched or sharpened, including for the small back portrait.
"""

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/assets"
REPORTS = ROOT / "reports"
SOURCE = ROOT / "assets/source/friends.jpg"

# Absolute x/y coordinates in the original 1280 x 960 photo. Crops include a
# small transparent border. Keep these bounds aligned with src/config/heroes.ts.
PORTRAITS = {
    "left": {
        "crop": (25, 145, 293, 405),
        "points": [
            (139, 153), (168, 153), (194, 155), (218, 162), (241, 171),
            (261, 183), (280, 200), (294, 217), (303, 238), (307, 260),
            (306, 286), (304, 309), (304, 326), (310, 329), (309, 341),
            (305, 352), (304, 378), (303, 409), (300, 437), (290, 461),
            (276, 480), (254, 499), (233, 518), (213, 534), (187, 541),
            (163, 540), (142, 534), (121, 523), (105, 510), (98, 494),
            (94, 478), (88, 468), (78, 455), (70, 442), (64, 430),
            (59, 418), (57, 409), (50, 402), (42, 395),
            (38, 384), (36, 367), (32, 349), (32, 332), (33, 318),
            (33, 305), (40, 304), (47, 314), (47, 298), (43, 278),
            (44, 251), (47, 227), (57, 206), (72, 187), (90, 171),
            (111, 161),
        ],
    },
    "back": {
        "crop": (327, 267, 175, 213),
        "points": [
            (392, 276), (411, 272), (429, 274), (447, 282), (462, 295),
            (474, 309), (480, 327), (482, 350), (483, 372), (490, 377),
            (492, 383), (489, 399), (482, 413), (475, 419), (470, 433),
            (458, 449), (444, 460), (426, 470), (412, 473), (399, 468),
            (385, 461), (374, 450), (363, 439), (354, 424), (349, 409),
            (344, 401), (338, 395), (335, 383), (332, 368), (335, 357),
            (340, 357), (345, 365), (347, 343), (349, 323), (356, 305),
            (366, 291), (378, 282),
        ],
    },
    "center": {
        "crop": (519, 270, 282, 411),
        "points": [
            (624, 287), (646, 281), (665, 278), (689, 281), (711, 287),
            (733, 299), (748, 313), (762, 331), (770, 351), (777, 372),
            (779, 398), (780, 420), (782, 437), (788, 433), (792, 440),
            (793, 455), (791, 475), (790, 494), (787, 512), (783, 520),
            (783, 542), (780, 562), (773, 584), (762, 608), (746, 631),
            (726, 649), (706, 662), (686, 670), (666, 672), (647, 669),
            (628, 662), (608, 650), (589, 633), (574, 615), (561, 593),
            (551, 570), (547, 548), (542, 537), (535, 530), (531, 515),
            (527, 496), (526, 477), (527, 460), (532, 454), (540, 458),
            (538, 439), (535, 418), (535, 397), (540, 377), (547, 356),
            (555, 338), (568, 322), (584, 306), (604, 295),
        ],
    },
    "right": {
        "crop": (918, 254, 284, 342),
        "points": [
            (994, 275), (1017, 271), (1043, 269), (1069, 265), (1095, 262),
            (1117, 259), (1136, 264), (1147, 273), (1149, 285), (1149, 296),
            (1147, 306), (1149, 318), (1156, 331), (1162, 343), (1167, 356), (1173, 378),
            (1183, 376), (1191, 381), (1193, 393), (1191, 411), (1188, 430),
            (1181, 449), (1174, 459), (1168, 463), (1165, 481), (1158, 507),
            (1145, 534), (1128, 554), (1108, 571), (1086, 582), (1064, 587),
            (1043, 588), (1028, 582), (1010, 572), (996, 559), (984, 545),
            (973, 530), (965, 514), (960, 500), (959, 488), (954, 483),
            (948, 478), (942, 466), (939, 456), (933, 451),
            (927, 438), (925, 424), (928, 418), (935, 421), (937, 431),
            (935, 411), (934, 392), (934, 374), (937, 353), (941, 333),
            (945, 316), (947, 298), (954, 288), (970, 281),
        ],
    },
}


def smooth_outline(points, samples=10):
    """Closed Catmull–Rom contour, retaining the hand-selected outline."""
    result = []
    count = len(points)
    for i in range(count):
        p0, p1, p2, p3 = (points[j % count] for j in (i - 1, i, i + 1, i + 2))
        for j in range(samples):
            t = j / samples
            result.append(tuple(
                0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t
                + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t * t
                + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t * t * t)
                for d in range(2)
            ))
    return result


def make_head(source, spec):
    x, y, width, height = spec["crop"]
    # Supersampling smooths only the transparency boundary, never face pixels.
    scale = 4
    mask = Image.new("L", (width * scale, height * scale))
    coordinates = [((px - x) * scale, (py - y) * scale)
                   for px, py in smooth_outline(spec["points"])]
    ImageDraw.Draw(mask).polygon(coordinates, fill=255)
    mask = mask.resize((width, height), Image.Resampling.LANCZOS)
    head = source.crop((x, y, x + width, y + height)).convert("RGBA")
    head.putalpha(mask)
    # Small rear head stays at native resolution. Larger heads also retain
    # native resolution so the same files work in menu, game and share card.
    return head


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    REPORTS.mkdir(parents=True, exist_ok=True)
    with Image.open(SOURCE) as original:
        # Copy into a fresh RGB image to discard EXIF, GPS, profiles and comments.
        source = Image.new("RGB", original.size)
        source.paste(original)
    group = source.resize((960, 720), Image.Resampling.LANCZOS)
    group.save(OUTPUT / "friends.webp", "WEBP", quality=82, method=6)

    heads = {}
    for hero_id, spec in PORTRAITS.items():
        head = make_head(source, spec)
        head.save(OUTPUT / f"head-{hero_id}.webp", "WEBP", quality=92,
                  alpha_quality=100, method=6)
        heads[hero_id] = head

    # Private QA only: verify contours against both dark and light backgrounds.
    # Body composition is checked separately in browser screenshots.
    sheet = Image.new("RGB", (1120, 640), "#111d2d")
    draw = ImageDraw.Draw(sheet)
    for index, (hero_id, head) in enumerate(heads.items()):
        x0 = index * 280
        draw.rectangle((x0, 330, x0 + 279, 639), fill="#ecede7")
        draw.text((x0 + 15, 12), hero_id, fill="white")
        display = head.copy()
        display.thumbnail((235, 280), Image.Resampling.LANCZOS)
        for top in (40, 346):
            sheet.paste(display, (x0 + (280 - display.width) // 2, top), display)
    sheet.save(REPORTS / "portraits-contour-review.jpg", quality=93)
    for name in ("friends.webp", *(f"head-{key}.webp" for key in PORTRAITS)):
        with Image.open(OUTPUT / name) as image:
            assert not image.getexif(), f"EXIF found: {name}"
            assert not any(key in image.info for key in ("exif", "icc_profile", "xmp"))
            if name.startswith("head-"):
                assert image.mode == "RGBA"
                alpha = image.getchannel("A")
                assert alpha.getextrema() == (0, 255)
                assert alpha.getpixel((0, 0)) == 0
            print(f"{name}: {image.width}×{image.height}; {(OUTPUT / name).stat().st_size:,} bytes; no metadata")


if __name__ == "__main__":
    main()
