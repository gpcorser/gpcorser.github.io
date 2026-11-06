'use strict';

const byId = id => document.getElementById(id);
const repository = 'https://github.com/gpcorser/gpcorser.github.io';
const compact = matchMedia('(max-width: 740px)');
const explorer = byId('explorer');
const chat = byId('chat');
const explorerToggle = byId('explorer-toggle');
const chatToggle = byId('chat-toggle');

function showPanel(panel, button, open) {
  panel.hidden = !open;
  button.setAttribute('aria-expanded', String(open));
}

showPanel(explorer, explorerToggle, false);
showPanel(chat, chatToggle, true);

compact.addEventListener('change', event => {
  if (event.matches && !chat.hidden) {
    showPanel(explorer, explorerToggle, false);
  }
});
explorerToggle.addEventListener('click', () => {
  if (compact.matches && explorer.hidden) showPanel(chat, chatToggle, false);
  showPanel(explorer, explorerToggle, explorer.hidden);
});

chatToggle.addEventListener('click', () => {
  if (compact.matches && chat.hidden) showPanel(explorer, explorerToggle, false);
  showPanel(chat, chatToggle, chat.hidden);
  if (!chat.hidden) byId('question').focus();
});

function closeChat() {
  showPanel(chat, chatToggle, false);
  chatToggle.focus();
}

byId('chat-close').addEventListener('click', closeChat);
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (!chat.hidden) closeChat();
  else if (!explorer.hidden && compact.matches) {
    showPanel(explorer, explorerToggle, false);
    explorerToggle.focus();
  }
});

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function link(text, url, className) {
  const node = element('a', text, className);
  node.href = url;
  return node;
}

// Keep the actual GitHub hierarchy. Populate folders only when opened.
const children = new Map();
const entryPoints = new Map(projects.map(project => [project.folder, project]));
for (const [path, type] of repoPaths) {
  const slash = path.lastIndexOf('/');
  const parent = slash < 0 ? '' : path.slice(0, slash);
  if (!children.has(parent)) children.set(parent, []);
  children.get(parent).push({ path, type, name: path.slice(slash + 1) });
}

function sourcePath(path, type) {
  return repository + '/' + (type === 'tree' ? 'tree' : 'blob') + '/master/' +
    path.split('/').map(encodeURIComponent).join('/');
}

function treeLink(label, url, icon) {
  const anchor = link(label, url, 'tree-link');
  const mark = element('span', icon, 'tree-icon');
  mark.setAttribute('aria-hidden', 'true');
  anchor.prepend(mark);
  return anchor;
}

function renderFolder(parent, container) {
  const entries = (children.get(parent) || []).slice().sort((a, b) =>
    Number(b.type === 'tree') - Number(a.type === 'tree') || a.name.localeCompare(b.name)
  );

  for (const entry of entries) {
    if (entry.type !== 'tree') {
      const project = parent === '' ? entryPoints.get(entry.path) : null;
      container.append(treeLink(entry.name, project?.url || sourcePath(entry.path, entry.type), '◇'));
      continue;
    }
    const folder = element('details');
    const summary = element('summary', entry.name);
    const mark = element('span', '▱', 'tree-icon');
    mark.setAttribute('aria-hidden', 'true');
    summary.prepend(mark);
    folder.append(summary);
    folder.addEventListener('toggle', function populate() {
      if (!folder.open) return;
      const branch = element('div', '', 'tree-children');
      const project = parent === '' ? entryPoints.get(entry.path) : null;
      if (project && project.url !== project.source) {
        branch.append(treeLink('Open project ↗', project.url, '▶'));
      }
      branch.append(treeLink('View folder on GitHub ↗', sourcePath(entry.path, 'tree'), '⌘'));
      renderFolder(entry.path, branch);
      folder.append(branch);
      folder.removeEventListener('toggle', populate);
    });
    container.append(folder);
  }
}

byId('repo-tree').replaceChildren();
renderFolder('', byId('repo-tree'));

function searchable(project) {
  return [project.title, project.description, project.category, project.folder].join(' ').toLowerCase();
}

function renderProjects() {
  const query = byId('project-filter').value.trim().toLowerCase();
  const matches = projects.filter(project => searchable(project).includes(query));
  const rows = matches.map(project => {
    const row = element('article', '', 'project-row');
    const copy = element('div');
    const title = element('h3');
    title.append(link(project.title, project.url));
    copy.append(title, element('p', project.description));
    const source = link('Source ↗', project.source);
    source.setAttribute('aria-label', 'Source for ' + project.title);
    row.append(copy, source);
    return row;
  });
  byId('project-list').replaceChildren(...rows);
  byId('project-status').textContent = matches.length ? matches.length + ' projects' : 'No matching projects.';
}

byId('project-filter').addEventListener('input', renderProjects);
renderProjects();

const synonyms = {
  turing: ['turing', 'utm', 'm2'],
  papers: ['papers', 'publications', 'research'],
  web: ['web', 'bootstrap', 'html'],
  demos: ['demos', 'prototype'],
  cv: ['cv', 'résumé', 'curriculum vitae']
};

function answer(question) {
  const messages = byId('messages');
  messages.append(element('p', question, 'message user'));
  const words = question.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const normalized = words.map(word => word.length > 4 ? word.replace(/s$/, '') : word);
  const ranked = projects.map(project => {
    const haystack = searchable(project);
    const score = words.reduce((total, word, index) => {
      if (word.length < 3 && word !== 'cv' && word !== 'm2') return total;
      const candidates = synonyms[word] || [word, normalized[index]];
      const match = candidates.find(term => haystack.includes(term));
      return total + (match ? (project.title.toLowerCase().includes(match) ? 3 : 1) : 0);
    }, 0);
    return { project, score };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 4);

  const reply = element('div', ranked.length ? 'Here are matching projects.' : 'No close matches. Try a project name, “Turing machines,” or “papers.”', 'message');
  if (ranked.length) {
    const list = element('ul');
    for (const { project } of ranked) {
      const item = element('li');
      item.append(link(project.title + ' ↗', project.url));
      list.append(item);
    }
    reply.append(list);
  }
  messages.append(reply);
  messages.scrollTop = messages.scrollHeight;
}

byId('chat-form').addEventListener('submit', event => {
  event.preventDefault();
  const input = byId('question');
  const question = input.value.trim();
  if (question) answer(question);
  input.value = '';
});
document.querySelectorAll('.suggestions button').forEach(button => {
  button.addEventListener('click', () => answer(button.textContent));
});

const canvas = byId('code-field');
const context = canvas.getContext('2d');
const motionButton = byId('motion-toggle');
if (context) {
  const surface = canvas.parentElement;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const glyphs = ['{ }', 'λ', '0', '1', '→', 'Σ', '&&', '∈', '[]', 'δ', '∅', '/*', '*/'];
  const pointer = { x: -1000, y: -1000, dragging: false };
  let paused = preference.matches;
  let onscreen = true;
  let frame = 0;
  let width, height, particles;

  function resize() {
    width = surface.clientWidth;
    height = surface.clientHeight;
    const scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = width * scale;
    canvas.height = height * scale;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    particles = Array.from({ length: Math.min(70, Math.floor(width / 14)) }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      speed: .12 + Math.random() * .2,
      glyph: glyphs[index % glyphs.length]
    }));
    draw(false);
  }

  function draw(move) {
    context.clearRect(0, 0, width, height);
    context.font = '14px ui-monospace, monospace';
    for (const particle of particles) {
      const dx = particle.x - pointer.x;
      const dy = particle.y - pointer.y;
      const influence = Math.max(0, 1 - Math.hypot(dx, dy) / 130);
      if (move) {
        const swirl = influence * (pointer.dragging ? .075 : .016);
        particle.x = (particle.x + particle.speed - dy * swirl + width) % width;
        particle.y = (particle.y - particle.speed / 2 + dx * swirl + height) % height;
      }
      context.fillStyle = 'rgba(164,199,236,' + (.13 + influence * .18) + ')';
      context.fillText(particle.glyph, particle.x, particle.y);
    }
  }

  function animate() {
    draw(true);
    frame = requestAnimationFrame(animate);
  }

  function sync() {
    cancelAnimationFrame(frame);
    motionButton.textContent = paused ? 'Play motion' : 'Pause motion';
    motionButton.setAttribute('aria-pressed', String(paused));
    if (!paused && onscreen && !document.hidden) frame = requestAnimationFrame(animate);
  }

  surface.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const bounds = surface.getBoundingClientRect();
    pointer.x = event.clientX - bounds.left;
    pointer.y = event.clientY - bounds.top;
    pointer.dragging = (event.buttons & 1) === 1;
  });
  surface.addEventListener('pointerleave', () => {
    pointer.x = pointer.y = -1000;
    pointer.dragging = false;
  });
  motionButton.addEventListener('click', () => { paused = !paused; sync(); });
  preference.addEventListener('change', event => { paused = event.matches; sync(); });
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(([entry]) => { onscreen = entry.isIntersecting; sync(); }).observe(surface);
  new ResizeObserver(resize).observe(surface);
  resize();
  sync();
} else {
  motionButton.hidden = true;
}
