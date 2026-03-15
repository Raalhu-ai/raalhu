export default `# PowerPoint Creation (python-pptx) in Pyodide

## Setup
\`\`\`python
import micropip
await micropip.install('python-pptx')
from pptx import Presentation
from pptx.util import Inches, Pt, Cm
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
\`\`\`

## Basic Presentation
\`\`\`python
prs = Presentation()
slide = prs.slides.add_slide(prs.slide_layouts[0])
title = slide.shapes.title
subtitle = slide.placeholders[1]
title.text = 'Presentation Title'
subtitle.text = 'Subtitle text'
prs.save('/output/presentation.pptx')
\`\`\`

## Slide Layouts
| Index | Name |
|-------|------|
| 0 | Title Slide |
| 1 | Title and Content |
| 5 | Title Only |
| 6 | Blank |

## Text Boxes
\`\`\`python
txBox = slide.shapes.add_textbox(Inches(1), Inches(2), Inches(8), Inches(1.5))
tf = txBox.text_frame
tf.word_wrap = True
p = tf.paragraphs[0]
p.text = 'Text in a text box'
p.font.size = Pt(18)
\`\`\`

## Run-Level Styling
\`\`\`python
run = p.add_run()
run.text = 'Styled text'
run.font.size = Pt(14)
run.font.bold = True
run.font.color.rgb = RGBColor(0x1A, 0x3A, 0x8A)
\`\`\`

## Tables
\`\`\`python
table_shape = slide.shapes.add_table(4, 3, Inches(1), Inches(2), Inches(8), Inches(0.8))
table = table_shape.table
table.columns[0].width = Inches(3)
table.cell(0, 0).text = 'Header'
\`\`\`

## Images
\`\`\`python
slide.shapes.add_picture('/workspace/image.png', Inches(1), Inches(2), width=Inches(4))
\`\`\`

## Charts
\`\`\`python
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE

chart_data = CategoryChartData()
chart_data.categories = ['Q1', 'Q2', 'Q3', 'Q4']
chart_data.add_series('Revenue', (120, 150, 180, 200))

chart_frame = slide.shapes.add_chart(
    XL_CHART_TYPE.COLUMN_CLUSTERED,
    Inches(1), Inches(2), Inches(8), Inches(4.5),
    chart_data,
)
\`\`\`

## RTL / Thaana
\`\`\`python
def set_rtl_paragraph(paragraph):
    pPr = paragraph._p.get_or_add_pPr()
    pPr.set('rtl', '1')
    pPr.set('algn', 'r')

p = tf.add_paragraph()
run = p.add_run()
run.text = 'ތާނަ ލިޔުން'
run.font.name = 'MV Typewriter'
set_rtl_paragraph(p)
\`\`\`

## Preloaded Thaana Fonts

| Font | File | Use |
|------|------|-----|
| MV Typewriter Regular | \`/fonts/mvtyper.ttf\` | Body text |
| MV Typewriter Bold | \`/fonts/mvtypebold.ttf\` | Bold body text |
| Sangu Suruhee | \`/fonts/SanguSuruhee-Regular.ttf\` | Headings |

After saving, call \`embed_thaana_fonts_pptx()\` to embed fonts.

## Embedding Thaana Fonts

\`\`\`python
import zipfile, shutil, os
from xml.etree import ElementTree as ET

def embed_thaana_fonts_pptx(pptx_path):
    ET.register_namespace('a', 'http://schemas.openxmlformats.org/drawingml/2006/main')
    ET.register_namespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
    ET.register_namespace('p', 'http://schemas.openxmlformats.org/presentationml/2006/main')

    P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
    R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships'
    FONT_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/font'

    fonts = [
        ('MV Typewriter', '/fonts/mvtyper.ttf', '/fonts/mvtypebold.ttf'),
        ('Sangu Suruhee', '/fonts/SanguSuruhee-Regular.ttf', None),
    ]

    tmp = pptx_path + '.tmp'
    shutil.copy2(pptx_path, tmp)

    with zipfile.ZipFile(tmp, 'r') as zin, \\
         zipfile.ZipFile(pptx_path, 'w', zipfile.ZIP_DEFLATED) as zout:

        entries = {name: zin.read(name) for name in zin.namelist()}
        pres = ET.fromstring(entries['ppt/presentation.xml'])
        rels_path = 'ppt/_rels/presentation.xml.rels'
        rels = ET.fromstring(entries[rels_path]) if rels_path in entries else ET.fromstring(f'<Relationships xmlns="{REL_NS}"/>')
        ct = ET.fromstring(entries['[Content_Types].xml'])

        rid = sum(1 for _ in rels.findall(f'{{{REL_NS}}}Relationship')) + 1
        added = {}

        efl = pres.find(f'{{{P}}}embeddedFontLst')
        if efl is None:
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

prs.save('/output/presentation.pptx')
embed_thaana_fonts_pptx('/output/presentation.pptx')
\`\`\`

## Critical Rules

- **Always save to \`/output/\`** directory
- **Use \`present_file\`** after saving
- **Embed Thaana fonts** — call \`embed_thaana_fonts_pptx()\` after saving
- **Set slide size early**
- **Each \`execute_python\` call is a fresh scope**`;
