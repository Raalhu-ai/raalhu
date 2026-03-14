# Inline Visualiser — show_widget Skill

Render rich, **interactive** visuals — SVG diagrams, Chart.js charts, HTML widgets — directly inline in chat using `show_widget`.

## How it works

Pass `title` (snake_case) and `widget_code` (HTML or SVG) to `show_widget`. The client renders it in a sandboxed iframe.

**Two modes (auto-detected):**

- **SVG mode**: `widget_code` starts with `<svg`. Wrapped in dark-bg HTML. No JS, no `sendPrompt`. Use ONLY for simple static illustrations.
- **HTML mode**: Everything else. Supports JS, event handlers, `sendPrompt`, CSS animations. **Use this for ALL interactive content** — even diagrams. Embed `<svg>` inside HTML when you need interactivity.

**Rule: If it should be clickable, hoverable, or animated → use HTML mode, not SVG mode.**

## Design System

### Colors

| Token | Value | Use |
|-------|-------|-----|
| Background | `#242526` | Injected by client |
| Text | `#e4e6eb` | Primary text |
| Muted | `#8a8d91` | Labels, subtitles |
| Accent | `#7d9fe3` | Links, highlights, active states |
| Accent dark | `#1a3a8a` | Darker fills, headers |
| Border | `#3a3b3c` | Dividers, box borders |
| Surface | `#2d2e2f` | Cards, elevated surfaces |
| Hover surface | `#363738` | Hovered cards/boxes |
| Success | `#4ade80` | Positive values |
| Warning | `#fbbf24` | Caution |
| Danger | `#f87171` | Errors, negative values |

Use 2-3 colors per visual max.

### Typography

- Body font: `"MV Typewriter", -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` (injected by client — Thaana text renders in MV Typewriter automatically)
- Heading font: `"Sangu Suruhee", "MV Typewriter", -apple-system, sans-serif` (injected on `h1`, `h2`, `h3` by client)
- SVG text: set `font-family` to `"MV Typewriter", sans-serif` for Thaana labels
- h1=22px, h2=18px, h3=16px, body=14px, small=12px, min=11px
- Weights: 400, 600/700 only
- Thaana text is RTL — add `direction: rtl` on Thaana containers, `text-anchor="end"` on right-aligned SVG text

### Spacing

- Iframe has 16px padding (injected for fragments)
- SVG viewBox width: 680px standard
- Corner radius: `rx="4"` SVG, `8px` HTML
- Auto-resize: 200-800px height

## Sandbox Constraints

- `sandbox="allow-scripts"` — no same-origin, no forms, no popups
- No localStorage/sessionStorage — in-memory state only
- No fetch/XHR — CSP blocks external API calls
- CDN allowlist: `cdnjs.cloudflare.com`, `esm.sh`, `cdn.jsdelivr.net`, `unpkg.com`
- No `position: fixed` — breaks auto-resize

## The sendPrompt Bridge

`sendPrompt(text)` is available in **HTML mode only**. It sends a message to chat as if the user typed it.

Use it for: clicking a diagram node to ask for more detail, selecting a chart segment to drill down, navigating between related concepts.

Do NOT use it for: filtering, sorting, toggling, calculations — handle those in local JS.

## Choosing the Right Visual

| User says | Type | Mode | What to build |
|-----------|------|------|---------------|
| "how does X work" | Interactive diagram | **HTML** | SVG diagram with clickable nodes, hover tooltips |
| "what are the parts of X" | Structural diagram | **HTML** | Boxes with hover detail + click to explore |
| "walk me through steps" | Flowchart | **HTML** | Sequential boxes with hover highlights + click |
| "compare X vs Y" | Comparison | **HTML** | Side-by-side cards with hover effects |
| "show me the data" | Chart | **HTML** | Chart.js with tooltips + click callbacks |
| "explain X" | Interactive explainer | **HTML** | Controls, sliders, live state |
| "draw / diagram" | Diagram | **HTML** | Architecture/ER/flow with interaction |
| "mockup" | UI mockup | **HTML** | HTML+CSS layout with hover states |

**Default to HTML mode for everything.** Only use pure SVG mode for simple decorative art with no interaction needed.

---

## Interactive Diagrams (HTML + embedded SVG)

This is the most common visual type. Use HTML mode with `<svg>` inside so you get hover, click, tooltips, and `sendPrompt`.

### Clickable Flowchart with Hover + Tooltips

```html
<style>
  .node { cursor: pointer; transition: all 0.15s ease; }
  .node:hover rect { fill: #363738; stroke: #7d9fe3; stroke-width: 1.5; }
  .node:hover .label { fill: #7d9fe3; }
  .tooltip {
    position: absolute; background: #1a3a8a; color: #e4e6eb;
    padding: 8px 12px; border-radius: 6px; font-size: 12px;
    pointer-events: none; opacity: 0; transition: opacity 0.15s;
    max-width: 220px; z-index: 10;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .tooltip.visible { opacity: 1; }
  .arrow { stroke: #7d9fe3; stroke-width: 1.5; fill: none; }
</style>
<div style="position: relative; font-family: -apple-system, sans-serif;">
  <div id="tip" class="tooltip"></div>
  <svg width="100%" viewBox="0 0 680 320" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L10 5 L0 10z" fill="#7d9fe3"/>
      </marker>
    </defs>

    <g class="node" data-tip="Details about Step 1" data-prompt="Explain step 1 in detail"
       onclick="sendPrompt(this.dataset.prompt)"
       onmouseenter="showTip(evt, this)" onmouseleave="hideTip()">
      <rect x="240" y="20" width="200" height="56" rx="4" fill="#2d2e2f" stroke="#3a3b3c"/>
      <text class="label" x="340" y="45" text-anchor="middle" fill="#e4e6eb" font-size="14">Step One</text>
      <text x="340" y="62" text-anchor="middle" fill="#8a8d91" font-size="11">click for details</text>
    </g>

    <line x1="340" y1="76" x2="340" y2="110" class="arrow" marker-end="url(#arr)"/>

    <g class="node" data-tip="Details about Step 2" data-prompt="Explain step 2 in detail"
       onclick="sendPrompt(this.dataset.prompt)"
       onmouseenter="showTip(evt, this)" onmouseleave="hideTip()">
      <rect x="240" y="110" width="200" height="56" rx="4" fill="#2d2e2f" stroke="#3a3b3c"/>
      <text class="label" x="340" y="135" text-anchor="middle" fill="#e4e6eb" font-size="14">Step Two</text>
      <text x="340" y="152" text-anchor="middle" fill="#8a8d91" font-size="11">click for details</text>
    </g>
  </svg>
</div>
<script>
var tip = document.getElementById('tip');
function showTip(evt, el) {
  tip.textContent = el.dataset.tip;
  tip.classList.add('visible');
  var r = el.querySelector('rect').getBoundingClientRect();
  var pr = el.closest('div').getBoundingClientRect();
  tip.style.left = (r.left - pr.left + r.width / 2 - tip.offsetWidth / 2) + 'px';
  tip.style.top = (r.top - pr.top - tip.offsetHeight - 8) + 'px';
}
function hideTip() { tip.classList.remove('visible'); }
</script>
```

### Key Interactive Diagram Patterns

**Hover highlight on nodes:**
```css
.node { cursor: pointer; transition: all 0.15s ease; }
.node:hover rect { fill: #363738; stroke: #7d9fe3; stroke-width: 1.5; }
.node:hover .label { fill: #7d9fe3; }
```

**Click to explore via sendPrompt:**
```html
<g class="node" onclick="sendPrompt('Tell me more about ' + this.dataset.topic)">
```

**Tooltip on hover:**
```html
<g onmouseenter="showTip(evt, this)" onmouseleave="hideTip()" data-tip="Hover text here">
```

**Active/selected state:**
```css
.node.active rect { fill: #1a3a8a; stroke: #7d9fe3; stroke-width: 2; }
.node.active .label { fill: #fff; }
```

**Animated connector pulse:**
```css
@keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
.arrow { animation: pulse 2s infinite; }
```

### Diagram Rules

- **Always use HTML mode** for diagrams — embed SVG inside a `<div>`
- Every node should have `:hover` feedback (fill change + cursor pointer)
- Nodes representing concepts should be clickable via `sendPrompt`
- Add subtle tooltip text on hover showing a brief description
- Use `data-*` attributes to store metadata on SVG elements
- Group related elements with `<g class="node">` for easy event handling
- Keep `transition: all 0.15s ease` on interactive elements

---

## Charts (Chart.js)

Always use HTML mode. Chart.js has built-in tooltip interactivity.

### Interactive Bar Chart with Click Callback

```html
<canvas id="chart" style="width:100%; max-height:400px;"></canvas>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<script>
var ctx = document.getElementById('chart');
var chart = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [{
      label: 'Revenue',
      data: [120, 150, 180, 200],
      backgroundColor: '#7d9fe3',
      hoverBackgroundColor: '#9bb8f0',
      borderRadius: 4,
    }]
  },
  options: {
    responsive: true,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { labels: { color: '#e4e6eb', font: { size: 13 } } },
      tooltip: {
        backgroundColor: '#1a3a8a',
        titleColor: '#e4e6eb',
        bodyColor: '#e4e6eb',
        cornerRadius: 6,
        padding: 10,
        titleFont: { size: 13, weight: 600 },
        bodyFont: { size: 12 },
      }
    },
    scales: {
      x: { ticks: { color: '#8a8d91' }, grid: { color: '#3a3b3c' } },
      y: { ticks: { color: '#8a8d91' }, grid: { color: '#3a3b3c' } },
    },
    onClick: function(evt, elements) {
      if (elements.length > 0) {
        var idx = elements[0].index;
        var label = chart.data.labels[idx];
        var value = chart.data.datasets[0].data[idx];
        sendPrompt('Break down the ' + label + ' revenue of ' + value);
      }
    }
  }
});
</script>
```

### Chart Theme Rules

- Background transparent (container provides `#242526`)
- Grid lines: `#3a3b3c`
- Tick labels: `#8a8d91`
- Legend text: `#e4e6eb`
- Tooltip: `backgroundColor: '#1a3a8a'`, white text, `cornerRadius: 6`
- Data colors: `#7d9fe3` primary, then `#4ade80`, `#fbbf24`, `#f87171`
- `hoverBackgroundColor` should be a lighter variant of the fill
- Always: `responsive: true`, `interaction: { intersect: false, mode: 'index' }`
- `borderRadius: 4` on bar charts
- Always configure `tooltip` plugin with themed colors
- Use `onClick` callback + `sendPrompt` when clicking a data point should trigger further analysis

### Chart Types

| Type | When |
|------|------|
| `bar` | Comparing categories |
| `line` | Trends over time |
| `doughnut` | Part-of-whole (not pie) |
| `radar` | Multi-axis comparison |
| `scatter` | Correlation between variables |

---

## Mermaid Diagrams

For complex flowcharts, sequence diagrams, or ER diagrams where hand-crafted SVG is tedious:

```html
<div id="diagram"></div>
<script type="module">
import mermaid from 'https://esm.sh/mermaid@10';
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#2d2e2f',
    primaryBorderColor: '#7d9fe3',
    primaryTextColor: '#e4e6eb',
    lineColor: '#7d9fe3',
    secondaryColor: '#1a3a8a',
    tertiaryColor: '#242526'
  }
});
const { svg } = await mermaid.render('d', `graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Action]
  B -->|No| D[Other]
`);
document.getElementById('diagram').innerHTML = svg;
</script>
```

Prefer hand-crafted HTML+SVG for interactive diagrams. Use Mermaid only for complex ER/sequence diagrams where layout is hard.

---

## Interactive Explainers

For concepts with parameters the user can explore:

```html
<style>
  .ctrl { margin-bottom: 16px; }
  .ctrl label { font-size: 12px; color: #8a8d91; display: block; margin-bottom: 4px; }
  .ctrl input[type=range] { width: 100%; accent-color: #7d9fe3; }
  .val { font-size: 14px; color: #7d9fe3; font-weight: 600; float: right; }
  .result { padding: 16px; background: #2d2e2f; border-radius: 8px; font-size: 14px; border: 1px solid #3a3b3c; }
  .result h4 { margin: 0 0 8px; font-size: 14px; color: #8a8d91; font-weight: 400; }
  .result .big { font-size: 28px; font-weight: 600; color: #7d9fe3; }
</style>
<div style="font-family: -apple-system, sans-serif; color: #e4e6eb;">
  <h3 style="margin: 0 0 16px; font-size: 18px; font-weight: 600;">Compound Interest</h3>
  <div class="ctrl">
    <label>Principal <span class="val" id="pv"></span></label>
    <input type="range" id="p" min="1000" max="100000" value="10000" step="1000">
  </div>
  <div class="ctrl">
    <label>Rate % <span class="val" id="rv"></span></label>
    <input type="range" id="r" min="1" max="20" value="7" step="0.5">
  </div>
  <div class="ctrl">
    <label>Years <span class="val" id="yv"></span></label>
    <input type="range" id="y" min="1" max="30" value="10">
  </div>
  <div class="result">
    <h4>Final Amount</h4>
    <div class="big" id="out"></div>
  </div>
</div>
<script>
var pe=document.getElementById('p'), re=document.getElementById('r'), ye=document.getElementById('y');
function calc() {
  var p=+pe.value, r=+re.value/100, y=+ye.value;
  document.getElementById('pv').textContent = '$'+p.toLocaleString();
  document.getElementById('rv').textContent = re.value+'%';
  document.getElementById('yv').textContent = y;
  document.getElementById('out').textContent = '$'+(p*Math.pow(1+r,y)).toLocaleString(undefined,{maximumFractionDigits:0});
}
pe.oninput=re.oninput=ye.oninput=calc;
calc();
</script>
```

### Explainer Patterns

- **Sliders** with live value display: `<input type="range">` + `oninput` handler
- **Toggle buttons** for switching views: styled `<button>` with `onclick` toggling state
- **Tabbed sections**: buttons that show/hide `<div>` sections
- **Live formulas**: calculate and display results reactively as inputs change
- **Step-through**: "Next"/"Prev" buttons revealing content progressively

---

## Comparison Layouts

Side-by-side cards with hover effects:

```html
<style>
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-family: -apple-system, sans-serif; color: #e4e6eb; }
  .card {
    background: #2d2e2f; padding: 16px; border-radius: 8px;
    border: 1px solid #3a3b3c; cursor: pointer;
    transition: all 0.15s ease;
  }
  .card:hover { border-color: #7d9fe3; background: #363738; transform: translateY(-2px); }
  .card h3 { margin: 0 0 8px; font-size: 16px; color: #7d9fe3; }
  .card p { margin: 0; font-size: 14px; color: #8a8d91; }
  .card .metric { font-size: 24px; font-weight: 600; color: #e4e6eb; margin: 8px 0; }
</style>
<div class="grid">
  <div class="card" onclick="sendPrompt('Tell me more about Option A')">
    <h3>Option A</h3>
    <div class="metric">$1,200/mo</div>
    <p>Description of this option</p>
  </div>
  <div class="card" onclick="sendPrompt('Tell me more about Option B')">
    <h3>Option B</h3>
    <div class="metric">$800/mo</div>
    <p>Description of this option</p>
  </div>
</div>
```

---

## UI Mockups

HTML+CSS layouts with hover states:

```html
<style>
  .mock { font-family: -apple-system, sans-serif; color: #e4e6eb; max-width: 400px; margin: 0 auto; }
  .mock-header { padding: 12px 16px; background: #1a3a8a; border-radius: 8px 8px 0 0; font-weight: 600; }
  .mock-body { padding: 16px; background: #2d2e2f; border-radius: 0 0 8px 8px; border: 1px solid #3a3b3c; border-top: 0; }
  .mock-row { padding: 10px 0; border-bottom: 1px solid #3a3b3c; display: flex; justify-content: space-between; transition: background 0.1s; }
  .mock-row:last-child { border-bottom: 0; }
  .mock-row:hover { background: #363738; margin: 0 -16px; padding: 10px 16px; border-radius: 4px; }
  .mock-btn { background: #7d9fe3; color: #fff; border: 0; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; transition: background 0.15s; }
  .mock-btn:hover { background: #9bb8f0; }
</style>
<div class="mock">
  <div class="mock-header">Settings</div>
  <div class="mock-body">
    <div class="mock-row"><span>Theme</span><span style="color:#8a8d91">Dark</span></div>
    <div class="mock-row"><span>Language</span><span style="color:#8a8d91">Dhivehi</span></div>
    <div class="mock-row"><span>Notifications</span><span style="color:#4ade80">On</span></div>
    <div style="margin-top: 16px; text-align: center;">
      <button class="mock-btn" onclick="sendPrompt('How do I customize the settings page?')">Customize</button>
    </div>
  </div>
</div>
```

---

## Critical Rules

- **Always use HTML mode for interactive content** — pure SVG mode has no JS or sendPrompt
- **Every clickable element needs `:hover` feedback** — fill change, border highlight, cursor pointer, transitions
- **Use `sendPrompt` for drill-down** — clicking a node/card/bar should trigger a follow-up explanation
- **Tooltips on hover** — show brief descriptions via positioned divs with `.visible` toggle
- **Transitions on everything interactive** — `transition: all 0.15s ease`
- **Title must be snake_case** — used as download filename
- **Use inline styles or `<style>` block** — no external CSS
- **Dark theme always** — bg `#242526`, text `#e4e6eb`
- **SVG inside HTML: always `width="100%"` + `viewBox`**
- **Max 2-3 accent colors** per visual
- **Labels 3-5 words**, subtitles <=5 words
- **CDN scripts at end** — content first, `<script src>`, then inline `<script>`
- **No `position: fixed`** — breaks auto-resize
- **No external API calls** — sandbox blocks them
- **Min font 11px**, touch targets >=44px
- **Design for expand** — widget has fullscreen button
