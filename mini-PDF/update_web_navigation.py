"""Apply association branding and curated related guides to the existing HTML."""
from pathlib import Path
import html
import re

WEB = Path(__file__).resolve().parent / 'WEB'
RELATED = {
    1: [9, 17, 25, 41], 2: [9, 10, 13, 44], 3: [14, 15, 8, 7],
    4: [7, 12, 33, 34], 5: [19, 12, 30, 49], 6: [50, 38, 16, 49],
    7: [4, 26, 34, 3], 8: [28, 3, 15, 50], 9: [1, 2, 12, 17],
    10: [2, 16, 33, 44], 11: [18, 4, 26, 34], 12: [4, 9, 13, 45],
    13: [21, 42, 44, 2], 14: [3, 8, 38, 50], 15: [17, 24, 1, 3],
    16: [10, 43, 46, 44], 17: [15, 24, 1, 9], 18: [11, 30, 4, 34],
    19: [5, 30, 49, 12], 20: [23, 44, 47, 29], 21: [13, 29, 27, 42],
    22: [29, 35, 37, 46], 23: [20, 44, 47, 7], 24: [17, 15, 25, 41],
    25: [1, 24, 41, 32], 26: [7, 31, 34, 11], 27: [43, 21, 29, 46],
    28: [8, 30, 24, 50], 29: [21, 35, 22, 20], 30: [18, 28, 19, 34],
    31: [26, 25, 2, 34], 32: [36, 25, 40, 1], 33: [10, 4, 45, 34],
    34: [7, 26, 4, 30], 35: [29, 22, 24, 20], 36: [1, 32, 40, 41],
    37: [22, 46, 38, 50], 38: [50, 6, 16, 37], 39: [40, 36, 48, 32],
    40: [39, 36, 32, 48], 41: [1, 25, 24, 36], 42: [13, 21, 44, 43],
    43: [27, 42, 10, 46], 44: [2, 10, 42, 23], 45: [12, 33, 10, 42],
    46: [43, 27, 22, 37], 47: [23, 20, 44, 7], 48: [40, 39, 36, 32],
    49: [19, 5, 6, 50], 50: [6, 38, 8, 14],
}

def main():
    portal = WEB / 'index.html'
    index = portal.read_text(encoding='utf-8')
    titles = {int(n): title for n, title in re.findall(r'id: "(\d{3})", title: "([^"]+)"', index)}
    assert len(titles) == 50
    index = index.replace('© 2026 JACR Chiang Rai Contents. All Rights Reserved.',
                          '© 2026 チェンライ日本人会. All Rights Reserved.')
    index = index.replace('>JACR Chiang Rai Contents<', '>チェンライ日本人会 作成<')
    portal.write_text(index, encoding='utf-8')
    for number, targets in RELATED.items():
        path = WEB / f'{number:03}' / 'index.html'
        page = path.read_text(encoding='utf-8')
        page = page.replace('© 2026 JACR Chiang Rai Contents. All Rights Reserved.',
                            '© 2026 チェンライ日本人会. All Rights Reserved.')
        if 'class="association-host"' not in page:
            page = page.replace('<div class="container header-inner">',
                                '<div class="container header-inner">\n      <p class="association-host">チェンライ日本人会 作成</p>', 1)
        if 'href="../guide-navigation.css"' not in page:
            page = page.replace('</head>', '  <link rel="stylesheet" href="../guide-navigation.css">\n</head>', 1)
        cards = []
        for target in targets:
            name = f'{target:03}'
            assert target != number and (WEB / name / 'index.html').is_file()
            cards.append(f'''        <a class="related-guide" href="../{name}/index.html">
          <img src="../thumbnails/{name}.webp" alt="" width="80" height="113" loading="lazy" decoding="async">
          <span><small>No. {name}</small><span>{html.escape(titles[target])}</span></span>
        </a>''')
        section = '''    <!-- related-guides:start -->
    <nav class="related-guides" aria-labelledby="related-guides-title">
      <div class="related-heading"><h2 id="related-guides-title">あわせて読みたいガイド</h2><a href="../index.html">全50ガイドを見る →</a></div>
      <div class="related-grid">
''' + '\n'.join(cards) + '''
      </div>
    </nav>
    <!-- related-guides:end -->
'''
        page = re.sub(r'    <!-- related-guides:start -->.*?<!-- related-guides:end -->\n?', '', page, flags=re.S)
        page = page.replace('  </main>', section + '  </main>', 1)
        assert page.count('チェンライ日本人会') == 2, path
        path.write_text(page, encoding='utf-8')
    print('Updated 51 pages: association branding and 200 curated related links.')

if __name__ == '__main__':
    main()
