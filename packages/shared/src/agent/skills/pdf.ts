export default `# PDF Processing (fpdf2 + pypdf) in Pyodide

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
- **Each \`execute_python\` call is a fresh scope**`;
