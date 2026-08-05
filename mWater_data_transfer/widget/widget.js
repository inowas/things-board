self.onInit = function() {

    // ===== Your config device id (where the "datasets" attribute lives) =====
    var CONFIG_DEVICE_ID = "3cc473a0-877f-11f1-8ad4-33c0a4dccc58";
    // =======================================================================

    var root = self.ctx.$container ? self.ctx.$container[0] : document;
    var byId = function(id) { return root.querySelector('#' + id); };

    var datasets = [];
    var mode = 'single';

    function jwt() { return localStorage.getItem('jwt_token'); }

    function rawApi(path, method, body, token) {
        return fetch('/api/' + path, {
            method: method || 'GET',
            headers: { 'Content-Type': 'application/json', 'X-Authorization': 'Bearer ' + token },
            body: body ? JSON.stringify(body) : undefined
        });
    }

    function refreshToken() {
        return fetch('/api/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: localStorage.getItem('refresh_token') })
        }).then(function(r) {
            if (!r.ok) throw new Error('refresh failed');
            return r.json();
        }).then(function(d) {
            localStorage.setItem('jwt_token', d.token);
            if (d.refreshToken) localStorage.setItem('refresh_token', d.refreshToken);
            return d.token;
        });
    }

    // auto-refresh the JWT on 401 and retry once
    function api(path, method, body) {
        return rawApi(path, method, body, jwt()).then(function(r) {
            if (r.status !== 401) return r;
            return refreshToken()
                .then(function(nt) { return rawApi(path, method, body, nt); })
                .catch(function() { status('Session expired — reload the dashboard page', false); return r; });
        });
    }

    function status(msg, ok) {
        var s = byId('mw-status'); if (!s) return;
        s.textContent = msg;
        s.style.color = (ok === true) ? '#1a7f37' : (ok === false ? '#c0392b' : '#6b7280');
    }

    function esc(s) {
        return ('' + (s == null ? '' : s)).replace(/[&<>"]/g, function(c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }

    function setMode(m) {
        mode = m;
        byId('mw-mode-single').classList.toggle('active', m === 'single');
        byId('mw-mode-split').classList.toggle('active', m === 'split');
        byId('f-device').style.display = (m === 'single') ? '' : 'none';
        byId('f-prefix').style.display = (m === 'split') ? '' : 'none';
        byId('f-point').style.display  = (m === 'split') ? '' : 'none';
    }

    function targetLabel(d) {
        if (d.pointField) {
            return 'by "' + esc(d.pointField) + '"' + (d.device ? ' &middot; prefix "' + esc(d.device) + '"' : '');
        }
        return esc(d.device || '\u2014');
    }

    function render() {
        var tb = byId('mw-list'); tb.innerHTML = '';
        datasets.forEach(function(d, i) {
            var tr = document.createElement('tr');
            tr.innerHTML =
                '<td class="c"><input type="checkbox" class="mw-en" data-i="' + i + '" ' + (d.enabled !== false ? 'checked' : '') + '></td>' +
                '<td>' + targetLabel(d) + '</td>' +
                '<td>' + esc(d.dateField || 'Date') + '</td>' +
                '<td>' + esc(d.pointField || '\u2014') + '</td>' +
                '<td class="url" title="' + esc(d.url) + '">' + esc(d.url) + '</td>' +
                '<td class="c"><button class="del" data-i="' + i + '" title="Remove">&#10005;</button></td>';
            tb.appendChild(tr);
        });
        byId('mw-empty').style.display = datasets.length ? 'none' : '';
        Array.prototype.forEach.call(root.querySelectorAll('.mw-en'), function(cb) {
            cb.onchange = function() { datasets[+cb.getAttribute('data-i')].enabled = cb.checked; };
        });
        Array.prototype.forEach.call(root.querySelectorAll('.del'), function(b) {
            b.onclick = function() { datasets.splice(+b.getAttribute('data-i'), 1); render(); status('Removed — not saved yet'); };
        });
    }

    function load() {
        status('Loading...');
        api('plugins/telemetry/DEVICE/' + CONFIG_DEVICE_ID + '/values/attributes/SERVER_SCOPE?keys=datasets')
            .then(function(r) { return r.json(); })
            .then(function(arr) {
                var v = (arr && arr.length && arr[0]) ? arr[0].value : '[]';
                var parsed = (typeof v === 'string') ? JSON.parse(v || '[]') : v;
                datasets = Array.isArray(parsed) ? parsed : [];
                render(); status('Loaded ' + datasets.length + ' dataset(s)', true);
            })
            .catch(function(e) { datasets = []; render(); status('Load error: ' + e, false); });
    }

    function save() {
        status('Saving...');
        api('plugins/telemetry/DEVICE/' + CONFIG_DEVICE_ID + '/SERVER_SCOPE', 'POST', { datasets: JSON.stringify(datasets) })
            .then(function(r) {
                if (r.ok) status('Saved ' + datasets.length + ' dataset(s)', true);
                else r.text().then(function(t) { status('Save failed: ' + t, false); });
            })
            .catch(function(e) { status('Save error: ' + e, false); });
    }

    byId('mw-mode-single').onclick = function() { setMode('single'); };
    byId('mw-mode-split').onclick = function() { setMode('split'); };

    byId('mw-add').onclick = function() {
        var url = byId('mw-url').value.trim();
        var df  = byId('mw-datefield').value.trim() || 'Date';
        if (!url) { status('Enter the mWater JSON URL', false); return; }

        var entry = { url: url, dateField: df, enabled: byId('mw-enabled').checked };

        if (mode === 'split') {
            var pf = byId('mw-pointfield').value.trim();
            if (!pf) { status('Point column is required in "Split by point"', false); return; }
            entry.pointField = pf;
            entry.device = byId('mw-prefix').value.trim();
        } else {
            var dev = byId('mw-device').value.trim();
            if (!dev) { status('Device name is required', false); return; }
            entry.device = dev;
            entry.pointField = '';
        }

        datasets.push(entry);
        byId('mw-device').value = ''; byId('mw-prefix').value = ''; byId('mw-pointfield').value = '';
        byId('mw-url').value = ''; byId('mw-datefield').value = ''; byId('mw-enabled').checked = true;
        render(); status('Added — press Save to apply');
    };

    byId('mw-save').onclick = save;
    byId('mw-reload').onclick = load;

    var help = byId('mw-help-modal');
    if (help) {
        byId('mw-help-btn').onclick = function() { help.style.display = 'flex'; };
        byId('mw-help-close').onclick = function() { help.style.display = 'none'; };
        help.onclick = function(e) { if (e.target === help) help.style.display = 'none'; };
    }

    setMode('single');
    if (CONFIG_DEVICE_ID === "PASTE_CONFIG_DEVICE_ID_HERE") status('Set CONFIG_DEVICE_ID in the widget JS first', false);
    else load();
};

self.onDataUpdated = function() {};
self.onResize = function() {};
self.onDestroy = function() {};
