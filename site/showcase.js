/* Fieldnote showcase v2 — every consumer number is measured, and says so. */
(function () {
  'use strict';

  var STATUS_CLASS = {
    'Passes this screen': 'tag-pass',
    'Review': 'tag-review',
    'Excluded — proximity rule': 'tag-excl',
    'Excluded — additional criteria': 'tag-excl'
  };
  var DOT = { 'Passes this screen': '#23a68a', 'Review': '#e0a106', 'Excluded — proximity rule': '#b46b5a',
              'Excluded — additional criteria': '#b46b5a' };

  var GLYPH = {
    retail: '<path d="M3 9l1.6-5h14.8L21 9v1.8a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 10.8z"/><rect x="4.6" y="14" width="14.8" height="6.4" rx="1.2"/>',
    edu: '<path d="M12 3.2 2.6 8 12 12.8 21.4 8z"/><path d="M6.4 11.6V16c0 1.7 2.5 3 5.6 3s5.6-1.3 5.6-3v-4.4"/>',
    play: '<circle cx="7" cy="6.4" r="2"/><path d="M7 8.4V19M3.6 12.4h6.8M14 6.6l6.4 10.8M14 17.4l6.4-10.8"/>',
    masjid: '<path d="M12 2.8c2.3 2.2 4.2 4.4 4.2 7.2H7.8c0-2.8 1.9-5 4.2-7.2z"/><path d="M6.2 10.6h11.6V20H6.2z"/><path d="M10.4 20v-4.4a1.6 1.6 0 0 1 3.2 0V20"/>',
    church: '<path d="M12 2.6V8M9.2 5.2h5.6"/><path d="M6.4 20V11l5.6-3 5.6 3v9z"/><path d="M10.6 20v-4.2a1.4 1.4 0 0 1 2.8 0V20"/>',
    cafe: '<path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 9h2a2.5 2.5 0 0 1 0 5h-2"/><path d="M4 21h14"/>',
    campus: '<path d="M3 20h18M5 20V9l7-5 7 5v11M9 20v-7h6v7"/>',
    transit_hub: '<rect x="4" y="4" width="16" height="13" rx="2"/><path d="M4 11h16M7 20v-3M17 20v-3"/><circle cx="8" cy="14" r="1"/><circle cx="16" cy="14" r="1"/>',
    public_building: '<path d="M3 20h18M5 20V10h14v10M8 10V6h8v4M10 20v-6h4v6"/>',
    public_area: '<path d="M12 3l5 7h-3l4 6H6l4-6H7z"/><path d="M12 16v5"/>',
    medical: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
    competitor: '<rect x="3" y="4" width="18" height="10" rx="1"/><path d="M8 20l4-6 4 6M12 14v-4"/>',
    chain: '<path d="M3 9l1.6-5h14.8L21 9v1.8a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 10.8z"/><path d="M8 14v7M16 14v7"/>'
  };

  // pins use the engine's kind names; retail/chain/supermarket share a glyph
  var LAYER_ORDER = ['retail', 'chain', 'cafe', 'campus', 'transit_hub', 'public_building', 'public_area',
                     'education', 'worship', 'medical'];
  var LAYER_LABEL = { retail: 'Retail', chain: 'Minimarket chains', cafe: 'Cafés', campus: 'Campuses',
                      transit_hub: 'Transit hubs', public_building: 'Public buildings',
                      public_area: 'Public areas', education: 'Education', worship: 'Worship',
                      medical: 'Medical' };
  var LAYER_STYLE = {
    retail: { color: '#8a6d00', icon: 'retail', label: function () { return 'Independent minimarket'; } },
    chain: { color: '#6d4c41', icon: 'chain', label: function () { return 'Minimarket chain'; } },
    education: { color: '#6a1b9a', icon: 'edu',
                 label: function (p) { return p.k === 'kindergarten' ? 'Kindergarten' : 'School'; } },
    cafe: { color: '#8d6e63', icon: 'cafe', label: function () { return 'Café'; } },
    campus: { color: '#6a1b9a', icon: 'campus', label: function () { return 'Campus'; } },
    transit_hub: { color: '#0277bd', icon: 'transit_hub', label: function () { return 'Transit hub'; } },
    public_building: { color: '#5d4037', icon: 'public_building', label: function () { return 'Public building'; } },
    public_area: { color: '#2e7d32', icon: 'public_area', label: function () { return 'Public area'; } },
    worship: { color: '#0d47a1', icon: 'masjid',
               label: function (p) { return p.k === 'church' ? 'Church' : 'Masjid'; } },
    medical: { color: '#00796b', icon: 'medical', label: function () { return 'Medical facility'; } }
  };
  var CHURCH_COLOR = '#5d4037';

  var D = null, map = null, layer = null, selected = null;
  var siteMap = null, siteGroups = {}, siteRings = null;
  var layers = { retail: true, chain: true, cafe: true, campus: true, transit_hub: true, public_building: true,
                 public_area: true, education: true, worship: true, medical: true,
                 ring: true, km: true };
  var filters = { city: '', district: '', status: '', radius: 500 };

  function statusOf(s) { return filters.radius === 100 ? (s.status100 || s.status) : s.status; }

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function cityName(id) {
    var c = D.cityList.filter(function (x) { return x.id === id; })[0];
    return c ? c.name : id;
  }
  function metres(v) { return v == null ? '—' : (Math.round(v * 10) / 10).toFixed(1) + ' m'; }
  function num(v) { return (v || 0).toLocaleString('en-US'); }

  // Foursquare carries placeholder names for unnamed stalls ("Toko \"tanpa nama\"").
  // Showing the category instead keeps the popup honest and searchable.
  function displayName(name, fallback) {
    if (!name) return fallback;
    if (/tanpa\s*nama|^\s*$/i.test(name)) return fallback + ' (unnamed stall)';
    return name;
  }

  function glyph(kind, color, size) {
    size = size || 14;
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="' + color +
      '" aria-hidden="true">' + GLYPH[kind] + '</svg>';
  }

  function pinIcon(glyphKind, color) {
    return L.divIcon({
      className: 'ss-pin',
      html: '<span style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;' +
            'border-radius:50%;background:#fff;border:2px solid ' + color + '">' +
            glyph(glyphKind, color, 12) + '</span>',
      iconSize: [22, 22], iconAnchor: [11, 11]
    });
  }

  function bucket(k) {
    if (k === 'retail_other' || k === 'supermarket') return 'retail';
    if (k === 'chain') return 'chain';
    if (k === 'school' || k === 'kindergarten') return 'education';
    if (k === 'masjid' || k === 'church') return 'worship';
    if (k === 'cafe' || k === 'campus' || k === 'transit_hub' || k === 'public_building'
        || k === 'public_area' || k === 'medical') return k;
    if (k === 'competitor_ooh') return 'competitor';
    return null;
  }

  function offset(lat, lon, bearingDeg, metresAway) {
    var R = 6371000, br = bearingDeg * Math.PI / 180, d = metresAway / R;
    var p1 = lat * Math.PI / 180, l1 = lon * Math.PI / 180;
    var p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(br));
    var l2 = l1 + Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(p1),
                             Math.cos(d) - Math.sin(p1) * Math.sin(p2));
    return [p2 * 180 / Math.PI, l2 * 180 / Math.PI];
  }

  function visible() {
    var list = D.sites.filter(function (s) {
      return (!filters.city || s.city === filters.city) &&
             (!filters.district || s.district === filters.district) &&
             (!filters.status || statusOf(s) === filters.status);
    }).sort(function (a, b) { return (a.rank || 0) - (b.rank || 0); });
    list.forEach(function (s, i) { s.scope_rank = i + 1; });
    return list;
  }

  function counts(list) {
    var c = { Pass: 0, Review: 0, Excluded: 0 };
    list.forEach(function (s) {
      var st = statusOf(s);
      if (st === 'Passes this screen') c.Pass++;
      else if (st === 'Review') c.Review++;
      else c.Excluded++;
    });
    return c;
  }

  function renderFilters() {
    var city = el('f-city');
    city.innerHTML = '<option value="">All cities</option>' + D.cityList.map(function (c) {
      return '<option value="' + esc(c.id) + '">' + esc(c.name) + ' (' + c.sites + ')</option>';
    }).join('');
    city.value = filters.city;
    var ds = D.districts.filter(function (d) { return !filters.city || d.city === filters.city; });
    el('f-district').innerHTML = '<option value="">All districts</option>' + ds.map(function (d) {
      return '<option value="' + esc(d.district) + '">' + esc(d.district) + '</option>';
    }).join('');
    el('f-district').value = filters.district;
    var list = visible(), c = counts(list);
    el('counts').innerHTML = '<span><b>' + list.length + '</b> sites</span>' +
      '<span><b>' + c.Pass + '</b> pass this screen</span>' +
      '<span><b>' + c.Review + '</b> review</span>' +
      '<span><b>' + c.Excluded + '</b> excluded</span>' +
      (filters.radius === 100
        ? '<span class="counts-note">Screening radius 100 m — user-selected distance criterion; 500 m is the baseline. Not a regulatory determination.</span>' : '') +
      (D.provisionalScores
        ? '<span class="counts-note">' + D.provisionalScores + ' provisional score' +
          (D.provisionalScores === 1 ? '' : 's') + ' · Pending inputs</span>' : '');
  }

  function renderMap() {
    if (!map) {
      map = L.map('map', {
        scrollWheelZoom: true, worldCopyJump: true,
        preferCanvas: true, renderer: L.canvas({ padding: 0.5 })
      }).setView([-6.9, 110.4], 6);
      var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
      }).addTo(map);
      var loaded = false;
      tiles.on('tileload', function () { loaded = true; });
      tiles.on('tileerror', function () {
        var cap = el('map-caption');
        if (cap && !loaded) cap.textContent = 'Basemap unavailable · site positions and their data still work.';
      });
      layer = L.layerGroup().addTo(map);
    }
    layer.clearLayers();
    var list = visible();
    list.forEach(function (s) {
      var st = statusOf(s);
      L.circleMarker([s.lat, s.lon], {
        radius: 5.5, weight: 1, color: DOT[st] || '#8a8a8a',
        fillColor: DOT[st] || '#8a8a8a', fillOpacity: 0.8
      }).bindPopup('<b>#' + (s.scope_rank || s.rank || '—') + ' · ' + esc(s.id) + '</b>' +
        (s.score && s.score.provisional ? ' <span class="prov">provisional</span>' : '') + esc(s.district) + '<br>' + esc(st) +
        (s.score ? '<br><b>' + s.score.total.toFixed(1) + '/45</b> measured consumer + road proxy' : '') +
        '<br><span style="opacity:.75">education ' + metres(s.nearby.education_m) +
        ' · retail 1 km ' + s.nearby.retail_1km + '</span>')
        .on('click', function () { showDetail(s); }).addTo(layer);
    });
    if (list.length) {
      map.fitBounds(L.latLngBounds(list.map(function (s) { return [s.lat, s.lon]; })).pad(0.15),
                    { maxZoom: 11 });
    }
  }

  var PAGE = 50, page = 1;

  function clearStaleDetail() {
    if (!selected) return;
    var still = visible().some(function (s) { return s.id === selected.id; });
    if (!still) {
      selected = null;
      var d = el('detail');
      d.classList.add('is-hidden');
      d.innerHTML = '';
      if (siteMap) { siteMap.remove(); siteMap = null; }
      return;
    }
    showDetail(selected);
  }

  function renderTable() {
    var list = visible();
    var pages = Math.max(1, Math.ceil(list.length / PAGE));
    if (page > pages) page = pages;
    var start = (page - 1) * PAGE;
    var slice = list.slice(start, start + PAGE);
    el('rows').innerHTML = slice.map(function (s) {
      return '<tr data-id="' + esc(s.id) + '">' +
        '<td class="num rankcell">#' + (s.scope_rank || s.rank || '—') +
          (s.score && s.score.provisional ? ' <span class="prov" title="Provisional rank — at least one input is coverage-unknown or the road proxy is unconfirmed">prov.</span>' : '') + '</td>' +
        '<td>' + esc(s.id) + '</td>' +
        '<td>' + esc(cityName(s.city)) + '</td>' +
        '<td>' + esc(s.district) + '</td>' +
        '<td><span class="tag ' + (STATUS_CLASS[statusOf(s)] || '') + '">' + esc(statusOf(s)) + '</span></td>' +
        '<td class="num">' + (s.score ? s.score.total.toFixed(1) : '—') + '</td>' +
        '<td class="num">' + metres(s.nearby.education_m) + '</td>' +
        '<td class="num">' + metres(s.nearby.playground_m) + '</td>' +
        '<td class="num">' + s.nearby.retail_1km + '</td></tr>';
    }).join('') || '<tr><td colspan="9">No sites match these filters.</td></tr>';

    el('pager').innerHTML = list.length
      ? '<button type="button" id="pg-prev"' + (page === 1 ? ' disabled' : '') + '>Previous</button>' +
        '<span>Showing ' + (start + 1).toLocaleString('en-US') + '–' +
        Math.min(start + PAGE, list.length).toLocaleString('en-US') + ' of ' +
        list.length.toLocaleString('en-US') + '</span>' +
        '<button type="button" id="pg-next"' + (page === pages ? ' disabled' : '') + '>Next</button>'
      : '<span>Showing 0 of 0</span>';
    var prev = el('pg-prev'), next = el('pg-next');
    if (prev) prev.onclick = function () { page--; renderTable(); };
    if (next) next.onclick = function () { page++; renderTable(); };
  }

  function stateNote(c) {
    if (c.state === 'scored_zero') return ' · assessed zero';
    if (c.state === 'coverage_unknown') return ' · coverage unknown';
    if (c.state === 'pending') return ' · Pending';
    return '';
  }

  // The v1 payload carries counts on score.components; return a safe default so a
  // missing label never blanks the whole detail panel.
  function compByKey(s, label) {
    var c = (s.score && s.score.components || []).filter(function (x) { return x.label === label; })[0];
    return c || { measured: 0, count_cap: 0, points: 0, max: 0, state: 'pending' };
  }

  function showDetail(s) {
    selected = s;
    var d = el('detail');
    d.classList.remove('is-hidden');
    var gap = s.coverage && s.coverage.state !== 'measured';
    d.innerHTML =
      '<h3>' + esc(s.id) + '</h3>' +
      '<p class="rankline"><b>Rank #' + (s.rank || '—') + '</b>' +
        (s.score && s.score.provisional ? ' <span class="prov">provisional</span>' : '') +
        ' of ' + D.sites.length.toLocaleString('en-US') + ' · #' + (s.rank_city || '—') + ' in ' +
        esc(cityName(s.city)) + '</p>' +
      (s.score && s.score.provisional
        ? '<p class="hint provnote">Modelled rank — Pending inputs: ' +
          esc((s.score.missing || []).join(', ')) + '. Not verified dominance.</p>' : '') +
      '<div class="meta">' + esc(cityName(s.city)) + ' · ' + esc(s.district) +
        ' · <span class="tag ' + (STATUS_CLASS[statusOf(s)] || '') + '">' + esc(statusOf(s)) + '</span>' +
        (filters.radius === 100 ? ' · <span class="radius-tag">100 m — user-selected distance criterion</span>' : '') + '</div>' +
      '<div class="grid">' +
        (s.score ? '<div class="block"><h4>Location attractiveness <span class="score-num">' +
          s.score.total.toFixed(1) + '/45</span></h4>' +
          '<p class="score-sub">consumer ' + s.score.consumer.toFixed(1) + ' (measured)' +
          (s.score.road_class
            ? ' · OSM ' + esc(s.score.road_class) + ' +' + s.score.road.toFixed(0) + ' (proxy)'
            : ' · road unconfirmed (Pending)') + '</p>' +
          '<ul>' + s.score.components.map(function (c2) {
            return '<li>' + esc(c2.label) + ': ' + c2.points.toFixed(2) + ' / ' + c2.max +
              ' <span class="meas">' + num(c2.measured) + ' POI, cap ' + c2.count_cap +
              (c2.nearest_m != null ? ', nearest ' + Math.round(c2.nearest_m) + ' m' : '') +
              (c2.portion != null ? ', portion ' + c2.portion.toFixed(1) : '') +
              stateNote(c2) + '</span></li>';
          }).join('') + '</ul>' +
          '<p class="hint" style="margin:6px 0 0">' +
          'Model <code>' + esc(s.score.model || 'sms-location-attractiveness-45-v1') + '</code>. ' +
          'Per category: allocation × (0,6 × proximity portion + 0,4 × min(count ÷ cap, 1)). ' +
          'Consumer totals 25 points maximum, plus a road proxy of up to 20, giving the score out of 45. ' +
          'Road proxy is the OSM functional class, not a traffic measurement. ' +
          'Counts: Foursquare OS Places 2025-02-06, 2 km disc.</p>' +
          '</div>' : '') +
        '<div class="block"><h4>Nearby, straight-line</h4><ul>' +
          '<li>Education unit: ' + metres(s.nearby.education_m) + '</li>' +
          '<li>Children’s play area: ' + metres(s.nearby.playground_m) + '</li>' +
          '<li>Place of worship: ' + metres(s.nearby.worship_m) + '</li>' +
          '<li>Medical facility: ' + metres(s.nearby.medical_m) + '</li></ul></div>' +
        '<div class="block"><h4>Retail within 1 km</h4>' +
          '<p class="score-sub">Context: ' + num(s.coverage && s.coverage.poi_2km) + ' POI of any kind within 2 km</p><ul>' +
          '<li>Indomaret (2 km): ' + num(compByKey(s, 'Indomaret').measured) +
            ' <span class="meas">cap ' + compByKey(s, 'Indomaret').count_cap + '</span></li>' +
          '<li>Alfamart (2 km): ' + num(compByKey(s, 'Alfamart').measured) +
            ' <span class="meas">cap ' + compByKey(s, 'Alfamart').count_cap + '</span></li>' +
          '<li>Cafés (2 km): ' + num(compByKey(s, 'Café').measured) +
            ' <span class="meas">cap ' + compByKey(s, 'Café').count_cap + '</span></li></ul></div>' +
        '<div class="block"><h4>Verify independently</h4>' +
          '<p style="margin:0 0 8px;font-size:13px">Open this spot in Google Maps on your phone and compare the ' +
          'named places below. We link out; we do not store Google content.</p>' +
          '<a class="verify" href="' + esc(s.verify_url) + '" target="_blank" rel="noopener noreferrer">' +
          'Open in Google Maps ↗</a>' +
          (gap ? '<p class="hint" style="margin:8px 0 0;color:#b46b5a">Coverage is thin here (' +
                 num(s.coverage.poi_2km) + ' POI within 2 km). Treat this row as coverage unknown, not as a zero.</p>' : '') +
        '</div>' +
      '</div>' +
      '<div class="block mapblock">' +
        '<h4>Nearby map layers <span class="cap">' + (s.pins || []).length + ' real POIs plotted</span></h4>' +
        '<div class="chips" id="site-map-layers" role="group" aria-label="Map layers">' +
          LAYER_ORDER.map(function (k) {
            var st = LAYER_STYLE[k];
            return '<button type="button" class="mapchip' + (layers[k] ? ' is-on' : '') +
              '" data-layer="' + k + '" aria-pressed="' + (layers[k] ? 'true' : 'false') + '">' +
              glyph(st.icon, st.color, 14) + '<span>' + LAYER_LABEL[k] + '</span></button>';
          }).join('') +
          '<button type="button" class="mapchip mapchip--ring' + (layers.ring ? ' is-on' : '') +
            '" data-ring="screen" aria-pressed="' + (layers.ring ? 'true' : 'false') + '">' +
            '<span class="ringdot" style="border-color:' + (filters.radius === 100 ? '#7b1fa2' : '#c62828') + '"></span>' +
            '<span>' + (filters.radius === 100 ? '100 m' : '500 m') + ' ring</span></button>' +
          '<button type="button" class="mapchip mapchip--ring' + (layers.km ? ' is-on' : '') +
            '" data-ring="km" aria-pressed="' + (layers.km ? 'true' : 'false') + '">' +
            '<span class="ringdot" style="border-color:#444"></span><span>1 km ring</span></button>' +
        '</div>' +
        '<div id="site-map" class="sitemap"></div>' +
        '<p class="hint">Pins are real POIs with their true distance and bearing from the rounded site ' +
        'position. Names come from Foursquare OS Places (Apache-2.0) — search the same name in Google Maps ' +
        'to confirm.</p>' +
      '</div>';
    drawSiteMap(s);
    d.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function drawSiteMap(s) {
    var host = el('site-map');
    if (!host || typeof L === 'undefined') return;
    if (siteMap) { siteMap.remove(); siteMap = null; }
    siteMap = L.map(host, { scrollWheelZoom: false }).setView([s.lat, s.lon], 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(siteMap);
    siteRings = {
      screen: L.circle([s.lat, s.lon], {
        radius: filters.radius,
        color: filters.radius === 100 ? '#7b1fa2' : '#c62828',
        weight: 1, dashArray: '4 3', fillOpacity: 0.05
      }),
      km: L.circle([s.lat, s.lon], { radius: 1000, color: '#444', weight: 1, fillOpacity: 0.03 })
    };
    if (layers.ring) siteRings.screen.addTo(siteMap);
    if (layers.km) siteRings.km.addTo(siteMap);
    L.circleMarker([s.lat, s.lon], { radius: 7, color: '#111', fillColor: '#111', fillOpacity: 1 })
      .bindPopup('<b>' + esc(s.id) + '</b>Selected site (rounded position)').addTo(siteMap);

    siteGroups = {};
    LAYER_ORDER.forEach(function (k) { siteGroups[k] = L.layerGroup(); });
    (s.pins || []).forEach(function (p) {
      var b = bucket(p.k);
      if (!b) return;
      var st = LAYER_STYLE[b], g = siteGroups[b];
      if (!g) return;
      var pos = offset(s.lat, s.lon, p.b, p.d);
      var iconGlyph = b === 'worship' ? (p.k === 'church' ? 'church' : 'masjid') : st.icon;
      var color = b === 'worship' ? (p.k === 'church' ? CHURCH_COLOR : LAYER_STYLE.worship.color) : st.color;
      L.marker(pos, { icon: pinIcon(iconGlyph, color) })
        .bindPopup('<b>' + esc(displayName(p.n, st.label(p))) + '</b>' + Math.round(p.d) + ' m · ' + esc(st.label(p)))
        .addTo(g);
    });
    LAYER_ORDER.forEach(function (k) { if (layers[k]) siteMap.addLayer(siteGroups[k]); });

    document.querySelectorAll('#site-map-layers button[data-layer]').forEach(function (btn) {
      btn.onclick = function () {
        var k = btn.dataset.layer;
        layers[k] = !layers[k];
        btn.classList.toggle('is-on', layers[k]);
        btn.setAttribute('aria-pressed', layers[k] ? 'true' : 'false');
        if (!siteMap) return;
        if (layers[k]) siteMap.addLayer(siteGroups[k]);
        else siteMap.removeLayer(siteGroups[k]);
      };
    });
    document.querySelectorAll('#site-map-layers button[data-ring]').forEach(function (btn) {
      btn.onclick = function () {
        var k = btn.dataset.ring === 'screen' ? 'ring' : 'km';
        layers[k] = !layers[k];
        btn.classList.toggle('is-on', layers[k]);
        btn.setAttribute('aria-pressed', layers[k] ? 'true' : 'false');
        if (!siteMap || !siteRings) return;
        var circle = k === 'ring' ? siteRings.screen : siteRings.km;
        if (layers[k]) circle.addTo(siteMap);
        else siteMap.removeLayer(circle);
      };
    });
    setTimeout(function () { if (siteMap) siteMap.invalidateSize(); }, 80);
  }

  function renderGallery() {
    el('gallery').innerHTML = [1, 2, 3].map(function (n) {
      var f = 'survey-' + String(n).padStart(2, '0') + '.jpg';
      return '<figure><img src="photos/' + f + '" alt="Field survey photograph ' + n +
             ', identifying details blurred" loading="lazy" width="735" height="414">' +
             '<figcaption>Field survey photograph · identifying details blurred</figcaption></figure>';
    }).join('');
  }

  function switchTab(which) {
    var isMap = which === 'map';
    el('view-map').classList.toggle('is-hidden', !isMap);
    el('view-sites').classList.toggle('is-hidden', isMap);
    el('tab-map').classList.toggle('is-on', isMap);
    el('tab-sites').classList.toggle('is-on', !isMap);
    if (isMap && map) setTimeout(function () { map.invalidateSize(); }, 60);
  }

  function wire() {
    el('f-city').addEventListener('change', function (e) {
      filters.city = e.target.value; filters.district = ''; page = 1;
      renderFilters(); renderMap(); renderTable(); clearStaleDetail();
    });
    el('f-district').addEventListener('change', function (e) {
      filters.district = e.target.value; page = 1;
      renderFilters(); renderMap(); renderTable(); clearStaleDetail();
    });
    el('f-radius').addEventListener('change', function (e) {
      filters.radius = Number(e.target.value) === 100 ? 100 : 500;
      page = 1;
      renderFilters(); renderMap(); renderTable(); clearStaleDetail();
    });
    el('f-status').addEventListener('change', function (e) {
      filters.status = e.target.value; page = 1;
      renderFilters(); renderMap(); renderTable(); clearStaleDetail();
    });
    el('tab-map').addEventListener('click', function () { switchTab('map'); });
    el('tab-sites').addEventListener('click', function () { switchTab('sites'); });
    el('rows').addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-id]');
      if (!tr) return;
      var s = D.sites.filter(function (x) { return x.id === tr.dataset.id; })[0];
      if (s) showDetail(s);
    });
  }

  fetch('data/showcase.json')
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (data) {
      D = data;
      el('built').textContent = 'built ' + D.generated +
        (D.screened_on ? ' · survey screen ' + D.screened_on : '') +
        (D.score_version ? ' · ' + D.score_version : '');
      renderFilters(); renderMap(); renderTable(); renderGallery(); wire();
    })
    .catch(function (err) {
      el('map').innerHTML = '<p style="padding:20px">Showcase data unavailable: ' + esc(err.message) + '</p>';
    });
})();
