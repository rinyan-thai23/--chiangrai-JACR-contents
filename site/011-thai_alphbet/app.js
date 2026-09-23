/* ===================================================
   Thai Alphabet Learning App
   =================================================== */

(() => {
    'use strict';

    // --- R2 base URL ---
    const R2_BASE = 'https://pub-1cb8d5bae9ea4a93a941d9e2607437b3.r2.dev/thai_alphabet(kita-thai.com)/';

    // --- State ---
    let currentFilter = 'all';
    let currentView = 'list';   // 'list' | 'card'
    let currentIndex = 0;
    let filteredData = [...THAI_DATA];

    // --- DOM ---
    const $ = id => document.getElementById(id);
    const listView = $('listView');
    const cardView = $('cardView');
    const bottomNav = $('bottomNav');
    const navCounter = $('navCounter');
    const audioPlayer = $('audioPlayer');

    // --- Category config ---
    const CATEGORY_ORDER = ['Consonant', 'Vowel', 'Tone', 'Exception'];
    const CATEGORY_NAMES = {
        Consonant: '子音 Consonant',
        Vowel: '母音 Vowel',
        Tone: '声調 Tone Mark',
        Exception: '特殊 Exception'
    };

    // =============================================
    // AUDIO
    // =============================================
    let playingType = null; // null | 'main' | 'sub'

    function buildMainAudioUrl(item) {
        const id = String(item.id).padStart(2, '0');
        return `${R2_BASE}${id}.mp3`;
    }

    function buildSubAudioUrl(item, subIndex) {
        const id = String(item.id).padStart(2, '0');
        const sub = String(subIndex).padStart(2, '0');
        return `${R2_BASE}${id}-sub${sub}.mp3`;
    }

    function stopAudio() {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        audioPlayer.removeAttribute('src');
        setPlayingState(null);
    }

    function setPlayingState(type) {
        playingType = type;
        // Hero section animation
        const hero = document.querySelector('.card-hero');
        if (hero) {
            hero.classList.toggle('is-playing', type === 'main');
        }
        // Spell section animation
        const spellSection = document.querySelector('.spell-section');
        if (spellSection) {
            spellSection.classList.toggle('is-playing', type === 'sub');
        }
        // Bottom nav buttons
        const mainBtn = $('btnPlayMain');
        const subBtn = $('btnPlaySub');
        if (mainBtn) mainBtn.classList.toggle('is-playing', type === 'main');
        if (subBtn) subBtn.classList.toggle('is-playing', type === 'sub');
        // Hero play button
        const heroPlay = $('heroPlay');
        if (heroPlay) {
            heroPlay.classList.toggle('is-playing', type === 'main');
            heroPlay.textContent = type === 'main' ? '⏹ 停止' : '🔊 再生';
        }
        // Spell play button
        const spellPlay = $('spellPlay');
        if (spellPlay) {
            spellPlay.classList.toggle('is-playing', type === 'sub');
            spellPlay.textContent = type === 'sub' ? '⏹ 停止' : '🔉 スペル音声';
        }
    }

    function playMP3(url, type) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        audioPlayer.src = url;
        setPlayingState(type);
        audioPlayer.play().catch(() => { setPlayingState(null); });
    }

    // Sequential sub playback state
    let subQueue = [];
    let subQueueIndex = 0;

    function toggleMain() {
        if (playingType === 'main') { stopAudio(); return; }
        const item = filteredData[currentIndex];
        if (!item) return;
        playMP3(buildMainAudioUrl(item), 'main');
    }

    function toggleSub() {
        if (playingType === 'sub') { stopAudio(); subQueue = []; return; }
        const item = filteredData[currentIndex];
        if (!item || !item.spell) return;
        const count = Object.keys(item.spell).length;
        if (count === 0) return;
        subQueue = [];
        for (let i = 1; i <= count; i++) {
            subQueue.push(buildSubAudioUrl(item, i));
        }
        subQueueIndex = 0;
        playNextSub();
    }

    function playNextSub() {
        if (subQueueIndex >= subQueue.length) {
            stopAudio();
            subQueue = [];
            return;
        }
        playMP3(subQueue[subQueueIndex], 'sub');
        subQueueIndex++;
    }

    function playSubSingle(item, subIndex) {
        if (playingType) stopAudio();
        playMP3(buildSubAudioUrl(item, subIndex), 'sub');
    }

    // =============================================
    // LIST VIEW
    // =============================================
    // List auto-play state
    let listAutoTimer = null;
    let listAutoItems = [];
    let listAutoIdx = 0;
    let listAutoBtn = null;

    function renderList() {
        listView.innerHTML = '';
        stopListAutoPlay();

        const groups = {};
        filteredData.forEach(item => {
            const t = item.type || 'Other';
            if (!groups[t]) groups[t] = [];
            groups[t].push(item);
        });

        const order = currentFilter === 'all'
            ? CATEGORY_ORDER.filter(k => groups[k])
            : [currentFilter];

        order.forEach(type => {
            const items = groups[type];
            if (!items || items.length === 0) return;

            const section = document.createElement('div');
            section.className = 'list-section';

            // header with auto-play button
            section.innerHTML = `
        <div class="section-header">
          <span class="section-dot ${type}"></span>
          <span class="section-title">${CATEGORY_NAMES[type] || type}</span>
          <span class="section-count">${items.length}</span>
          <button class="drill-auto-btn list-auto-btn" data-type="${type}">▶ 自動再生</button>
        </div>
      `;

            // auto-play button handler
            const autoBtn = section.querySelector('.list-auto-btn');
            autoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (listAutoBtn === autoBtn) {
                    stopListAutoPlay();
                } else {
                    startListAutoPlay(items, autoBtn, section);
                }
            });

            // grid
            const grid = document.createElement('div');
            grid.className = 'grid-container';

            items.forEach(item => {
                const card = document.createElement('div');
                card.className = `mini-card ${item.type}`;
                card.dataset.itemId = item.id;
                const soundInit = item.sound && item.sound.init && item.sound.init !== '-' ? item.sound.init : '';
                card.innerHTML = `
          <div class="char"><span>${item.char}</span><span class="sound-init-list">${soundInit}</span></div>
          <div class="name-roman">${item.name.roman || ''}</div>
          <span class="mini-badge ${item.class}">${item.class || ''}</span>
        `;
                card.addEventListener('click', () => { stopAudio(); stopListAutoPlay(); openCard(item); });
                grid.appendChild(card);
            });

            section.appendChild(grid);
            listView.appendChild(section);
        });
    }

    function startListAutoPlay(items, btn, section) {
        stopListAutoPlay();
        listAutoItems = items;
        listAutoIdx = 0;
        listAutoBtn = btn;
        btn.textContent = '⏹ 停止';
        playNextListAuto(section);
    }

    function playNextListAuto(section) {
        // Remove previous highlight
        document.querySelectorAll('.mini-card.is-list-playing').forEach(el => el.classList.remove('is-list-playing'));

        if (listAutoIdx >= listAutoItems.length) {
            stopListAutoPlay();
            return;
        }
        const item = listAutoItems[listAutoIdx];
        // Highlight current card
        if (section) {
            const card = section.querySelector(`[data-item-id="${item.id}"]`);
            if (card) {
                card.classList.add('is-list-playing');
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
        playMP3(buildMainAudioUrl(item), 'main');
        listAutoIdx++;

        // Use ended event via a one-time listener
        const onEnded = () => {
            audioPlayer.removeEventListener('ended', onEnded);
            listAutoTimer = setTimeout(() => playNextListAuto(section), 800);
        };
        // Remove the default ended handler temporarily — we'll handle it
        audioPlayer.addEventListener('ended', onEnded);
    }

    function stopListAutoPlay() {
        if (listAutoTimer) {
            clearTimeout(listAutoTimer);
            listAutoTimer = null;
        }
        if (listAutoBtn) {
            listAutoBtn.textContent = '▶ 自動再生';
            listAutoBtn = null;
        }
        listAutoItems = [];
        listAutoIdx = 0;
        document.querySelectorAll('.mini-card.is-list-playing').forEach(el => el.classList.remove('is-list-playing'));
    }

    // =============================================
    // CARD VIEW
    // =============================================
    function renderCard() {
        const item = filteredData[currentIndex];
        if (!item) return;

        // Counter
        navCounter.textContent = `${currentIndex + 1} / ${filteredData.length}`;

        const sections = [];

        // ---- Hero ----
        const soundInit = item.sound && item.sound.init && item.sound.init !== '-' ? item.sound.init : '';
        sections.push(`
      <div class="card-hero">
        <span class="type-label ${item.type}">${item.type}</span>
        <span class="badge ${item.class}">${item.class || ''}</span>
        <div class="hero-char" id="heroChar">${item.char}<span class="sound-init-card">${soundInit}</span></div>
        <div class="hero-name-thai">${item.name.thai || ''}</div>
        <div class="hero-name-roman">${item.name.roman || ''}</div>
        <button class="hero-play-btn" id="heroPlay">🔊 再生</button>
      </div>
    `);

        // ---- Sound & Rule ----
        if (item.sound || item.rule) {
            let infoHtml = '<div class="info-grid">';
            if (item.sound) {
                infoHtml += `
          <div class="info-item">
            <div class="info-label">Initial</div>
            <div class="info-value">${item.sound.init || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Final</div>
            <div class="info-value">${item.sound.final || '-'}</div>
          </div>
        `;
            }
            if (item.rule) {
                infoHtml += `
          <div class="info-item">
            <div class="info-label">Position</div>
            <div class="info-value">${item.rule.pos || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Pair</div>
            <div class="info-value">${item.rule.pair || '-'}</div>
          </div>
        `;
                if (item.rule.change) {
                    infoHtml += `
            <div class="info-item" style="grid-column: span 2">
              <div class="info-label">Change / Rule</div>
              <div class="info-value">${item.rule.change}</div>
            </div>
          `;
                }
            }
            infoHtml += '</div>';
            sections.push(`
        <div class="card-section">
          <div class="card-section-title">📋 基本情報</div>
          ${infoHtml}
        </div>
      `);
        }

        // ---- Drill ----
        if (item.drill && Object.keys(item.drill).length > 0) {
            // Map drill keys to spell values for audio index
            const spellValues = item.spell ? Object.values(item.spell) : [];
            const drillHtml = Object.entries(item.drill).map(([thai, roman]) => {
                // Drill key (e.g. "กะ") matches spell value (e.g. "กอ อะ": "กะ")
                const spellIdx = spellValues.indexOf(thai);
                const subIdx = spellIdx >= 0 ? spellIdx + 1 : 0;
                return `<div class="drill-item" data-drill-thai="${thai}" data-drill-roman="${roman}" data-sub-index="${subIdx}">
          <div class="drill-thai">${thai}</div>
          <div class="drill-roman">${roman}</div>
        </div>`;
            }).join('');
            sections.push(`
        <div class="card-section">
          <div class="card-section-title">📝 ドリル <button class="drill-auto-btn" id="drillAutoBtn">▶ 自動再生</button></div>
          <div class="drill-grid">${drillHtml}</div>
        </div>
      `);
        }

        // ---- Spell ----
        if (item.spell && Object.keys(item.spell).length > 0) {
            const spellHtml = Object.entries(item.spell).map(([read, result], idx) => {
                const parts = read.split(' ');
                return `<div class="spell-item" data-sub-index="${idx + 1}" data-spell-part1="${parts[0] || ''}" data-spell-part2="${parts[1] || ''}" data-spell-result="${result}">
          <span class="spell-read">${read}</span>
          <span class="spell-arrow">→</span>
          <span class="spell-result">${result}</span>
        </div>`;
            }).join('');
            sections.push(`
        <div class="card-section spell-section">
          <div class="card-section-title">🔤 スペル <button class="drill-auto-btn" id="spellAutoBtn">▶ 自動再生</button></div>
          <div class="spell-grid">${spellHtml}</div>
        </div>
      `);
        }

        // ---- Vocab ----
        if (item.vocab && item.vocab.word) {
            sections.push(`
        <div class="card-section">
          <div class="card-section-title">📖 単語</div>
          <div class="vocab-box">
            <div class="vocab-word">${item.vocab.word}</div>
            <div class="vocab-details">
              <div class="vocab-roman">${item.vocab.roman || ''}</div>
              <div class="vocab-mean">${item.vocab.mean || ''}</div>
            </div>
          </div>
        </div>
      `);
        }

        // ---- Tip ----
        if (item.tip) {
            sections.push(`
        <div class="card-section">
          <div class="card-section-title">💡 ヒント</div>
          <div class="tip-text">${item.tip}</div>
        </div>
      `);
        }

        cardView.innerHTML = sections.join('');

        // Bind hero play
        const heroPlay = $('heroPlay');
        if (heroPlay) heroPlay.addEventListener('click', toggleMain);

        const heroChar = $('heroChar');
        if (heroChar) heroChar.addEventListener('click', toggleMain);

        // Bind spell play (sequential all)
        const spellPlay = $('spellPlay');
        if (spellPlay) spellPlay.addEventListener('click', toggleSub);

        // Bind drill item clicks
        cardView.querySelectorAll('.drill-item').forEach(el => {
            el.addEventListener('click', () => {
                const subIdx = parseInt(el.dataset.subIndex, 10);
                openDrillModal(el.dataset.drillThai, el.dataset.drillRoman, null, subIdx);
            });
        });

        // Bind drill auto-play
        const drillAutoBtn = $('drillAutoBtn');
        if (drillAutoBtn) drillAutoBtn.addEventListener('click', startDrillAutoPlay);

        // Bind spell item clicks
        cardView.querySelectorAll('.spell-item').forEach(el => {
            el.addEventListener('click', () => {
                const subIdx = parseInt(el.dataset.subIndex, 10);
                openSpellModal(el.dataset.spellPart1, el.dataset.spellPart2, el.dataset.spellResult, null, subIdx);
            });
        });

        // Bind spell auto-play
        const spellAutoBtn = $('spellAutoBtn');
        if (spellAutoBtn) spellAutoBtn.addEventListener('click', startSpellAutoPlay);
    }

    // =============================================
    // NAVIGATION
    // =============================================
    function openCard(item) {
        const idx = filteredData.indexOf(item);
        if (idx !== -1) currentIndex = idx;
        switchView('card');
    }

    function switchView(view) {
        stopAudio();
        currentView = view;
        const isCard = view === 'card';

        listView.classList.toggle('hidden', isCard);
        cardView.classList.toggle('hidden', !isCard);
        cardView.classList.toggle('visible', isCard);
        bottomNav.classList.toggle('visible', isCard);

        $('btnList').classList.toggle('active', !isCard);
        $('btnCard').classList.toggle('active', isCard);

        if (isCard) {
            renderCard();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            renderList();
        }
    }

    function navigate(dir) {
        stopAudio();
        currentIndex += dir;
        if (currentIndex < 0) currentIndex = filteredData.length - 1;
        if (currentIndex >= filteredData.length) currentIndex = 0;
        renderCard();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // =============================================
    // FILTER
    // =============================================
    function applyFilter(type) {
        currentFilter = type;
        filteredData = type === 'all'
            ? [...THAI_DATA]
            : THAI_DATA.filter(d => d.type === type);
        currentIndex = 0;

        // Update tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === type);
        });

        if (currentView === 'list') renderList();
        else renderCard();
    }

    // =============================================
    // KEYBOARD
    // =============================================
    function handleKeyboard(e) {
        if (currentView !== 'card') return;
        switch (e.key) {
            case 'ArrowLeft': navigate(-1); break;
            case 'ArrowRight': navigate(1); break;
            case ' ':
                e.preventDefault();
                toggleMain();
                break;
            case 's':
            case 'S':
                toggleSub();
                break;
            case 'Escape':
                closeDrillModal();
                closeSpellModal();
                break;
        }
    }

    // =============================================
    // SWIPE (mobile)
    // =============================================
    let touchStartX = 0;
    function handleTouchStart(e) {
        touchStartX = e.touches[0].clientX;
    }
    function handleTouchEnd(e) {
        if (currentView !== 'card') return;
        const diff = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(diff) > 60) {
            navigate(diff < 0 ? 1 : -1);
        }
    }

    // =============================================
    // DRILL MODAL
    // =============================================
    let drillAutoTimer = null;
    let drillAutoEntries = [];
    let drillAutoIndex = 0;
    let drillAutoItem = null;

    function openDrillModal(thai, roman, autoInfo, subIndex) {
        let overlay = $('drillModal');
        const isNew = !overlay;
        if (isNew) {
            overlay = document.createElement('div');
            overlay.className = 'drill-modal';
            overlay.id = 'drillModal';
            document.body.appendChild(overlay);
        }

        const counterHtml = autoInfo
            ? `<div class="drill-modal-counter">${autoInfo.current} / ${autoInfo.total}</div>
               <div class="drill-modal-progress"><div class="drill-modal-progress-bar"></div></div>`
            : '';

        overlay.innerHTML = `
            <div class="drill-modal-content">
                ${counterHtml}
                <div class="drill-modal-thai">${thai}</div>
                <div class="drill-modal-roman">${roman}</div>
                <button class="drill-modal-close" id="drillModalClose">✕</button>
            </div>
        `;

        // Play audio for this drill item
        if (subIndex && subIndex > 0) {
            const item = drillAutoItem || filteredData[currentIndex];
            if (item) {
                playMP3(buildSubAudioUrl(item, subIndex), 'sub');
            }
        }

        // Close on × click
        $('drillModalClose').addEventListener('click', (e) => {
            e.stopPropagation();
            stopDrillAutoPlay();
            closeDrillModal();
        });
        // Close on backdrop click (only bind once on new overlay)
        if (isNew) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    stopDrillAutoPlay();
                    closeDrillModal();
                }
            });
        }
    }

    function closeDrillModal(keepAuto) {
        const modal = $('drillModal');
        if (modal) modal.remove();
        if (!keepAuto) {
            stopAudio();
            stopDrillAutoPlay();
        }
    }

    function startDrillAutoPlay() {
        const item = filteredData[currentIndex];
        if (!item || !item.drill) return;
        drillAutoItem = item;
        const spellValues = item.spell ? Object.values(item.spell) : [];
        drillAutoEntries = Object.entries(item.drill).map(([thai, roman]) => {
            const spellIdx = spellValues.indexOf(thai);
            return { thai, roman, subIndex: spellIdx >= 0 ? spellIdx + 1 : 0 };
        });
        if (drillAutoEntries.length === 0) return;
        drillAutoIndex = 0;
        showNextDrillAuto();
    }

    function showNextDrillAuto() {
        if (drillAutoIndex >= drillAutoEntries.length) {
            closeDrillModal();
            return;
        }
        const entry = drillAutoEntries[drillAutoIndex];
        openDrillModal(entry.thai, entry.roman, {
            current: drillAutoIndex + 1,
            total: drillAutoEntries.length
        }, entry.subIndex);
        drillAutoIndex++;
        drillAutoTimer = setTimeout(showNextDrillAuto, 5000);
    }

    function stopDrillAutoPlay() {
        if (drillAutoTimer) {
            clearTimeout(drillAutoTimer);
            drillAutoTimer = null;
        }
        drillAutoEntries = [];
        drillAutoIndex = 0;
        drillAutoItem = null;
    }

    // =============================================
    // SPELL MODAL
    // =============================================
    let spellAutoTimer = null;
    let spellAutoEntries = [];
    let spellAutoIndex = 0;
    let spellAutoItem = null;

    function openSpellModal(part1, part2, result, autoInfo, subIndex) {
        let overlay = $('spellModal');
        const isNew = !overlay;
        if (isNew) {
            overlay = document.createElement('div');
            overlay.className = 'drill-modal';
            overlay.id = 'spellModal';
            document.body.appendChild(overlay);
        }

        const counterHtml = autoInfo
            ? `<div class="drill-modal-counter">${autoInfo.current} / ${autoInfo.total}</div>
               <div class="drill-modal-progress"><div class="drill-modal-progress-bar"></div></div>`
            : '';

        overlay.innerHTML = `
            <div class="drill-modal-content spell-modal-content">
                ${counterHtml}
                <div class="spell-modal-parts">
                    <span class="spell-modal-part spell-part-1">${part1}</span>
                    <span class="spell-modal-part spell-part-2">${part2}</span>
                    <span class="spell-modal-arrow spell-part-3">→</span>
                    <span class="spell-modal-result spell-part-3">${result}</span>
                </div>
                <button class="drill-modal-close" id="spellModalClose">✕</button>
            </div>
        `;

        // Play audio
        if (subIndex && subIndex > 0) {
            const item = spellAutoItem || filteredData[currentIndex];
            if (item) playMP3(buildSubAudioUrl(item, subIndex), 'sub');
        }

        // Close handlers
        $('spellModalClose').addEventListener('click', (e) => {
            e.stopPropagation();
            stopSpellAutoPlay();
            closeSpellModal();
        });
        if (isNew) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    stopSpellAutoPlay();
                    closeSpellModal();
                }
            });
        }
    }

    function closeSpellModal(keepAuto) {
        const modal = $('spellModal');
        if (modal) modal.remove();
        if (!keepAuto) {
            stopAudio();
            stopSpellAutoPlay();
        }
    }

    function startSpellAutoPlay() {
        const item = filteredData[currentIndex];
        if (!item || !item.spell) return;
        spellAutoItem = item;
        spellAutoEntries = Object.entries(item.spell).map(([read, result], idx) => {
            const parts = read.split(' ');
            return { part1: parts[0] || '', part2: parts[1] || '', result, subIndex: idx + 1 };
        });
        if (spellAutoEntries.length === 0) return;
        spellAutoIndex = 0;
        showNextSpellAuto();
    }

    function showNextSpellAuto() {
        if (spellAutoIndex >= spellAutoEntries.length) {
            closeSpellModal();
            return;
        }
        const entry = spellAutoEntries[spellAutoIndex];
        openSpellModal(entry.part1, entry.part2, entry.result, {
            current: spellAutoIndex + 1,
            total: spellAutoEntries.length
        }, entry.subIndex);
        spellAutoIndex++;
        spellAutoTimer = setTimeout(showNextSpellAuto, 5000);
    }

    function stopSpellAutoPlay() {
        if (spellAutoTimer) {
            clearTimeout(spellAutoTimer);
            spellAutoTimer = null;
        }
        spellAutoEntries = [];
        spellAutoIndex = 0;
        spellAutoItem = null;
    }

    // THEME
    // =============================================
    function initTheme() {
        const saved = localStorage.getItem('thai-theme') || 'dark';
        applyTheme(saved);
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const btn = $('btnTheme');
        if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        localStorage.setItem('thai-theme', next);
        applyTheme(next);
    }

    // =============================================
    // FONT SWITCHER
    // =============================================
    const DEFAULT_FONT = "'Noto Sans Thai', sans-serif";

    function initFont() {
        const saved = localStorage.getItem('thai-font') || DEFAULT_FONT;
        applyFont(saved);
    }

    function applyFont(fontValue) {
        document.documentElement.style.setProperty('--thai-font', fontValue);
        // Update active state in panel
        document.querySelectorAll('.font-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.font === fontValue);
        });
    }

    function setupFontSelector() {
        const btn = $('btnFont');
        const panel = $('fontPanel');
        if (!btn || !panel) return;

        // Toggle panel
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.classList.toggle('open');
        });

        // Font option click
        panel.addEventListener('click', (e) => {
            const opt = e.target.closest('.font-option');
            if (!opt) return;
            e.stopPropagation();
            const font = opt.dataset.font;
            localStorage.setItem('thai-font', font);
            applyFont(font);
            panel.classList.remove('open');
        });

        // Close on outside click
        document.addEventListener('click', () => {
            panel.classList.remove('open');
        });
        panel.addEventListener('click', (e) => e.stopPropagation());
    }

    // =============================================
    // INIT
    // =============================================
    function init() {
        // Theme toggle
        initTheme();
        $('btnTheme').addEventListener('click', toggleTheme);

        // Font selector
        initFont();
        setupFontSelector();

        // View toggle
        $('btnList').addEventListener('click', () => switchView('list'));
        $('btnCard').addEventListener('click', () => switchView('card'));

        // Filter tabs
        $('filterTabs').addEventListener('click', e => {
            const tab = e.target.closest('.filter-tab');
            if (tab) applyFilter(tab.dataset.filter);
        });

        // Bottom nav
        $('btnPrev').addEventListener('click', () => navigate(-1));
        $('btnNext').addEventListener('click', () => navigate(1));
        $('btnPlayMain').addEventListener('click', toggleMain);
        $('btnPlaySub').addEventListener('click', toggleSub);

        // Auto-stop or chain next sub when audio ends
        audioPlayer.addEventListener('ended', () => {
            if (subQueue.length > 0 && subQueueIndex < subQueue.length) {
                playNextSub();
            } else {
                subQueue = [];
                setPlayingState(null);
            }
        });

        // Keyboard
        document.addEventListener('keydown', handleKeyboard);

        // Swipe
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });

        // Initial render
        switchView('list');
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();