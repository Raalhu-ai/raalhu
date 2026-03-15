# Inline Visualiser — show_widget Skill

Render interactive visuals inline in chat using `show_widget`. The client wrapper provides CSS variables, SVG utility classes, color ramps, form defaults, and a pre-defined arrow marker — write minimal code.

## Modes

- **SVG mode**: `widget_code` starts with `<svg`. Static only — no JS, no `sendPrompt`.
- **HTML mode**: Everything else. Supports JS, events, `sendPrompt`. **Use this for ALL interactive content** — embed `<svg>` inside HTML.

**If it needs click, hover, or animation → use HTML mode.**

**IMPORTANT: Always output HTML fragments only — NEVER a full document with `<!DOCTYPE>`, `<html>`, `<head>`, or `<body>` tags.** The wrapper provides the document shell, dark theme, fonts, and all utilities. Just output the content that goes inside `<body>`.

## Pre-built Utilities (injected by client)

### CSS Variables

Use `var(--name)` in both CSS and inline styles. Available everywhere.

| Var | Value | Use |
|-----|-------|-----|
| `--p` | `#e4e6eb` | Primary text |
| `--s` | `#8a8d91` | Secondary/muted text |
| `--t` | `#6b6d71` | Tertiary text |
| `--bg` | `#242526` | Background |
| `--bg2` | `#2d2e2f` | Surface / card bg |
| `--bg3` | `#363738` | Hover surface |
| `--acc` | `#7d9fe3` | Accent |
| `--acc-d` | `#1a3a8a` | Accent dark |
| `--b` | `#3a3b3c` | Border |
| `--ok` | `#4ade80` | Success |
| `--warn` | `#fbbf24` | Warning |
| `--err` | `#f87171` | Danger |
| `--font` | MV Typewriter + system | Body font stack |
| `--font-h` | Sangu Suruhee + system | Heading font stack |
| `--radius` | `8px` | Border radius |

### SVG Utility Classes

Apply directly to SVG elements — no inline `fill`/`font-size` needed.

| Class | What it sets |
|-------|-------------|
| `.t` | 14px text, primary color, body font |
| `.ts` | 12px text, muted color, body font |
| `.th` | 14px text, primary color, bold (600), body font |
| `.box` | Surface fill (`--bg2`), border stroke, 1px width |
| `.arr` | Accent stroke, no fill, 1.5px width |
| `.leader` | Muted dashed line (4 3 dash pattern) |

### `.node` Interaction Class

Add `class="node"` to any `<g>` wrapping a rect+text. Automatically gets:
- `cursor: pointer`
- Hover: child rects brighten (30%), text dims slightly
- Works with color ramps — hover brightens the ramp color

### Color Ramp Classes

Apply to a `<g>` wrapping rect+text. Sets fill, stroke, and text colors as a coordinated palette.

| Class | Fill | Stroke | Text |
|-------|------|--------|------|
| `.c-blue` | `#0c447c` | `#85b7eb` | `#b5d4f4` |
| `.c-teal` | `#085041` | `#5dcaa5` | `#9fe1cb` |
| `.c-coral` | `#712b13` | `#f0997b` | `#f5c4b3` |
| `.c-purple` | `#3c3489` | `#afa9ec` | `#cecbf6` |
| `.c-pink` | `#72243e` | `#ed93b1` | `#f4c0d1` |
| `.c-gray` | `#444441` | `#b4b2a9` | `#d3d1c7` |
| `.c-green` | `#27500a` | `#97c459` | `#c0dd97` |
| `.c-amber` | `#633806` | `#ef9f27` | `#fac775` |
| `.c-red` | `#791f1f` | `#f09595` | `#f7c1c1` |

Usage: `<g class="node c-blue">` for a clickable blue node.

### Pre-defined Arrow Marker

`marker-end="url(#arrow)"` is available on any `<line>` or `<path>`. Accent-colored arrowhead. No need to define `<defs>` or `<marker>`.

### Auto-styled Form Elements

Bare `<input>`, `<select>`, `<textarea>`, `<button>` are automatically dark-themed with:
- Focus rings (accent glow)
- Hover states
- Range sliders with styled thumbs
- Buttons with hover/active transitions

Write plain HTML — styling is automatic.

## sendPrompt Bridge

`sendPrompt(text)` is available in **HTML mode only**. Sends a message to chat as if the user typed it.

Use for: clicking diagram nodes to explore, chart segments to drill down.
Don't use for: filtering, sorting, toggling — handle in local JS.

## Choosing the Right Visual

| User says | What to build |
|-----------|---------------|
| "how does X work" | Interactive diagram — SVG with clickable `.node` groups |
| "what are the parts of X" | Structural diagram — colored `.node` boxes with `.c-*` ramps |
| "walk me through steps" | Flowchart — `.node` boxes + `.arr` connectors + `url(#arrow)` |
| "compare X vs Y" | Side-by-side cards with hover + `sendPrompt` |
| "show me the data" | Chart.js with tooltips + click callbacks |
| "explain X" | Interactive explainer — sliders, buttons, live state |

**Always use HTML mode.** Pure SVG mode only for simple decorative art.

---

## Interactive Diagram Example

```html
<div style="position:relative">
  <div id="tip" style="position:absolute;background:var(--acc-d);color:var(--p);padding:8px 12px;border-radius:6px;font-size:12px;pointer-events:none;opacity:0;transition:opacity .15s;max-width:220px;z-index:10"></div>
  <svg width="100%" viewBox="0 0 680 200">
    <g class="node c-blue" onclick="sendPrompt('Explain step 1')"
       onmouseenter="showTip(evt,this)" onmouseleave="hideTip()" data-tip="First step details">
      <rect x="240" y="20" width="200" height="56" rx="4"/>
      <text x="340" y="45" text-anchor="middle" class="th">Step One</text>
      <text x="340" y="62" text-anchor="middle" class="ts">click for details</text>
    </g>
    <line x1="340" y1="76" x2="340" y2="110" class="arr" marker-end="url(#arrow)"/>
    <g class="node c-teal" onclick="sendPrompt('Explain step 2')"
       onmouseenter="showTip(evt,this)" onmouseleave="hideTip()" data-tip="Second step details">
      <rect x="240" y="110" width="200" height="56" rx="4"/>
      <text x="340" y="135" text-anchor="middle" class="th">Step Two</text>
      <text x="340" y="152" text-anchor="middle" class="ts">click for details</text>
    </g>
  </svg>
</div>
<script>
var tip=document.getElementById('tip');
function showTip(e,el){
  tip.textContent=el.dataset.tip;tip.style.opacity='1';
  var r=el.querySelector('rect,circle,ellipse').getBoundingClientRect(),p=el.closest('div').getBoundingClientRect();
  var left=r.left-p.left+r.width/2-tip.offsetWidth/2;
  var top=r.top-p.top-tip.offsetHeight-8;
  if(top<0) top=r.bottom-p.top+8;
  if(left<0) left=4;
  if(left+tip.offsetWidth>p.width) left=p.width-tip.offsetWidth-4;
  tip.style.left=left+'px';tip.style.top=top+'px';
}
function hideTip(){tip.style.opacity='0'}
</script>
```

Notice: no `fill`, `stroke`, `font-size`, `font-family` attrs — all handled by `.th`, `.ts`, `.c-blue`, `.c-teal`. No `<marker>` definition — `url(#arrow)` is pre-defined. `.node` provides hover interaction automatically.

---

## Chart.js Example

```html
<canvas id="chart" style="width:100%;max-height:400px"></canvas>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<script>
var c=new Chart(document.getElementById('chart'),{
  type:'bar',
  data:{
    labels:['Q1','Q2','Q3','Q4'],
    datasets:[{label:'Revenue',data:[120,150,180,200],backgroundColor:'#7d9fe3',hoverBackgroundColor:'#9bb8f0',borderRadius:4}]
  },
  options:{
    responsive:true,
    interaction:{intersect:false,mode:'index'},
    plugins:{
      legend:{labels:{color:'#e4e6eb',font:{size:13}}},
      tooltip:{backgroundColor:'#1a3a8a',titleColor:'#e4e6eb',bodyColor:'#e4e6eb',cornerRadius:6,padding:10}
    },
    scales:{
      x:{ticks:{color:'#8a8d91'},grid:{display:false}},
      y:{ticks:{color:'#8a8d91'},grid:{color:'#3a3b3c'}}
    },
    onClick:function(e,els){
      if(els.length){var i=els[0].index;sendPrompt('Break down '+c.data.labels[i]+' revenue')}
    }
  }
});
</script>
```

Chart.js tooltip interactivity is built-in. Use `onClick` + `sendPrompt` for drill-down.

### Chart Colors

- Primary: `#7d9fe3` (accent), hover: `#9bb8f0`
- Multi-series: `#7d9fe3`, `#4ade80`, `#fbbf24`, `#f87171`
- Grid: `#3a3b3c`, ticks: `#8a8d91`, legend: `#e4e6eb`
- Tooltip bg: `#1a3a8a`

---

## Interactive Explainer Example

```html
<h3 style="margin:0 0 16px;font-size:18px">Compound Interest</h3>
<label style="font-size:12px;color:var(--s)">Principal <span id="pv" style="float:right;color:var(--acc);font-weight:600"></span></label>
<input type="range" id="p" min="1000" max="100000" value="10000" step="1000">
<label style="font-size:12px;color:var(--s);margin-top:12px;display:block">Rate % <span id="rv" style="float:right;color:var(--acc);font-weight:600"></span></label>
<input type="range" id="r" min="1" max="20" value="7" step="0.5">
<div style="margin-top:16px;padding:16px;background:var(--bg2);border-radius:var(--radius);border:1px solid var(--b)">
  <div style="font-size:12px;color:var(--s)">Final Amount</div>
  <div id="out" style="font-size:28px;font-weight:600;color:var(--acc);margin-top:4px"></div>
</div>
<script>
var pe=document.getElementById('p'),re=document.getElementById('r');
function calc(){
  var p=+pe.value,r=+re.value/100;
  document.getElementById('pv').textContent='$'+p.toLocaleString();
  document.getElementById('rv').textContent=re.value+'%';
  document.getElementById('out').textContent='$'+(p*Math.pow(1+r,10)).toLocaleString(undefined,{maximumFractionDigits:0});
}
pe.oninput=re.oninput=calc;calc();
</script>
```

Range sliders are auto-styled by the wrapper — no CSS needed.

---

## Comparison Layout Example

```html
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
  <button style="text-align:left;padding:16px;background:var(--bg2);border-color:var(--b);border-radius:var(--radius)" onclick="sendPrompt('Tell me more about Option A')">
    <div style="font-size:16px;color:var(--acc);font-weight:600;margin-bottom:4px">Option A</div>
    <div style="font-size:24px;font-weight:600;margin-bottom:8px">$1,200/mo</div>
    <div style="font-size:14px;color:var(--s)">Description here</div>
  </button>
  <button style="text-align:left;padding:16px;background:var(--bg2);border-color:var(--b);border-radius:var(--radius)" onclick="sendPrompt('Tell me more about Option B')">
    <div style="font-size:16px;color:var(--acc);font-weight:600;margin-bottom:4px">Option B</div>
    <div style="font-size:24px;font-weight:600;margin-bottom:8px">$800/mo</div>
    <div style="font-size:14px;color:var(--s)">Description here</div>
  </button>
</div>
```

Using `<button>` gives automatic hover/active states from the wrapper.

---

## Critical Rules

- **NEVER output a full HTML document** — no `<!DOCTYPE>`, `<html>`, `<head>`, `<body>` tags. Only output HTML/SVG fragments. The wrapper provides the document shell.
- **NEVER set background on html or body** — the wrapper provides a dark transparent background
- **NEVER hardcode hex color values** — always use CSS variables: `var(--p)`, `var(--bg2)`, `var(--acc)`, etc.
- **Use HTML mode for all interactive content** — SVG mode has no JS
- **Use utility classes** — `.t`, `.th`, `.ts`, `.box`, `.arr`, `.node`, `.c-*` — don't repeat inline styles
- **Use `url(#arrow)`** — pre-defined, don't create `<marker>` definitions
- **Use `sendPrompt` for drill-down** — click nodes/cards/bars to trigger follow-up
- **`.node` class for interactive SVG groups** — hover is automatic
- **Bare form elements are auto-styled** — don't add CSS for inputs/buttons/selectors
- **Title must be snake_case**
- **SVG: `width="100%"` + `viewBox`** — never fixed pixel widths
- **CDN scripts at end** — content, then `<script src>`, then inline `<script>`
- **No `position: fixed`** — breaks auto-resize
- **No external API calls** — sandbox blocks them
- **Min font 11px**, touch targets >=44px
- **ViewBox width: 680px standard**
