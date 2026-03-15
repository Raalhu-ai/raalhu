export default `# Word Document Creation (python-docx) in Pyodide

## Quick Reference

| Task | Approach |
|------|----------|
| Create new document | python-docx (see sections below) |
| Read .docx content | python-docx \`Document(path)\` — iterate paragraphs/tables |
| RTL / Thaana text | XML manipulation via \`oxml\` (python-docx has no native RTL) |
| Features not in python-docx API | Direct XML via \`oxml.ns.qn\` (hyperlinks, TOC, footnotes, columns) |

## Setup
\`\`\`python
import micropip
await micropip.install('python-docx')
from docx import Document
from docx.shared import Inches, Pt, Cm, Emu, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.section import WD_ORIENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml
\`\`\`

## Basic Document
\`\`\`python
doc = Document()
doc.add_heading('Document Title', level=0)  # Title style
doc.add_paragraph('Normal paragraph text')
doc.add_heading('Section Heading', level=1)
doc.add_paragraph('Section content here')
doc.save('/output/document.docx')
\`\`\`

## Page Size and Margins

\`\`\`python
from docx.shared import Inches, Cm

section = doc.sections[0]

# US Letter (8.5 x 11 inches)
section.page_width = Inches(8.5)
section.page_height = Inches(11)

# A4 (21 x 29.7 cm) — python-docx default
section.page_width = Cm(21)
section.page_height = Cm(29.7)

# Margins (1 inch all around)
section.top_margin = Inches(1)
section.bottom_margin = Inches(1)
section.left_margin = Inches(1)
section.right_margin = Inches(1)
\`\`\`

**Landscape orientation:**
\`\`\`python
section.orientation = WD_ORIENT.LANDSCAPE
# CRITICAL: You must also swap width and height manually
section.page_width, section.page_height = section.page_height, section.page_width
\`\`\`

## Styles (Override Built-in Headings)

\`\`\`python
from docx.shared import Pt, RGBColor

style = doc.styles['Heading 1']
style.font.size = Pt(16)
style.font.bold = True
style.font.color.rgb = RGBColor(0, 0, 0)
style.font.name = 'Arial'
style.paragraph_format.space_before = Pt(12)
style.paragraph_format.space_after = Pt(12)

style = doc.styles['Heading 2']
style.font.size = Pt(14)
style.font.bold = True
style.font.name = 'Arial'

# Default paragraph font
style = doc.styles['Normal']
style.font.size = Pt(12)
style.font.name = 'Arial'
\`\`\`

## Run-Level Styling
\`\`\`python
p = doc.add_paragraph()
run = p.add_run('Bold and colored text')
run.font.size = Pt(14)
run.font.bold = True
run.font.italic = True
run.font.underline = True
run.font.color.rgb = RGBColor(0x2E, 0x86, 0xAB)
run.font.name = 'Arial'

# Multiple runs in one paragraph
p = doc.add_paragraph()
p.add_run('Normal text, ')
bold_run = p.add_run('bold text, ')
bold_run.bold = True
p.add_run('normal again.')
\`\`\`

## Paragraph Alignment
\`\`\`python
from docx.enum.text import WD_ALIGN_PARAGRAPH

p = doc.add_paragraph('Centered text')
p.alignment = WD_ALIGN_PARAGRAPH.CENTER

# Options: LEFT, CENTER, RIGHT, JUSTIFY
\`\`\`

## Paragraph Spacing and Indentation
\`\`\`python
from docx.shared import Pt, Inches

p = doc.add_paragraph('Indented paragraph')
fmt = p.paragraph_format
fmt.space_before = Pt(12)
fmt.space_after = Pt(6)
fmt.line_spacing = Pt(18)       # Fixed line spacing
fmt.first_line_indent = Inches(0.5)
fmt.left_indent = Inches(0.5)   # Block indent
\`\`\`

## Lists (NEVER use unicode bullets)

\`\`\`python
# ❌ WRONG — never manually insert bullet characters
doc.add_paragraph('• Item')       # BAD
doc.add_paragraph('\\u2022 Item')  # BAD

# ✅ CORRECT — use built-in list styles
doc.add_paragraph('First item', style='List Bullet')
doc.add_paragraph('Second item', style='List Bullet')
doc.add_paragraph('Third item', style='List Bullet')

# Numbered list
doc.add_paragraph('Step one', style='List Number')
doc.add_paragraph('Step two', style='List Number')

# Nested lists (indent levels)
doc.add_paragraph('Top level', style='List Bullet')
doc.add_paragraph('Nested item', style='List Bullet 2')
doc.add_paragraph('Deeper nested', style='List Bullet 3')
\`\`\`

## Tables

**CRITICAL: Always set explicit column widths for consistent rendering.**

\`\`\`python
from docx.shared import Inches, Pt, RGBColor
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml

# Basic table
table = doc.add_table(rows=3, cols=3)
table.style = 'Table Grid'
table.alignment = WD_TABLE_ALIGNMENT.CENTER

# Set column widths explicitly
widths = [Inches(2.5), Inches(3.0), Inches(1.5)]
for row in table.rows:
    for i, cell in enumerate(row.cells):
        cell.width = widths[i]

# Populate cells
for i, row in enumerate(table.rows):
    for j, cell in enumerate(row.cells):
        cell.text = f'Row {i+1}, Col {j+1}'
\`\`\`

**Header row with shading:**
\`\`\`python
header_cells = table.rows[0].cells
for cell in header_cells:
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="2E86AB" w:val="clear"/>')
    cell._element.get_or_add_tcPr().append(shading)
    for paragraph in cell.paragraphs:
        for run in paragraph.runs:
            run.font.bold = True
            run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            run.font.size = Pt(11)
\`\`\`

**Cell padding (margins):**
\`\`\`python
tc = cell._element
tcPr = tc.get_or_add_tcPr()
tcMar = parse_xml(
    f'<w:tcMar {nsdecls("w")}>'
    '  <w:top w:w="80" w:type="dxa"/>'
    '  <w:bottom w:w="80" w:type="dxa"/>'
    '  <w:left w:w="120" w:type="dxa"/>'
    '  <w:right w:w="120" w:type="dxa"/>'
    '</w:tcMar>'
)
tcPr.append(tcMar)
\`\`\`

**Merged cells:**
\`\`\`python
# Horizontal merge
cell_a = table.cell(0, 0)
cell_b = table.cell(0, 2)
cell_a.merge(cell_b)

# Vertical merge
cell_top = table.cell(0, 0)
cell_bottom = table.cell(2, 0)
cell_top.merge(cell_bottom)
\`\`\`

## Images

\`\`\`python
doc.add_picture('/workspace/image.png', width=Inches(4))

# Centered image
from docx.enum.text import WD_ALIGN_PARAGRAPH
last_paragraph = doc.paragraphs[-1]
last_paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
\`\`\`

## Page Breaks

\`\`\`python
doc.add_page_break()

p = doc.add_paragraph('This starts on a new page')
p.paragraph_format.page_break_before = True
\`\`\`

## Hyperlinks (via XML — no native python-docx API)

\`\`\`python
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import docx.opc.constants

def add_hyperlink(paragraph, url, text, color='0563C1', underline=True):
    part = paragraph.part
    r_id = part.relate_to(url, docx.opc.constants.RELATIONSHIP_TYPE.HYPERLINK, is_external=True)
    hyperlink = OxmlElement('w:hyperlink')
    hyperlink.set(qn('r:id'), r_id)
    run = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')
    c = OxmlElement('w:color')
    c.set(qn('w:val'), color)
    rPr.append(c)
    if underline:
        u = OxmlElement('w:u')
        u.set(qn('w:val'), 'single')
        rPr.append(u)
    run.append(rPr)
    t = OxmlElement('w:t')
    t.text = text
    run.append(t)
    hyperlink.append(run)
    paragraph._element.append(hyperlink)

p = doc.add_paragraph('Visit ')
add_hyperlink(p, 'https://example.com', 'Example Site')
\`\`\`

## Headers and Footers

\`\`\`python
from docx.shared import Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

section = doc.sections[0]

header = section.header
header.is_linked_to_previous = False
p = header.paragraphs[0]
p.text = 'Document Header'
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.style.font.size = Pt(9)

footer = section.footer
footer.is_linked_to_previous = False
p = footer.paragraphs[0]
p.alignment = WD_ALIGN_PARAGRAPH.CENTER

run = p.add_run('Page ')
fldChar1 = OxmlElement('w:fldChar')
fldChar1.set(qn('w:fldCharType'), 'begin')
run2 = p.add_run()
run2._element.append(fldChar1)

instrText = OxmlElement('w:instrText')
instrText.set(qn('xml:space'), 'preserve')
instrText.text = ' PAGE '
run3 = p.add_run()
run3._element.append(instrText)

fldChar2 = OxmlElement('w:fldChar')
fldChar2.set(qn('w:fldCharType'), 'end')
run4 = p.add_run()
run4._element.append(fldChar2)
\`\`\`

## RTL / Thaana Text

python-docx has no native RTL support. Use XML manipulation:

\`\`\`python
from docx.oxml.ns import qn

def set_rtl(paragraph):
    pPr = paragraph._element.get_or_add_pPr()
    bidi = pPr.makeelement(qn('w:bidi'), {})
    pPr.append(bidi)

def set_run_rtl(run):
    rPr = run._element.get_or_add_rPr()
    rtl = rPr.makeelement(qn('w:rtl'), {})
    rPr.append(rtl)

p = doc.add_paragraph('ތާނަ ލިޔުން')
set_rtl(p)
p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
for run in p.runs:
    set_run_rtl(run)
    run.font.name = 'MV Typewriter'
\`\`\`

## Preloaded Thaana Fonts

| Font | File | Use |
|------|------|-----|
| MV Typewriter Regular | \`/fonts/mvtyper.ttf\` | Body text |
| MV Typewriter Bold | \`/fonts/mvtypebold.ttf\` | Bold body text |
| Sangu Suruhee | \`/fonts/SanguSuruhee-Regular.ttf\` | Headings |

**IMPORTANT:** Set the font name on runs, then call \`embed_thaana_fonts()\` after saving.

## Embedding Thaana Fonts

\`\`\`python
import zipfile, shutil, os
from xml.etree import ElementTree as ET

def embed_thaana_fonts(docx_path):
    ET.register_namespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
    ET.register_namespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
    ET.register_namespace('mc', 'http://schemas.openxmlformats.org/markup-compatibility/2006')
    ET.register_namespace('o', 'urn:schemas-microsoft-com:office:office')
    ET.register_namespace('m', 'http://schemas.openxmlformats.org/officeDocument/2006/math')
    ET.register_namespace('v', 'urn:schemas-microsoft-com:vml')
    ET.register_namespace('wp', 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing')
    ET.register_namespace('a', 'http://schemas.openxmlformats.org/drawingml/2006/main')
    ET.register_namespace('wps', 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape')
    ET.register_namespace('wpg', 'http://schemas.microsoft.com/office/word/2010/wordprocessingGroup')
    ET.register_namespace('wpc', 'http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas')

    W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships'
    FONT_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/font'

    fonts = [
        ('MV Typewriter', '/fonts/mvtyper.ttf', '/fonts/mvtypebold.ttf'),
        ('Sangu Suruhee', '/fonts/SanguSuruhee-Regular.ttf', None),
    ]

    tmp = docx_path + '.tmp'
    shutil.copy2(docx_path, tmp)

    with zipfile.ZipFile(tmp, 'r') as zin, \\
         zipfile.ZipFile(docx_path, 'w', zipfile.ZIP_DEFLATED) as zout:

        entries = {name: zin.read(name) for name in zin.namelist()}

        ft = ET.fromstring(entries['word/fontTable.xml']) if 'word/fontTable.xml' in entries else None
        if ft is None:
            for name, data in entries.items():
                zout.writestr(name, data)
            os.remove(tmp)
            return

        rels_path = 'word/_rels/fontTable.xml.rels'
        rels = ET.fromstring(entries[rels_path]) if rels_path in entries else ET.fromstring(f'<Relationships xmlns="{REL_NS}"/>')
        ct = ET.fromstring(entries['[Content_Types].xml'])
        settings = ET.fromstring(entries['word/settings.xml']) if 'word/settings.xml' in entries else None

        rid = sum(1 for _ in rels.findall(f'{{{REL_NS}}}Relationship')) + 1
        added = {}

        for font_name, reg_path, bold_path in fonts:
            font_el = None
            for f in ft.findall(f'{{{W}}}font'):
                if f.get(f'{{{W}}}name') == font_name:
                    font_el = f
                    break
            if font_el is None:
                font_el = ET.SubElement(ft, f'{{{W}}}font')
                font_el.set(f'{{{W}}}name', font_name)

            for style, src in [('Regular', reg_path), ('Bold', bold_path)]:
                if not src or not os.path.exists(src):
                    continue
                fname = font_name.replace(' ', '') + '_' + style + '.ttf'
                with open(src, 'rb') as f:
                    added[f'word/fonts/{fname}'] = f.read()
                rid_str = f'rIdFont{rid}'
                rid += 1
                rel = ET.SubElement(rels, f'{{{REL_NS}}}Relationship')
                rel.set('Id', rid_str)
                rel.set('Type', FONT_REL)
                rel.set('Target', f'fonts/{fname}')
                embed = ET.SubElement(font_el, f'{{{W}}}embed{style}')
                embed.set(f'{{{R}}}id', rid_str)

        if settings is not None:
            if settings.find(f'{{{W}}}embedTrueTypeFonts') is None:
                el = ET.SubElement(settings, f'{{{W}}}embedTrueTypeFonts')
                el.set(f'{{{W}}}val', 'true')

        has_ttf = any(d.get('Extension') == 'ttf' for d in ct.findall('Default'))
        if not has_ttf:
            d = ET.SubElement(ct, 'Default')
            d.set('Extension', 'ttf')
            d.set('ContentType', 'application/x-font-ttf')

        for name, data in entries.items():
            if name == 'word/fontTable.xml':
                zout.writestr(name, ET.tostring(ft, xml_declaration=True, encoding='UTF-8'))
            elif name == rels_path:
                zout.writestr(name, ET.tostring(rels, xml_declaration=True, encoding='UTF-8'))
            elif name == '[Content_Types].xml':
                zout.writestr(name, ET.tostring(ct, xml_declaration=True, encoding='UTF-8'))
            elif name == 'word/settings.xml':
                zout.writestr(name, ET.tostring(settings, xml_declaration=True, encoding='UTF-8'))
            else:
                zout.writestr(name, data)

        if rels_path not in entries:
            zout.writestr(rels_path, ET.tostring(rels, xml_declaration=True, encoding='UTF-8'))
        for zpath, fdata in added.items():
            zout.writestr(zpath, fdata)

    os.remove(tmp)
    print(f'Fonts embedded in {docx_path}')

doc.save('/output/document.docx')
embed_thaana_fonts('/output/document.docx')
\`\`\`

## Borders (Use Instead of Empty Tables)

\`\`\`python
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml

p = doc.add_paragraph()
pPr = p._element.get_or_add_pPr()
pBdr = parse_xml(
    f'<w:pBdr {nsdecls("w")}>'
    '  <w:bottom w:val="single" w:sz="6" w:space="1" w:color="2E86AB"/>'
    '</w:pBdr>'
)
pPr.append(pBdr)
\`\`\`

## Critical Rules

- **Always save to \`/output/\`** directory
- **Use \`present_file\`** after saving
- **Set page size explicitly** — python-docx defaults to A4
- **Landscape: swap width and height manually** after setting \`WD_ORIENT.LANDSCAPE\`
- **Never use unicode bullets** — use \`List Bullet\` / \`List Number\` styles
- **Never use tables as dividers** — use paragraph borders instead
- **Set column widths on every cell**
- **Use \`parse_xml\` for cell shading**
- **Embed Thaana fonts** — call \`embed_thaana_fonts()\` after saving any document with Thaana text
- **Each \`execute_python\` call is a fresh scope** — re-import everything`;
