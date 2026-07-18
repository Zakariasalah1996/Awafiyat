from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("/home/ubuntu/webdev-static-assets/awafiyat-icon.png")
TARGETS = {
    ROOT / "assets/images/icon.png": (1024, 1024),
    ROOT / "assets/images/splash-icon.png": (1024, 1024),
    ROOT / "assets/images/favicon.png": (512, 512),
    ROOT / "assets/images/android-icon-foreground.png": (1024, 1024),
}

with Image.open(SOURCE) as source:
    rgb = source.convert("RGB")
    for path, size in TARGETS.items():
        resized = rgb.resize(size, Image.Resampling.LANCZOS)
        optimized = resized.quantize(
            colors=256,
            method=Image.Quantize.MEDIANCUT,
            dither=Image.Dither.NONE,
        )
        optimized.save(path, format="PNG", optimize=True, compress_level=9)
        print(f"{path.relative_to(ROOT)}\t{path.stat().st_size}\t{size[0]}x{size[1]}")
