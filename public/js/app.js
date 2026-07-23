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

function formatDecimal(value, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : '-';
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

document.querySelectorAll('[data-section-link]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    document.querySelectorAll('[data-section-link]').forEach((item) => item.classList.remove('active'));
    link.classList.add('active');
    document.querySelector('#historicoSection').classList.add('d-none');
    document.querySelector('#statsSection').classList.add('d-none');
    document.querySelector('#generatorSection').classList.add('d-none');
    document.querySelector('#backtestingSection').classList.add('d-none');
    document.querySelector('#comparisonSection').classList.add('d-none');
    document.querySelector('#candidatesSection').classList.add('d-none');
    document.querySelector('#realPlaysSection').classList.add('d-none');
    document.querySelector(`#${link.dataset.sectionLink}`).classList.remove('d-none');
    if (link.dataset.sectionLink === 'statsSection' && !window.__statsLoaded) {
      analyzeStats();
      window.__statsLoaded = true;
    }
    if (link.dataset.sectionLink === 'generatorSection' && !window.__generatorLoaded) {
      loadGeneratedHistory();
      window.__generatorLoaded = true;
    }
    if (link.dataset.sectionLink === 'backtestingSection' && !window.__backtestingLoaded) {
      loadBacktestingRuns();
      window.__backtestingLoaded = true;
    }
    if (link.dataset.sectionLink === 'candidatesSection' && !window.__candidatesLoaded) {
      loadCandidates();
      window.__candidatesLoaded = true;
    }
    if (link.dataset.sectionLink === 'realPlaysSection' && !window.__realPlaysLoaded) {
      loadRealPlaysView();
      window.__realPlaysLoaded = true;
    }
  });
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

const $stats = {
  modalidad: document.querySelector('#statsModalidad'),
  periodoTipo: document.querySelector('#statsPeriod'),
  cantidadAnios: document.querySelector('#statsYears'),
  ultimosNSorteos: document.querySelector('#statsLastDraws'),
  fechaDesde: document.querySelector('#statsDateFrom'),
  fechaHasta: document.querySelector('#statsDateTo'),
  sorteoDesde: document.querySelector('#statsDrawFrom'),
  sorteoHasta: document.querySelector('#statsDrawTo'),
  nombre: document.querySelector('#statsName'),
  guardar: document.querySelector('#statsSave')
};

function statsPayload() {
  return {
    modalidad: $stats.modalidad.value,
    periodoTipo: $stats.periodoTipo.value,
    cantidadAnios: $stats.cantidadAnios.value || null,
    ultimosNSorteos: $stats.ultimosNSorteos.value || null,
    fechaDesde: $stats.fechaDesde.value || null,
    fechaHasta: $stats.fechaHasta.value || null,
    sorteoDesde: $stats.sorteoDesde.value || null,
    sorteoHasta: $stats.sorteoHasta.value || null,
    nombre: $stats.nombre.value || null,
    guardar: $stats.guardar.checked
  };
}

async function postJson(url, body, method = 'POST') {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await response.json();
  if (!response.ok || json.success === false) throw new Error(json.error || 'Solicitud fallida');
  return json;
}

async function analyzeStats() {
  clearAppError();
  const button = document.querySelector('#statsAnalyzeButton');
  button.disabled = true;
  button.textContent = 'Analizando...';
  try {
    const json = await postJson('/api/estadisticas/analizar', statsPayload());
    renderStats(json.data);
  } catch (error) {
    showAppError(error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Analizar';
  }
}

function renderStats(data) {
  const summary = data.summary;
  document.querySelector('#statsPlays').textContent = summary.jugadasAnalizadas;
  document.querySelector('#statsDraws').textContent = summary.sorteosAnalizados;
  document.querySelector('#statsRange').textContent = `${formatDate(summary.fechaDesde)} - ${formatDate(summary.fechaHasta)}`;
  document.querySelector('#statsExpected').textContent = formatDecimal(summary.frecuenciaEsperadaPorNumero, 2);
  document.querySelector('#statsDeviation').textContent = summary.mayorDesviacion
    ? `${padNumber(summary.mayorDesviacion.numero)} (${formatDecimal(summary.mayorDesviacion.zScore, 2)})`
    : '-';
  document.querySelector('#statsSaved').textContent = data.analisisId || '-';

  renderFrequency(data.frequencies);
  renderDeviations(data.frequencies);
  renderDistributions(data.distributions);
  renderPairs(data.pairs, data.trios);
  renderQuality(data.quality);
}

function renderFrequency(frequencies) {
  const max = Math.max(1, ...frequencies.map((row) => row.apariciones));
  document.querySelector('#statsFrequency').innerHTML = `
    <div class="table-responsive">
      <table class="table table-sm align-middle">
        <thead>
          <tr>
            <th>Numero</th><th>Apariciones</th><th>Esperado</th><th>Diferencia</th><th>%</th><th>Z-score</th><th>Ultima aparicion</th>
          </tr>
        </thead>
        <tbody>
          ${frequencies.map((row) => `
            <tr>
              <td>${ball(row.numero)}</td>
              <td>
                <div class="bar-cell">
                  <span class="bar-fill" style="width:${Math.round((row.apariciones / max) * 100)}%"></span>
                  <strong>${row.apariciones}</strong>
                </div>
              </td>
              <td>${formatDecimal(row.frecuenciaEsperada, 2)}</td>
              <td class="${row.diferenciaAbsoluta >= 0 ? 'text-success' : 'text-danger'}">${formatDecimal(row.diferenciaAbsoluta, 2)}</td>
              <td>${formatDecimal(row.diferenciaPorcentual, 1)}%</td>
              <td>${formatDecimal(row.zScore, 2)}</td>
              <td>${formatDate(row.ultimaAparicionFecha)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

function renderDeviations(frequencies) {
  const rows = [...frequencies]
    .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore) || a.numero - b.numero)
    .slice(0, 20);
  document.querySelector('#statsEvolution').innerHTML = `
    <div class="stats-list">
      ${rows.map((row) => `
        <div class="deviation-row">
          ${ball(row.numero)}
          <div>
            <strong>Z ${formatDecimal(row.zScore, 2)}</strong>
            <span>${row.apariciones} apariciones, esperado ${formatDecimal(row.frecuenciaEsperada, 2)}</span>
          </div>
        </div>
      `).join('')}
    </div>`;
}

function renderDistributions(distributions) {
  document.querySelector('#statsDistribution').innerHTML = `
    <div class="stats-columns">
      ${distributionBlock('Pares / impares', distributions.parity)}
      ${distributionBlock('Decenas', distributions.tens)}
      ${distributionBlock('Consecutivos', distributions.consecutive)}
      ${distributionBlock('Repetidos sorteo anterior', distributions.repeatedPrevious)}
      <div>
        <h2>Suma total</h2>
        <table class="table table-sm">
          <tbody>
            <tr><th>Promedio</th><td>${formatDecimal(distributions.sums.promedio, 2)}</td></tr>
            <tr><th>Minimo</th><td>${distributions.sums.minimo}</td></tr>
            <tr><th>Maximo</th><td>${distributions.sums.maximo}</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

function distributionBlock(title, rows) {
  return `
    <div>
      <h2>${title}</h2>
      <table class="table table-sm">
        <thead><tr><th>Grupo</th><th>Cantidad</th></tr></thead>
        <tbody>${rows.map((row) => `<tr><td>${row.clave}</td><td>${row.valor}</td></tr>`).join('')}</tbody>
      </table>
    </div>`;
}

function renderPairs(pairs, trios) {
  document.querySelector('#statsPairs').innerHTML = `
    <div class="stats-columns two">
      ${combinationBlock('Pares mas frecuentes', pairs)}
      ${combinationBlock('Trios mas frecuentes', trios)}
    </div>`;
}

function combinationBlock(title, rows) {
  return `
    <div>
      <h2>${title}</h2>
      <table class="table table-sm">
        <thead><tr><th>#</th><th>Numeros</th><th>Apariciones</th></tr></thead>
        <tbody>
          ${rows.slice(0, 25).map((row) => `
            <tr><td>${row.rankingApariciones}</td><td>${row.numeros}</td><td>${row.apariciones}</td></tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

function renderQuality(qualityRows) {
  document.querySelector('#statsQuality').innerHTML = `
    <div class="table-responsive">
      <table class="table table-sm">
        <thead>
          <tr><th>Anio</th><th>Sorteos</th><th>Jugadas</th><th>Desde</th><th>Hasta</th><th>Estado</th></tr>
        </thead>
        <tbody>
          ${qualityRows.map((row) => `
            <tr>
              <td>${row.anio}</td>
              <td>${row.sorteosDetectados}</td>
              <td>${row.jugadasDetectadas}</td>
              <td>${formatDate(row.fechaMinima)}</td>
              <td>${formatDate(row.fechaMaxima)}</td>
              <td><span class="status-badge ${row.estado.toLowerCase()}">${row.estado}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

document.querySelector('#statsAnalyzeButton').addEventListener('click', analyzeStats);

document.querySelectorAll('[data-stats-tab]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-stats-tab]').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    document.querySelectorAll('.stats-panel').forEach((panel) => panel.classList.add('d-none'));
    document.querySelector(`#${button.dataset.statsTab}`).classList.remove('d-none');
  });
});

const $generator = {
  modalidad: document.querySelector('#generatorModalidad'),
  estrategia: document.querySelector('#generatorStrategy'),
  periodoTipo: document.querySelector('#generatorPeriod'),
  cantidad: document.querySelector('#generatorCount'),
  ultimosNSorteos: document.querySelector('#generatorLastDraws'),
  cantidadAnios: document.querySelector('#generatorYears'),
  estado: document.querySelector('#generatorState'),
  fechaDesde: document.querySelector('#generatorDateFrom'),
  fechaHasta: document.querySelector('#generatorDateTo'),
  sorteoDesde: document.querySelector('#generatorDrawFrom'),
  sorteoHasta: document.querySelector('#generatorDrawTo'),
  guardar: document.querySelector('#generatorSave')
};

function generatorPayload() {
  return {
    modalidad: $generator.modalidad.value,
    estrategia: $generator.estrategia.value,
    periodoTipo: $generator.periodoTipo.value,
    cantidad: $generator.cantidad.value,
    ultimosNSorteos: $generator.ultimosNSorteos.value || null,
    cantidadAnios: $generator.cantidadAnios.value || null,
    estado: $generator.estado.value,
    fechaDesde: $generator.fechaDesde.value || null,
    fechaHasta: $generator.fechaHasta.value || null,
    sorteoDesde: $generator.sorteoDesde.value || null,
    sorteoHasta: $generator.sorteoHasta.value || null,
    guardar: $generator.guardar.checked
  };
}

async function generateNumbers() {
  clearAppError();
  const button = document.querySelector('#generatorButton');
  button.disabled = true;
  button.textContent = 'Generando...';
  try {
    const json = await postJson('/api/generador/generar', generatorPayload());
    renderGenerated(json.data);
    await loadGeneratedHistory();
  } catch (error) {
    showAppError(error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Generar';
  }
}

function renderGenerated(data) {
  document.querySelector('#generatorPlays').textContent = data.historicoUsado.jugadas;
  document.querySelector('#generatorDraws').textContent = data.historicoUsado.sorteos;
  document.querySelector('#generatorStrategyLabel').textContent = $generator.estrategia.options[$generator.estrategia.selectedIndex].text;
  document.querySelector('#generatorStateLabel').textContent = $generator.estado.value;
  document.querySelector('#generatedResults').innerHTML = data.combinaciones.map((combination) => `
    <article class="generated-card">
      <div class="generated-header">
        <strong>${combination.id ? `#${combination.id}` : 'Sin guardar'}</strong>
        <span>${combination.estado}</span>
      </div>
      <div class="generated-balls">${combination.numeros.map(ball).join('')}</div>
      <p>${combination.explicacion}</p>
      <small>Score: ${formatDecimal(combination.score, 2)}</small>
    </article>
  `).join('');
}

async function loadGeneratedHistory() {
  const json = await getJson('/api/generador/historial?page=1&pageSize=20');
  const body = document.querySelector('#generatedHistory tbody');
  body.innerHTML = json.data.map((row) => `
    <tr>
      <td>${row.id}</td>
      <td>${formatDateTime(row.createdAt)}</td>
      <td>${row.estado}</td>
      <td>${row.modalidad}</td>
      <td>${row.estrategia}</td>
      <td>${[row.numero1, row.numero2, row.numero3, row.numero4, row.numero5, row.numero6].map(ball).join('')}</td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="text-muted">No hay combinaciones guardadas.</td></tr>';
}

document.querySelector('#generatorButton').addEventListener('click', generateNumbers);

const $backtesting = {
  modalidad: document.querySelector('#backtestingModalidad'),
  estrategia: document.querySelector('#backtestingStrategy'),
  periodoTipo: document.querySelector('#backtestingPeriod'),
  ultimosNSorteos: document.querySelector('#backtestingLastDraws'),
  ventanaEntrenamiento: document.querySelector('#backtestingWindow'),
  combinacionesPorSorteo: document.querySelector('#backtestingCombos'),
  simulacionesAleatorias: document.querySelector('#backtestingRandomRuns'),
  fechaDesde: document.querySelector('#backtestingDateFrom'),
  fechaHasta: document.querySelector('#backtestingDateTo'),
  sorteoDesde: document.querySelector('#backtestingDrawFrom'),
  sorteoHasta: document.querySelector('#backtestingDrawTo'),
  nombre: document.querySelector('#backtestingName'),
  guardar: document.querySelector('#backtestingSave'),
  compararAleatoria: document.querySelector('#backtestingCompareRandom')
};

function backtestingPayload() {
  return {
    modalidad: $backtesting.modalidad.value,
    estrategia: $backtesting.estrategia.value,
    periodoTipo: $backtesting.periodoTipo.value,
    ultimosNSorteos: $backtesting.ultimosNSorteos.value || null,
    ventanaEntrenamiento: $backtesting.ventanaEntrenamiento.value,
    combinacionesPorSorteo: $backtesting.combinacionesPorSorteo.value,
    simulacionesAleatorias: $backtesting.simulacionesAleatorias.value,
    fechaDesde: $backtesting.fechaDesde.value || null,
    fechaHasta: $backtesting.fechaHasta.value || null,
    sorteoDesde: $backtesting.sorteoDesde.value || null,
    sorteoHasta: $backtesting.sorteoHasta.value || null,
    nombre: $backtesting.nombre.value || null,
    compararAleatoria: $backtesting.compararAleatoria.checked,
    guardar: $backtesting.guardar.checked
  };
}

async function executeBacktesting() {
  clearAppError();
  const button = document.querySelector('#backtestingButton');
  button.disabled = true;
  button.textContent = 'Ejecutando...';
  try {
    const json = await postJson('/api/backtesting/ejecutar', backtestingPayload());
    renderBacktesting(json.data);
    await loadBacktestingRuns();
  } catch (error) {
    showAppError(error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Ejecutar';
  }
}

function renderBacktesting(data) {
  document.querySelector('#backtestingDraws').textContent = data.summary.sorteosEvaluados;
  document.querySelector('#backtestingPlays').textContent = data.summary.jugadasGeneradas;
  document.querySelector('#backtestingAverage').textContent = formatDecimal(data.summary.promedioAciertos, 3);
  document.querySelector('#backtestingBest').textContent = data.summary.mejorAcierto;
  document.querySelector('#backtestingSaved').textContent = data.corridaId || '-';
  renderBacktestingComparison(data);

  const distribution = data.summary.distribucionAciertos;
  const max = Math.max(1, ...Object.values(distribution).map(Number));
  document.querySelector('#backtestingDistribution').innerHTML = Object.entries(distribution)
    .map(([hits, count]) => `
      <div class="hit-row">
        <strong>${hits} aciertos</strong>
        <div class="bar-cell"><span class="bar-fill" style="width:${Math.round((count / max) * 100)}%"></span><strong>${count}</strong></div>
      </div>
    `).join('');

  document.querySelector('#backtestingDetails tbody').innerHTML = data.details.map((row) => `
    <tr>
      <td>${row.numeroSorteo}</td>
      <td>${formatDate(row.fechaSorteo)}</td>
      <td>${row.combinacionIndex}</td>
      <td>${row.numeros.map(ball).join('')}</td>
      <td>${row.numerosSorteados.map(ball).join('')}</td>
      <td><strong>${row.aciertos}</strong></td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="text-muted">Sin resultados.</td></tr>';
}

function renderBacktestingComparison(data) {
  const panel = document.querySelector('#backtestingComparisonPanel');
  const root = document.querySelector('#backtestingComparison');
  if (!data.baseline) {
    panel.classList.add('d-none');
    root.innerHTML = '';
    return;
  }

  panel.classList.remove('d-none');
  const target = data.summary;
  const baseline = data.baseline.summary;
  root.innerHTML = `
    <div class="metric"><span>Estrategia</span><strong>${formatDecimal(target.promedioAciertos, 3)}</strong></div>
    <div class="metric"><span>Aleatoria promedio (${data.baseline.simulaciones})</span><strong>${formatDecimal(data.baseline.promedioPromedios, 3)}</strong></div>
    <div class="metric"><span>Diferencia promedio</span><strong class="${data.baseline.diferenciaPromedio >= 0 ? 'text-success' : 'text-danger'}">${formatDecimal(data.baseline.diferenciaPromedio, 3)}</strong></div>
    <div class="metric"><span>Percentil estrategia</span><strong>${formatDecimal(data.baseline.percentilEstrategia * 100, 1)}%</strong></div>
    <div class="metric"><span>Rango aleatorio</span><strong>${formatDecimal(data.baseline.promedioMinimo, 3)} - ${formatDecimal(data.baseline.promedioMaximo, 3)}</strong></div>
    <div class="metric"><span>Mejor aleatoria</span><strong>${data.baseline.mejorMinimo} - ${data.baseline.mejorMaximo}</strong></div>
  `;
}

async function loadBacktestingRuns() {
  const json = await getJson('/api/backtesting/corridas?page=1&pageSize=20');
  document.querySelector('#backtestingRuns tbody').innerHTML = json.data.map((row) => `
    <tr>
      <td>${row.id}</td>
      <td>${formatDateTime(row.createdAt)}</td>
      <td>${row.modalidad}</td>
      <td>${row.estrategia}</td>
      <td>${row.sorteosEvaluados}</td>
      <td>${formatDecimal(row.promedioAciertos, 3)}</td>
      <td>${row.mejorAcierto}</td>
    </tr>
  `).join('') || '<tr><td colspan="7" class="text-muted">No hay corridas guardadas.</td></tr>';
}

document.querySelector('#backtestingButton').addEventListener('click', executeBacktesting);

const $comparison = {
  modalidad: document.querySelector('#comparisonModalidad'),
  periodoTipo: document.querySelector('#comparisonPeriod'),
  ultimosNSorteos: document.querySelector('#comparisonLastDraws'),
  ventanaEntrenamiento: document.querySelector('#comparisonWindow'),
  combinacionesPorSorteo: document.querySelector('#comparisonCombos'),
  simulacionesAleatorias: document.querySelector('#comparisonRandomRuns'),
  fechaDesde: document.querySelector('#comparisonDateFrom'),
  fechaHasta: document.querySelector('#comparisonDateTo'),
  sorteoDesde: document.querySelector('#comparisonDrawFrom'),
  sorteoHasta: document.querySelector('#comparisonDrawTo')
};

function comparisonPayload() {
  return {
    modalidad: $comparison.modalidad.value,
    periodoTipo: $comparison.periodoTipo.value,
    ultimosNSorteos: $comparison.ultimosNSorteos.value || null,
    ventanaEntrenamiento: $comparison.ventanaEntrenamiento.value,
    combinacionesPorSorteo: $comparison.combinacionesPorSorteo.value,
    simulacionesAleatorias: $comparison.simulacionesAleatorias.value,
    fechaDesde: $comparison.fechaDesde.value || null,
    fechaHasta: $comparison.fechaHasta.value || null,
    sorteoDesde: $comparison.sorteoDesde.value || null,
    sorteoHasta: $comparison.sorteoHasta.value || null,
    estrategias: Array.from(document.querySelectorAll('#comparisonStrategies input:checked')).map(
      (input) => input.value
    )
  };
}

async function compareStrategies() {
  clearAppError();
  const button = document.querySelector('#comparisonButton');
  button.disabled = true;
  button.textContent = 'Comparando...';
  try {
    const json = await postJson('/api/comparacion/estrategias', comparisonPayload());
    renderComparison(json.data);
  } catch (error) {
    showAppError(error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Comparar';
  }
}

function renderComparison(data) {
  const best = data.ranking[0];
  document.querySelector('#comparisonRandomAverage').textContent = formatDecimal(
    data.baselineAleatoria.promedioPromedios,
    3
  );
  document.querySelector('#comparisonRandomRange').textContent = `${formatDecimal(
    data.baselineAleatoria.promedioMinimo,
    3
  )} - ${formatDecimal(data.baselineAleatoria.promedioMaximo, 3)}`;
  document.querySelector('#comparisonBestStrategy').textContent = best?.estrategia || '-';
  document.querySelector('#comparisonBestAverage').textContent = best
    ? formatDecimal(best.promedioAciertos, 3)
    : '0';

  document.querySelector('#comparisonTable tbody').innerHTML = data.ranking.map((row) => {
    const dist = row.distribucionAciertos || {};
    const fourPlus = Number(dist['4'] || 0) + Number(dist['5'] || 0) + Number(dist['6'] || 0);
    return `
      <tr>
        <td>${row.ranking}</td>
        <td>${row.estrategia}</td>
        <td><strong>${formatDecimal(row.promedioAciertos, 3)}</strong></td>
        <td class="${row.diferenciaContraAleatoria >= 0 ? 'text-success' : 'text-danger'}">${formatDecimal(row.diferenciaContraAleatoria, 3)}</td>
        <td>${formatDecimal(row.percentilContraAleatoria * 100, 1)}%</td>
        <td>${row.mejorAcierto}</td>
        <td>${dist['0'] || 0}</td>
        <td>${dist['1'] || 0}</td>
        <td>${dist['2'] || 0}</td>
        <td>${dist['3'] || 0}</td>
        <td>${fourPlus}</td>
      </tr>
    `;
  }).join('');
}

document.querySelector('#comparisonButton').addEventListener('click', compareStrategies);

const $candidates = {
  estado: document.querySelector('#candidateState'),
  modalidad: document.querySelector('#candidateModalidad'),
  estrategia: document.querySelector('#candidateStrategy')
};

function candidateQuery() {
  const params = new URLSearchParams({ page: '1', pageSize: '100' });
  if ($candidates.estado.value) params.set('estado', $candidates.estado.value);
  if ($candidates.modalidad.value) params.set('modalidad', $candidates.modalidad.value);
  if ($candidates.estrategia.value) params.set('estrategia', $candidates.estrategia.value);
  return params;
}

async function loadCandidates() {
  clearAppError();
  try {
    const json = await getJson(`/api/generador/historial?${candidateQuery()}`);
    renderCandidates(json.data);
  } catch (error) {
    showAppError(error.message);
  }
}

function renderCandidates(rows) {
  document.querySelector('#candidatesTable tbody').innerHTML = rows.map((row) => `
    <tr>
      <td>${row.id}</td>
      <td>${formatDateTime(row.createdAt)}</td>
      <td><span class="status-badge ${String(row.estado).toLowerCase()}">${row.estado}</span></td>
      <td>${row.modalidad}</td>
      <td>${row.estrategia}</td>
      <td>${[row.numero1, row.numero2, row.numero3, row.numero4, row.numero5, row.numero6].map(ball).join('')}</td>
      <td>${row.observaciones || ''}</td>
      <td>
        <div class="candidate-actions">
          <button class="btn btn-sm btn-outline-secondary" data-candidate-action="CANDIDATA" data-id="${row.id}">Candidata</button>
          <button class="btn btn-sm btn-outline-primary" data-candidate-action="SELECCIONADA" data-id="${row.id}">Seleccionar</button>
          <button class="btn btn-sm btn-outline-secondary" data-candidate-action="SIMULADA" data-id="${row.id}">Simulada</button>
          <button class="btn btn-sm btn-outline-danger" data-candidate-action="ANULADA" data-id="${row.id}">Anular</button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="8" class="text-muted">No hay combinaciones para los filtros seleccionados.</td></tr>';
}

async function updateCandidateState(id, estado) {
  const observaciones = window.prompt('Observaciones (opcional):', '') || '';
  try {
    await postJson(`/api/generador/${id}/estado`, { estado, observaciones }, 'PATCH');
    await loadCandidates();
    await loadGeneratedHistory();
  } catch (error) {
    showAppError(error.message);
  }
}

document.querySelector('#candidatesRefreshButton').addEventListener('click', loadCandidates);
Object.values($candidates).forEach((element) => element.addEventListener('change', loadCandidates));
document.querySelector('#candidatesTable').addEventListener('click', (event) => {
  const button = event.target.closest('[data-candidate-action]');
  if (!button) return;
  updateCandidateState(button.dataset.id, button.dataset.candidateAction);
});

const $realPlays = {
  estado: document.querySelector('#realPlayState'),
  modalidad: document.querySelector('#realPlayModalidad')
};

function realPlayQuery() {
  const params = new URLSearchParams({ page: '1', pageSize: '100' });
  if ($realPlays.estado.value) params.set('estado', $realPlays.estado.value);
  if ($realPlays.modalidad.value) params.set('modalidad', $realPlays.modalidad.value);
  return params;
}

async function loadRealPlaysView() {
  await Promise.all([loadSelectedForReal(), loadRealPlays()]);
}

async function loadSelectedForReal() {
  clearAppError();
  try {
    const params = new URLSearchParams({ page: '1', pageSize: '100', estado: 'SELECCIONADA' });
    const json = await getJson(`/api/generador/historial?${params}`);
    renderSelectedForReal(json.data);
  } catch (error) {
    showAppError(error.message);
  }
}

function renderSelectedForReal(rows) {
  document.querySelector('#selectedForRealTable tbody').innerHTML = rows.map((row) => `
    <tr>
      <td>${row.id}</td>
      <td>${formatDateTime(row.createdAt)}</td>
      <td>${row.modalidad}</td>
      <td>${row.estrategia}</td>
      <td>${[row.numero1, row.numero2, row.numero3, row.numero4, row.numero5, row.numero6].map(ball).join('')}</td>
      <td>
        <button class="btn btn-sm btn-primary" data-real-register-id="${row.id}">
          Registrar jugada
        </button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="text-muted">No hay combinaciones seleccionadas para registrar.</td></tr>';
}

async function loadRealPlays() {
  clearAppError();
  try {
    const json = await getJson(`/api/jugadas-reales?${realPlayQuery()}`);
    renderRealPlays(json.data);
  } catch (error) {
    showAppError(error.message);
  }
}

function renderRealPlays(rows) {
  document.querySelector('#realPlaysTable tbody').innerHTML = rows.map((row) => `
    <tr>
      <td>${row.id}</td>
      <td>${formatDate(row.fechaJugada)}</td>
      <td><span class="status-badge ${String(row.estado).toLowerCase()}">${row.estado}</span></td>
      <td>${row.sorteoObjetivo}</td>
      <td>${row.modalidad}</td>
      <td>${[row.numero1, row.numero2, row.numero3, row.numero4, row.numero5, row.numero6].map(ball).join('')}</td>
      <td><strong>${row.aciertos ?? '-'}</strong></td>
      <td>${(row.numerosAcertados || []).map(ball).join('') || '-'}</td>
      <td>${row.comprobante || '-'}</td>
    </tr>
  `).join('') || '<tr><td colspan="9" class="text-muted">No hay jugadas reales para los filtros seleccionados.</td></tr>';
}

async function registerRealPlay(combinacionId) {
  const sorteoObjetivo = window.prompt('Numero de sorteo objetivo de la boleta:');
  if (!sorteoObjetivo) return;
  const fechaJugada = window.prompt('Fecha de jugada (aaaa-mm-dd):', new Date().toISOString().slice(0, 10));
  if (!fechaJugada) return;
  const importe = window.prompt('Importe (opcional):', '') || null;
  const comprobante = window.prompt('Comprobante o referencia (opcional):', '') || null;
  const agencia = window.prompt('Agencia (opcional):', '') || null;
  const observaciones = window.prompt('Observaciones (opcional):', '') || null;

  try {
    await postJson(`/api/jugadas-reales/desde-combinacion/${combinacionId}`, {
      sorteoObjetivo,
      fechaJugada,
      importe,
      comprobante,
      agencia,
      observaciones
    });
    await loadRealPlaysView();
    await loadCandidates();
  } catch (error) {
    showAppError(error.message);
  }
}

async function evaluateRealPlays() {
  clearAppError();
  const button = document.querySelector('#evaluateRealPlaysButton');
  button.disabled = true;
  button.textContent = 'Evaluando...';
  try {
    const json = await postJson('/api/jugadas-reales/evaluar-pendientes', {});
    const data = json.data;
    window.alert(`Evaluacion terminada. Evaluadas: ${data.evaluadas}. Sin resultado cargado: ${data.sinResultado}.`);
    await loadRealPlays();
  } catch (error) {
    showAppError(error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Evaluar pendientes';
  }
}

document.querySelector('#realPlaysRefreshButton').addEventListener('click', loadRealPlaysView);
document.querySelector('#evaluateRealPlaysButton').addEventListener('click', evaluateRealPlays);
Object.values($realPlays).forEach((element) => element.addEventListener('change', loadRealPlays));
document.querySelector('#selectedForRealTable').addEventListener('click', (event) => {
  const button = event.target.closest('[data-real-register-id]');
  if (!button) return;
  registerRealPlay(button.dataset.realRegisterId);
});
