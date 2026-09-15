"""Build lightweight portal previews; originals and detail pages are untouched."""
from pathlib import Path
from PIL import Image, ImageOps

BASE = Path(__file__).resolve().parent
DEST = BASE / 'WEB' / 'thumbnails'

def main():
    DEST.mkdir(exist_ok=True)
    original_bytes = preview_bytes = 0
    for number in range(1, 51):
        name = f'{number:03}'
        source = BASE / 'img2' / f'{name}-a4-portrait-white.png'
        target = DEST / f'{name}.webp'
        with Image.open(source) as opened:
            im = ImageOps.exif_transpose(opened).convert('RGB')
            im.thumbnail((480, 720), Image.Resampling.LANCZOS)
            im.save(target, 'WEBP', quality=76, method=6)
        original_bytes += source.stat().st_size
        preview_bytes += target.stat().st_size
    print(f'50 previews: {preview_bytes:,} bytes; originals: {original_bytes:,} bytes; reduction: {100*(1-preview_bytes/original_bytes):.1f}%')

if __name__ == '__main__':
    main()
