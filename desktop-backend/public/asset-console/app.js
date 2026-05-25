const state = {
  token: localStorage.getItem('desktopAdminToken') || '',
  user: JSON.parse(localStorage.getItem('desktopAdminUser') || 'null'),
  features: null,
  activeView: 'dashboard',
  dashboard: null,
  assets: [],
  assetMeta: null,
  selectedAsset: null,
  histories: {
    verifications: null,
    transfers: null,
    rfid: null,
  },
  reports: null,
  filters: {
    assets: {
      page: 1,
      limit: 25,
      q: '',
      status: '',
      section: '',
      technician: '',
      sort: '-updatedAtSource',
      identifierType: '',
      identifierValue: '',
    },
    history: { page: 1, limit: 25 },
  },
  loading: {},
  errors: {},
  aborters: {},
};

const viewMeta = {
  dashboard: ['Asset Dashboard', 'Asset operations summary from desktop asset projections.'],
  assets: ['Asset Table', 'Paged asset records with identifier-aware filtering.'],
  detail: ['Asset Detail', 'Lifecycle, identifiers, verification, transfer, and RFID activity.'],
  sections: ['Sections', 'Asset counts and verification progress by section.'],
  technicians: ['Technicians', 'Assigned, verified, transferred, and pending assets by technician.'],
  verification: ['Verification', 'Asset-centric verification history and pending review.'],
  transfers: ['Transfers', 'Asset movement and section rotation history.'],
  rfid: ['RFID Operations', 'RFID activity metrics without exposing ingestion controls.'],
  reports: ['Reports', 'Asset-centric reporting projections.'],
};

const flagByView = {
  dashboard: 'dashboard',
  assets: 'lists',
  detail: 'detail',
  sections: 'sections',
  technicians: 'technicians',
  verification: 'verification',
  transfers: 'transfers',
  rfid: 'rfidOperations',
  reports: 'reporting',
};

const app = document.getElementById('app');

const h = (tag, attrs = {}, children = []) => {
  const el = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;
    if (key === 'className') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else el.setAttribute(key, value === true ? '' : String(value));
  });
  const normalizedChildren = Array.isArray(children) ? children : [children];
  normalizedChildren.forEach(child => {
    if (child === null || child === undefined) return;
    el.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return el;
};

const fmt = value => value === null || value === undefined || value === '' ? '-' : String(value);
const fmtDate = value => value ? new Date(value).toLocaleString() : '-';
const statusClass = value => {
  if (value === 'Healthy' || /^verified/i.test(value || '')) return 'ok';
  if (value === 'Repairable' || /pending/i.test(value || '')) return 'warn';
  if (value === 'Beyond Repair' || /missing|duplicate|unresolved/i.test(value || '')) return 'danger';
  return '';
};

const isFeatureEnabled = view => {
  if (!state.features?.assetUi?.enabled) return false;
  const flag = flagByView[view];
  return !flag || Boolean(state.features.assetUi[flag]);
};

const setLoading = (key, value) => {
  state.loading[key] = value;
  render();
};

const setError = (key, value) => {
  state.errors[key] = value ? String(value) : null;
};

const timed = async (name, fn) => {
  const start = performance.now();
  try {
    const result = await fn();
    sendMetric('ui_operation', { name, durationMs: Math.round(performance.now() - start), ok: true });
    return result;
  } catch (error) {
    sendMetric('ui_error', { name, durationMs: Math.round(performance.now() - start), error: error.message });
    throw error;
  }
};

const apiFetch = async (path, options = {}) => {
  const headers = new Headers(options.headers || {});
  if (state.token) headers.set('Authorization', `Bearer ${state.token}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(path, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Request failed: ${response.status}`);
  }
  return data;
};

const abortableFetch = async (key, path) => {
  if (state.aborters[key]) state.aborters[key].abort();
  const controller = new AbortController();
  state.aborters[key] = controller;
  return apiFetch(path, { signal: controller.signal });
};

const sendMetric = (event, payload = {}) => {
  if (!state.token) return;
  fetch('/api/features/ui-metrics', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${state.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event, view: state.activeView, ...payload }),
  }).catch(() => {});
};

const recordFeatureUsage = view => {
  if (!state.token) return;
  fetch('/api/features/usage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${state.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ feature: view, enabled: isFeatureEnabled(view) }),
  }).catch(() => {});
};

const loadFeatures = async () => {
  const result = await apiFetch('/api/features');
  state.features = result.features;
};

const login = async event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  setError('auth', null);
  try {
    const result = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: form.get('username'),
        password: form.get('password'),
      }),
    });
    state.token = result.token;
    state.user = result.user;
    localStorage.setItem('desktopAdminToken', result.token);
    localStorage.setItem('desktopAdminUser', JSON.stringify(result.user));
    await loadInitialData();
  } catch (error) {
    setError('auth', error.message);
    render();
  }
};

const logout = () => {
  localStorage.removeItem('desktopAdminToken');
  localStorage.removeItem('desktopAdminUser');
  state.token = '';
  state.user = null;
  render();
};

const loadDashboard = async () => {
  setLoading('dashboard', true);
  setError('dashboard', null);
  try {
    const result = await timed('dashboard.load', () => abortableFetch('dashboard', '/api/assets/dashboard'));
    state.dashboard = result.dashboard;
  } catch (error) {
    if (error.name !== 'AbortError') setError('dashboard', error.message);
  } finally {
    setLoading('dashboard', false);
  }
};

const assetQueryString = () => {
  const params = new URLSearchParams();
  Object.entries(state.filters.assets).forEach(([key, value]) => {
    if (key === 'identifierType' || key === 'identifierValue') return;
    if (value !== '') params.set(key, value);
  });
  return params.toString();
};

const loadAssets = async () => {
  const identifierType = state.filters.assets.identifierType;
  const identifierValue = state.filters.assets.identifierValue;
  setLoading('assets', true);
  setError('assets', null);
  try {
    if (identifierType && identifierValue) {
      const result = await timed('assets.resolveIdentifier', () =>
        abortableFetch('assets', `/api/assets/resolve?type=${encodeURIComponent(identifierType)}&value=${encodeURIComponent(identifierValue)}`));
      state.assets = result.resolved.map(item => item.asset).filter(Boolean);
      state.assetMeta = { page: 1, limit: state.assets.length, total: state.assets.length, totalPages: 1 };
    } else {
      const result = await timed('assets.list', () => abortableFetch('assets', `/api/assets?${assetQueryString()}`));
      state.assets = result.assets || [];
      state.assetMeta = result.meta;
    }
  } catch (error) {
    if (error.name !== 'AbortError') setError('assets', error.message);
  } finally {
    setLoading('assets', false);
  }
};

const loadAssetDetail = async assetId => {
  if (!assetId) return;
  setLoading('detail', true);
  setError('detail', null);
  try {
    const result = await timed('asset.detail', () => abortableFetch('detail', `/api/assets/${encodeURIComponent(assetId)}`));
    state.selectedAsset = result;
    state.activeView = 'detail';
    recordFeatureUsage('detail');
  } catch (error) {
    if (error.name !== 'AbortError') setError('detail', error.message);
  } finally {
    setLoading('detail', false);
  }
};

const loadHistory = async (kind, path) => {
  setLoading(kind, true);
  setError(kind, null);
  try {
    const result = await timed(`${kind}.load`, () => abortableFetch(kind, path));
    state.histories[kind] = result;
  } catch (error) {
    if (error.name !== 'AbortError') setError(kind, error.message);
  } finally {
    setLoading(kind, false);
  }
};

const loadReport = async type => {
  setLoading('reports', true);
  setError('reports', null);
  try {
    const result = await timed(`report.${type}`, () => abortableFetch('reports', `/api/assets/reports/${encodeURIComponent(type)}`));
    state.reports = result;
  } catch (error) {
    if (error.name !== 'AbortError') setError('reports', error.message);
  } finally {
    setLoading('reports', false);
  }
};

const debounce = (fn, ms = 350) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
};

const debouncedAssetSearch = debounce(() => {
  state.filters.assets.page = 1;
  loadAssets();
});

const loadInitialData = async () => {
  await loadFeatures();
  if (!state.features?.assetUi?.enabled) {
    render();
    return;
  }
  await Promise.allSettled([loadDashboard(), loadAssets()]);
  render();
};

const renderAuth = () => {
  app.replaceChildren(h('div', { className: 'auth-shell' }, [
    h('div', { className: 'auth-box' }, [
      h('h1', {}, 'Asset Operations Console'),
      h('p', { className: 'muted' }, 'Use your desktop admin credentials to access RFID asset operations.'),
      state.errors.auth ? h('p', { className: 'error' }, state.errors.auth) : null,
      h('form', { className: 'auth-form', onsubmit: login }, [
        field('Username', h('input', { name: 'username', autocomplete: 'username', required: true })),
        field('Password', h('input', { name: 'password', type: 'password', autocomplete: 'current-password', required: true })),
        h('button', { className: 'button primary', type: 'submit' }, 'Sign in'),
      ]),
    ]),
  ]));
};

const field = (label, input) => h('div', { className: 'field' }, [h('label', {}, label), input]);
const panel = (title, body, actions = null) => h('section', { className: 'panel' }, [
  h('div', { className: 'panel-header' }, [h('h2', { className: 'panel-title' }, title), actions]),
  h('div', { className: 'panel-body' }, body),
]);
const metricCard = (label, value, note = '', className = '') => h('div', { className: 'card' }, [
  h('div', { className: 'metric-label' }, label),
  h('div', { className: `metric-value ${className}` }, fmt(value)),
  note ? h('div', { className: 'metric-note' }, note) : null,
]);
const pill = value => h('span', { className: `pill ${statusClass(value)}` }, fmt(value));

const table = (headers, rows, emptyText = 'No records found') => {
  if (!rows?.length) return h('div', { className: 'empty' }, emptyText);
  return h('div', { className: 'table-wrap' }, h('table', {}, [
    h('thead', {}, h('tr', {}, headers.map(header => h('th', {}, header)))),
    h('tbody', {}, rows),
  ]));
};

const renderDashboard = () => {
  if (state.loading.dashboard && !state.dashboard) return h('div', { className: 'loading' }, 'Loading asset dashboard...');
  if (state.errors.dashboard) return h('div', { className: 'error' }, state.errors.dashboard);
  const dash = state.dashboard || {};
  const summary = dash.summary || {};
  const rfid = dash.rfidActivity || {};
  return h('div', { className: 'grid' }, [
    h('div', { className: 'grid summary-grid' }, [
      metricCard('Total Assets', summary.totalAssets),
      metricCard('Healthy', summary.healthyAssets, 'Operational assets', 'ok'),
      metricCard('Repairable', summary.repairableAssets, 'Assets requiring repair', 'warn'),
      metricCard('Written Off', summary.writtenOffAssets, 'Beyond repair', 'danger'),
      metricCard('Verified', summary.verifiedAssets),
      metricCard('Transferred', summary.transferredAssets),
      metricCard('Active RFID', summary.activeRFIDAssets),
      metricCard('Unresolved IDs', rfid.unresolvedIdentifierCount, 'Unlinked RFID identifiers', 'danger'),
    ]),
    panel('RFID Activity', h('div', { className: 'grid summary-grid' }, [
      metricCard('RFID Events', rfid.totalEvents),
      metricCard('Last 24h', rfid.eventsLast24Hours),
      metricCard('Duplicates', rfid.duplicateEvents),
      metricCard('Reader Sessions', rfid.activeReaderSessions),
    ])),
    panel('Section Summary', renderSectionCards(dash.sections || [])),
    panel('Technician Summary', renderTechnicianCards(dash.technicians || [])),
    panel('Recently Scanned', renderRfidEventTable(dash.recentlyScannedAssets || [])),
  ]);
};

const renderSectionCards = sections => h('div', { className: 'grid summary-grid' },
  (sections.length ? sections : [{ sectionName: 'No sections', assetCount: 0 }]).map(section => metricCard(
    section.sectionName,
    section.assetCount,
    `${section.verificationProgress || 0}% verified | ${section.repairableCount || 0} repairable`,
  )));

const renderTechnicianCards = technicians => h('div', { className: 'grid summary-grid' },
  (technicians.length ? technicians : [{ technicianName: 'No technician activity', assignedAssets: 0 }]).map(tech => metricCard(
    tech.technicianName || tech.technicianId,
    tech.assignedAssets,
    `${tech.verifiedAssets || 0} verified | ${tech.pendingVerifications || 0} pending`,
  )));

const renderAssetTable = () => panel('Assets', h('div', { className: 'grid' }, [
  renderAssetFilters(),
  state.loading.assets ? h('div', { className: 'loading' }, 'Loading assets...') : null,
  state.errors.assets ? h('div', { className: 'error' }, state.errors.assets) : null,
  table(['Asset', 'Status', 'Section', 'Technician', 'Identifiers', 'Verification', 'Last Activity'], state.assets.map(asset =>
    h('tr', { onclick: () => loadAssetDetail(asset.assetId) }, [
      h('td', {}, [h('strong', {}, fmt(asset.assetName)), h('div', { className: 'muted' }, fmt(asset.assetNumber))]),
      h('td', {}, pill(asset.status)),
      h('td', {}, fmt(asset.currentSection || asset.section)),
      h('td', {}, fmt(asset.technician)),
      h('td', {}, (asset.identifiers || []).slice(0, 4).map(id => pill(id.type))),
      h('td', {}, pill(asset.verificationState)),
      h('td', {}, fmtDate(asset.lastSeenAt || asset.updatedAt)),
    ]))),
  renderPagination(state.assetMeta, page => {
    state.filters.assets.page = page;
    loadAssets();
  }),
]));

const renderAssetFilters = () => h('div', { className: 'toolbar' }, [
  field('Search', h('input', {
    value: state.filters.assets.q,
    placeholder: 'Name, number, section',
    oninput: event => { state.filters.assets.q = event.target.value; debouncedAssetSearch(); },
  })),
  field('Status', h('select', {
    onchange: event => { state.filters.assets.status = event.target.value; state.filters.assets.page = 1; loadAssets(); },
  }, ['', 'Healthy', 'Repairable', 'Beyond Repair'].map(value => h('option', { value, selected: state.filters.assets.status === value }, value || 'All')))),
  field('Section', h('input', {
    value: state.filters.assets.section,
    placeholder: 'Section',
    oninput: event => { state.filters.assets.section = event.target.value; debouncedAssetSearch(); },
  })),
  field('Technician', h('input', {
    value: state.filters.assets.technician,
    placeholder: 'Technician ID',
    oninput: event => { state.filters.assets.technician = event.target.value; debouncedAssetSearch(); },
  })),
  field('Identifier Type', h('select', {
    onchange: event => { state.filters.assets.identifierType = event.target.value; state.filters.assets.page = 1; debouncedAssetSearch(); },
  }, ['', 'RFID', 'EPC', 'BARCODE', 'QR', 'NFC'].map(value =>
    h('option', { value, selected: state.filters.assets.identifierType === value }, value || 'None')))),
  field('Identifier Value', h('input', {
    value: state.filters.assets.identifierValue,
    placeholder: 'Identifier',
    oninput: event => { state.filters.assets.identifierValue = event.target.value; state.filters.assets.page = 1; debouncedAssetSearch(); },
  })),
  h('button', { className: 'button', onclick: () => loadAssets() }, 'Refresh'),
]);

const renderPagination = (meta, onPage) => {
  if (!meta) return h('div');
  return h('div', { className: 'pagination' }, [
    h('button', { className: 'button', disabled: !meta.hasPreviousPage, onclick: () => onPage(meta.page - 1) }, 'Previous'),
    h('span', { className: 'muted' }, `Page ${meta.page} of ${meta.totalPages} | ${meta.total} records`),
    h('button', { className: 'button', disabled: !meta.hasNextPage, onclick: () => onPage(meta.page + 1) }, 'Next'),
  ]);
};

const renderDetail = () => {
  const detail = state.selectedAsset;
  return h('div', { className: 'grid' }, [
    panel('Load Asset', h('div', { className: 'toolbar' }, [
      field('Asset ID', h('input', { id: 'assetIdInput', placeholder: 'Desktop sourceAssetId' })),
      h('button', { className: 'button primary', onclick: () => loadAssetDetail(document.getElementById('assetIdInput').value) }, 'Load'),
    ])),
    state.loading.detail ? h('div', { className: 'loading' }, 'Loading asset detail...') : null,
    state.errors.detail ? h('div', { className: 'error' }, state.errors.detail) : null,
    detail ? renderAssetDetailPanels(detail) : h('div', { className: 'empty' }, 'Select an asset from the table or load by ID.'),
  ]);
};

const renderAssetDetailPanels = detail => {
  const asset = detail.asset;
  return h('div', { className: 'grid' }, [
    panel(asset.assetName || 'Asset Detail', h('div', { className: 'detail-grid' }, [
      metricCard('Asset Number', asset.assetNumber),
      metricCard('Status', asset.status),
      metricCard('Section', asset.currentSection || asset.section),
      metricCard('Technician', asset.technician),
      metricCard('Verification', asset.verificationState),
      metricCard('Last Seen', fmtDate(asset.lastSeenAt)),
    ])),
    panel('Identifiers', h('div', {}, (asset.identifiers || []).map(id => h('div', { className: 'card' }, [
      pill(id.type),
      h('strong', {}, ` ${id.value}`),
      h('div', { className: 'muted' }, `${id.active ? 'Active' : 'Inactive'} | Last seen ${fmtDate(id.lastSeenAt)}`),
    ])))),
    panel('Activity Timeline', renderTimeline([...(detail.history || []), ...(detail.transfers || []), ...(detail.verifications || [])])),
    panel('Recent RFID Events', renderRfidEventTable(detail.rfidEvents || [])),
  ]);
};

const renderTimeline = items => h('div', { className: 'timeline' },
  (items.length ? items : [{ type: 'None', eventAt: null }]).map(item => h('div', { className: 'timeline-item' }, [
    h('strong', {}, fmt(item.type || item.transferType || item.result)),
    h('div', { className: 'muted' }, fmtDate(item.eventAt || item.verifiedAt)),
    h('div', {}, [fmt(item.reason || item.fromSection || item.section), item.toSection ? ` -> ${item.toSection}` : '']),
  ])));

const renderRfidEventTable = events => table(['EPC', 'Status', 'Session', 'Device', 'Duplicate', 'Time'], events.map(event => h('tr', {}, [
  h('td', {}, fmt(event.epcRaw || event.epcKey)),
  h('td', {}, pill(event.mappingStatus)),
  h('td', {}, fmt(event.readerSessionId)),
  h('td', {}, fmt(event.deviceId)),
  h('td', {}, event.duplicateSuppressed ? pill('duplicate') : pill('unique')),
  h('td', {}, fmtDate(event.eventTimestamp)),
])), 'No RFID activity found');

const renderHistoryView = (kind, title, path, renderRows) => panel(title, h('div', { className: 'grid' }, [
  h('div', { className: 'toolbar' }, [
    field('Asset ID', h('input', { id: `${kind}Asset`, placeholder: 'Optional asset ID' })),
    field('From', h('input', { id: `${kind}From`, type: 'date' })),
    field('To', h('input', { id: `${kind}To`, type: 'date' })),
    h('button', { className: 'button primary', onclick: () => {
      const params = new URLSearchParams();
      const asset = document.getElementById(`${kind}Asset`).value;
      const from = document.getElementById(`${kind}From`).value;
      const to = document.getElementById(`${kind}To`).value;
      if (asset) params.set('assetId', asset);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      loadHistory(kind, `${path}?${params}`);
    } }, 'Apply'),
  ]),
  state.loading[kind] ? h('div', { className: 'loading' }, 'Loading...') : null,
  state.errors[kind] ? h('div', { className: 'error' }, state.errors[kind]) : null,
  renderRows(state.histories[kind]),
]));

const renderVerification = () => renderHistoryView('verifications', 'Verification History', '/api/assets/verifications', result =>
  table(['Asset', 'Section', 'Result', 'Audit', 'Verified By', 'Time'], (result?.verifications || []).map(item => h('tr', {}, [
    h('td', {}, fmt(item.assetId)),
    h('td', {}, fmt(item.section)),
    h('td', {}, pill(item.result)),
    h('td', {}, fmt(item.auditId)),
    h('td', {}, fmt(item.verifiedBy)),
    h('td', {}, fmtDate(item.verifiedAt)),
  ]))));

const renderTransfers = () => renderHistoryView('transfers', 'Transfer History', '/api/assets/transfers', result =>
  table(['Asset', 'From', 'To', 'Type', 'Actor', 'Time'], (result?.transfers || []).map(item => h('tr', {}, [
    h('td', {}, fmt(item.assetId)),
    h('td', {}, fmt(item.fromSection)),
    h('td', {}, fmt(item.toSection)),
    h('td', {}, fmt(item.transferType)),
    h('td', {}, fmt(item.actorId)),
    h('td', {}, fmtDate(item.eventAt)),
  ]))));

const renderRfidOps = () => renderHistoryView('rfid', 'RFID Operational Activity', '/api/assets/rfid-activity', result =>
  renderRfidEventTable(result?.events || []));

const renderSections = () => panel('Section Asset Dashboard', state.dashboard
  ? renderSectionCards(state.dashboard.sections || [])
  : h('button', { className: 'button', onclick: loadDashboard }, 'Load sections'));

const renderTechnicians = () => panel('Technician Asset Dashboard', state.dashboard
  ? renderTechnicianCards(state.dashboard.technicians || [])
  : h('button', { className: 'button', onclick: loadDashboard }, 'Load technicians'));

const renderReports = () => panel('Asset Reports', h('div', { className: 'grid' }, [
  h('div', { className: 'toolbar' }, [
    field('Report Type', h('select', { id: 'reportType' }, [
      'dashboard', 'snapshot', 'lifecycle', 'sections', 'technicians', 'transfers', 'verifications', 'rfid_operational', 'unresolved_identifiers', 'movement',
    ].map(type => h('option', { value: type }, type)))),
    h('button', { className: 'button primary', onclick: () => loadReport(document.getElementById('reportType').value) }, 'Generate'),
  ]),
  state.loading.reports ? h('div', { className: 'loading' }, 'Generating report...') : null,
  state.errors.reports ? h('div', { className: 'error' }, state.errors.reports) : null,
  state.reports ? h('pre', { className: 'report-output' }, JSON.stringify(state.reports, null, 2)) : h('div', { className: 'empty' }, 'Choose a report type.'),
]));

const renderCurrentView = () => {
  if (!isFeatureEnabled(state.activeView)) {
    return panel('Feature Disabled', h('p', {}, 'This RFID asset console feature is disabled by server-side feature flags.'));
  }
  switch (state.activeView) {
    case 'dashboard': return renderDashboard();
    case 'assets': return renderAssetTable();
    case 'detail': return renderDetail();
    case 'sections': return renderSections();
    case 'technicians': return renderTechnicians();
    case 'verification': return renderVerification();
    case 'transfers': return renderTransfers();
    case 'rfid': return renderRfidOps();
    case 'reports': return renderReports();
    default: return renderDashboard();
  }
};

const setView = view => {
  state.activeView = view;
  recordFeatureUsage(view);
  if (view === 'dashboard' && !state.dashboard) loadDashboard();
  if (view === 'assets' && !state.assets.length) loadAssets();
  render();
};

const renderShell = () => {
  const [title, subtitle] = viewMeta[state.activeView] || viewMeta.dashboard;
  const navItems = [
    ['dashboard', 'Dashboard'],
    ['assets', 'Assets'],
    ['detail', 'Details'],
    ['sections', 'Sections'],
    ['technicians', 'Technicians'],
    ['verification', 'Verification'],
    ['transfers', 'Transfers'],
    ['rfid', 'RFID Ops'],
    ['reports', 'Reports'],
  ];

  app.replaceChildren(h('div', { className: 'app-shell' }, [
    h('aside', { className: 'sidebar' }, [
      h('div', { className: 'brand' }, [
        h('h1', { className: 'brand-title' }, 'Asset Operations'),
        h('p', { className: 'brand-subtitle' }, 'Feature-flagged desktop migration console'),
      ]),
      h('nav', { className: 'nav' }, navItems.map(([view, label]) =>
        h('button', {
          className: `nav-button ${state.activeView === view ? 'active' : ''}`,
          onclick: () => setView(view),
          disabled: !isFeatureEnabled(view),
        }, label))),
    ]),
    h('main', { className: 'main' }, [
      h('header', { className: 'topbar' }, [
        h('div', {}, [h('h2', { className: 'topbar-title' }, title), h('p', { className: 'topbar-subtitle' }, subtitle)]),
        h('div', { className: 'toolbar' }, [
          h('span', { className: 'muted' }, state.user?.username || 'Admin'),
          h('button', { className: 'button', onclick: () => Promise.allSettled([loadDashboard(), loadAssets()]) }, 'Refresh'),
          h('button', { className: 'button danger', onclick: logout }, 'Sign out'),
        ]),
      ]),
      h('section', { className: 'content' }, renderCurrentView()),
    ]),
  ]));
};

const render = () => {
  const start = performance.now();
  if (!state.token) renderAuth();
  else renderShell();
  const duration = Math.round(performance.now() - start);
  if (duration > 50) sendMetric('slow_render', { durationMs: duration });
};

loadFeatures()
  .then(() => state.token ? loadInitialData() : render())
  .catch(error => {
    setError('auth', error.message);
    render();
  });
