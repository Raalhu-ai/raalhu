export interface SkillInfo {
	name: string;
	description: string;
}

export const SKILLS: SkillInfo[] = [
	{ name: 'docx', description: 'Word document (.docx) creation, reading, and editing — reports, memos, letters, templates, tables of contents, formatted documents' },
	{ name: 'pdf', description: 'PDF creation, reading, merging, splitting, rotating, encrypting — reports, charts, combined documents' },
	{ name: 'xlsx', description: 'Spreadsheet (.xlsx) creation, reading, styling, charts, formulas, data validation, conditional formatting' },
	{ name: 'pptx', description: 'PowerPoint (.pptx) creation — presentations, slide decks, Thaana text, charts, tables, images, embedded fonts' },
	{ name: 'text-processing', description: 'Text manipulation and Thaana handling' },
	{ name: 'csv-data', description: 'CSV/data processing with pandas or csv module' },
	{ name: 'visualiser', description: 'Inline visualizations via show_widget — SVG diagrams, Chart.js charts, HTML interactive explainers, flowcharts, architecture diagrams, comparisons, mockups' },
];

// Inline skill content — works in both Metro (mobile) and Vite (desktop)
// Content sourced from desktop's detailed .md files
const SKILL_CONTENT: Record<string, string> = {
	'text-processing': `# Text & Thaana Processing in Pyodide

## String Manipulation
\`\`\`python
text = "Hello World"
text.upper()       # "HELLO WORLD"
text.lower()       # "hello world"
text.title()       # "Hello World"
text.strip()       # Remove whitespace
text.replace('old', 'new')
text.split(' ')    # Split into list
' '.join(parts)    # Join list into string
\`\`\`

## Thaana Script Handling
Thaana Unicode range: U+0780 to U+07BF

\`\`\`python
def is_thaana(text):
    """Check if text contains Thaana characters."""
    return any('\\u0780' <= c <= '\\u07BF' for c in text)

def thaana_char_count(text):
    """Count Thaana characters."""
    return sum(1 for c in text if '\\u0780' <= c <= '\\u07BF')
\`\`\`

## Regular Expressions
\`\`\`python
import re
# Find all Thaana words
thaana_words = re.findall(r'[\\u0780-\\u07BF]+', text)

# Find all English words
english_words = re.findall(r'[a-zA-Z]+', text)

# Replace patterns
result = re.sub(r'\\d+', '#', text)  # Replace numbers
\`\`\`

## Text Statistics
\`\`\`python
def text_stats(text):
    words = text.split()
    sentences = text.count('.') + text.count('。') + text.count('؟')
    return {
        'chars': len(text),
        'words': len(words),
        'sentences': max(sentences, 1),
        'lines': text.count('\\n') + 1,
    }
\`\`\`

## File Reading/Writing
\`\`\`python
# Write text
with open('/output/result.txt', 'w', encoding='utf-8') as f:
    f.write(processed_text)

# Read text
with open('/workspace/input.txt', 'r', encoding='utf-8') as f:
    content = f.read()
\`\`\`

## Key Gotchas
- Always use \`encoding='utf-8'\` for file operations
- Thaana text is RTL — string operations work normally in Python
- \`len()\` counts Unicode code points, not visual characters
- Use \`present_file\` after saving results to \`/output/\``,

	'csv-data': `# Data Processing with pandas/csv in Pyodide

## Setup (pandas)
\`\`\`python
import micropip
await micropip.install('pandas')
import pandas as pd
\`\`\`

## CSV without pandas (lighter)
\`\`\`python
import csv, io

# Parse CSV string
reader = csv.DictReader(io.StringIO(csv_text))
rows = list(reader)

# Write CSV
with open('/output/data.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['Name', 'Value', 'Category'])
    writer.writerows(data)
\`\`\`

## pandas Basics
\`\`\`python
# Create DataFrame
df = pd.DataFrame({
    'name': ['Ahmed', 'Fatima', 'Hassan'],
    'age': [25, 30, 28],
    'city': ['Male', 'Hulhumale', 'Addu']
})

# Read CSV
df = pd.read_csv('/workspace/data.csv')

# Basic operations
df.describe()           # Statistics
df.groupby('city').mean()  # Group by
df.sort_values('age')    # Sort
df[df['age'] > 25]       # Filter
\`\`\`

## Data Analysis
\`\`\`python
# Aggregations
total = df['amount'].sum()
average = df['amount'].mean()
counts = df['category'].value_counts()

# Pivot tables
pivot = df.pivot_table(values='amount', index='category', aggfunc='sum')

# Cross-tabulation
ct = pd.crosstab(df['category'], df['status'])
\`\`\`

## Export
\`\`\`python
# To CSV
df.to_csv('/output/result.csv', index=False, encoding='utf-8')

# To JSON
df.to_json('/output/result.json', orient='records', force_ascii=False)

# To formatted string (for display)
summary = df.to_string()
\`\`\`

## Key Gotchas
- pandas is ~15MB to install — use \`csv\` module for simple tasks
- Always use \`encoding='utf-8'\` and \`force_ascii=False\` for Thaana data
- Save results to \`/output/\` and use \`present_file\` to share
- For large datasets, consider chunked reading: \`pd.read_csv(path, chunksize=1000)\``,

	'docx': `# Word Document Creation (python-docx) in Pyodide

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
- **Each \`execute_python\` call is a fresh scope** — re-import everything`,

	'pdf': `# PDF Processing (fpdf2 + pypdf) in Pyodide

## Quick Reference

| Task | Library | Key API |
|------|---------|---------|
| Create new PDF | fpdf2 | \`FPDF()\` → \`pdf.output(path)\` |
| Read / extract text | pypdf | \`PdfReader(path)\` → \`page.extract_text()\` |
| Merge PDFs | pypdf | \`PdfWriter.add_page()\` |
| Split PDF | pypdf | One page per \`PdfWriter\` |
| Rotate pages | pypdf | \`page.rotate(90)\` |
| Encrypt / decrypt | pypdf | \`writer.encrypt()\` / \`PdfReader(password=)\` |

## Setup

\`\`\`python
import micropip
await micropip.install('fpdf2')
from fpdf import FPDF
# For reading/manipulating: await micropip.install('pypdf')
\`\`\`

## Basic Document
\`\`\`python
pdf = FPDF()
pdf.add_page()
pdf.set_font('Helvetica', size=12)
pdf.cell(0, 10, 'Hello World', new_x='LMARGIN', new_y='NEXT')
pdf.output('/output/document.pdf')
\`\`\`

## Page Size and Margins
\`\`\`python
pdf = FPDF(orientation='portrait', unit='mm', format='letter')
pdf.set_margins(left=25.4, top=25.4, right=25.4)
pdf.set_auto_page_break(auto=True, margin=25.4)
\`\`\`

## Text
\`\`\`python
pdf.cell(0, 10, 'Single line text', new_x='LMARGIN', new_y='NEXT')
pdf.multi_cell(0, 7, 'Long text that wraps...')
pdf.multi_cell(0, 7, 'This is **bold**', markdown=True)
\`\`\`

## Fonts and Colors
\`\`\`python
pdf.set_font('Helvetica', 'B', 16)
pdf.set_text_color(46, 134, 171)
pdf.set_fill_color(240, 240, 240)
\`\`\`

## Tables
\`\`\`python
col_widths = [50, 70, 40, 30]
headers = ['Name', 'Description', 'Date', 'Amount']
pdf.set_font('Helvetica', 'B', 10)
pdf.set_fill_color(46, 134, 171)
pdf.set_text_color(255, 255, 255)
for i, header in enumerate(headers):
    pdf.cell(col_widths[i], 8, header, border=1, fill=True, align='C')
pdf.ln()
\`\`\`

Table width: Letter/A4 ≈ 190mm usable with default margins. Column widths must sum to ≤ usable width.

## Headers/Footers
\`\`\`python
class PDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'I', 9)
        self.cell(0, 10, 'Document Title', align='C')
        self.ln(12)
    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}}', align='C')
\`\`\`

## Thaana Fonts (Preloaded at /fonts/)

\`\`\`python
pdf.add_font('MVTypewriter', '', '/fonts/mvtyper.ttf', uni=True)
pdf.add_font('MVTypewriter', 'B', '/fonts/mvtypebold.ttf', uni=True)
pdf.add_font('SanguSuruhee', '', '/fonts/SanguSuruhee-Regular.ttf', uni=True)

pdf.set_font('SanguSuruhee', '', 24)
pdf.cell(0, 12, 'ސުރުޚީ', new_x='LMARGIN', new_y='NEXT', align='R')
\`\`\`

## Reading PDFs (pypdf)
\`\`\`python
from pypdf import PdfReader
reader = PdfReader('/workspace/document.pdf')
for page in reader.pages:
    print(page.extract_text())
\`\`\`

## Merge / Split / Rotate / Encrypt
\`\`\`python
from pypdf import PdfReader, PdfWriter

# Merge
writer = PdfWriter()
for path in ['/workspace/doc1.pdf', '/workspace/doc2.pdf']:
    for page in PdfReader(path).pages:
        writer.add_page(page)
with open('/output/merged.pdf', 'wb') as f:
    writer.write(f)

# Encrypt
writer.encrypt(user_password='viewpass', owner_password='ownerpass')
\`\`\`

## Critical Rules

- **Always save to \`/output/\`** directory
- **Use \`present_file\`** after saving
- **Never use Unicode sub/superscripts** — built-in fonts render them as blanks
- **Column widths must sum to ≤ usable page width** (~190mm)
- **fpdf2 for creation, pypdf for manipulation**
- **Use preloaded Thaana fonts** — register with \`add_font()\` before use
- **Each \`execute_python\` call is a fresh scope**`,

	'xlsx': `# Spreadsheet Processing (openpyxl) in Pyodide

## Quick Reference

| Task | Approach |
|------|----------|
| Create new spreadsheet | \`Workbook()\` → \`wb.save(path)\` |
| Read existing spreadsheet | \`load_workbook(path)\` |
| Style cells | \`Font\`, \`PatternFill\`, \`Alignment\`, \`Border\` |
| Formulas | Assign formula string to cell value |
| Charts | \`openpyxl.chart\` module |

## Setup

\`\`\`python
import micropip
await micropip.install('openpyxl')
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
\`\`\`

## Basic Spreadsheet

\`\`\`python
wb = Workbook()
ws = wb.active
ws.title = 'Sheet1'
ws.append(['Name', 'Age', 'City'])
ws.append(['Ahmed', 25, 'Male'])
wb.save('/output/spreadsheet.xlsx')
\`\`\`

## Column Widths
\`\`\`python
ws.column_dimensions['A'].width = 25
ws.column_dimensions['B'].width = 15
\`\`\`

## Cell Styling
\`\`\`python
cell.font = Font(name='Arial', size=12, bold=True, color='2E86AB')
cell.fill = PatternFill(start_color='2E86AB', end_color='2E86AB', fill_type='solid')
cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
cell.border = Border(
    left=Side(style='thin', color='CCCCCC'),
    right=Side(style='thin', color='CCCCCC'),
    top=Side(style='thin', color='CCCCCC'),
    bottom=Side(style='thin', color='CCCCCC'),
)
\`\`\`

## Number Formats
\`\`\`python
cell.number_format = '#,##0.00'     # 1,234.56
cell.number_format = '0.0%'         # 85.5%
cell.number_format = 'YYYY-MM-DD'
\`\`\`

## Formulas
\`\`\`python
ws['D2'] = '=SUM(B2:B100)'
# Formulas are NOT evaluated in Python — computed when opened in Excel
\`\`\`

## Charts
\`\`\`python
from openpyxl.chart import BarChart, Reference
chart = BarChart()
chart.title = 'Sales'
data = Reference(ws, min_col=2, min_row=1, max_row=ws.max_row)
cats = Reference(ws, min_col=1, min_row=2, max_row=ws.max_row)
chart.add_data(data, titles_from_data=True)
chart.set_categories(cats)
ws.add_chart(chart, 'E2')
\`\`\`

## Conditional Formatting
\`\`\`python
from openpyxl.formatting.rule import ColorScaleRule, CellIsRule, DataBarRule
ws.conditional_formatting.add('B2:B100',
    ColorScaleRule(start_type='min', start_color='63BE7B',
        mid_type='percentile', mid_value=50, mid_color='FFEB84',
        end_type='max', end_color='F8696B'))
\`\`\`

## Data Validation (Dropdowns)
\`\`\`python
from openpyxl.worksheet.datavalidation import DataValidation
dv = DataValidation(type='list', formula1='"Option A,Option B,Option C"', allow_blank=True)
ws.add_data_validation(dv)
dv.add('C2:C100')
\`\`\`

## RTL / Thaana Text
\`\`\`python
from openpyxl.styles import Alignment
rtl_align = Alignment(horizontal='right', reading_order=2)
cell.alignment = rtl_align
cell.font = Font(name='MV Boli')
ws.sheet_view.rightToLeft = True
\`\`\`

## Critical Rules

- **Always save to \`/output/\`** directory
- **Use \`present_file\`** after saving
- **Formulas are NOT evaluated in Python**
- **Set column widths explicitly**
- **Styles are immutable** — assign a new style object each time
- **Each \`execute_python\` call is a fresh scope**`,

	'pptx': `# PowerPoint Creation (python-pptx) in Pyodide

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
- **Each \`execute_python\` call is a fresh scope**`,

	'visualiser': `# Inline Visualiser — show_widget Skill

Render interactive visuals inline in chat using \`show_widget\`. The client wrapper provides CSS variables, SVG utility classes, color ramps, form defaults, and a pre-defined arrow marker — write minimal code.

## Modes

- **SVG mode**: \`widget_code\` starts with \`<svg\`. Static only — no JS, no \`sendPrompt\`.
- **HTML mode**: Everything else. Supports JS, events, \`sendPrompt\`. **Use this for ALL interactive content** — embed \`<svg>\` inside HTML.

**If it needs click, hover, or animation → use HTML mode.**

## Pre-built Utilities (injected by client)

### CSS Variables

| Var | Value | Use |
|-----|-------|-----|
| \`--p\` | \`#e4e6eb\` | Primary text |
| \`--s\` | \`#8a8d91\` | Secondary/muted text |
| \`--t\` | \`#6b6d71\` | Tertiary text |
| \`--bg\` | \`#242526\` | Background |
| \`--bg2\` | \`#2d2e2f\` | Surface / card bg |
| \`--bg3\` | \`#363738\` | Hover surface |
| \`--acc\` | \`#7d9fe3\` | Accent |
| \`--acc-d\` | \`#1a3a8a\` | Accent dark |
| \`--b\` | \`#3a3b3c\` | Border |
| \`--ok\` | \`#4ade80\` | Success |
| \`--warn\` | \`#fbbf24\` | Warning |
| \`--err\` | \`#f87171\` | Danger |
| \`--font\` | system font stack | Body font |
| \`--font-h\` | heading font stack | Heading font |
| \`--radius\` | \`8px\` | Border radius |

### SVG Utility Classes

| Class | What it sets |
|-------|-------------|
| \`.t\` | 14px text, primary color, body font |
| \`.ts\` | 12px text, muted color, body font |
| \`.th\` | 14px text, primary color, bold, body font |
| \`.box\` | Surface fill, border stroke, 1px width |
| \`.arr\` | Accent stroke, no fill, 1.5px width |
| \`.leader\` | Muted dashed line (4 3 dash pattern) |

### \`.node\` Interaction Class

\`<g class="node">\` gets cursor:pointer, hover brightness on child rects, text dims on hover. Works with color ramps.

### Color Ramp Classes

Apply to \`<g>\` wrapping rect+text. Sets fill, stroke, and text colors.

| Class | Fill | Stroke | Text |
|-------|------|--------|------|
| \`.c-blue\` | \`#0c447c\` | \`#85b7eb\` | \`#b5d4f4\` |
| \`.c-teal\` | \`#085041\` | \`#5dcaa5\` | \`#9fe1cb\` |
| \`.c-coral\` | \`#712b13\` | \`#f0997b\` | \`#f5c4b3\` |
| \`.c-purple\` | \`#3c3489\` | \`#afa9ec\` | \`#cecbf6\` |
| \`.c-pink\` | \`#72243e\` | \`#ed93b1\` | \`#f4c0d1\` |
| \`.c-gray\` | \`#444441\` | \`#b4b2a9\` | \`#d3d1c7\` |
| \`.c-green\` | \`#27500a\` | \`#97c459\` | \`#c0dd97\` |
| \`.c-amber\` | \`#633806\` | \`#ef9f27\` | \`#fac775\` |
| \`.c-red\` | \`#791f1f\` | \`#f09595\` | \`#f7c1c1\` |

Usage: \`<g class="node c-blue">\` for a clickable blue node.

### Pre-defined Arrow Marker

\`marker-end="url(#arrow)"\` — available on any line/path. No need to define \`<defs>\` or \`<marker>\`.

### Auto-styled Form Elements

Bare \`<input>\`, \`<select>\`, \`<textarea>\`, \`<button>\` are automatically dark-themed with focus rings, hover states, styled range thumbs, and button transitions.

## sendPrompt Bridge

\`sendPrompt(text)\` in **HTML mode only**. Sends a message to chat.

Use for: clicking nodes to explore, chart segments to drill down.
Don't use for: filtering, sorting, toggling — handle in local JS.

## Choosing the Right Visual

| User says | What to build |
|-----------|---------------|
| "how does X work" | Interactive diagram — SVG with clickable \`.node\` groups |
| "what are the parts of X" | Structural diagram — colored \`.node\` boxes with \`.c-*\` ramps |
| "walk me through steps" | Flowchart — \`.node\` boxes + \`.arr\` connectors + \`url(#arrow)\` |
| "compare X vs Y" | Side-by-side cards with hover + \`sendPrompt\` |
| "show me the data" | Chart.js with tooltips + click callbacks |
| "explain X" | Interactive explainer — sliders, buttons, live state |

**Always use HTML mode.** Pure SVG mode only for simple decorative art.

---

## Interactive Diagram Example

\`\`\`html
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
  var r=el.querySelector('rect').getBoundingClientRect(),p=el.closest('div').getBoundingClientRect();
  tip.style.left=(r.left-p.left+r.width/2-tip.offsetWidth/2)+'px';
  tip.style.top=(r.top-p.top-tip.offsetHeight-8)+'px';
}
function hideTip(){tip.style.opacity='0'}
</script>
\`\`\`

No \`fill\`, \`stroke\`, \`font-size\` attrs — handled by \`.th\`, \`.ts\`, \`.c-blue\`, \`.c-teal\`. No \`<marker>\` — \`url(#arrow)\` is pre-defined. \`.node\` provides hover automatically.

---

## Chart.js Example

\`\`\`html
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
\`\`\`

Chart colors: primary \`#7d9fe3\`, multi-series \`#4ade80\`, \`#fbbf24\`, \`#f87171\`. Tooltip bg \`#1a3a8a\`. Grid \`#3a3b3c\`.

---

## Interactive Explainer Example

\`\`\`html
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
\`\`\`

Range sliders and labels are auto-styled by the wrapper.

---

## Comparison Layout Example

\`\`\`html
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
  <button style="text-align:left;padding:16px;background:var(--bg2);border-color:var(--b);border-radius:var(--radius)" onclick="sendPrompt('Tell me more about Option A')">
    <div style="font-size:16px;color:var(--acc);font-weight:600;margin-bottom:4px">Option A</div>
    <div style="font-size:24px;font-weight:600;margin-bottom:8px">$1,200/mo</div>
    <div style="font-size:14px;color:var(--s)">Description</div>
  </button>
  <button style="text-align:left;padding:16px;background:var(--bg2);border-color:var(--b);border-radius:var(--radius)" onclick="sendPrompt('Tell me more about Option B')">
    <div style="font-size:16px;color:var(--acc);font-weight:600;margin-bottom:4px">Option B</div>
    <div style="font-size:24px;font-weight:600;margin-bottom:8px">$800/mo</div>
    <div style="font-size:14px;color:var(--s)">Description</div>
  </button>
</div>
\`\`\`

Using \`<button>\` gives automatic hover/active states.

---

## Critical Rules

- **Use HTML mode for all interactive content**
- **Use utility classes** — \`.t\`, \`.th\`, \`.ts\`, \`.box\`, \`.arr\`, \`.node\`, \`.c-*\`
- **Use CSS variables** — \`var(--p)\`, \`var(--acc)\`, \`var(--bg2)\`
- **Use \`url(#arrow)\`** — pre-defined, don't create \`<marker>\` defs
- **Use \`sendPrompt\` for drill-down**
- **\`.node\` class for interactive SVG groups** — hover is automatic
- **Bare form elements are auto-styled**
- **Title must be snake_case**
- **SVG: \`width="100%"\` + \`viewBox\`**, viewBox width 680px
- **CDN scripts at end**
- **No \`position: fixed\`**, no external API calls
- **Min font 11px**, touch targets >=44px`,
};

export function getSkillContent(name: string): string {
	const content = SKILL_CONTENT[name];
	if (!content) {
		throw new Error(`Unknown skill: "${name}". Available: ${SKILLS.map((s) => s.name).join(', ')}`);
	}
	return content;
}

export function getSkillList(): string {
	return SKILLS.map((s) => `- ${s.name}: ${s.description}`).join('\n');
}
