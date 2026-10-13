# 90日レポートのアイコン（カレンダーに「90」）を、追加ライブラリなしで PNG に書き出す。
# 使い方: python3 tools/make_icons.py
import struct, zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "site" / "90day"
TEAL, WHITE, RED, INK = (0x0b, 0x5d, 0x57), (255, 255, 255), (0xc3, 0x33, 0x2b), (0x14, 0x20, 0x1f)
DIGITS = {  # 5x7 の点で描く数字
    "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
    "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
}

def pixel(u, v):
    # 背景（maskable でも切れないよう、内容は中央 70% に収める）
    if not (0.18 <= u <= 0.82 and 0.20 <= v <= 0.82):
        return TEAL
    if v < 0.34:
        return RED  # カレンダーの上の帯
    # 「90」を下の白い部分に描く
    gx0, gy0, cell = 0.27, 0.42, 0.034
    for i, ch in enumerate("90"):
        x0 = gx0 + i * cell * 7
        cx, cy = int((u - x0) / cell), int((v - gy0) / cell)
        if 0 <= cx < 5 and 0 <= cy < 7 and u >= x0 and v >= gy0 and DIGITS[ch][cy][cx] == "1":
            return INK
    return WHITE

def png(size, name):
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            row += bytes(pixel((x + .5) / size, (y + .5) / size))
        rows.append(bytes(row))
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)) \
        + chunk(b"IDAT", zlib.compress(b"".join(rows), 9)) + chunk(b"IEND", b"")
    (OUT / name).write_bytes(data)

png(192, "icon-192.png")
png(512, "icon-512.png")
print("icons written")
