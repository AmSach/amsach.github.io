import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const SITE = ROOT;
const DATA_JS = path.join(SITE, 'data.js');
const OUT_PAPERS = path.join(SITE, 'papers');
const OUT_PROJECTS = path.join(SITE, 'projects');
const ASSETS = path.join(SITE, 'assets');

function readSiteData() {
  const code = fs.readFileSync(DATA_JS, 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { timeout: 1000 });
  return sandbox.window.SITE_DATA;
}

function slugify(input) {
  return String(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

function titleCaseFromSlug(slug) {
  return slug
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function esc(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

function relativePrefix(depth) {
  return depth > 0 ? '../'.repeat(depth) : '';
}

function wrapLines(text, max = 28) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function buildOgSvg({ title, subtitle, kind }) {
  const lines = wrapLines(title, 24);
  const subtitleLines = wrapLines(subtitle, 42).slice(0, 2);
  const kindLabel = kind.toUpperCase();
  const titleText = lines.map((line, i) => `<text x="72" y="${170 + i * 58}" class="title">${esc(line)}</text>`).join('');
  const subtitleText = subtitleLines.map((line, i) => `<text x="72" y="${360 + i * 32}" class="subtitle">${esc(line)}</text>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="60" y1="40" x2="1140" y2="590" gradientUnits="userSpaceOnUse">
      <stop stop-color="#07111F"/>
      <stop offset="0.48" stop-color="#0A1628"/>
      <stop offset="1" stop-color="#050B14"/>
    </linearGradient>
    <radialGradient id="glowA" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(210 140) rotate(12) scale(250 250)">
      <stop stop-color="#78F0C1" stop-opacity="0.30"/>
      <stop offset="1" stop-color="#78F0C1" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(980 140) rotate(12) scale(260 260)">
      <stop stop-color="#9FA8FF" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#9FA8FF" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur" x="0" y="0" width="1200" height="630" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="30"/>
    </filter>
  </defs>
  <rect width="1200" height="630" rx="40" fill="url(#bg)"/>
  <circle cx="240" cy="160" r="180" fill="url(#glowA)" filter="url(#blur)"/>
  <circle cx="980" cy="170" r="190" fill="url(#glowB)" filter="url(#blur)"/>
  <rect x="62" y="58" width="1076" height="514" rx="32" fill="rgba(255,255,255,0.03)" stroke="rgba(177,208,255,0.16)"/>
  <path d="M84 510 C 216 442, 300 448, 408 396 C 506 346, 586 262, 650 250 C 724 236, 806 288, 900 242 C 979 204, 1038 146, 1104 122" stroke="rgba(120,240,193,0.35)" stroke-width="3" fill="none"/>
  <text x="72" y="112" class="kind">${kindLabel} INDEX</text>
  ${titleText}
  ${subtitleText}
  <text x="72" y="524" class="footer">Aman Sachan • GitHub Pages research hub • public papers and projects</text>
  <circle cx="1034" cy="456" r="66" fill="rgba(120,240,193,0.10)" stroke="rgba(120,240,193,0.24)"/>
  <path d="M1010 461 L1033 432 L1058 461 L1033 486 Z" fill="rgba(233,242,255,0.95)"/>
  <style>
    .kind { font: 600 20px Inter, Arial, sans-serif; letter-spacing: 0.34em; fill: #A2B5D1; }
    .title { font: 800 54px Inter, Arial, sans-serif; letter-spacing: -0.05em; fill: #F3F7FF; }
    .subtitle { font: 400 26px Inter, Arial, sans-serif; fill: rgba(233,242,255,0.74); }
    .footer { font: 500 20px Inter, Arial, sans-serif; fill: rgba(233,242,255,0.64); }
  </style>
</svg>`;
}

function pageShell({ title, description, prefix = '', ogTitle = title, ogDescription = description, kind = 'page', body }) {
  const ogSvg = `${prefix}og.svg`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${esc(description)}" />
    <meta name="theme-color" content="#07111f" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${esc(ogTitle)}" />
    <meta property="og:description" content="${esc(ogDescription)}" />
    <meta property="og:image" content="${esc(ogSvg)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(ogTitle)}" />
    <meta name="twitter:description" content="${esc(ogDescription)}" />
    <meta name="twitter:image" content="${esc(ogSvg)}" />
    <title>${esc(title)}</title>
    <link rel="icon" type="image/png" href="${prefix}assets/icon.png" />
    <link rel="stylesheet" href="${prefix}styles.css" />
  </head>
  <body data-page-kind="${esc(kind)}">
    ${body}
  </body>
</html>`;
}

function topbar(prefix, active = '') {
  const item = (href, label, key) => `<a ${active === key ? 'data-active="true"' : ''} href="${prefix}${href}">${label}</a>`;
  return `
<header class="topbar">
  <a class="brand" href="${prefix}index.html">
    <img src="${prefix}assets/pegasus.svg" alt="Pegasus logo" />
    <div class="brand-text">
      <strong>Aman Sachan</strong>
      <span>papers • projects • research index</span>
    </div>
  </a>
  <nav class="nav">
    ${item('index.html', 'Home', 'home')}
    ${item('papers/', 'Papers', 'papers')}
    ${item('projects/', 'Projects', 'projects')}
    <a href="https://github.com/AmSach" target="_blank" rel="noreferrer">GitHub</a>
  </nav>
</header>`;
}

function badge(text, cls = '') {
  return `<span class="badge ${cls}">${esc(text)}</span>`;
}

function paperSlug(paper) {
  return slugify(path.basename(paper.pdf, path.extname(paper.pdf)));
}

function projectSlug(project) {
  return slugify(project.name);
}

function paperHighlights() {
  return [
    'Adaptive mixed-precision cache compression',
    'Recency-aware bit allocation',
    'Sink-aware reservation for stable anchors',
    'Head/layer coupling for finer precision control',
    'Explicit metadata for invertibility and auditing',
    'Forward-pass wrapping for drop-in use'
  ];
}

function projectHighlights(project) {
  const highlights = [];
  highlights.push(project.fork ? `Mirror of ${project.upstream || 'an upstream project'}` : 'Original project from Aman Sachan');
  highlights.push(`Primary language: ${project.language}`);
  if (project.stars !== undefined) highlights.push(`${project.stars} GitHub stars recorded in the snapshot`);
  if (project.description && project.description !== 'No public description yet.') highlights.push(project.description);
  return highlights.slice(0, 6);
}

function detailStats(items) {
  return items.map(item => `<div class="stat"><strong>${esc(item.value)}</strong><span>${esc(item.label)}</span></div>`).join('');
}

function infoList(items) {
  return items.map(item => `<div class="mini-item"><div><strong>${esc(item.label)}</strong><span>${esc(item.value)}</span></div></div>`).join('');
}

function paperDetailPage(paper, others) {
  const slug = paperSlug(paper);
  const prefix = '../../';
  const title = `${paper.title} — Aman Sachan`;
  const description = paper.summary;
  const keyHighlights = paperHighlights();
  const related = others.filter(item => paperSlug(item) !== slug).slice(0, 3);
  const pdfHref = `${prefix}${paper.pdf}`;
  const texHref = `${prefix}${paper.tex}`;
  const body = `
  <div class="shell detail-shell">
    ${topbar(prefix, 'papers')}
    <main class="detail-main">
      <section class="detail-hero panel">
        <div class="detail-hero-copy">
          <span class="eyebrow">Research paper</span>
          <h1>${esc(paper.title)}</h1>
          <p>${esc(paper.summary)}</p>
          <div class="hero-actions">
            <a class="btn primary" href="${esc(pdfHref)}" target="_blank" rel="noreferrer">Open PDF</a>
            <a class="btn ghost" href="${esc(texHref)}" target="_blank" rel="noreferrer">Source file</a>
            <a class="btn ghost" href="${prefix}papers/">All papers</a>
            <a class="btn ghost" href="${prefix}index.html">Home</a>
          </div>
        </div>
        <aside class="hero-aside detail-aside">
          <div class="stat-grid">
            ${detailStats([
              { value: paper.version, label: 'Version' },
              { value: paper.status, label: 'Status' },
              { value: paper.tags.length.toString(), label: 'Tags' },
              { value: 'Aman Sachan', label: 'Author' },
            ])}
          </div>
          <div class="feature-stack">
            ${paper.tags.map(tag => `<div class="feature"><span class="dot"></span><div><strong>${esc(tag)}</strong><span>Topic label for the paper index.</span></div></div>`).join('')}
          </div>
        </aside>
      </section>

      <section class="detail-grid">
        <article class="section panel detail-panel">
          <div class="section-head"><div><h2>Technical synopsis</h2><p>The paper is built around a precise cache-compression story with explicit maths and implementation detail.</p></div></div>
          <div class="prose">
            <p>${esc(paper.summary)}</p>
            <ul class="detail-list">
              ${keyHighlights.map(item => `<li>${esc(item)}</li>`).join('')}
            </ul>
          </div>
        </article>

        <aside class="section panel detail-panel">
          <div class="section-head"><div><h2>Quick facts</h2><p>Everything a reviewer or reader needs at a glance.</p></div></div>
          <div class="mini-list">
            ${infoList([
              { label: 'File', value: paper.pdf },
              { label: 'Source', value: paper.tex },
              { label: 'Format', value: 'PDF + LaTeX source' },
              { label: 'Project', value: 'KVQuant' },
            ])}
          </div>
        </aside>
      </section>

      <section class="section panel detail-panel">
        <div class="section-head"><div><h2>Math + algorithm focus</h2><p>Why the paper is not just a narrative, but a system design with structure.</p></div></div>
        <div class="prose columns">
          <div>
            <h3>Core equation</h3>
            <p>The cache footprint grows as <code>M<sub>KV</sub> = 2 · B · L · H · T · D<sub>h</sub> · b</code>. The paper uses this to motivate a precision allocator rather than naive uniform compression.</p>
          </div>
          <div>
            <h3>Allocation logic</h3>
            <p>The relaxed allocator gives more precision to more important tokens and smaller budgets to tokens that are older, less sensitive, or less structurally important.</p>
          </div>
          <div>
            <h3>Implementation contract</h3>
            <p>The runtime wrapper decompresses incoming cache state, runs the model, then compresses the returned cache with metadata preserved for exact reconstruction.</p>
          </div>
        </div>
      </section>

      <section class="section panel detail-panel">
        <div class="section-head"><div><h2>Preview</h2><p>Open the PDF inline without leaving the page.</p></div></div>
        <iframe class="pdf-frame" src="${esc(pdfHref)}" title="${esc(paper.title)} PDF"></iframe>
      </section>

      <section class="section panel detail-panel">
        <div class="section-head"><div><h2>Related papers</h2><p>Alternate manuscript versions of the same project.</p></div></div>
        <div class="grid related-grid">
          ${related.map(item => `
            <article class="card related-card">
              <div class="badges">
                ${badge('Paper', 'featured')}
                ${badge(item.version)}
              </div>
              <h3>${esc(item.version)}</h3>
              <p class="desc">${esc(item.status)}</p>
              <div class="card-actions">
                <a class="primary" href="${prefix}papers/${paperSlug(item)}/">Open page</a>
                <a href="${prefix}${item.pdf}" target="_blank" rel="noreferrer">PDF</a>
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    </main>
  </div>`;

  const page = pageShell({
    title,
    description,
    prefix,
    ogTitle: title,
    ogDescription: `${paper.version} · ${paper.status}`,
    kind: 'paper',
    body,
  });
  return { page, og: buildOgSvg({ title: paper.title, subtitle: paper.summary, kind: 'paper' }) };
}

function projectDetailPage(project, papers = []) {
  const slug = projectSlug(project);
  const prefix = '../../';
  const title = `${project.name} — Aman Sachan`;
  const description = project.description && project.description !== 'No public description yet.'
    ? project.description
    : `${project.name} project page.`;
  const highlights = projectHighlights(project);
  const body = `
  <div class="shell detail-shell">
    ${topbar(prefix, 'projects')}
    <main class="detail-main">
      <section class="detail-hero panel">
        <div class="detail-hero-copy">
          <span class="eyebrow">Project detail</span>
          <h1>${esc(project.name)}</h1>
          <p>${esc(description)}</p>
          <div class="hero-actions">
            <a class="btn primary" href="${esc(project.url)}" target="_blank" rel="noreferrer">Open project</a>
            <a class="btn ghost" href="${esc(project.repoUrl)}" target="_blank" rel="noreferrer">GitHub</a>
            <a class="btn ghost" href="${prefix}projects/">All projects</a>
            <a class="btn ghost" href="${prefix}index.html">Home</a>
          </div>
        </div>
        <aside class="hero-aside detail-aside">
          <div class="stat-grid">
            ${detailStats([
              { value: project.language, label: 'Language' },
              { value: project.fork ? 'Mirror' : 'Original', label: 'Type' },
              { value: String(project.stars ?? 0), label: 'Stars' },
              { value: project.upstream || '—', label: 'Upstream' },
            ])}
          </div>
          <div class="feature-stack">
            ${highlights.slice(0, 4).map(item => `<div class="feature"><span class="dot"></span><div><strong>${esc(item)}</strong><span>Portfolio context.</span></div></div>`).join('')}
          </div>
        </aside>
      </section>

      <section class="detail-grid">
        <article class="section panel detail-panel">
          <div class="section-head"><div><h2>What it is</h2><p>A quick, honest read on the project and why it belongs in your public portfolio.</p></div></div>
          <div class="prose">
            <p>${esc(description)}</p>
            <ul class="detail-list">
              <li>${project.fork ? `Mirror / contribution repo with upstream <strong>${esc(project.upstream || 'unknown')}</strong>.` : 'Original project developed under Aman Sachan.'}</li>
              <li>Primary language: <strong>${esc(project.language)}</strong>.</li>
              <li>GitHub repository: <strong>${esc(project.repoUrl)}</strong>.</li>
              <li>External project link: <strong>${esc(project.url)}</strong>.</li>
            </ul>
          </div>
        </article>

        <aside class="section panel detail-panel">
          <div class="section-head"><div><h2>Portfolio facts</h2><p>What a visitor needs to understand at a glance.</p></div></div>
          <div class="mini-list">
            ${infoList([
              { label: 'Repository', value: project.repoUrl },
              { label: 'Upstream', value: project.upstream || '—' },
              { label: 'Featured on home', value: project.featured ? 'Yes' : 'No' },
              { label: 'Snapshot stars', value: String(project.stars ?? 0) },
            ])}
          </div>
        </aside>
      </section>

      <section class="section panel detail-panel">
        <div class="section-head"><div><h2>Why it matters</h2><p>A short narrative that makes the page feel like a real portfolio entry, not a bare repo link.</p></div></div>
        <div class="prose columns">
          <div>
            <h3>Core idea</h3>
            <p>${esc(project.description && project.description !== 'No public description yet.' ? project.description : 'This project is part of the broader research and systems portfolio.')}</p>
          </div>
          <div>
            <h3>Public surface</h3>
            <p>This page gives the project a clean landing spot for GitHub Pages, search, and sharing. It also keeps the repository discoverable alongside your papers.</p>
          </div>
          <div>
            <h3>Portfolio role</h3>
            <p>${project.fork ? 'This repository is a mirror or upstream contribution, so it is grouped separately from original work.' : 'This repository is an original project, and is surfaced as a primary portfolio item.'}</p>
          </div>
        </div>
      </section>

      ${project.name.toLowerCase() === 'kvquant' ? `
      <section class="section panel detail-panel">
        <div class="section-head"><div><h2>Associated papers</h2><p>Direct links between the project and its publication track.</p></div></div>
        <div class="grid related-grid">
          ${papers.map(paper => `
            <article class="card related-card">
              <div class="badges">${badge('Paper', 'featured')} ${badge(paper.version)}</div>
              <h3>${esc(paper.title)}</h3>
              <p class="desc">${esc(paper.status)}</p>
              <div class="card-actions">
                <a class="primary" href="${prefix}papers/${paperSlug(paper)}/">Open paper</a>
                <a href="${prefix}${paper.pdf}" target="_blank" rel="noreferrer">PDF</a>
              </div>
            </article>
          `).join('')}
        </div>
      </section>` : ''}
    </main>
  </div>`;

  const page = pageShell({
    title,
    description,
    prefix,
    ogTitle: title,
    ogDescription: description,
    kind: 'project',
    body,
  });
  return { page, og: buildOgSvg({ title: project.name, subtitle: description, kind: project.fork ? 'mirror' : 'project' }) };
}

function collectionPage({ title, description, prefix, items, kind, itemRenderer }) {
  const cards = items.map(itemRenderer).join('\n');
  const body = `
  <div class="shell detail-shell">
    ${topbar(prefix, kind)}
    <main class="detail-main">
      <section class="detail-hero panel archive-hero">
        <div class="detail-hero-copy">
          <span class="eyebrow">${esc(title)}</span>
          <h1>${esc(title)}</h1>
          <p>${esc(description)}</p>
          <div class="hero-actions">
            <a class="btn primary" href="${prefix}index.html">Home</a>
            <a class="btn ghost" href="${prefix}papers/">Papers</a>
            <a class="btn ghost" href="${prefix}projects/">Projects</a>
          </div>
        </div>
        <aside class="hero-aside detail-aside">
          <div class="stat-grid">
            ${detailStats([
              { value: String(items.length), label: 'Items' },
              { value: kind === 'papers' ? 'PDF + source' : 'Repo + page', label: 'Format' },
              { value: kind === 'papers' ? 'Research manuscripts' : 'Portfolio repos', label: 'Collection' },
              { value: 'Searchable', label: 'Navigation' },
            ])}
          </div>
          <div class="feature-stack">
            <div class="feature"><span class="dot"></span><div><strong>Fast browsing</strong><span>Every item has its own page.</span></div></div>
            <div class="feature"><span class="dot"></span><div><strong>Public ready</strong><span>Designed for GitHub Pages and crawlable indexing.</span></div></div>
          </div>
        </aside>
      </section>

      <section class="section panel detail-panel">
        <div class="section-head"><div><h2>Browse the archive</h2><p>Use these pages when you want a cleaner directory view than the homepage.</p></div></div>
        <label class="search archive-search" aria-label="Search archive">
          <span>⌕</span>
          <input id="archiveSearch" type="search" placeholder="Search this archive…" />
        </label>
        <div class="grid archive-grid" id="archiveGrid">
          ${cards}
        </div>
        <div id="archiveEmpty" class="empty" style="display:none; margin-top: 14px;">No matches. Try a different keyword.</div>
      </section>
    </main>
  </div>
  <script>
    const input = document.getElementById('archiveSearch');
    const cards = [...document.querySelectorAll('[data-archive-card]')];
    const empty = document.getElementById('archiveEmpty');
    function run() {
      const q = input.value.trim().toLowerCase();
      let visible = 0;
      cards.forEach(card => {
        const text = card.getAttribute('data-search') || '';
        const show = !q || text.includes(q);
        card.style.display = show ? '' : 'none';
        if (show) visible += 1;
      });
      empty.style.display = visible ? 'none' : '';
    }
    input.addEventListener('input', run);
    run();
  </script>`;
  const page = pageShell({
    title,
    description,
    prefix,
    ogTitle: title,
    ogDescription: description,
    kind,
    body,
  });
  return { page, og: buildOgSvg({ title, subtitle: description, kind }) };
}

function archivePaperCard(paper, prefix) {
  const slug = paperSlug(paper);
  return `
  <article class="card archive-card" data-archive-card data-search="${esc([paper.title, paper.version, paper.status, paper.summary, paper.tags.join(' ')].join(' ')).toLowerCase()}">
    <div class="badges">${badge('Paper', 'featured')} ${paper.primary ? badge('Featured', 'featured') : ''} ${badge(paper.version)}</div>
    <h3>${esc(paper.title)}</h3>
    <p class="desc">${esc(paper.summary)}</p>
    <p class="meta">${esc(paper.status)}</p>
    <div class="badges">${paper.tags.map(tag => badge(tag)).join('')}</div>
    <div class="card-actions">
      <a class="primary" href="${prefix}papers/${slug}/">Open page</a>
      <a href="${prefix}${paper.pdf}" target="_blank" rel="noreferrer">PDF</a>
    </div>
  </article>`;
}

function archiveProjectCard(project, prefix) {
  const slug = projectSlug(project);
  return `
  <article class="card archive-card" data-archive-card data-search="${esc([project.name, project.description, project.language, project.upstream || ''].join(' ')).toLowerCase()}">
    <div class="badges">
      ${badge(project.language)}
      ${project.featured ? badge('Featured', 'featured') : ''}
      ${project.fork ? badge('Mirror', 'mirror') : badge('Original', 'featured')}
    </div>
    <h3>${esc(project.name)}</h3>
    <p class="desc">${esc(project.description)}</p>
    <p class="meta">${project.fork ? `Upstream: ${esc(project.upstream || 'unknown')}` : 'Original project'}</p>
    <div class="card-actions">
      <a class="primary" href="${prefix}projects/${slug}/">Open page</a>
      <a href="${esc(project.url)}" target="_blank" rel="noreferrer">Open site</a>
    </div>
  </article>`;
}

function generate() {
  const data = readSiteData();
  const papers = [...data.papers];
  const projects = [...data.projects];
  const mirrors = projects.filter(project => project.fork);
  const originals = projects.filter(project => !project.fork);

  ensureDir(OUT_PAPERS);
  ensureDir(OUT_PROJECTS);
  ensureDir(ASSETS);

  // Root-level pages and assets.
  writeFile(path.join(SITE, 'og.svg'), buildOgSvg({
    title: 'Aman Sachan',
    subtitle: 'Papers, projects, and research index',
    kind: 'home',
  }));

  // Detail pages.
  for (const paper of papers) {
    const slug = paperSlug(paper);
    const dir = path.join(OUT_PAPERS, slug);
    ensureDir(dir);
    const { page, og } = paperDetailPage(paper, papers);
    writeFile(path.join(dir, 'index.html'), page);
    writeFile(path.join(dir, 'og.svg'), og);
  }

  for (const project of projects) {
    const slug = projectSlug(project);
    const dir = path.join(OUT_PROJECTS, slug);
    ensureDir(dir);
    const { page, og } = projectDetailPage(project, papers);
    writeFile(path.join(dir, 'index.html'), page);
    writeFile(path.join(dir, 'og.svg'), og);
  }

  // Collection pages.
  const paperArchive = collectionPage({
    title: 'Papers archive',
    description: 'A complete archive of Aman Sachan’s research papers and manuscript versions.',
    prefix: '../',
    kind: 'papers',
    items: papers,
    itemRenderer: paper => archivePaperCard(paper, '../'),
  });
  writeFile(path.join(OUT_PAPERS, 'index.html'), paperArchive.page);
  writeFile(path.join(OUT_PAPERS, 'og.svg'), paperArchive.og);

  const projectArchive = collectionPage({
    title: 'Projects archive',
    description: 'Original projects and mirrored upstream repos, all organised in one public catalogue.',
    prefix: '../',
    kind: 'projects',
    items: projects,
    itemRenderer: project => archiveProjectCard(project, '../'),
  });
  writeFile(path.join(OUT_PROJECTS, 'index.html'), projectArchive.page);
  writeFile(path.join(OUT_PROJECTS, 'og.svg'), projectArchive.og);

  const mirrorArchive = collectionPage({
    title: 'Mirrors archive',
    description: 'Forks and mirrored repos grouped together for reference.',
    prefix: '../',
    kind: 'projects',
    items: mirrors,
    itemRenderer: project => archiveProjectCard(project, '../'),
  });
  writeFile(path.join(SITE, 'mirrors.html'), mirrorArchive.page);
  writeFile(path.join(SITE, 'mirrors-og.svg'), mirrorArchive.og);

  // Sitemap and robots.
  const urls = [
    '/',
    '/papers/',
    '/projects/',
    '/mirrors.html',
    ...papers.map(p => `/papers/${paperSlug(p)}/`),
    ...projects.map(p => `/projects/${projectSlug(p)}/`),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url><loc>${url}</loc></url>`).join('\n')}
</urlset>
`;
  writeFile(path.join(SITE, 'sitemap.xml'), sitemap);
  writeFile(path.join(SITE, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n`);

  // README.
  const readme = [
    '# Aman Sachan research index',
    '',
    'This is the public GitHub Pages-style research homepage for Aman Sachan.',
    '',
    '## What it includes',
    '',
    '- Home index with papers, projects, mirrors, and live search',
    "- Individual paper pages under 'papers/<slug>/'",
    "- Individual project pages under 'projects/<slug>/'",
    '- Archive pages for papers and projects',
    '- Sitemap and robots files for indexing',
    '',
    '## Rebuild',
    '',
    'Run:',
    '',
    '```bash',
    'node generate-site.mjs',
    '```',
    '',
    "The script reads 'data.js' and regenerates all derived pages.",
    '',
  ].join('\n');
  writeFile(path.join(SITE, 'README.md'), readme);

  console.log(`Generated ${papers.length} paper pages, ${projects.length} project pages, archive pages, sitemap, and OG images.`);
  console.log(`Original projects: ${originals.length}; mirrors: ${mirrors.length}`);
}

generate();
