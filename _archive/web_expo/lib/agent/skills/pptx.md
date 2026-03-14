# PowerPoint Creation (python-pptx) in Pyodide

## Quick Reference

| Task | Approach |
|------|----------|
| Create new presentation | `Presentation()` → `prs.save(path)` |
| Open existing presentation | `Presentation(path)` |
| Add slide | `prs.slides.add_slide(layout)` |
| Add text | Text frames, paragraphs, runs |
| Add table | `slide.shapes.add_table(rows, cols, ...)` |
| Add image | `slide.shapes.add_picture(path, ...)` |
| Add chart | `slide.shapes.add_chart(chart_type, ...)` |
| RTL / Thaana text | XML manipulation via `oxml` |

## Setup

```python
import micropip
await micropip.install('python-pptx')
from pptx import Presentation
from pptx.util import Inches, Pt, Cm, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.chart import XL_CHART_TYPE
```

## Basic Presentation

```python
prs = Presentation()

# Title slide
slide_layout = prs.slide_layouts[0]  # Title Slide
slide = prs.slides.add_slide(slide_layout)
title = slide.shapes.title
subtitle = slide.placeholders[1]
title.text = 'Presentation Title'
subtitle.text = 'Subtitle text'

prs.save('/output/presentation.pptx')
```

## Slide Layouts

python-pptx's default template includes these layouts:

| Index | Name | Description |
|-------|------|-------------|
| 0 | Title Slide | Title + subtitle |
| 1 | Title and Content | Title + body placeholder |
| 2 | Section Header | Section divider |
| 3 | Two Content | Title + two body columns |
| 4 | Comparison | Title + two labeled columns |
| 5 | Title Only | Title placeholder only |
| 6 | Blank | No placeholders |
| 7 | Content with Caption | Body + side caption |
| 8 | Picture with Caption | Picture + caption |

```python
# Add different slide types
title_slide = prs.slides.add_slide(prs.slide_layouts[0])
content_slide = prs.slides.add_slide(prs.slide_layouts[1])
blank_slide = prs.slides.add_slide(prs.slide_layouts[6])
```

## Slide Size

```python
from pptx.util import Inches, Emu

# Standard (4:3)
prs.slide_width = Inches(10)
prs.slide_height = Inches(7.5)

# Widescreen (16:9) — default
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# Custom size
prs.slide_width = Cm(25.4)
prs.slide_height = Cm(19.05)
```

## Text (Text Frames, Paragraphs, Runs)

```python
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor

# Using a placeholder
slide = prs.slides.add_slide(prs.slide_layouts[1])
title = slide.shapes.title
title.text = 'Slide Title'

body = slide.placeholders[1]
tf = body.text_frame
tf.text = 'First paragraph'  # Sets the first paragraph

# Add more paragraphs
p = tf.add_paragraph()
p.text = 'Second paragraph'
p.level = 1  # Indent level (0-8)

p2 = tf.add_paragraph()
p2.text = 'Third paragraph'
p2.level = 0
```

### Adding a Text Box

```python
from pptx.util import Inches, Pt

txBox = slide.shapes.add_textbox(Inches(1), Inches(2), Inches(8), Inches(1.5))
tf = txBox.text_frame
tf.word_wrap = True

p = tf.paragraphs[0]
p.text = 'Text in a text box'
p.font.size = Pt(18)
```

### Run-Level Styling

```python
from pptx.dml.color import RGBColor

p = tf.add_paragraph()
run = p.add_run()
run.text = 'Styled text'
run.font.size = Pt(14)
run.font.bold = True
run.font.italic = True
run.font.underline = True
run.font.color.rgb = RGBColor(0x1A, 0x3A, 0x8A)  # Cobalt blue
run.font.name = 'MV Typewriter'

# Multiple runs in one paragraph
p = tf.add_paragraph()
run1 = p.add_run()
run1.text = 'Normal text, '
run2 = p.add_run()
run2.text = 'bold text, '
run2.font.bold = True
run3 = p.add_run()
run3.text = 'colored text'
run3.font.color.rgb = RGBColor(0x7D, 0x9F, 0xE3)
```

### Paragraph Alignment

```python
from pptx.enum.text import PP_ALIGN

p.alignment = PP_ALIGN.CENTER    # CENTER, LEFT, RIGHT, JUSTIFY
```

### Paragraph Spacing

```python
from pptx.util import Pt

p.space_before = Pt(6)
p.space_after = Pt(6)
p.line_spacing = Pt(18)  # Or use a float for multiple (e.g., 1.5)
```

## Slide Background

```python
from pptx.dml.color import RGBColor

background = slide.background
fill = background.fill
fill.solid()
fill.fore_color.rgb = RGBColor(0x24, 0x25, 0x26)  # Dark background
```

## Tables

```python
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor

rows, cols = 4, 3
left = Inches(1)
top = Inches(2)
width = Inches(8)
height = Inches(0.8)

table_shape = slide.shapes.add_table(rows, cols, left, top, width, height)
table = table_shape.table

# Set column widths
table.columns[0].width = Inches(3)
table.columns[1].width = Inches(3)
table.columns[2].width = Inches(2)

# Populate header row
headers = ['Name', 'Department', 'Amount']
for i, header in enumerate(headers):
    cell = table.cell(0, i)
    cell.text = header

# Populate data rows
data = [
    ['Ahmed', 'Finance', '50,000'],
    ['Fatima', 'HR', '45,000'],
    ['Hassan', 'IT', '55,000'],
]
for row_idx, row_data in enumerate(data, 1):
    for col_idx, val in enumerate(row_data):
        table.cell(row_idx, col_idx).text = val
```

### Table Cell Styling

```python
from pptx.dml.color import RGBColor
from pptx.util import Pt
from pptx.oxml.ns import qn

# Header row styling
for i in range(cols):
    cell = table.cell(0, i)
    # Background fill
    cell.fill.solid()
    cell.fill.fore_color.rgb = RGBColor(0x1A, 0x3A, 0x8A)
    # Text styling
    for paragraph in cell.text_frame.paragraphs:
        for run in paragraph.runs:
            run.font.bold = True
            run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            run.font.size = Pt(11)

# Cell vertical alignment
from pptx.enum.text import MSO_ANCHOR
cell.vertical_anchor = MSO_ANCHOR.MIDDLE
```

### Merged Cells

```python
# Merge cells
cell_a = table.cell(0, 0)
cell_b = table.cell(0, 2)
cell_a.merge(cell_b)  # Merges row 0, cols 0-2
```

## Images

```python
from pptx.util import Inches

# Image must exist in the virtual filesystem
slide.shapes.add_picture(
    '/workspace/image.png',
    left=Inches(1),
    top=Inches(2),
    width=Inches(4),
    # height auto-calculated to preserve aspect ratio
)

# With explicit height (aspect ratio NOT preserved)
slide.shapes.add_picture(
    '/workspace/photo.jpg',
    left=Inches(1),
    top=Inches(2),
    width=Inches(4),
    height=Inches(3),
)

# Full-slide background image (on blank slide)
slide = prs.slides.add_slide(prs.slide_layouts[6])
slide.shapes.add_picture(
    '/workspace/bg.jpg',
    left=0, top=0,
    width=prs.slide_width,
    height=prs.slide_height,
)
```

## Shapes

```python
from pptx.util import Inches
from pptx.enum.shapes import MSO_SHAPE
from pptx.dml.color import RGBColor

# Rectangle
shape = slide.shapes.add_shape(
    MSO_SHAPE.RECTANGLE,
    left=Inches(1), top=Inches(2),
    width=Inches(3), height=Inches(1.5),
)
shape.fill.solid()
shape.fill.fore_color.rgb = RGBColor(0x1A, 0x3A, 0x8A)
shape.line.color.rgb = RGBColor(0x7D, 0x9F, 0xE3)
shape.line.width = Pt(2)

# Add text to shape
shape.text = 'Shape text'
shape.text_frame.paragraphs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

# Rounded rectangle
shape = slide.shapes.add_shape(
    MSO_SHAPE.ROUNDED_RECTANGLE,
    Inches(1), Inches(2), Inches(3), Inches(1),
)

# Common shapes: RECTANGLE, ROUNDED_RECTANGLE, OVAL, TRIANGLE,
#   DIAMOND, PENTAGON, HEXAGON, ARROW_RIGHT, STAR_5_POINT
```

## Charts

```python
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE
from pptx.util import Inches

# Bar chart
chart_data = CategoryChartData()
chart_data.categories = ['Q1', 'Q2', 'Q3', 'Q4']
chart_data.add_series('Revenue', (120, 150, 180, 200))
chart_data.add_series('Expenses', (80, 90, 100, 110))

chart_frame = slide.shapes.add_chart(
    XL_CHART_TYPE.COLUMN_CLUSTERED,
    Inches(1), Inches(2), Inches(8), Inches(4.5),
    chart_data,
)
chart = chart_frame.chart
chart.has_legend = True

# Line chart
chart_data = CategoryChartData()
chart_data.categories = ['Jan', 'Feb', 'Mar', 'Apr', 'May']
chart_data.add_series('Growth', (10, 15, 25, 30, 45))

chart_frame = slide.shapes.add_chart(
    XL_CHART_TYPE.LINE,
    Inches(1), Inches(2), Inches(8), Inches(4.5),
    chart_data,
)

# Pie chart
chart_data = CategoryChartData()
chart_data.categories = ['A', 'B', 'C', 'D']
chart_data.add_series('Share', (35, 25, 20, 20))

chart_frame = slide.shapes.add_chart(
    XL_CHART_TYPE.PIE,
    Inches(2), Inches(2), Inches(6), Inches(4.5),
    chart_data,
)

# Chart types: COLUMN_CLUSTERED, COLUMN_STACKED, BAR_CLUSTERED,
#   LINE, LINE_MARKERS, PIE, DOUGHNUT, AREA, XY_SCATTER
```

## Preloaded Thaana Fonts

Three Thaana font files are preloaded in the virtual filesystem at `/fonts/`:

| Font | File | Use |
|------|------|-----|
| MV Typewriter Regular | `/fonts/mvtyper.ttf` | Body text |
| MV Typewriter Bold | `/fonts/mvtypebold.ttf` | Bold body text |
| Sangu Suruhee | `/fonts/SanguSuruhee-Regular.ttf` | Headings |

Set on runs:
```python
run.font.name = 'MV Typewriter'     # Body text
run.font.name = 'Sangu Suruhee'     # Headings
```

After saving, call `embed_thaana_fonts_pptx()` to embed fonts in the file (see below).

## RTL / Thaana Text

python-pptx has no native RTL support. Use XML manipulation:

```python
from pptx.oxml.ns import qn

def set_rtl_paragraph(paragraph):
    """Set a paragraph to RTL direction."""
    pPr = paragraph._p.get_or_add_pPr()
    pPr.set('rtl', '1')
    pPr.set('algn', 'r')  # Right-align

def set_run_rtl(run):
    """Set a run to RTL direction."""
    rPr = run._r.get_or_add_rPr()
    rPr.set('lang', 'dv-MV')
    rPr.set('altLang', 'en-US')

# Usage
p = tf.add_paragraph()
run = p.add_run()
run.text = 'ތާނަ ލިޔުން'
run.font.name = 'MV Typewriter'
set_rtl_paragraph(p)
set_run_rtl(run)
p.alignment = PP_ALIGN.RIGHT
```

**CRITICAL: Thaana font must be set on the run.** Use `MV Typewriter` for body text or `Sangu Suruhee` for headings — both are preloaded at `/fonts/`. After saving, call `embed_thaana_fonts_pptx()` to embed fonts.

## Theme Colors

Default presentation accent colors (adapt based on user's content and context):

| Role | Hex | RGB | Use |
|------|-----|-----|-----|
| Primary accent | `#1a3a8a` | (26, 58, 138) | Headings, shapes, chart colors |
| Light accent | `#7d9fe3` | (125, 159, 227) | Secondary elements, highlights |
| Dark background | `#242526` | (36, 37, 38) | Dark slide backgrounds |
| White text | `#FFFFFF` | (255, 255, 255) | Text on dark backgrounds |

These are sensible defaults. **Adapt colors to match the presentation's purpose** — a corporate deck might use the company's brand colors, a school project could use brighter colors, a medical presentation might use calming greens/blues. When the user specifies colors or a theme, use those instead.

### Applying Theme Colors

```python
from pptx.dml.color import RGBColor

# Dark slide with white text
slide.background.fill.solid()
slide.background.fill.fore_color.rgb = RGBColor(0x24, 0x25, 0x26)

title.text_frame.paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

# Accent-colored shape
shape.fill.solid()
shape.fill.fore_color.rgb = RGBColor(0x1A, 0x3A, 0x8A)
```

## Embedding Thaana Fonts

After saving a presentation with Thaana text, call `embed_thaana_fonts_pptx()` to embed the actual TTF files into the .pptx. This ensures correct rendering on any system.

**Always embed fonts when the presentation contains Thaana text.**

```python
import zipfile, shutil, os
from xml.etree import ElementTree as ET

def embed_thaana_fonts_pptx(pptx_path):
    """Embed MV Typewriter and Sangu Suruhee fonts into a .pptx file."""
    ET.register_namespace('a', 'http://schemas.openxmlformats.org/drawingml/2006/main')
    ET.register_namespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
    ET.register_namespace('p', 'http://schemas.openxmlformats.org/presentationml/2006/main')

    P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
    A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
    R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships'
    FONT_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/font'

    fonts = [
        ('MV Typewriter', '/fonts/mvtyper.ttf', '/fonts/mvtypebold.ttf'),
        ('Sangu Suruhee', '/fonts/SanguSuruhee-Regular.ttf', None),
    ]

    tmp = pptx_path + '.tmp'
    shutil.copy2(pptx_path, tmp)

    with zipfile.ZipFile(tmp, 'r') as zin, \
         zipfile.ZipFile(pptx_path, 'w', zipfile.ZIP_DEFLATED) as zout:

        entries = {name: zin.read(name) for name in zin.namelist()}

        pres = ET.fromstring(entries['ppt/presentation.xml'])
        rels_path = 'ppt/_rels/presentation.xml.rels'
        rels = ET.fromstring(entries[rels_path]) if rels_path in entries else ET.fromstring(f'<Relationships xmlns="{REL_NS}"/>')
        ct = ET.fromstring(entries['[Content_Types].xml'])

        rid = sum(1 for _ in rels.findall(f'{{{REL_NS}}}Relationship')) + 1
        added = {}

        # Find or create embeddedFontLst
        efl = pres.find(f'{{{P}}}embeddedFontLst')
        if efl is None:
            # Insert after sldIdLst or sldMasterIdLst
            idx = 0
            for i, child in enumerate(pres):
                tag = child.tag.split('}')[-1] if '}' in child.tag else child.tag
                if tag in ('sldMasterIdLst', 'sldIdLst', 'notesMasterIdLst'):
                    idx = i + 1
            efl = ET.Element(f'{{{P}}}embeddedFontLst')
            pres.insert(idx, efl)

        for font_name, reg_path, bold_path in fonts:
            ef = ET.SubElement(efl, f'{{{P}}}embeddedFont')
            font_el = ET.SubElement(ef, f'{{{P}}}font')
            font_el.set('typeface', font_name)

            for style, src, tag in [('regular', reg_path, 'regular'), ('bold', bold_path, 'bold')]:
                if not src or not os.path.exists(src):
                    continue
                fname = font_name.replace(' ', '') + '_' + style + '.fntdata'
                with open(src, 'rb') as f:
                    added[f'ppt/fonts/{fname}'] = f.read()
                rid_str = f'rIdFont{rid}'
                rid += 1
                rel = ET.SubElement(rels, f'{{{REL_NS}}}Relationship')
                rel.set('Id', rid_str)
                rel.set('Type', FONT_REL)
                rel.set('Target', f'fonts/{fname}')
                embed = ET.SubElement(ef, f'{{{P}}}{tag}')
                embed.set(f'{{{R}}}id', rid_str)

        # Add fntdata content type
        has_fnt = any(d.get('Extension') == 'fntdata' for d in ct.findall('Default'))
        if not has_fnt:
            d = ET.SubElement(ct, 'Default')
            d.set('Extension', 'fntdata')
            d.set('ContentType', 'application/x-fontdata')

        for name, data in entries.items():
            if name == 'ppt/presentation.xml':
                zout.writestr(name, ET.tostring(pres, xml_declaration=True, encoding='UTF-8'))
            elif name == rels_path:
                zout.writestr(name, ET.tostring(rels, xml_declaration=True, encoding='UTF-8'))
            elif name == '[Content_Types].xml':
                zout.writestr(name, ET.tostring(ct, xml_declaration=True, encoding='UTF-8'))
            else:
                zout.writestr(name, data)

        if rels_path not in entries:
            zout.writestr(rels_path, ET.tostring(rels, xml_declaration=True, encoding='UTF-8'))
        for zpath, fdata in added.items():
            zout.writestr(zpath, fdata)

    os.remove(tmp)
    print(f'Fonts embedded in {pptx_path}')


# Usage:
prs.save('/output/presentation.pptx')
embed_thaana_fonts_pptx('/output/presentation.pptx')
# then call present_file
```

## Reading Existing Presentations

```python
prs = Presentation('/workspace/uploaded.pptx')

# Iterate slides
for slide in prs.slides:
    for shape in slide.shapes:
        if shape.has_text_frame:
            print(shape.text)
        if shape.has_table:
            for row in shape.table.rows:
                for cell in row.cells:
                    print(cell.text)
```

## Critical Rules

- **Always save to `/output/`** directory
- **Use `present_file`** after saving to show the user the downloadable file
- **Embed Thaana fonts** — call `embed_thaana_fonts_pptx()` after saving any presentation with Thaana text
- **Set slide size early** — changing slide size after adding content can misalign shapes
- **Thaana requires manual RTL + font** — set paragraph RTL via XML, font name on run, use `MV Typewriter` or `Sangu Suruhee`
- **Layout indices may vary** — the 0-8 indices are for the default template; custom templates may differ
- **Charts render in PowerPoint** — python-pptx embeds chart definitions; data and visuals populate when opened
- **Each `execute_python` call is a fresh scope** — re-import everything at the top of each call
- **Files must exist in the virtual filesystem** — use `write_file` tool or previous `execute_python` to create images before referencing them
