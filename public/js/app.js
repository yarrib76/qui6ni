const $filters = {
  year: document.querySelector('#filterYear'),
  month: document.querySelector('#filterMonth'),
  modalidad: document.querySelector('#filterModalidad'),
  numeroSorteo: document.querySelector('#filterDraw'),
  fechaDesde: document.querySelector('#filterFrom'),
  fechaHasta: document.querySelector('#filterTo')
};

const monthNames = [
  '',
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

if (window.DataTable?.ext) {
  window.DataTable.ext.errMode = 'none';
}
if (window.jQuery?.fn?.dataTable?.ext) {
  window.jQuery.fn.dataTable.ext.errMode = 'none';
}

function showAppError(message) {
  const alert = document.querySelector('#appError');
  alert.textContent = message;
  alert.classList.remove('d-none');
}

function clearAppError() {
  const alert = document.querySelector('#appError');
  alert.textContent = '';
  alert.classList.add('d-none');
}

function padNumber(value) {
  return String(value).padStart(2, '0');
}

function formatDate(value) {
  if (!value) return '-';
  return String(value).slice(0, 10).split('-').reverse().join('/');
}

function formatDateTime(value) {
  if (!value) return '-';
  return String(value).replace('T', ' ').slice(0, 19);
}

function ball(value) {
  return `<span class="ball">${padNumber(value)}</span>`;
}

function balls(row) {
  return `<span class="balls">${[row.numero1, row.numero2, row.numero3, row.numero4, row.numero5, row.numero6]
    .map(ball)
    .join('')}</span>`;
}

function queryFilters() {
  return Object.fromEntries(
    Object.entries($filters)
      .map(([key, element]) => [key, element.value])
      .filter(([, value]) => value)
  );
}

async function getJson(url, options) {
  const response = await fetch(url, options);
  const json = await response.json();
  if (!response.ok || json.success === false) {
    throw new Error(json.error || 'Solicitud fallida');
  }
  return json;
}

async function loadSummary() {
  clearAppError();
  const json = await getJson('/api/historico/resumen');
  const data = json.data;
  document.querySelector('#lastRun').textContent = formatDateTime(data.ultimaImportacion?.fecha_inicio);
  document.querySelector('#lastDraw').textContent = data.ultimoSorteo?.numeroSorteo || '-';
  document.querySelector('#lastDrawDate').textContent = formatDate(data.ultimoSorteo?.fechaSorteo);
  document.querySelector('#drawCount').textContent = data.totalSorteos;
  document.querySelector('#playCount').textContent = data.totalJugadas;
  document.querySelector('#lastStatus').textContent = data.estadoUltimaActualizacion || '-';
}

const table = new DataTable('#historicoTable', {
  serverSide: true,
  processing: true,
  pageLength: 25,
  ajax(data, callback) {
    clearAppError();
    const params = new URLSearchParams({
      draw: data.draw,
      start: data.start,
      length: data.length,
      search: data.search?.value || ''
    });

    const order = data.order?.[0];
    if (order) {
      params.set('order[0][column]', order.column);
      params.set('order[0][dir]', order.dir);
    }

    for (const [key, value] of Object.entries(queryFilters())) {
      params.set(key, value);
    }

    fetch(`/api/historico?${params}`)
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'No se pudo cargar el historico.');
        callback(json);
      })
      .catch((error) => {
        showAppError(error.message);
        callback({
          draw: data.draw,
          recordsTotal: 0,
          recordsFiltered: 0,
          data: []
        });
      });
  },
  order: [[2, 'desc']],
  columns: [
    { data: 'anio' },
    { data: 'mes', render: (value) => monthNames[value] || value },
    { data: 'fechaSorteo', render: formatDate },
    { data: 'numeroSorteo' },
    { data: 'modalidadNombre' },
    { data: 'numero1', render: ball, orderable: false },
    { data: 'numero2', render: ball, orderable: false },
    { data: 'numero3', render: ball, orderable: false },
    { data: 'numero4', render: ball, orderable: false },
    { data: 'numero5', render: ball, orderable: false },
    { data: 'numero6', render: ball, orderable: false },
    { data: 'fechaDescarga', render: formatDateTime }
  ],
  language: {
    url: 'https://cdn.datatables.net/plug-ins/2.1.8/i18n/es-ES.json'
  }
});

async function loadGroupedView() {
  const params = new URLSearchParams({
    page: '1',
    pageSize: '5000',
    all: '1',
    orderBy: 'fecha',
    orderDirection: 'DESC'
  });
  for (const [key, value] of Object.entries(queryFilters())) params.set(key, value);
  const json = await getJson(`/api/historico?${params}`);
  const root = document.querySelector('#groupedView');
  const grouped = new Map();

  for (const row of json.data) {
    const year = row.anio;
    const month = row.mes;
    const drawKey = `${row.fechaSorteo}|${row.numeroSorteo}`;
    if (!grouped.has(year)) grouped.set(year, new Map());
    if (!grouped.get(year).has(month)) grouped.get(year).set(month, new Map());
    if (!grouped.get(year).get(month).has(drawKey)) grouped.get(year).get(month).set(drawKey, []);
    grouped.get(year).get(month).get(drawKey).push(row);
  }

  root.innerHTML = Array.from(grouped.entries())
    .map(([year, months]) => `
      <details class="group-node">
        <summary>${year}</summary>
        ${Array.from(months.entries()).map(([month, draws]) => `
          <details class="group-node ms-3">
            <summary>${monthNames[month]}</summary>
            ${Array.from(draws.entries()).map(([drawKey, rows]) => {
              const [date, draw] = drawKey.split('|');
              return `
                <details class="group-node ms-3">
                  <summary>${formatDate(date)} - Sorteo ${draw}</summary>
                  ${rows.map((row) => `
                    <div class="draw-row">
                      <strong>${row.modalidadNombre}</strong>
                      <span>${balls(row)}</span>
                    </div>
                  `).join('')}
                </details>
              `;
            }).join('')}
          </details>
        `).join('')}
      </details>
    `)
    .join('') || '<p class="text-muted mb-0">No hay resultados para los filtros seleccionados.</p>';
}

function reloadViews() {
  clearAppError();
  table.ajax.reload();
  if (document.querySelector('#groupMode').checked) loadGroupedView();
}

for (const element of Object.values($filters)) {
  element.addEventListener('change', reloadViews);
}

document.querySelector('#clearFilters').addEventListener('click', () => {
  for (const element of Object.values($filters)) {
    element.value = '';
  }
  table.search('');
  reloadViews();
});

document.querySelector('#toggleSidebar').addEventListener('click', () => {
  document.querySelector('#sidebar').classList.toggle('collapsed');
});

document.querySelector('#tableMode').addEventListener('change', () => {
  document.querySelector('#tableView').classList.remove('d-none');
  document.querySelector('#groupedView').classList.add('d-none');
  table.ajax.reload();
});

document.querySelector('#groupMode').addEventListener('change', async () => {
  document.querySelector('#tableView').classList.add('d-none');
  document.querySelector('#groupedView').classList.remove('d-none');
  await loadGroupedView();
});

let pollTimer = null;

function setUpdating(updating) {
  document.querySelector('#updateButton').disabled = updating;
  document.querySelector('#updateSpinner').classList.toggle('d-none', !updating);
  document.querySelector('#updateButtonText').textContent = updating
    ? 'Actualizando historicos...'
    : 'Bajar historicos';
  document.querySelector('#statusPanel').classList.toggle('d-none', !updating);
}

async function pollStatus() {
  const json = await getJson('/api/historico/actualizacion/estado');
  const data = json.data;
  const progress = data.progress || {};
  const total = progress.total || 0;
  const processed = progress.processed || 0;
  const percent = total ? Math.min(100, Math.round((processed / total) * 100)) : 0;

  document.querySelector('#statusText').textContent = data.message || data.status;
  document.querySelector('#statusProgress').textContent = `${processed} / ${total}`;
  document.querySelector('#progressBar').style.width = `${percent}%`;
  document.querySelector('#statusDetails').textContent =
    `Insertados: ${progress.inserted || 0}. Jugadas: ${progress.jugadasInserted || 0}. ` +
    `Omitidos: ${progress.skipped || 0}. Errores: ${progress.errors || 0}.`;

  if (data.status !== 'EN_PROCESO') {
    clearInterval(pollTimer);
    pollTimer = null;
    setUpdating(false);
    await loadSummary();
    reloadViews();
  }
}

document.querySelector('#updateButton').addEventListener('click', async () => {
  try {
    setUpdating(true);
    await getJson('/api/historico/actualizar', { method: 'POST' });
    await pollStatus();
    pollTimer = setInterval(pollStatus, 2000);
  } catch (error) {
    setUpdating(false);
    showAppError(error.message);
  }
});

loadSummary().catch((error) => {
  console.error(error);
  showAppError(error.message);
});
