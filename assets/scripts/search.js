(function () {
  var indexCache = null;

  function loadIndex() {
    if (indexCache) return Promise.resolve(indexCache);
    return fetch('/assets/scripts/search-index.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { indexCache = data; return data; });
  }

  function matchScore(entry, q) {
    var title = entry.title.toLowerCase();
    var keywords = entry.keywords.toLowerCase();
    if (title.startsWith(q)) return 3;
    if (title.includes(q)) return 2;
    if (keywords.includes(q)) return 1;
    return 0;
  }

  function search(data, query, limit) {
    var q = query.trim().toLowerCase();
    if (!q) return [];
    return data
      .map(function (entry) { return { entry: entry, score: matchScore(entry, q) }; })
      .filter(function (r) { return r.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, limit || 8)
      .map(function (r) { return r.entry; });
  }

  function attachAutocomplete(input, dropdown) {
    if (!input || !dropdown) return;

    function render(results) {
      dropdown.innerHTML = '';
      if (results.length === 0) {
        dropdown.classList.add('hidden');
        return;
      }
      results.forEach(function (r) {
        var a = document.createElement('a');
        a.href = r.url;
        a.className = 'block px-4 py-2 text-sm text-gray-800 hover:bg-primary-gray-100 border-b border-gray-100 last:border-b-0';
        a.textContent = r.title;
        dropdown.appendChild(a);
      });
      dropdown.classList.remove('hidden');
    }

    input.addEventListener('input', function () {
      var q = input.value;
      if (!q.trim()) {
        dropdown.classList.add('hidden');
        return;
      }
      loadIndex().then(function (data) {
        render(search(data, q, 8));
      });
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var q = input.value.trim();
        if (q) window.location.href = '/search.html#q=' + encodeURIComponent(q);
      }
    });

    document.addEventListener('click', function (e) {
      if (e.target !== input && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }

  window.ExcelSearch = { loadIndex: loadIndex, search: search, attachAutocomplete: attachAutocomplete };

  attachAutocomplete(document.getElementById('site-search-input'), document.getElementById('site-search-dropdown'));
  attachAutocomplete(document.getElementById('site-search-input-mobile'), document.getElementById('site-search-dropdown-mobile'));
})();
