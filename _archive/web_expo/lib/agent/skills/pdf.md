# PDF Processing (fpdf2 + pypdf) in Pyodide

## Quick Reference

| Task | Library | Key API |
|------|---------|---------|
| Create new PDF | fpdf2 | `FPDF()` → `pdf.output(path)` |
| Read / extract text | pypdf | `PdfReader(path)` → `page.extract_text()` |
| Merge PDFs | pypdf | `PdfWriter.add_page()` |
| Split PDF | pypdf | One page per `PdfWriter` |
| Rotate pages | pypdf | `page.rotate(90)` |
| Encrypt / decrypt | pypdf | `writer.encrypt()` / `PdfReader(password=)` |
| Extract metadata | pypdf | `reader.metadata` |
| Add watermark | pypdf | `page.merge_page(watermark)` |

## Setup

```python
import micropip

# For creating PDFs
await micropip.install('fpdf2')
from fpdf import FPDF

# For reading/manipulating existing PDFs
await micropip.install('pypdf')
from pypdf import PdfReader, PdfWriter
```

Install only what you need — `fpdf2` for creation, `pypdf` for manipulation. Both are pure Python and work in Pyodide.

---

## Creating PDFs (fpdf2)

### Basic Document
```python
pdf = FPDF()
pdf.add_page()
pdf.set_font('Helvetica', size=12)
pdf.cell(0, 10, 'Hello World', new_x='LMARGIN', new_y='NEXT')
pdf.output('/output/document.pdf')
```

### Page Size and Margins

```python
# US Letter (default)
pdf = FPDF(orientation='portrait', unit='mm', format='letter')

# A4
pdf = FPDF(format='A4')

# Custom margins (default: 10mm)
pdf.set_margins(left=25.4, top=25.4, right=25.4)  # 1 inch = 25.4mm
pdf.set_auto_page_break(auto=True, margin=25.4)    # Bottom margin

# Landscape
pdf = FPDF(orientation='landscape', format='letter')
```

**Common page formats:** `'letter'`, `'A4'`, `'A3'`, `'A5'`, `'legal'`, or tuple `(width, height)` in current unit.

### Text

```python
# Single-line cell
pdf.set_font('Helvetica', size=12)
pdf.cell(0, 10, 'Single line text', new_x='LMARGIN', new_y='NEXT')

# Multi-line (auto-wrap)
pdf.multi_cell(0, 7, 'Long text that wraps automatically across multiple lines...')

# Markdown-like formatting (fpdf2 feature)
pdf.multi_cell(0, 7, 'This is **bold** and this is __underline__', markdown=True)

# Positioned text (absolute coordinates)
pdf.text(x=50, y=100, text='Placed at exact position')
```

### Fonts and Styling

```python
# Built-in fonts: Helvetica, Times, Courier, Symbol, ZapfDingbats
pdf.set_font('Helvetica', '', 12)     # Regular
pdf.set_font('Helvetica', 'B', 16)    # Bold
pdf.set_font('Helvetica', 'I', 12)    # Italic
pdf.set_font('Helvetica', 'BI', 14)   # Bold + Italic

# Colors
pdf.set_text_color(46, 134, 171)      # Text color (R, G, B)
pdf.set_fill_color(240, 240, 240)     # Cell background
pdf.set_draw_color(200, 200, 200)     # Border / line color

# Title with background
pdf.set_font('Helvetica', 'B', 18)
pdf.set_fill_color(46, 134, 171)
pdf.set_text_color(255, 255, 255)
pdf.cell(0, 14, 'Report Title', new_x='LMARGIN', new_y='NEXT', fill=True, align='C')

# Reset colors after
pdf.set_text_color(0, 0, 0)
```

### Headings Pattern

```python
def heading(pdf, text, level=1):
    sizes = {1: 18, 2: 15, 3: 13}
    pdf.set_font('Helvetica', 'B', sizes.get(level, 12))
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, sizes.get(level, 12) * 0.6, text, new_x='LMARGIN', new_y='NEXT')
    pdf.ln(2)

def body(pdf, text):
    pdf.set_font('Helvetica', '', 11)
    pdf.set_text_color(50, 50, 50)
    pdf.multi_cell(0, 6, text)
    pdf.ln(2)
```

### Tables

```python
# Header row
pdf.set_font('Helvetica', 'B', 10)
pdf.set_fill_color(46, 134, 171)
pdf.set_text_color(255, 255, 255)

col_widths = [50, 70, 40, 30]   # Must sum to ≤ usable page width
headers = ['Name', 'Description', 'Date', 'Amount']
for i, header in enumerate(headers):
    pdf.cell(col_widths[i], 8, header, border=1, fill=True, align='C')
pdf.ln()

# Data rows
pdf.set_font('Helvetica', '', 10)
pdf.set_text_color(0, 0, 0)
for row_idx, row in enumerate(data):
    # Alternating row colors
    if row_idx % 2 == 0:
        pdf.set_fill_color(245, 245, 245)
    else:
        pdf.set_fill_color(255, 255, 255)
    for i, val in enumerate(row):
        pdf.cell(col_widths[i], 8, str(val), border=1, fill=True)
    pdf.ln()
```

**Table width calculation:**
- Letter page: usable width ≈ 190mm with default margins (215.9 - 2×10)
- A4 page: usable width ≈ 190mm with default margins (210 - 2×10)
- Column widths must sum to ≤ usable width

**Multi-line cells in tables (advanced):**
```python
# For cells with long text, use multi_cell inside a table
# Save position, draw cell, restore position for next column
x_start = pdf.get_x()
y_start = pdf.get_y()

# Calculate row height first (based on longest cell)
line_height = 6
col1_lines = pdf.multi_cell(col_widths[0], line_height, long_text, dry_run=True, output='LINES')
row_height = max(8, len(col1_lines) * line_height)

# Draw cells with calculated height
pdf.set_xy(x_start, y_start)
pdf.multi_cell(col_widths[0], line_height, long_text, border=1)
pdf.set_xy(x_start + col_widths[0], y_start)
pdf.cell(col_widths[1], row_height, short_text, border=1)
```

### Images

```python
# Image must exist in the virtual filesystem
pdf.image('/workspace/chart.png', x=10, y=None, w=100)

# Centered image
page_width = pdf.w - pdf.l_margin - pdf.r_margin
img_width = 120
x_pos = pdf.l_margin + (page_width - img_width) / 2
pdf.image('/workspace/image.png', x=x_pos, y=None, w=img_width)

# Image with link
pdf.image('/workspace/logo.png', x=10, y=10, w=30, link='https://example.com')
```

### Page Breaks

```python
# Manual page break
pdf.add_page()

# Auto page break is on by default (set_auto_page_break)
# Content near bottom margin triggers automatic new page
```

### Headers and Footers

```python
class PDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'I', 9)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, 'Document Title', align='C')
        self.ln(12)

    def footer(self):
        self.set_y(-15)  # 15mm from bottom
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}}', align='C')

pdf = PDF()
pdf.alias_nb_pages()   # Enables {nb} for total pages
pdf.add_page()
# ... content ...
pdf.output('/output/report.pdf')
```

### Links and URLs

```python
# Clickable URL
pdf.set_font('Helvetica', 'U', 11)
pdf.set_text_color(5, 99, 193)
pdf.cell(0, 8, 'Visit Example', link='https://example.com', new_x='LMARGIN', new_y='NEXT')

# Internal link (jump to another page)
link_target = pdf.add_link()
pdf.set_link(link_target, page=3)  # Points to page 3
pdf.cell(0, 8, 'Go to page 3', link=link_target)
```

### Lines and Shapes

```python
# Horizontal rule
pdf.set_draw_color(200, 200, 200)
pdf.set_line_width(0.5)
y = pdf.get_y()
pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)
pdf.ln(5)

# Rectangle
pdf.rect(x=10, y=50, w=100, h=40, style='D')  # D=draw, F=fill, DF=both

# Filled rectangle
pdf.set_fill_color(240, 248, 255)
pdf.rect(x=10, y=50, w=100, h=40, style='DF')
```

### Multi-Page Documents

```python
pdf = FPDF()
pdf.set_auto_page_break(auto=True, margin=25)

# Page 1: Cover
pdf.add_page()
pdf.set_font('Helvetica', 'B', 28)
pdf.ln(80)
pdf.cell(0, 15, 'Annual Report 2025', align='C')
pdf.ln(10)
pdf.set_font('Helvetica', '', 14)
pdf.cell(0, 10, 'Company Name', align='C')

# Page 2+: Content
pdf.add_page()
pdf.set_font('Helvetica', 'B', 16)
pdf.cell(0, 10, 'Section 1: Overview', new_x='LMARGIN', new_y='NEXT')
pdf.set_font('Helvetica', '', 11)
pdf.multi_cell(0, 6, 'Content here...')

pdf.output('/output/report.pdf')
```

### Subscripts and Superscripts

**NEVER use Unicode sub/superscript characters (₀₁₂₃, ⁰¹²³) — built-in fonts don't include these glyphs and they render as blank or boxes.**

```python
# Simulate with font size and position
pdf.set_font('Helvetica', '', 12)
pdf.write(6, 'H')
pdf.set_font('Helvetica', '', 8)
pdf.write(8, '2')  # Subscript: smaller font, lower baseline
pdf.set_font('Helvetica', '', 12)
pdf.write(6, 'O')

# Superscript
pdf.write(6, 'x')
pdf.set_font('Helvetica', '', 8)
pdf.write(3, '2')  # Superscript: smaller font, higher baseline
pdf.set_font('Helvetica', '', 12)
```

---

## Reading / Manipulating PDFs (pypdf)

### Read and Extract Text
```python
from pypdf import PdfReader

reader = PdfReader('/workspace/document.pdf')
print(f'Pages: {len(reader.pages)}')

# Extract all text
text = ''
for page in reader.pages:
    text += page.extract_text() + '\n'
print(text)
```

### Extract Metadata
```python
reader = PdfReader('/workspace/document.pdf')
meta = reader.metadata
print(f'Title: {meta.title}')
print(f'Author: {meta.author}')
print(f'Subject: {meta.subject}')
print(f'Creator: {meta.creator}')
print(f'Pages: {len(reader.pages)}')
```

### Merge PDFs
```python
from pypdf import PdfWriter, PdfReader

writer = PdfWriter()

for pdf_path in ['/workspace/doc1.pdf', '/workspace/doc2.pdf', '/workspace/doc3.pdf']:
    reader = PdfReader(pdf_path)
    for page in reader.pages:
        writer.add_page(page)

with open('/output/merged.pdf', 'wb') as f:
    writer.write(f)
```

### Split PDF
```python
reader = PdfReader('/workspace/input.pdf')

# Split into individual pages
for i, page in enumerate(reader.pages):
    writer = PdfWriter()
    writer.add_page(page)
    with open(f'/output/page_{i + 1}.pdf', 'wb') as f:
        writer.write(f)

# Extract specific page range (pages 2-5)
writer = PdfWriter()
for page in reader.pages[1:5]:  # 0-indexed
    writer.add_page(page)
with open('/output/pages_2_to_5.pdf', 'wb') as f:
    writer.write(f)
```

### Rotate Pages
```python
reader = PdfReader('/workspace/input.pdf')
writer = PdfWriter()

for i, page in enumerate(reader.pages):
    if i == 0:
        page.rotate(90)   # Rotate first page 90° clockwise
    writer.add_page(page)

with open('/output/rotated.pdf', 'wb') as f:
    writer.write(f)
# Rotation values: 90, 180, 270
```

### Encrypt (Password Protect)
```python
reader = PdfReader('/workspace/input.pdf')
writer = PdfWriter()

for page in reader.pages:
    writer.add_page(page)

writer.encrypt(
    user_password='viewpass',     # Required to open
    owner_password='ownerpass',   # Required to change permissions
)

with open('/output/encrypted.pdf', 'wb') as f:
    writer.write(f)
```

### Decrypt
```python
reader = PdfReader('/workspace/encrypted.pdf')
if reader.is_encrypted:
    reader.decrypt('password')

# Now extract text or manipulate as normal
text = reader.pages[0].extract_text()
```

### Add Watermark
```python
from pypdf import PdfReader, PdfWriter

# The watermark must be a separate single-page PDF
watermark_reader = PdfReader('/workspace/watermark.pdf')
watermark_page = watermark_reader.pages[0]

reader = PdfReader('/workspace/document.pdf')
writer = PdfWriter()

for page in reader.pages:
    page.merge_page(watermark_page)
    writer.add_page(page)

with open('/output/watermarked.pdf', 'wb') as f:
    writer.write(f)
```

**Creating a text watermark PDF with fpdf2 (for use with pypdf merge):**
```python
from fpdf import FPDF

wm = FPDF()
wm.add_page()
wm.set_font('Helvetica', 'B', 50)
wm.set_text_color(200, 200, 200)  # Light gray
wm.rotate(45, x=105, y=148)
wm.text(x=40, y=148, text='DRAFT')
wm.output('/workspace/watermark.pdf')
```

### Add Metadata
```python
writer = PdfWriter()
reader = PdfReader('/workspace/input.pdf')
for page in reader.pages:
    writer.add_page(page)

writer.add_metadata({
    '/Title': 'Document Title',
    '/Author': 'Author Name',
    '/Subject': 'Subject',
    '/Creator': 'Mogger Agent',
})

with open('/output/with_metadata.pdf', 'wb') as f:
    writer.write(f)
```

---

## Thaana Fonts (Preloaded)

Three Thaana TTF fonts are preloaded at `/fonts/`:

| Font | File | Use |
|------|------|-----|
| MV Typewriter Regular | `/fonts/mvtyper.ttf` | Body text |
| MV Typewriter Bold | `/fonts/mvtypebold.ttf` | Bold body text |
| Sangu Suruhee | `/fonts/SanguSuruhee-Regular.ttf` | Headings |

### Registering Thaana Fonts with fpdf2

fpdf2's `add_font()` automatically embeds the TTF font into the PDF — no post-processing needed.

```python
pdf = FPDF()

# Register Thaana fonts (call once before using)
pdf.add_font('MVTypewriter', '', '/fonts/mvtyper.ttf', uni=True)
pdf.add_font('MVTypewriter', 'B', '/fonts/mvtypebold.ttf', uni=True)
pdf.add_font('SanguSuruhee', '', '/fonts/SanguSuruhee-Regular.ttf', uni=True)

# Use in document
pdf.add_page()
pdf.set_font('SanguSuruhee', '', 24)
pdf.cell(0, 12, 'ސުރުޚީ', new_x='LMARGIN', new_y='NEXT', align='R')

pdf.set_font('MVTypewriter', '', 12)
pdf.multi_cell(0, 8, 'ތާނަ ލިޔުމެއް...', align='R')

pdf.set_font('MVTypewriter', 'B', 12)
pdf.cell(0, 8, 'ބޯލްޑް ތާނަ', new_x='LMARGIN', new_y='NEXT', align='R')
```

### RTL Limitations

fpdf2 does **not** natively reorder RTL text. Thaana characters render correctly for most simple Thaana text. However:
- Mixed LTR/RTL text (English + Thaana in one line) may not reorder correctly
- For complex mixed-direction documents, prefer `.docx` format (use the `docx` skill)
- Simple all-Thaana or all-English documents work well in PDF

## Theme Colors

Default document accent colors (adapt based on user's content and context):

| Role | Hex | RGB | Use |
|------|-----|-----|-----|
| Primary accent | `#1a3a8a` | (26, 58, 138) | Headings, table headers, borders |
| Light accent | `#7d9fe3` | (125, 159, 227) | Highlights, secondary elements |
| Dark background | `#242526` | (36, 37, 38) | Dark-themed documents (rare) |

These are sensible defaults. **Adapt colors to match the document's purpose** — a medical report might use greens, a financial report navy/gold, a school assignment could use brighter colors. When the user specifies colors or a brand, use those instead.

---

## Not Available in Pyodide

These features from the full PDF skill require system tools not present in the browser sandbox:

| Feature | Reason |
|---------|--------|
| OCR (scanned PDFs) | Requires Tesseract binary |
| PDF → image conversion | Requires poppler (`pdftoppm`) |
| Image extraction from PDF | Requires poppler (`pdfimages`) |
| PDF form filling | Requires specialized tools |
| `.doc` → `.pdf` conversion | Requires LibreOffice |
| Command-line tools (qpdf, pdftk) | No shell access in Pyodide |

---

## Critical Rules

- **Always save to `/output/`** directory
- **Use `present_file`** after saving to show the user the downloadable file
- **Never use Unicode sub/superscripts** — built-in fonts render them as blanks or boxes
- **Column widths must sum to ≤ usable page width** — Letter ≈ 190mm, A4 ≈ 190mm with default margins
- **fpdf2 for creation, pypdf for manipulation** — don't mix them up
- **Use preloaded Thaana fonts for Thaana text** — register with `add_font()` before use; built-in fonts (Helvetica, Times) do not contain Thaana glyphs
- **Install only what you need** — `await micropip.install('fpdf2')` or `await micropip.install('pypdf')`, not both unless both are needed
- **Each `execute_python` call is a fresh scope** — re-import everything at the top of each call
- **Files must exist in the virtual filesystem** — use `write_file` tool or previous `execute_python` to create files before referencing them
- **Watermark must be a PDF** — create one with fpdf2 first, then merge with pypdf
