const BASE_STYLE = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --bg: #ffffff;
    --surface: #f8f9fa;
    --border: #e2e5e9;
    --text: #1a1a2e;
    --text-secondary: #6b7280;
    --accent: #2563eb;
    --accent-light: #dbeafe;
    --success: #16a34a;
    --danger: #dc2626;
    --radius: 10px;
    --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
    --shadow-md: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
  }
  body {
    font-family: 'MV Typewriter', 'Noto Sans Thaana', Thaana, sans-serif;
    background: var(--bg);
    color: var(--text);
    direction: rtl;
    padding: 16px;
    line-height: 1.6;
    font-size: 13px;
    overflow-x: hidden;
  }
  button {
    font-family: inherit;
    cursor: pointer;
    border: none;
    border-radius: var(--radius);
    padding: 8px 16px;
    font-size: 12px;
    transition: all 0.2s;
  }
  input, textarea, select {
    font-family: inherit;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 8px 12px;
    font-size: 12px;
    background: var(--bg);
    color: var(--text);
    direction: rtl;
    width: 100%;
    transition: border-color 0.2s;
  }
  input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-light);
  }
  .btn-primary {
    background: var(--accent);
    color: white;
  }
  .btn-primary:hover { background: #1d4ed8; }
  .btn-secondary {
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
  }
  .btn-secondary:hover { background: #e5e7eb; }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px;
    box-shadow: var(--shadow);
  }
  h1 { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
  h2 { font-size: 15px; font-weight: 600; margin-bottom: 8px; }
  .label { font-size: 11px; color: var(--text-secondary); margin-bottom: 4px; }
`;

function wrap(title: string, bodyContent: string, extraStyle = '', script = ''): string {
  return `<!DOCTYPE html>
<html lang="dv" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>${BASE_STYLE}${extraStyle}</style>
</head>
<body>
${bodyContent}
<script>${script}<\/script>
</body>
</html>`;
}

const writingEditor = wrap('ލިޔުން އެޑިޓަރު', `
<div style="display:flex;flex-direction:column;height:calc(100vh - 32px)">
  <h1>ލިޔުން އެޑިޓަރު</h1>
  <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
    <button class="btn-secondary" onclick="formatText('bold')"><b>B</b></button>
    <button class="btn-secondary" onclick="formatText('italic')"><i>I</i></button>
    <button class="btn-secondary" onclick="formatText('underline')"><u>U</u></button>
    <button class="btn-secondary" onclick="formatText('insertUnorderedList')">&#8226; ލިސްޓް</button>
    <button class="btn-secondary" onclick="clearFormat()">ފޯމެޓް ފޮހެލާ</button>
  </div>
  <div id="editor" contenteditable="true" style="flex:1;border:1px solid var(--border);border-radius:var(--radius);padding:14px;overflow-y:auto;background:var(--surface);min-height:120px;outline:none;line-height:1.8;font-size:14px" dir="rtl"></div>
  <div style="display:flex;gap:16px;margin-top:10px;padding:8px 12px;background:var(--surface);border-radius:var(--radius);border:1px solid var(--border)">
    <span class="label">ބަސް: <strong id="wc">0</strong></span>
    <span class="label">އަކުރު: <strong id="cc">0</strong></span>
    <span class="label">ފޮޅުވަތް: <strong id="sc">0</strong></span>
    <span class="label">ޕެރެގްރާފް: <strong id="pc">0</strong></span>
  </div>
</div>
`, '', `
const editor = document.getElementById('editor');
const wc = document.getElementById('wc');
const cc = document.getElementById('cc');
const sc = document.getElementById('sc');
const pc = document.getElementById('pc');
function formatText(cmd) { document.execCommand(cmd, false, null); editor.focus(); }
function clearFormat() { document.execCommand('removeFormat', false, null); editor.focus(); }
function updateCounts() {
  const text = editor.innerText || '';
  const trimmed = text.trim();
  cc.textContent = trimmed.length;
  const words = trimmed ? trimmed.split(/\\s+/) : [];
  wc.textContent = words.length;
  const sentences = trimmed ? trimmed.split(/[.!?؟،\\.]+/).filter(s=>s.trim()) : [];
  sc.textContent = sentences.length;
  const paras = trimmed ? trimmed.split(/\\n\\s*\\n/).filter(p=>p.trim()) : [];
  pc.textContent = Math.max(paras.length, trimmed ? 1 : 0);
}
editor.addEventListener('input', updateCounts);
editor.innerHTML = '<p>މިތަނުގައި ލިޔަން ފައްޓާ...</p>';
updateCounts();
`);

const documentGen = wrap('ޕްރޮޓޮޓައިޕް', `
<div style="display:flex;flex-direction:column;height:calc(100vh - 32px)">
  <h1>PRD → ޕްރޮޓޮޓައިޕް</h1>
  <div style="display:flex;gap:12px;flex:1;min-height:0">
    <div style="flex:1;display:flex;flex-direction:column">
      <div class="label">PRD ޕޭސްޓް ކުރޭ:</div>
      <textarea id="prd" style="flex:1;resize:none;font-size:12px" placeholder="ޕްރޮޑަކްޓް ރިކުއާމެންޓް ލިޔޭ...&#10;&#10;މިސާލު:&#10;- ލޮގިން ޕޭޖެއް&#10;- ޔޫޒަރނޭމް އާއި ޕާސްވޯޑް ފީލްޑް&#10;- ލޮގިން ބަޓަން&#10;- ރީތި ޑިޒައިން"></textarea>
      <button class="btn-primary" style="margin-top:8px" onclick="generate()">ޕްރޮޓޮޓައިޕް ހައްދާ</button>
    </div>
    <div style="flex:1;display:flex;flex-direction:column">
      <div class="label">ޕްރޮޓޮޓައިޕް:</div>
      <div id="preview" class="card" style="flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;color:var(--text-secondary)">
        PRD ލިޔެ ބަޓަން ފިއްތާ
      </div>
    </div>
  </div>
</div>
`, '', `
function generate() {
  const prd = document.getElementById('prd').value.trim();
  if (!prd) return;
  const prev = document.getElementById('preview');
  const lines = prd.split('\\n').filter(l => l.trim());
  const fields = [];
  const buttons = [];
  let title = 'އެޕް';
  lines.forEach(l => {
    const t = l.replace(/^[-*•]\\s*/, '').trim();
    if (/ޕޭޖް|ސްކްރީން|ފޯމް|ވިއު/.test(t)) title = t;
    else if (/ފީލްޑް|އިންޕުޓް|ޔޫޒަރ|ނޭމް|ޕާސް|އީމެއިލް|ނަން|ނަމް/.test(t)) fields.push(t);
    else if (/ބަޓަން|ފިއްތާ|ސަބްމިޓް|ލޮގިން|ރެޖިސް|ސައިން|ފޮނުވާ|ހުށައ/.test(t)) buttons.push(t);
    else fields.push(t);
  });
  if (fields.length === 0 && buttons.length === 0) {
    fields.push('ޓެކްސްޓް ފީލްޑް');
    buttons.push('ފޮނުވާ');
  }
  if (buttons.length === 0) buttons.push('ފޮނުވާ');
  let html = '<div style="width:100%;max-width:320px;margin:0 auto;padding:20px">';
  html += '<div style="text-align:center;margin-bottom:20px;font-size:16px;font-weight:700;color:var(--accent)">' + title + '</div>';
  fields.forEach(f => {
    html += '<div style="margin-bottom:12px"><div class="label">' + f + '</div>';
    html += '<input type="text" placeholder="' + f + '" style="width:100%"></div>';
  });
  buttons.forEach(b => {
    html += '<button class="btn-primary" style="width:100%;margin-top:8px;padding:10px">' + b + '</button>';
  });
  html += '</div>';
  prev.innerHTML = html;
  prev.style.alignItems = 'flex-start';
}
`);

const noteTransform = wrap('ނޯޓް ބަދަލުކުރާ', `
<div style="display:flex;flex-direction:column;height:calc(100vh - 32px)">
  <h1>ނޯޓް ބަދަލުކުރާ</h1>
  <div style="display:flex;gap:12px;flex:1;min-height:0">
    <div style="flex:1;display:flex;flex-direction:column">
      <div class="label">ރޯ ނޯޓްސް:</div>
      <textarea id="raw" style="flex:1;resize:none;font-size:12px" oninput="transform()" placeholder="ނޯޓްސް ލިޔޭ...&#10;&#10;# ހެޑިން&#10;- ބުލެޓް ޕޮއިންޓް&#10;- ބުލެޓް ޕޮއިންޓް&#10;&#10;ޕެރެގްރާފް ލިޔެވޭ"></textarea>
    </div>
    <div style="flex:1;display:flex;flex-direction:column">
      <div class="label">ފޯމެޓް ކުރެވިފައި:</div>
      <div id="out" class="card" style="flex:1;overflow:auto;font-size:13px;line-height:1.8"></div>
    </div>
  </div>
</div>
`, `
  #out h1 { font-size:16px; color:var(--accent); border-bottom:2px solid var(--accent-light); padding-bottom:4px; margin:12px 0 8px; }
  #out h2 { font-size:14px; color:var(--accent); margin:10px 0 6px; }
  #out ul { padding-right:20px; margin:6px 0; }
  #out li { margin:3px 0; }
  #out p { margin:6px 0; }
  #out blockquote { border-right:3px solid var(--accent); padding-right:10px; color:var(--text-secondary); margin:8px 0; }
`, `
function transform() {
  const raw = document.getElementById('raw').value;
  const lines = raw.split('\\n');
  let html = '';
  let inList = false;
  lines.forEach(line => {
    const t = line.trim();
    if (!t) {
      if (inList) { html += '</ul>'; inList = false; }
      return;
    }
    if (t.startsWith('# ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<h1>' + t.slice(2) + '</h1>';
    } else if (t.startsWith('## ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<h2>' + t.slice(3) + '</h2>';
    } else if (t.startsWith('> ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<blockquote>' + t.slice(2) + '</blockquote>';
    } else if (/^[-*•]\\s/.test(t)) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += '<li>' + t.replace(/^[-*•]\\s*/, '') + '</li>';
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<p>' + t + '</p>';
    }
  });
  if (inList) html += '</ul>';
  document.getElementById('out').innerHTML = html || '<span style="color:var(--text-secondary)">ވާތް ފަޅީގައި ނޯޓްސް ލިޔޭ</span>';
}
transform();
`);

const brainstorm = wrap('ހިޔާލު ޖެނެރޭޓަރު', `
<div style="display:flex;flex-direction:column;height:calc(100vh - 32px)">
  <h1>ހިޔާލު ޖެނެރޭޓަރު</h1>
  <div style="display:flex;gap:8px;margin-bottom:12px">
    <input id="topic" type="text" placeholder="މައުޟޫޢެއް ލިޔޭ..." style="flex:1">
    <button class="btn-primary" onclick="addTopic()">ހިޔާލު ހޯދާ</button>
  </div>
  <div id="board" style="flex:1;overflow:auto;display:flex;flex-wrap:wrap;gap:10px;align-content:flex-start"></div>
</div>
`, `
  .idea-card {
    width: calc(50% - 5px);
    padding: 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: var(--shadow);
  }
  .idea-card:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
  }
  .idea-card .topic-tag {
    font-size: 10px;
    background: var(--accent-light);
    color: var(--accent);
    padding: 2px 8px;
    border-radius: 20px;
    display: inline-block;
    margin-bottom: 6px;
  }
  .idea-card .title { font-weight: 600; font-size: 13px; margin-bottom: 4px; }
  .idea-card .desc { font-size: 11px; color: var(--text-secondary); display: none; }
  .idea-card.expanded .desc { display: block; }
`, `
const ideas = {
  'ޓެކްނޮލޮޖީ': [
    { t: 'AI ޗެޓްބޮޓް', d: 'ދިވެހި ބަހުން ވާހަކަ ދައްކާ AI ޗެޓްބޮޓެއް ހެދިދާނެ' },
    { t: 'ސްމާޓް ހޯމް', d: 'ފޯނުން ގޭގެ ލައިޓް، AC ކޮންޓްރޯލް ކުރެވޭ ސިސްޓަމެއް' },
    { t: 'ހެލްތް ޓްރެކަރ', d: 'ކެއުން، ކަސްރަތު، ނިދި ޓްރެކް ކުރާ އެޕެއް' },
    { t: 'ވާޗުއަލް ކްލާސް', d: 'އޮންލައިން ކިޔެވުމަށް ޚާއްޞަ ޕްލެޓްފޯމެއް' },
  ],
  'ވިޔަފާރި': [
    { t: 'އީ-ކޮމާސް', d: 'ރަށުގެ އުފެއްދުންތައް އޮންލައިންކޮށް ވިއްކާ ޕްލެޓްފޯމެއް' },
    { t: 'ޑެލިވަރީ ސާވިސް', d: 'ރެސްޓޯރެންޓް ތަކުން ކެއުން ޑެލިވަރ ކުރާ ސާވިސެއް' },
    { t: 'ފްރީލާންސް', d: 'ދިވެހި ފްރީލާންސަރުންނަށް ޚާއްޞަ މާކެޓްޕްލޭސެއް' },
    { t: 'ޓޫރިޒަމް އެޕް', d: 'ފަތުރުވެރިންނަށް ރާއްޖެ ތަޖުރިބާ ކުރެވޭ ގައިޑް އެޕެއް' },
  ],
};
const defaultIdeas = [
  { t: 'ކްރިއޭޓިވް ހިޔާލު', d: 'މި މައުޟޫޢާ ގުޅޭ ތަފާތު ހިޔާލެއް ވިސްނާ' },
  { t: 'ޕްރެކްޓިކަލް ހައްލު', d: 'އެންމެ ފަސޭހައިން ތަންފީޒު ކުރެވޭ ގޮތް' },
  { t: 'އީޖާދީ ވިސްނުން', d: 'ތަފާތު އެންގަލަކުން ބަލާ، އާ ގޮތެއް ހޯދާ' },
  { t: 'ޓީމް ވޯކް', d: 'ގިނަ މީހުން ގުޅިގެން ކުރެވޭ ގޮތަކަށް ރާވާ' },
];
function addTopic() {
  const input = document.getElementById('topic');
  const topic = input.value.trim();
  if (!topic) return;
  const board = document.getElementById('board');
  const list = ideas[topic] || defaultIdeas;
  list.forEach(idea => {
    const card = document.createElement('div');
    card.className = 'idea-card';
    card.innerHTML = '<div class="topic-tag">' + topic + '</div><div class="title">' + idea.t + '</div><div class="desc">' + idea.d + '</div>';
    card.onclick = () => card.classList.toggle('expanded');
    board.appendChild(card);
  });
  input.value = '';
}
`);

const projectInsights = wrap('ޕްރޮޖެކްޓް އިންސައިޓް', `
<div style="display:flex;flex-direction:column;height:calc(100vh - 32px)">
  <h1>ޕްރޮޖެކްޓް ޑޭޝްބޯޑް</h1>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
    <div class="card" style="text-align:center"><div class="label">ޖުމްލަ ޓާސްކް</div><div style="font-size:28px;font-weight:700;color:var(--accent)" id="total">12</div></div>
    <div class="card" style="text-align:center"><div class="label">ނިމިފައި</div><div style="font-size:28px;font-weight:700;color:var(--success)" id="done">7</div></div>
  </div>
  <div class="card" style="margin-bottom:10px">
    <h2>ޕްރޮގްރެސް</h2>
    <div id="bars"></div>
  </div>
  <div class="card" style="flex:1;overflow:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <h2 style="margin:0">ޓާސްކް ލިސްޓް</h2>
      <button class="btn-primary" style="font-size:11px;padding:5px 12px" onclick="addTask()">+ އިތުރު</button>
    </div>
    <div id="tasks"></div>
  </div>
</div>
`, `
  .progress-row { margin-bottom: 10px; }
  .progress-label { font-size: 11px; margin-bottom: 3px; display: flex; justify-content: space-between; }
  .progress-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 4px; transition: width 0.5s; }
  .task-item { display:flex; align-items:center; gap:8px; padding:8px; border-bottom:1px solid var(--border); font-size:12px; }
  .task-item input[type=checkbox] { width:16px; height:16px; accent-color:var(--accent); }
  .task-item.done span { text-decoration: line-through; color: var(--text-secondary); }
`, `
const data = [
  { name: 'ޑިޒައިން', pct: 90, color: '#2563eb' },
  { name: 'ފްރޮންޓެންޑް', pct: 65, color: '#7c3aed' },
  { name: 'ބެކެންޑް', pct: 45, color: '#059669' },
  { name: 'ޓެސްޓިން', pct: 20, color: '#d97706' },
];
const taskList = [
  { text: 'ޔޫޒަރ ފްލޯ ޑިޒައިން', done: true },
  { text: 'API ސެޓަޕް', done: true },
  { text: 'ލޮގިން ޕޭޖް', done: true },
  { text: 'ޑޭޝްބޯޑް UI', done: false },
  { text: 'ނޮޓިފިކޭޝަން ސިސްޓަމް', done: false },
  { text: 'ޑީބީ މައިގްރޭޝަން', done: false },
];
function renderBars() {
  document.getElementById('bars').innerHTML = data.map(d =>
    '<div class="progress-row"><div class="progress-label"><span>' + d.name + '</span><span>' + d.pct + '%</span></div>' +
    '<div class="progress-bar"><div class="progress-fill" style="width:' + d.pct + '%;background:' + d.color + '"></div></div></div>'
  ).join('');
}
function renderTasks() {
  const done = taskList.filter(t=>t.done).length;
  document.getElementById('done').textContent = done;
  document.getElementById('total').textContent = taskList.length;
  document.getElementById('tasks').innerHTML = taskList.map((t,i) =>
    '<div class="task-item ' + (t.done?'done':'') + '"><input type="checkbox" ' + (t.done?'checked':'') + ' onchange="toggleTask(' + i + ')"><span>' + t.text + '</span></div>'
  ).join('');
}
function toggleTask(i) { taskList[i].done = !taskList[i].done; renderTasks(); }
function addTask() {
  const name = prompt('ޓާސްކް ނަން:');
  if (name) { taskList.push({ text: name, done: false }); renderTasks(); }
}
renderBars();
renderTasks();
`);

const flashcards = wrap('ފްލެޝްކާޑް', `
<div style="display:flex;flex-direction:column;height:calc(100vh - 32px);align-items:center;justify-content:center">
  <h1>ފްލެޝްކާޑް</h1>
  <div class="label" id="counter" style="margin-bottom:12px">1 / 6</div>
  <div id="card" class="flashcard" onclick="flipCard()">
    <div class="flashcard-inner" id="cardInner">
      <div class="flashcard-front" id="front"></div>
      <div class="flashcard-back" id="back"></div>
    </div>
  </div>
  <div style="display:flex;gap:10px;margin-top:16px">
    <button class="btn-secondary" onclick="prevCard()">← ކުރީގެ</button>
    <button class="btn-secondary" onclick="flipCard()">ފުރޮޅާ</button>
    <button class="btn-secondary" onclick="nextCard()">ދެން →</button>
  </div>
  <button class="btn-primary" style="margin-top:12px" onclick="shuffle()">އެއްކޮށް އޮޅުވާލާ</button>
</div>
`, `
  .flashcard {
    width: 280px; height: 180px; perspective: 600px; cursor: pointer;
  }
  .flashcard-inner {
    width: 100%; height: 100%; position: relative;
    transition: transform 0.5s; transform-style: preserve-3d;
  }
  .flashcard-inner.flipped { transform: rotateY(180px); }
  .flashcard-front, .flashcard-back {
    position: absolute; inset: 0; backface-visibility: hidden;
    display: flex; align-items: center; justify-content: center;
    border-radius: var(--radius); padding: 20px; text-align: center;
    font-size: 14px; line-height: 1.6;
    box-shadow: var(--shadow-md);
  }
  .flashcard-front { background: var(--accent); color: white; }
  .flashcard-back { background: var(--surface); border: 2px solid var(--accent); transform: rotateY(180deg); }
  .flashcard-inner.flipped { transform: rotateY(180deg); }
`, `
const cards = [
  { q: 'ރާއްޖޭގެ ވެރިރަށަކީ؟', a: 'މާލެ' },
  { q: 'ރާއްޖޭގައި ކިތައް އަތޮޅު؟', a: '26 ޤުދުރަތީ އަތޮޅު (20 އިދާރީ)' },
  { q: 'ރާއްޖޭގެ ޤައުމީ ދުވަހަކީ؟', a: '1 ރަބީޢުލް އައްވަލް' },
  { q: 'ދިވެހި ލިޔެވޭ ސްކްރިޕްޓަކީ؟', a: 'ތާނަ (ކަނާތުން ވާތަށް)' },
  { q: 'ރާއްޖެއަށް ޚާއްޞަ މަހެއް؟', a: 'ކަޅުބިލަ މަސް (ސްކިޕްޖެކް ޓޫނާ)' },
  { q: 'ރާއްޖޭގެ ފައިސާގެ ނަމަކީ؟', a: 'ދިވެހި ރުފިޔާ' },
];
let current = 0;
let flipped = false;
function render() {
  document.getElementById('front').textContent = cards[current].q;
  document.getElementById('back').textContent = cards[current].a;
  document.getElementById('counter').textContent = (current+1) + ' / ' + cards.length;
  flipped = false;
  document.getElementById('cardInner').classList.remove('flipped');
}
function flipCard() {
  flipped = !flipped;
  document.getElementById('cardInner').classList.toggle('flipped');
}
function nextCard() { current = (current + 1) % cards.length; render(); }
function prevCard() { current = (current - 1 + cards.length) % cards.length; render(); }
function shuffle() {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  current = 0; render();
}
render();
`);

const quizMaker = wrap('ކުއިޒް', `
<div style="display:flex;flex-direction:column;height:calc(100vh - 32px)">
  <h1>ކުއިޒް</h1>
  <div id="quiz" style="flex:1;overflow:auto"></div>
  <div id="result" style="display:none;text-align:center;padding:20px">
    <div style="font-size:40px;margin-bottom:8px">🎯</div>
    <div style="font-size:18px;font-weight:700" id="score"></div>
    <button class="btn-primary" style="margin-top:12px" onclick="reset()">އަލުން ފައްޓާ</button>
  </div>
</div>
`, `
  .q-card { padding:14px; margin-bottom:10px; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); }
  .q-card .q-text { font-weight:600; margin-bottom:8px; }
  .q-card .option {
    display:block; padding:8px 12px; margin:4px 0; border:1px solid var(--border);
    border-radius:8px; cursor:pointer; transition:all 0.2s; font-size:12px; background:white;
  }
  .q-card .option:hover:not(.chosen) { border-color:var(--accent); background:var(--accent-light); }
  .q-card .option.correct { background:#dcfce7; border-color:#16a34a; color:#16a34a; }
  .q-card .option.wrong { background:#fee2e2; border-color:#dc2626; color:#dc2626; }
`, `
const questions = [
  { q: 'ރާއްޖޭގައި ކިތައް ރަށް؟', opts: ['1192', '800', '500', '2000'], ans: 0 },
  { q: 'ދުނިޔޭގެ އެންމެ ކުޑަ މުސްލިމް ޤައުމަކީ؟', opts: ['ބުރުނައި', 'ދިވެހިރާއްޖެ', 'ބަހްރައިން', 'ޤަޠަރު'], ans: 1 },
  { q: 'ތާނަ ލިޔަނީ ކޮން ދިމާއަކަށް؟', opts: ['ވާތުން ކަނާތަށް', 'ކަނާތުން ވާތަށް', 'މައްޗަށް', 'ތިރިއަށް'], ans: 1 },
  { q: 'HTML ގެ ފުލް ފޯމް؟', opts: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Home Tool Making Language', 'Hyper Transfer Main Language'], ans: 0 },
  { q: '1 ކިލޯ ބައިޓް = ކިތައް ބައިޓް؟', opts: ['100', '512', '1024', '1000'], ans: 2 },
];
let answered = 0;
let score = 0;
function renderQuiz() {
  document.getElementById('quiz').innerHTML = questions.map((q,qi) =>
    '<div class="q-card" id="q'+qi+'"><div class="q-text">'+(qi+1)+'. '+q.q+'</div>' +
    q.opts.map((o,oi) => '<div class="option" onclick="answer('+qi+','+oi+')">'+o+'</div>').join('') +
    '</div>'
  ).join('');
  answered = 0; score = 0;
  document.getElementById('result').style.display = 'none';
  document.getElementById('quiz').style.display = 'block';
}
function answer(qi, oi) {
  const card = document.getElementById('q'+qi);
  if (card.classList.contains('answered')) return;
  card.classList.add('answered');
  const opts = card.querySelectorAll('.option');
  opts.forEach(o => o.classList.add('chosen'));
  opts[questions[qi].ans].classList.add('correct');
  if (oi === questions[qi].ans) score++;
  else opts[oi].classList.add('wrong');
  answered++;
  if (answered === questions.length) {
    setTimeout(() => {
      document.getElementById('quiz').style.display = 'none';
      document.getElementById('result').style.display = 'block';
      document.getElementById('score').textContent = questions.length + ' އިން ' + score + ' ރަނގަޅު!';
    }, 800);
  }
}
function reset() { renderQuiz(); }
renderQuiz();
`);

const unitConverter = wrap('ޔުނިޓް ބަދަލުކުރާ', `
<div style="display:flex;flex-direction:column;height:calc(100vh - 32px)">
  <h1>ޔުނިޓް ބަދަލުކުރާ</h1>
  <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
    <button class="btn-primary tab active" data-tab="temp" onclick="switchTab('temp')">ޓެމްޕރޭޗަރ</button>
    <button class="btn-secondary tab" data-tab="weight" onclick="switchTab('weight')">ބަރުދަން</button>
    <button class="btn-secondary tab" data-tab="length" onclick="switchTab('length')">ދިގުމިން</button>
  </div>
  <div class="card" style="flex:1">
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
      <div style="flex:1;min-width:100px">
        <div class="label">ޢަދަދު:</div>
        <input type="number" id="val" value="100" oninput="convert()">
      </div>
      <div style="flex:1;min-width:80px">
        <div class="label">އިން:</div>
        <select id="from" onchange="convert()"></select>
      </div>
      <div style="flex:1;min-width:80px">
        <div class="label">އަށް:</div>
        <select id="to" onchange="convert()"></select>
      </div>
    </div>
    <div id="result" style="text-align:center;font-size:28px;font-weight:700;color:var(--accent);padding:20px 0"></div>
  </div>
</div>
`, `
  .tab.active { background: var(--accent); color: white; }
`, `
const units = {
  temp: { units: ['°C', '°F', 'K'], convert: (v,f,t) => {
    let c = f==='°C'?v:f==='°F'?(v-32)*5/9:v-273.15;
    return t==='°C'?c:t==='°F'?c*9/5+32:c+273.15;
  }},
  weight: { units: ['kg', 'lb', 'oz', 'g'], convert: (v,f,t) => {
    const toKg = { kg:1, lb:0.453592, oz:0.0283495, g:0.001 };
    return v * toKg[f] / toKg[t];
  }},
  length: { units: ['m', 'ft', 'cm', 'inch', 'km', 'mile'], convert: (v,f,t) => {
    const toM = { m:1, ft:0.3048, cm:0.01, inch:0.0254, km:1000, mile:1609.34 };
    return v * toM[f] / toM[t];
  }}
};
let currentTab = 'temp';
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
    if (b.dataset.tab === tab) { b.className = 'btn-primary tab active'; }
    else { b.className = 'btn-secondary tab'; }
  });
  const u = units[tab].units;
  const fromSel = document.getElementById('from');
  const toSel = document.getElementById('to');
  fromSel.innerHTML = u.map(x => '<option value="'+x+'">'+x+'</option>').join('');
  toSel.innerHTML = u.map(x => '<option value="'+x+'">'+x+'</option>').join('');
  toSel.selectedIndex = 1;
  convert();
}
function convert() {
  const v = parseFloat(document.getElementById('val').value) || 0;
  const f = document.getElementById('from').value;
  const t = document.getElementById('to').value;
  const result = units[currentTab].convert(v, f, t);
  document.getElementById('result').textContent = v + ' ' + f + ' = ' + result.toFixed(4).replace(/\\.?0+$/, '') + ' ' + t;
}
switchTab('temp');
`);

const budgetTracker = wrap('ބަޖެޓް ޓްރެކަރު', `
<div style="display:flex;flex-direction:column;height:calc(100vh - 32px)">
  <h1>ބަޖެޓް ޓްރެކަރު</h1>
  <div class="card" style="margin-bottom:10px">
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <input id="ename" placeholder="ޚަރަދުގެ ނަން" style="flex:2;min-width:80px">
      <input id="eamt" type="number" placeholder="ޢަދަދު" style="flex:1;min-width:60px">
      <select id="ecat" style="flex:1;min-width:70px">
        <option value="ކެއުން">ކެއުން</option>
        <option value="ދަތުރު">ދަތުރު</option>
        <option value="ބިލް">ބިލް</option>
        <option value="ވިޔަފާރި">ވިޔަފާރި</option>
        <option value="އެހެނިހެން">އެހެނިހެން</option>
      </select>
      <button class="btn-primary" onclick="addExp()">އެޑް</button>
    </div>
  </div>
  <div style="display:flex;gap:10px;flex:1;min-height:0">
    <div style="flex:1;overflow:auto">
      <div class="card" style="height:100%;overflow:auto">
        <h2>ޚަރަދުތައް</h2>
        <div id="list"></div>
        <div style="margin-top:10px;padding-top:8px;border-top:2px solid var(--border);font-weight:700">ޖުމްލަ: <span id="total">0</span> ރ</div>
      </div>
    </div>
    <div style="flex:1">
      <div class="card" style="height:100%">
        <h2>ޗާޓް</h2>
        <div id="chart" style="display:flex;align-items:flex-end;gap:8px;height:calc(100% - 30px);padding-top:10px"></div>
      </div>
    </div>
  </div>
</div>
`, `
  .exp-item { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border); font-size:12px; }
  .exp-item .cat { font-size:10px; background:var(--accent-light); color:var(--accent); padding:1px 6px; border-radius:10px; }
  .bar-col { display:flex; flex-direction:column; align-items:center; flex:1; }
  .bar-fill { width:100%; border-radius:4px 4px 0 0; transition:height 0.3s; min-width:20px; }
  .bar-label { font-size:9px; margin-top:4px; text-align:center; word-break:break-all; }
  .bar-val { font-size:9px; color:var(--text-secondary); }
`, `
const expenses = [];
const catColors = { 'ކެއުން':'#2563eb', 'ދަތުރު':'#7c3aed', 'ބިލް':'#d97706', 'ވިޔަފާރި':'#059669', 'އެހެނިހެން':'#dc2626' };
function addExp() {
  const n = document.getElementById('ename').value.trim();
  const a = parseFloat(document.getElementById('eamt').value);
  const c = document.getElementById('ecat').value;
  if (!n || !a) return;
  expenses.push({ name: n, amount: a, cat: c });
  document.getElementById('ename').value = '';
  document.getElementById('eamt').value = '';
  render();
}
function render() {
  const list = document.getElementById('list');
  list.innerHTML = expenses.map(e =>
    '<div class="exp-item"><div>' + e.name + ' <span class="cat">' + e.cat + '</span></div><div>' + e.amount + ' ރ</div></div>'
  ).join('');
  document.getElementById('total').textContent = expenses.reduce((s,e)=>s+e.amount,0).toFixed(0);
  const catTotals = {};
  expenses.forEach(e => { catTotals[e.cat] = (catTotals[e.cat]||0) + e.amount; });
  const max = Math.max(...Object.values(catTotals), 1);
  const chart = document.getElementById('chart');
  chart.innerHTML = Object.entries(catTotals).map(([cat,val]) =>
    '<div class="bar-col"><div class="bar-val">' + val + '</div>' +
    '<div class="bar-fill" style="height:' + (val/max*100) + '%;background:' + (catColors[cat]||'#888') + '"></div>' +
    '<div class="bar-label">' + cat + '</div></div>'
  ).join('');
}
render();
`);

const mealPlanner = wrap('ކެއުން ޕްލޭނަރު', `
<div style="display:flex;flex-direction:column;height:calc(100vh - 32px)">
  <h1>ހަފްތާގެ ކެއުން ޕްލޭން</h1>
  <div style="flex:1;overflow:auto">
    <table id="grid" style="width:100%;border-collapse:separate;border-spacing:4px">
      <thead>
        <tr>
          <th style="width:60px"></th>
          <th>ހެނދުނު</th>
          <th>މެންދުރު</th>
          <th>ރޭގަނޑު</th>
        </tr>
      </thead>
      <tbody id="body"></tbody>
    </table>
  </div>
  <button class="btn-secondary" style="margin-top:8px" onclick="clearAll()">ފޮހެލާ</button>
</div>
`, `
  th { font-size:11px; color:var(--text-secondary); padding:4px 6px; text-align:center; }
  .day-label { font-size:11px; font-weight:600; color:var(--accent); }
  .meal-cell {
    background:var(--surface); border:1px solid var(--border); border-radius:8px;
    padding:6px 8px; min-height:36px; font-size:11px; cursor:pointer;
    transition:all 0.2s; text-align:center; color:var(--text-secondary);
  }
  .meal-cell:hover { border-color:var(--accent); background:var(--accent-light); }
  .meal-cell.filled { color:var(--text); font-weight:500; }
`, `
const days = ['ހޮނިހިރު','އަންގާރަ','ބުދަ','ބުރާސްފަތި','ހުކުރު','ހޮނިހިރު','އާދީއްތަ'];
const meals = ['breakfast','lunch','dinner'];
const data = {};
function render() {
  document.getElementById('body').innerHTML = days.map((d,di) =>
    '<tr><td class="day-label">' + d + '</td>' +
    meals.map((m,mi) => {
      const key = di+'-'+mi;
      const val = data[key] || '';
      return '<td><div class="meal-cell' + (val?' filled':'') + '" onclick="edit('+di+','+mi+')">' + (val||'+ ކެއުން') + '</div></td>';
    }).join('') +
    '</tr>'
  ).join('');
}
function edit(di,mi) {
  const key = di+'-'+mi;
  const cur = data[key] || '';
  const val = prompt('ކެއުން ލިޔޭ:', cur);
  if (val !== null) {
    if (val.trim()) data[key] = val.trim();
    else delete data[key];
    render();
  }
}
function clearAll() { Object.keys(data).forEach(k => delete data[k]); render(); }
render();
`);

const ticTacToe = wrap('ޓިކް ޓެކް ޓޯ', `
<div style="display:flex;flex-direction:column;height:calc(100vh - 32px);align-items:center;justify-content:center">
  <h1>ޓިކް ޓެކް ޓޯ</h1>
  <div class="label" id="status" style="margin-bottom:12px;font-size:14px">ތިބާގެ ޓާން (X)</div>
  <div id="board" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:210px;height:210px"></div>
  <div style="display:flex;gap:10px;margin-top:16px">
    <button class="btn-primary" onclick="resetGame()">އާ ގޭމް</button>
  </div>
  <div style="margin-top:12px;display:flex;gap:20px" class="label">
    <span>ތިބާ: <strong id="sw">0</strong></span>
    <span>AI: <strong id="sl">0</strong></span>
    <span>އެއްވަރު: <strong id="sd">0</strong></span>
  </div>
</div>
`, `
  .cell {
    width:66px; height:66px; background:var(--surface); border:1px solid var(--border);
    border-radius:var(--radius); display:flex; align-items:center; justify-content:center;
    font-size:28px; font-weight:700; cursor:pointer; transition:all 0.15s;
    user-select:none;
  }
  .cell:hover:not(.taken) { background:var(--accent-light); border-color:var(--accent); }
  .cell.x { color: var(--accent); }
  .cell.o { color: var(--danger); }
  .cell.win { background: #dcfce7; border-color: var(--success); }
`, `
let board = Array(9).fill('');
let gameOver = false;
let wins = {w:0,l:0,d:0};
const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function render() {
  document.getElementById('board').innerHTML = board.map((c,i) =>
    '<div class="cell'+(c?' taken ':' ')+(c==='X'?'x':c==='O'?'o':'')+'" onclick="play('+i+')">'+(c||'')+'</div>'
  ).join('');
}
function check(b) {
  for (const [a,bb,c] of lines) if (b[a]&&b[a]===b[bb]&&b[a]===b[c]) return {winner:b[a],line:[a,bb,c]};
  if (!b.includes('')) return {winner:'draw',line:[]};
  return null;
}
function minimax(b, isMax, depth) {
  const r = check(b);
  if (r) return r.winner==='O'?10-depth:r.winner==='X'?depth-10:0;
  let best = isMax?-Infinity:Infinity;
  for (let i=0;i<9;i++) {
    if (b[i]) continue;
    b[i] = isMax?'O':'X';
    const s = minimax(b, !isMax, depth+1);
    best = isMax?Math.max(best,s):Math.min(best,s);
    b[i] = '';
  }
  return best;
}
function aiMove() {
  let bestScore = -Infinity, bestMove = -1;
  for (let i=0;i<9;i++) {
    if (board[i]) continue;
    board[i] = 'O';
    const s = minimax(board, false, 0);
    board[i] = '';
    if (s > bestScore) { bestScore = s; bestMove = i; }
  }
  if (bestMove >= 0) board[bestMove] = 'O';
}
function play(i) {
  if (gameOver || board[i]) return;
  board[i] = 'X';
  let r = check(board);
  if (r) return endGame(r);
  aiMove();
  r = check(board);
  if (r) return endGame(r);
  document.getElementById('status').textContent = 'ތިބާގެ ޓާން (X)';
  render();
}
function endGame(r) {
  gameOver = true;
  render();
  if (r.line.length) {
    const cells = document.getElementById('board').children;
    r.line.forEach(i => cells[i].classList.add('win'));
  }
  if (r.winner==='X') { wins.w++; document.getElementById('status').textContent = 'ތިބާ މޮޅުވީ!'; }
  else if (r.winner==='O') { wins.l++; document.getElementById('status').textContent = 'AI މޮޅުވީ!'; }
  else { wins.d++; document.getElementById('status').textContent = 'އެއްވަރު!'; }
  document.getElementById('sw').textContent = wins.w;
  document.getElementById('sl').textContent = wins.l;
  document.getElementById('sd').textContent = wins.d;
}
function resetGame() {
  board = Array(9).fill('');
  gameOver = false;
  document.getElementById('status').textContent = 'ތިބާގެ ޓާން (X)';
  render();
}
render();
`);

const memoryGame = wrap('މެމޮރީ ގޭމް', `
<div style="display:flex;flex-direction:column;height:calc(100vh - 32px);align-items:center">
  <h1>މެމޮރީ ގޭމް</h1>
  <div style="display:flex;gap:16px;margin-bottom:12px" class="label">
    <span>މޫވް: <strong id="moves">0</strong></span>
    <span>ޖޯޑު: <strong id="matched">0</strong>/8</span>
    <span>ވަގުތު: <strong id="timer">0</strong>ސ</span>
  </div>
  <div id="board" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;width:280px"></div>
  <button class="btn-primary" style="margin-top:14px" onclick="initGame()">އާ ގޭމް</button>
</div>
`, `
  .mem-card {
    width:62px; height:72px; perspective:500px; cursor:pointer;
  }
  .mem-card-inner {
    width:100%; height:100%; position:relative; transition:transform 0.4s;
    transform-style:preserve-3d;
  }
  .mem-card.flipped .mem-card-inner { transform:rotateY(180deg); }
  .mem-card-front, .mem-card-back {
    position:absolute;inset:0; backface-visibility:hidden;
    display:flex;align-items:center;justify-content:center;
    border-radius:var(--radius); font-size:24px;
  }
  .mem-card-front { background:var(--accent); color:white; font-size:18px; }
  .mem-card-back { background:var(--surface); border:2px solid var(--border); transform:rotateY(180deg); }
  .mem-card.matched .mem-card-back { border-color:var(--success); background:#dcfce7; }
`, `
const emojis = ['🐠','🐢','🐙','🦀','🐬','🐋','🦈','🐚'];
let cards, flippedCards, matchedCount, moves, timerVal, timerInterval;
function initGame() {
  clearInterval(timerInterval);
  const pairs = [...emojis,...emojis];
  for (let i=pairs.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [pairs[i],pairs[j]]=[pairs[j],pairs[i]]; }
  cards = pairs.map((e,i)=>({emoji:e,id:i,flipped:false,matched:false}));
  flippedCards=[]; matchedCount=0; moves=0; timerVal=0;
  document.getElementById('moves').textContent='0';
  document.getElementById('matched').textContent='0';
  document.getElementById('timer').textContent='0';
  timerInterval = setInterval(()=>{timerVal++;document.getElementById('timer').textContent=timerVal;},1000);
  renderBoard();
}
function renderBoard() {
  document.getElementById('board').innerHTML = cards.map(c =>
    '<div class="mem-card'+(c.flipped||c.matched?' flipped':'')+(c.matched?' matched':'')+'" onclick="flipCard('+c.id+')">' +
    '<div class="mem-card-inner"><div class="mem-card-front">?</div><div class="mem-card-back">'+c.emoji+'</div></div></div>'
  ).join('');
}
function flipCard(id) {
  const card = cards[id];
  if (card.flipped||card.matched||flippedCards.length>=2) return;
  card.flipped = true;
  flippedCards.push(card);
  renderBoard();
  if (flippedCards.length === 2) {
    moves++;
    document.getElementById('moves').textContent = moves;
    const [a,b] = flippedCards;
    if (a.emoji === b.emoji) {
      a.matched = b.matched = true;
      matchedCount++;
      document.getElementById('matched').textContent = matchedCount;
      flippedCards = [];
      renderBoard();
      if (matchedCount === 8) { clearInterval(timerInterval); setTimeout(()=>alert(moves+' މޫވް، '+timerVal+' ސިކުންތު!'),300); }
    } else {
      setTimeout(()=>{ a.flipped=b.flipped=false; flippedCards=[]; renderBoard(); },800);
    }
  }
}
initGame();
`);

const snakeGame = wrap('ސްނޭކް ގޭމް', `
<div style="display:flex;flex-direction:column;height:calc(100vh - 32px);align-items:center;justify-content:center">
  <h1>ސްނޭކް ގޭމް</h1>
  <div style="display:flex;gap:16px;margin-bottom:10px" class="label">
    <span>ސްކޯ: <strong id="score">0</strong></span>
    <span>ބެސްޓް: <strong id="best">0</strong></span>
  </div>
  <canvas id="canvas" width="300" height="300" style="border:2px solid var(--border);border-radius:var(--radius);background:var(--surface)"></canvas>
  <div id="msg" style="margin-top:10px;font-size:13px;color:var(--text-secondary)">ފައްޓަން ސްޕޭސް ފިއްތާ</div>
  <div style="display:grid;grid-template-columns:repeat(3,40px);gap:4px;margin-top:10px">
    <div></div><button class="btn-secondary" style="padding:6px;font-size:14px" onclick="setDir(0,-1)">↑</button><div></div>
    <button class="btn-secondary" style="padding:6px;font-size:14px" onclick="setDir(1,0)">→</button>
    <button class="btn-secondary" style="padding:6px;font-size:14px" onclick="setDir(0,1)">↓</button>
    <button class="btn-secondary" style="padding:6px;font-size:14px" onclick="setDir(-1,0)">←</button>
  </div>
</div>
`, '', `
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const SIZE = 15;
const COLS = canvas.width / SIZE;
const ROWS = canvas.height / SIZE;
let snake, dir, food, running, score, best = 0, interval;
function init() {
  snake = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];
  dir = {x:1,y:0};
  score = 0;
  document.getElementById('score').textContent = '0';
  placeFood();
  draw();
}
function placeFood() {
  do { food = {x:Math.floor(Math.random()*COLS),y:Math.floor(Math.random()*ROWS)}; }
  while (snake.some(s=>s.x===food.x&&s.y===food.y));
}
function draw() {
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(food.x*SIZE+SIZE/2, food.y*SIZE+SIZE/2, SIZE/2-1, 0, Math.PI*2);
  ctx.fill();
  snake.forEach((s,i) => {
    ctx.fillStyle = i===0?'#1d4ed8':'#2563eb';
    ctx.fillRect(s.x*SIZE+1, s.y*SIZE+1, SIZE-2, SIZE-2);
    if (i===0) { ctx.fillStyle='white'; ctx.fillRect(s.x*SIZE+SIZE/2-2+dir.x*2,s.y*SIZE+SIZE/2-2+dir.y*2,3,3); }
  });
}
function step() {
  const head = {x:snake[0].x+dir.x, y:snake[0].y+dir.y};
  if (head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS||snake.some(s=>s.x===head.x&&s.y===head.y)) {
    running = false;
    clearInterval(interval);
    if (score>best) { best=score; document.getElementById('best').textContent=best; }
    document.getElementById('msg').textContent = 'ގޭމް އޯވާ! ސްޕޭސް ފިއްތާ';
    return;
  }
  snake.unshift(head);
  if (head.x===food.x&&head.y===food.y) {
    score++;
    document.getElementById('score').textContent = score;
    placeFood();
  } else {
    snake.pop();
  }
  draw();
}
function setDir(dx,dy) {
  if (!running) return;
  if (dir.x===-dx&&dir.y===-dy) return;
  dir = {x:dx,y:dy};
}
function startGame() {
  if (running) return;
  init();
  running = true;
  document.getElementById('msg').textContent = 'ކުޅެނީ...';
  interval = setInterval(step, 120);
}
document.addEventListener('keydown', e => {
  if (e.code==='Space') { e.preventDefault(); startGame(); return; }
  if (!running) return;
  const map = {ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
  if (map[e.key]) { e.preventDefault(); setDir(...map[e.key]); }
});
init();
`);

const breathing = wrap('ނޭވާލުމުގެ ކަސްރަތު', `
<div style="display:flex;flex-direction:column;height:calc(100vh - 32px);align-items:center;justify-content:center">
  <h1>ނޭވާލުމުގެ ކަސްރަތު</h1>
  <div class="label" style="margin-bottom:8px">4-7-8 ޓެކްނީކް</div>
  <div id="circle" style="width:180px;height:180px;border-radius:50%;background:var(--accent-light);border:4px solid var(--accent);display:flex;align-items:center;justify-content:center;transition:all 0.3s;margin:20px 0">
    <div id="text" style="font-size:14px;font-weight:600;color:var(--accent);text-align:center"></div>
  </div>
  <div id="timer" style="font-size:28px;font-weight:700;color:var(--accent);margin-bottom:12px">0</div>
  <div style="display:flex;gap:10px">
    <button class="btn-primary" id="startBtn" onclick="startBreathing()">ފައްޓާ</button>
    <button class="btn-secondary" onclick="stopBreathing()">ހުއްޓާ</button>
  </div>
  <div class="label" style="margin-top:16px">4ސ ނޭވާ ލާ → 7ސ ހިފަހައްޓާ → 8ސ ދޫކޮށްލާ</div>
</div>
`, `
  @keyframes pulse-in {
    from { transform: scale(0.6); opacity: 0.6; }
    to { transform: scale(1); opacity: 1; }
  }
  @keyframes pulse-out {
    from { transform: scale(1); opacity: 1; }
    to { transform: scale(0.6); opacity: 0.6; }
  }
`, `
const circle = document.getElementById('circle');
const text = document.getElementById('text');
const timerEl = document.getElementById('timer');
let animInterval, running = false, seconds = 0, countInterval;
const phases = [
  { name: 'ނޭވާ ލާ', duration: 4, scale: 1, color: '#2563eb' },
  { name: 'ހިފަހައްޓާ', duration: 7, scale: 1, color: '#7c3aed' },
  { name: 'ދޫކޮށްލާ', duration: 8, scale: 0.6, color: '#059669' },
];
function startBreathing() {
  if (running) return;
  running = true;
  seconds = 0;
  countInterval = setInterval(()=>{seconds++;timerEl.textContent=seconds;},1000);
  runCycle();
}
function runCycle() {
  if (!running) return;
  let phaseIdx = 0;
  function runPhase() {
    if (!running) return;
    const phase = phases[phaseIdx];
    text.textContent = phase.name + '\\n' + phase.duration + 'ސ';
    circle.style.border = '4px solid ' + phase.color;
    circle.style.background = phase.color + '20';
    circle.style.transition = 'transform ' + phase.duration + 's ease-in-out';
    circle.style.transform = 'scale(' + phase.scale + ')';
    let countdown = phase.duration;
    const cd = setInterval(()=>{
      countdown--;
      if (countdown > 0 && running) text.textContent = phase.name + '\\n' + countdown + 'ސ';
    },1000);
    setTimeout(()=>{
      clearInterval(cd);
      phaseIdx++;
      if (phaseIdx < phases.length) runPhase();
      else { phaseIdx = 0; runPhase(); }
    }, phase.duration * 1000);
  }
  runPhase();
}
function stopBreathing() {
  running = false;
  clearInterval(countInterval);
  circle.style.transform = 'scale(1)';
  circle.style.transition = 'transform 0.5s';
  circle.style.border = '4px solid var(--accent)';
  circle.style.background = 'var(--accent-light)';
  text.textContent = '';
}
`);

const colorPalette = wrap('ކުލަ ޕެލެޓް', `
<div style="display:flex;flex-direction:column;height:calc(100vh - 32px);align-items:center">
  <h1>ކުލަ ޕެލެޓް ޖެނެރޭޓަރު</h1>
  <div class="label" style="margin-bottom:12px">ސްޕޭސް ފިއްތާ ނުވަތަ ބަޓަން ފިއްތާ</div>
  <div id="palette" style="display:flex;gap:8px;flex:1;width:100%;min-height:0;margin-bottom:12px"></div>
  <div id="copied" style="position:fixed;top:20px;left:50%;transform:translateX(-50%);background:var(--text);color:white;padding:6px 16px;border-radius:20px;font-size:12px;opacity:0;transition:opacity 0.3s;pointer-events:none">ކޮޕީ ކުރެވިއްޖެ!</div>
  <button class="btn-primary" onclick="generate()" style="width:100%;max-width:300px;padding:10px">ޖެނެރޭޓް ކުރޭ</button>
</div>
`, `
  .color-strip {
    flex:1; border-radius:var(--radius); display:flex; flex-direction:column;
    justify-content:flex-end; padding:10px; cursor:pointer; transition:transform 0.2s;
    box-shadow: var(--shadow);
    min-width: 0;
  }
  .color-strip:hover { transform:scale(1.03); }
  .color-hex {
    background:rgba(255,255,255,0.9); color:#333; padding:4px 6px;
    border-radius:6px; font-size:11px; text-align:center;
    font-family: monospace; backdrop-filter:blur(4px);
  }
`, `
function hslToHex(h,s,l) {
  s/=100; l/=100;
  const a=s*Math.min(l,1-l);
  const f=n=>{const k=(n+h/30)%12; const c=l-a*Math.max(Math.min(k-3,9-k,1),-1); return Math.round(255*c).toString(16).padStart(2,'0');};
  return '#'+f(0)+f(8)+f(4);
}
function generate() {
  const baseHue = Math.random()*360;
  const colors = [];
  const strategies = [
    ()=>[0,30,60,180,210],
    ()=>[0,72,144,216,288],
    ()=>[0,15,30,180,195],
    ()=>[0,60,120,180,240],
  ];
  const offsets = strategies[Math.floor(Math.random()*strategies.length)]();
  offsets.forEach(off => {
    const h = (baseHue + off) % 360;
    const s = 50 + Math.random()*30;
    const l = 35 + Math.random()*30;
    colors.push(hslToHex(h,s,l));
  });
  const palette = document.getElementById('palette');
  palette.innerHTML = colors.map(c =>
    '<div class="color-strip" style="background:'+c+'" onclick="copyColor(\\'' + c + '\\')">' +
    '<div class="color-hex">' + c.toUpperCase() + '</div></div>'
  ).join('');
}
function copyColor(hex) {
  navigator.clipboard.writeText(hex).catch(()=>{});
  const el = document.getElementById('copied');
  el.style.opacity = '1';
  setTimeout(()=>el.style.opacity='0', 1200);
}
document.addEventListener('keydown', e => { if(e.code==='Space'){e.preventDefault();generate();} });
generate();
`);

const natureSounds = wrap('ޤުދުރަތީ އަޑުތައް', `
<div style="display:flex;flex-direction:column;height:calc(100vh - 32px)">
  <h1>ޤުދުރަތީ އަޑުތައް</h1>
  <div class="label" style="margin-bottom:14px">ސްލައިޑަރު ތައް ބޭނުންކޮށް އަޑުތައް މިކްސް ކުރޭ</div>
  <div style="flex:1;display:flex;flex-direction:column;gap:16px">
    <div class="sound-row card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:22px">🌧️</span>
        <span style="font-weight:600">ވާރޭ</span>
        <span class="label vol-label" id="rain-val">0%</span>
      </div>
      <input type="range" min="0" max="100" value="0" id="rain" oninput="updateSound('rain')">
    </div>
    <div class="sound-row card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:22px">🌊</span>
        <span style="font-weight:600">ރާޅު</span>
        <span class="label vol-label" id="waves-val">0%</span>
      </div>
      <input type="range" min="0" max="100" value="0" id="waves" oninput="updateSound('waves')">
    </div>
    <div class="sound-row card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:22px">🐦</span>
        <span style="font-weight:600">ދޫނި</span>
        <span class="label vol-label" id="birds-val">0%</span>
      </div>
      <input type="range" min="0" max="100" value="0" id="birds" oninput="updateSound('birds')">
    </div>
    <div class="sound-row card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:22px">💨</span>
        <span style="font-weight:600">ވައި</span>
        <span class="label vol-label" id="wind-val">0%</span>
      </div>
      <input type="range" min="0" max="100" value="0" id="wind" oninput="updateSound('wind')">
    </div>
  </div>
  <button class="btn-secondary" style="margin-top:12px" onclick="stopAll()">ހުރިހާ އަޑެއް ނިވާލާ</button>
</div>
`, `
  input[type=range] {
    -webkit-appearance: none; width: 100%; height: 6px; border-radius: 3px;
    background: var(--border); outline: none; border: none; padding: 0;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
    background: var(--accent); cursor: pointer; box-shadow: var(--shadow);
  }
  .sound-row { transition: border-color 0.2s; }
  .sound-row.active { border-color: var(--accent); }
`, `
let audioCtx = null;
const nodes = {};
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function createNoise(type) {
  const ctx = getCtx();
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  if (type === 'rain') {
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const src = ctx.createBufferSource();
    src.buffer = buffer; src.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4000;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 8000;
    const gain = ctx.createGain(); gain.gain.value = 0;
    src.connect(hp).connect(lp).connect(gain).connect(ctx.destination);
    src.start();
    return { gain, src };
  } else if (type === 'waves') {
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * 0.3 * (0.5 + 0.5 * Math.sin(t * 0.3));
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800;
    const gain = ctx.createGain(); gain.gain.value = 0;
    src.connect(lp).connect(gain).connect(ctx.destination);
    src.start();
    return { gain, src };
  } else if (type === 'birds') {
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      const chirp = Math.sin(t * 3000 + Math.sin(t * 50) * 10) * Math.max(0, Math.sin(t * 4));
      data[i] = chirp * 0.15;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3000; bp.Q.value = 2;
    const gain = ctx.createGain(); gain.gain.value = 0;
    src.connect(bp).connect(gain).connect(ctx.destination);
    src.start();
    return { gain, src };
  } else {
    let b1 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b1 = 0.99 * b1 + 0.01 * white;
      data[i] = b1 * 3;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
    const gain = ctx.createGain(); gain.gain.value = 0;
    src.connect(lp).connect(gain).connect(ctx.destination);
    src.start();
    return { gain, src };
  }
}
function updateSound(type) {
  const val = parseInt(document.getElementById(type).value);
  document.getElementById(type+'-val').textContent = val+'%';
  const row = document.getElementById(type).closest('.sound-row');
  row.classList.toggle('active', val > 0);
  if (val > 0) {
    if (!nodes[type]) nodes[type] = createNoise(type);
    nodes[type].gain.gain.setTargetAtTime(val/100, getCtx().currentTime, 0.1);
  } else if (nodes[type]) {
    nodes[type].gain.gain.setTargetAtTime(0, getCtx().currentTime, 0.1);
  }
}
function stopAll() {
  ['rain','waves','birds','wind'].forEach(type => {
    document.getElementById(type).value = 0;
    document.getElementById(type+'-val').textContent = '0%';
    document.getElementById(type).closest('.sound-row').classList.remove('active');
    if (nodes[type]) {
      nodes[type].gain.gain.setTargetAtTime(0, getCtx().currentTime, 0.1);
    }
  });
}
`);

export const inspirationPreviews: Record<string, string> = {
  'writing-editor': writingEditor,
  'document-gen': documentGen,
  'note-transform': noteTransform,
  'brainstorm': brainstorm,
  'project-insights': projectInsights,
  'flashcards': flashcards,
  'quiz-maker': quizMaker,
  'unit-converter': unitConverter,
  'budget-tracker': budgetTracker,
  'meal-planner': mealPlanner,
  'tic-tac-toe': ticTacToe,
  'memory-game': memoryGame,
  'snake-game': snakeGame,
  'breathing': breathing,
  'color-palette': colorPalette,
  'nature-sounds': natureSounds,
};
