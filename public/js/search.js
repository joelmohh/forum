(function () {
    const API_BASE = '/api/search';
    const DEBOUNCE_MS = 250;
    const CACHE_TTL_MS = 5 * 60 * 1000;
    const CACHE_MAX_ENTRIES = 100;
    const RESULT_LIMIT = 5;

    const cache = new Map();


    const wrapperState = new WeakMap();

    let debounceTimer = null;
    let activeAbortController = null;
    let activeWrapper = null;

    function normalizeKey(query) {
        return query.trim().toLowerCase();
    }

    function debounce(fn, delay) {
        return (...args) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => fn(...args), delay);
        };
    }

    function escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }


    function setCacheEntry(key, entry) {
        if (cache.has(key)) cache.delete(key);
        cache.set(key, { ...entry, cachedAt: Date.now() });
        if (cache.size > CACHE_MAX_ENTRIES) {
            const oldestKey = cache.keys().next().value;
            cache.delete(oldestKey);
        }
    }

    function getCacheEntry(key) {
        const entry = cache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
            cache.delete(key);
            return null;
        }
        return entry;
    }

    function isExhaustive(entry) {
        return entry.totals.users <= entry.users.length
            && entry.totals.tags <= entry.tags.length
            && entry.totals.questions <= entry.questions.length;
    }

    function findExhaustivePrefixEntry(key) {
        for (let len = key.length - 1; len >= 1; len--) {
            const prefixKey = key.slice(0, len);
            const entry = getCacheEntry(prefixKey);
            if (entry && isExhaustive(entry) && key.startsWith(prefixKey)) {
                return entry;
            }
        }
        return null;
    }

    function filterLocally(entry, key) {
        const matches = (field) => (field || '').toLowerCase().includes(key);
        const users = entry.users.filter(u => matches(u.username) || matches(u.displayName));
        const tags = entry.tags.filter(t => matches(t.name));
        const questions = entry.questions.filter(q => matches(q.title));
        return {
            users, tags, questions,
            totals: { users: users.length, tags: tags.length, questions: questions.length }
        };
    }

    
    function signatureOf(data) {
        const ids = (arr) => arr.map(x => x._id).join(',');
        return `${ids(data.users)}|${ids(data.tags)}|${ids(data.questions)}`;
    }

    

    function userItem(u) {
        return `
            <a href="/users/${u._id}" class="global-search-item">
                <img src="${escapeHtml(u.profilePicture)}" class="global-search-avatar" alt="">
                <div class="global-search-item-text">
                    <span class="global-search-item-title">${escapeHtml(u.displayName || u.username)}</span>
                    <span class="global-search-item-sub">@${escapeHtml(u.username)}</span>
                </div>
            </a>`;
    }

    function tagItem(t) {
        return `
            <a href="/tags/${t._id}" class="global-search-item">
                <span class="global-search-tag-icon"><i class="fa-solid fa-tag"></i></span>
                <div class="global-search-item-text">
                    <span class="global-search-item-title">${escapeHtml(t.name)}</span>
                    <span class="global-search-item-sub">${t.postsCount ?? 0} questions</span>
                </div>
            </a>`;
    }

    function questionItem(q) {
        const author = q.creator?.displayName || q.creator?.username || 'Unknown';
        return `
            <a href="/questions/${q._id}" class="global-search-item">
                <span class="global-search-tag-icon"><i class="fa-solid fa-circle-question"></i></span>
                <div class="global-search-item-text">
                    <span class="global-search-item-title">${escapeHtml(q.title)}</span>
                    <span class="global-search-item-sub">by ${escapeHtml(author)}</span>
                </div>
            </a>`;
    }

    function renderSection(title, itemsHtml) {
        if (!itemsHtml.length) return '';
        return `
            <div class="global-search-section">
                <div class="global-search-section-title">${title}</div>
                ${itemsHtml.join('')}
            </div>`;
    }

    function buildResultsHtml({ users, tags, questions }) {
        const html = [
            renderSection('Users', users.map(userItem)),
            renderSection('Tags', tags.map(tagItem)),
            renderSection('Questions', questions.map(questionItem))
        ].join('');

        return html || `<div class="global-search-empty">No results found.</div>`;
    }

    
    function renderIfChanged(wrapper, container, data) {
        const state = wrapperState.get(wrapper);
        const signature = signatureOf(data);

        container.classList.add('show');

        if (state && state.lastSignature === signature) {
            return; 
        }

        container.innerHTML = buildResultsHtml(data);
        wrapperState.set(wrapper, { ...state, lastSignature: signature });
    }

    function closeDropdown(wrapper, container) {
        container.classList.remove('show');
        container.innerHTML = '';
        wrapperState.set(wrapper, { lastKey: '', lastSignature: '', seq: (wrapperState.get(wrapper)?.seq || 0) });
    }

    

    async function fetchFromApi(query, signal) {
        const url = `${API_BASE}/global?search=${encodeURIComponent(query)}&limit=${RESULT_LIMIT}`;
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error(`Search API returned ${res.status}`);
        const json = await res.json();
        if (!json.ok) throw new Error('Search API returned ok:false');
        return json.data;
    }

    async function runSearch(rawQuery, wrapper, container) {
        const key = normalizeKey(rawQuery);
        if (!key) {
            closeDropdown(wrapper, container);
            return;
        }

        const state = wrapperState.get(wrapper) || { lastKey: '', lastSignature: '', seq: 0 };

        
        const exact = getCacheEntry(key);
        if (exact) {
            wrapperState.set(wrapper, { ...state, lastKey: key });
            renderIfChanged(wrapper, container, exact);
            return;
        }

        
        const prefixEntry = findExhaustivePrefixEntry(key);
        if (prefixEntry) {
            const derived = filterLocally(prefixEntry, key);
            setCacheEntry(key, derived);
            wrapperState.set(wrapper, { ...state, lastKey: key });
            renderIfChanged(wrapper, container, derived);
            return;
        }

        
        if (activeAbortController) activeAbortController.abort();
        activeAbortController = new AbortController();
        const { signal } = activeAbortController;

        const mySeq = state.seq + 1;
        wrapperState.set(wrapper, { ...state, lastKey: key, seq: mySeq });

        
        container.classList.add('show');

        try {
            const data = await fetchFromApi(key, signal);
            setCacheEntry(key, data);

            const currentState = wrapperState.get(wrapper);
            
            if (currentState.lastKey !== key || currentState.seq !== mySeq) return;

            renderIfChanged(wrapper, container, data);
        } catch (err) {
            if (err.name === 'AbortError') return;
            
            if (!container.innerHTML.trim()) {
                container.innerHTML = `<div class="global-search-empty">Something went wrong.</div>`;
            }
        }
    }

    const debouncedApiSearch = debounce(runSearch, DEBOUNCE_MS);

    function handleInput(query, wrapper, container) {
        const key = normalizeKey(query);
        if (!key) {
            closeDropdown(wrapper, container);
            return;
        }

        const exact = getCacheEntry(key);
        if (exact) {
            wrapperState.set(wrapper, { ...(wrapperState.get(wrapper) || {}), lastKey: key });
            renderIfChanged(wrapper, container, exact);
            return;
        }

        const prefixEntry = findExhaustivePrefixEntry(key);
        if (prefixEntry) {
            const derived = filterLocally(prefixEntry, key);
            setCacheEntry(key, derived);
            wrapperState.set(wrapper, { ...(wrapperState.get(wrapper) || {}), lastKey: key });
            renderIfChanged(wrapper, container, derived);
            return;
        }

        debouncedApiSearch(query, wrapper, container);
    }

    document.querySelectorAll('.global-search-wrapper').forEach(wrapper => {
        const input = wrapper.querySelector('.global-search-input');
        const results = wrapper.querySelector('.global-search-results');
        if (!input || !results) return;

        wrapperState.set(wrapper, { lastKey: '', lastSignature: '', seq: 0 });

        input.addEventListener('input', () => {
            activeWrapper = wrapper;
            handleInput(input.value, wrapper, results);
        });

        input.addEventListener('focus', () => {
            const key = normalizeKey(input.value);
            const cached = getCacheEntry(key);
            if (cached) renderIfChanged(wrapper, results, cached);
        });
    });

    document.addEventListener('click', (e) => {
        if (activeWrapper && !activeWrapper.contains(e.target)) {
            closeDropdown(activeWrapper, activeWrapper.querySelector('.global-search-results'));
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && activeWrapper) {
            closeDropdown(activeWrapper, activeWrapper.querySelector('.global-search-results'));
            activeWrapper.querySelector('.global-search-input')?.blur();
        }
    });
})();