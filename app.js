const data = window.SITE_DATA;
const state = {
  view: 'all',
  query: '',
  showMirrors: true,
};

const els = {
  search: document.getElementById('search'),
  toggles: [...document.querySelectorAll('[data-view]')],
  showMirrors: document.getElementById('showMirrors'),
  papersGrid: document.getElementById('papersGrid'),
  projectsGrid: document.getElementById('projectsGrid'),
  mirrorsGrid: document.getElementById('mirrorsGrid'),
  papersCount: document.getElementById('papersCount'),
  projectsCount: document.getElementById('projectsCount'),
  mirrorsCount: document.getElementById('mirrorsCount'),
  totalShown: document.getElementById('totalShown'),
  noResults: document.getElementById('noResults'),
};

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderBadge(text, cls = '') {
  return `<span class="badge ${cls}">${escapeHtml(text)}</span>`;
}

function paperCard(item) {
  const tags = item.tags.map(t => renderBadge(t)).join('');
  return `
    <article class="card reveal" data-kind="paper" data-search="${escapeHtml([item.title, item.version, item.status, item.summary, item.tags.join(' ')].join(' ')).toLowerCase()}">
      <div class="badges">
        ${renderBadge('Paper', 'featured')}
        ${item.primary ? renderBadge('Featured', 'featured') : ''}
        ${renderBadge(item.version)}
        ${renderBadge(item.status)}
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="desc">${escapeHtml(item.summary)}</p>
      <div class="badges">${tags}</div>
      <div class="card-actions">
        <a class="primary" href="${escapeHtml(item.pdf)}" target="_blank" rel="noreferrer">Open PDF</a>
        <a href="${escapeHtml(item.tex)}" target="_blank" rel="noreferrer">Source</a>
      </div>
    </article>
  `;
}

function projectCard(item, isMirror = false) {
  const badges = [
    renderBadge(item.language),
    item.featured ? renderBadge('Featured', 'featured') : '',
    isMirror ? renderBadge('Mirror', 'mirror') : '',
    isMirror && item.upstream ? renderBadge(`Upstream: ${item.upstream}`, 'mirror') : '',
  ].join('');

  return `
    <article class="card reveal" data-kind="${isMirror ? 'mirror' : 'project'}" data-search="${escapeHtml([item.name, item.description, item.language, item.upstream || '', item.repoUrl].join(' ')).toLowerCase()}">
      <div class="badges">${badges}</div>
      <h3>${escapeHtml(item.name)}</h3>
      <p class="desc">${escapeHtml(item.description)}</p>
      <p class="meta">${isMirror ? 'Mirror / contribution repo' : 'Original project'} · ${escapeHtml(item.language)}</p>
      <div class="card-actions">
        <a class="primary" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Open repo</a>
        <a href="${escapeHtml(item.repoUrl)}" target="_blank" rel="noreferrer">GitHub</a>
      </div>
    </article>
  `;
}

function render() {
  els.papersGrid.innerHTML = data.papers.map(paperCard).join('');
  els.projectsGrid.innerHTML = data.projects.map(projectCard).join('');
  els.mirrorsGrid.innerHTML = data.mirrors.map(item => projectCard(item, true)).join('');

  els.papersCount.textContent = `${data.stats.papers} paper${data.stats.papers === 1 ? '' : 's'}`;
  els.projectsCount.textContent = `${data.stats.projects} original project${data.stats.projects === 1 ? '' : 's'}`;
  els.mirrorsCount.textContent = `${data.stats.mirrors} mirror${data.stats.mirrors === 1 ? '' : 's'}`;

  updateVisibility();
  updateCounts();
}

function updateActiveView() {
  els.toggles.forEach(btn => btn.dataset.active = String(btn.dataset.view === state.view));
}

function matchCard(card) {
  const search = state.query.trim().toLowerCase();
  const text = card.dataset.search || '';
  const kind = card.dataset.kind;
  const viewMatch =
    state.view === 'all' ? true :
    state.view === 'papers' ? kind === 'paper' :
    state.view === 'projects' ? kind === 'project' :
    state.view === 'mirrors' ? kind === 'mirror' : true;
  const mirrorMatch = state.showMirrors || kind !== 'mirror';
  const queryMatch = !search || text.includes(search);
  return viewMatch && mirrorMatch && queryMatch;
}

function updateVisibility() {
  document.querySelectorAll('.card[data-kind]').forEach(card => {
    card.style.display = matchCard(card) ? '' : 'none';
  });

  document.querySelectorAll('.section[data-section]').forEach(section => {
    const sectionKind = section.dataset.section;
    const shouldShow =
      state.view === 'all' ||
      (state.view === 'papers' && sectionKind === 'papers') ||
      (state.view === 'projects' && sectionKind === 'projects') ||
      (state.view === 'mirrors' && sectionKind === 'mirrors');
    section.style.display = shouldShow ? '' : 'none';
  });

  els.noResults.style.display = document.querySelectorAll('.card[data-kind]').length && [...document.querySelectorAll('.card[data-kind]')].some(matchCard)
    ? 'none'
    : '';
}

function updateCounts() {
  const visible = [...document.querySelectorAll('.card[data-kind]')].filter(matchCard).length;
  els.totalShown.textContent = `${visible} item${visible === 1 ? '' : 's'} visible`;
}

els.search.addEventListener('input', e => {
  state.query = e.target.value;
  updateVisibility();
  updateCounts();
});

els.showMirrors.addEventListener('change', e => {
  state.showMirrors = e.target.checked;
  updateVisibility();
  updateCounts();
});

els.toggles.forEach(btn => {
  btn.addEventListener('click', () => {
    state.view = btn.dataset.view;
    updateActiveView();
    updateVisibility();
    updateCounts();
    document.getElementById('index').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

render();
updateActiveView();
