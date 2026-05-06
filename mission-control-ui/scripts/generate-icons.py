from pathlib import Path
from PIL import Image, ImageFilter

SOURCE = Path("public/aentx-logo.png")
APP_DIR = Path("src/app")

ICON_PNG = APP_DIR / "icon.png"
APPLE_ICON_PNG = APP_DIR / "apple-icon.png"
FAVICON_ICO = APP_DIR / "favicon.ico"

# Increase this if the logo feels too large/cropped.
# Decrease it if the favicon looks too tiny.
PADDING_RATIO = 0.08


def load_source() -> Image.Image:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Missing source logo: {SOURCE}")

    return Image.open(SOURCE).convert("RGBA")


def trim_transparent_padding(img: Image.Image) -> Image.Image:
    bbox = img.getbbox()
    if bbox is None:
        return img
    return img.crop(bbox)


def make_square_icon(source: Image.Image, size: int) -> Image.Image:
    source = trim_transparent_padding(source)

    padding = round(size * PADDING_RATIO)
    max_logo_size = size - (padding * 2)

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    logo = source.copy()
    logo.thumbnail((max_logo_size, max_logo_size), Image.Resampling.LANCZOS)

    x = (size - logo.width) // 2
    y = (size - logo.height) // 2
    canvas.alpha_composite(logo, (x, y))

    return canvas


def main() -> None:
    APP_DIR.mkdir(parents=True, exist_ok=True)

    source = load_source()

    # Modern browser / app icons.
    make_square_icon(source, 512).save(ICON_PNG)
    make_square_icon(source, 180).save(APPLE_ICON_PNG)

    # Multi-resolution classic favicon.
    favicon_sizes = [16, 24, 32, 48, 64, 128, 256]
    favicon_images = [make_square_icon(source, size) for size in favicon_sizes]

    favicon_images[0].save(
        FAVICON_ICO,
        format="ICO",
        sizes=[(size, size) for size in favicon_sizes],
        append_images=favicon_images[1:],
    )

    print("Generated favicons:")
    print(f"  {ICON_PNG}")
    print(f"  {APPLE_ICON_PNG}")
    print(f"  {FAVICON_ICO}")


if __name__ == "__main__":
    main()