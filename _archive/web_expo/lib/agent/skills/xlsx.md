# Spreadsheet Processing (openpyxl) in Pyodide

## Quick Reference

| Task | Approach |
|------|----------|
| Create new spreadsheet | `Workbook()` → `wb.save(path)` |
| Read existing spreadsheet | `load_workbook(path)` |
| Style cells | `Font`, `PatternFill`, `Alignment`, `Border` |
| Formulas | Assign formula string to cell value |
| Charts | `openpyxl.chart` module |
| Data validation | `DataValidation` class |
| Conditional formatting | `ColorScaleRule`, `CellIsRule`, `FormulaRule` |

## Setup

```python
import micropip
await micropip.install('openpyxl')
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, numbers
from openpyxl.utils import get_column_letter
```

## Basic Spreadsheet

```python
wb = Workbook()
ws = wb.active
ws.title = 'Sheet1'

# Headers
headers = ['Name', 'Age', 'City']
for col, header in enumerate(headers, 1):
    ws.cell(row=1, column=col, value=header)

# Data rows
data = [
    ['Ahmed', 25, 'Male'],
    ['Fatima', 30, 'Hulhumale'],
    ['Hassan', 28, 'Addu'],
]
for row_idx, row_data in enumerate(data, 2):
    for col_idx, value in enumerate(row_data, 1):
        ws.cell(row=row_idx, column=col_idx, value=value)

wb.save('/output/spreadsheet.xlsx')
```

**Shorthand: `append()` for row-by-row writing:**
```python
ws.append(['Name', 'Age', 'City'])  # Header row
ws.append(['Ahmed', 25, 'Male'])
ws.append(['Fatima', 30, 'Hulhumale'])
```

## Reading Existing Spreadsheets

```python
wb = load_workbook('/workspace/data.xlsx')
ws = wb.active

# Iterate all rows
for row in ws.iter_rows(min_row=1, values_only=True):
    print(row)  # Tuple of cell values

# Specific cell
val = ws['B2'].value
val = ws.cell(row=2, column=2).value

# Sheet names
print(wb.sheetnames)

# Access specific sheet
ws2 = wb['Summary']

# Get dimensions
print(ws.max_row, ws.max_column)
```

**Read-only mode for large files:**
```python
wb = load_workbook('/workspace/large.xlsx', read_only=True)
ws = wb.active
for row in ws.iter_rows(values_only=True):
    print(row)
wb.close()  # MUST close read-only workbooks
```

## Column Widths and Row Heights

```python
from openpyxl.utils import get_column_letter

# Set specific column width
ws.column_dimensions['A'].width = 25
ws.column_dimensions['B'].width = 15

# Auto-fit approximation (openpyxl has no true auto-fit)
for col_idx in range(1, ws.max_column + 1):
    max_len = 0
    col_letter = get_column_letter(col_idx)
    for row in ws.iter_rows(min_col=col_idx, max_col=col_idx, values_only=True):
        cell_len = len(str(row[0] or ''))
        if cell_len > max_len:
            max_len = cell_len
    ws.column_dimensions[col_letter].width = min(max_len + 4, 50)

# Row height
ws.row_dimensions[1].height = 30  # Header row taller
```

## Cell Styling

### Fonts
```python
from openpyxl.styles import Font

# Font options
cell.font = Font(
    name='Arial',
    size=12,
    bold=True,
    italic=False,
    underline='single',  # 'single', 'double', 'singleAccounting', 'doubleAccounting'
    strike=False,
    color='2E86AB',       # Hex color (no #)
)
```

### Fill (Background Color)
```python
from openpyxl.styles import PatternFill

# Solid fill
cell.fill = PatternFill(start_color='2E86AB', end_color='2E86AB', fill_type='solid')

# No fill (reset)
cell.fill = PatternFill(fill_type=None)
```

### Alignment
```python
from openpyxl.styles import Alignment

cell.alignment = Alignment(
    horizontal='center',    # 'left', 'center', 'right', 'justify'
    vertical='center',      # 'top', 'center', 'bottom'
    wrap_text=True,         # Wrap long text
    shrink_to_fit=False,
    text_rotation=0,        # 0-180 degrees
    reading_order=0,        # 0=context, 1=LTR, 2=RTL
)
```

### Borders
```python
from openpyxl.styles import Border, Side

thin_border = Border(
    left=Side(style='thin', color='CCCCCC'),
    right=Side(style='thin', color='CCCCCC'),
    top=Side(style='thin', color='CCCCCC'),
    bottom=Side(style='thin', color='CCCCCC'),
)
cell.border = thin_border

# Border styles: 'thin', 'medium', 'thick', 'double', 'dotted', 'dashed',
#   'dashDot', 'dashDotDot', 'hair', 'mediumDashed', 'mediumDashDot',
#   'mediumDashDotDot', 'slantDashDot'
```

### Number Formats
```python
# Currency
cell.number_format = '#,##0.00'       # 1,234.56
cell.number_format = '$#,##0.00'      # $1,234.56
cell.number_format = '#,##0.00 MVR'   # 1,234.56 MVR

# Percentage
cell.number_format = '0.0%'           # 85.5%

# Date
cell.number_format = 'YYYY-MM-DD'
cell.number_format = 'DD/MM/YYYY'

# Custom
cell.number_format = '#,##0'          # No decimals
cell.number_format = '0.000'          # 3 decimals
```

### Applying Styles to Ranges
```python
# Style a header row
header_font = Font(bold=True, color='FFFFFF', size=11)
header_fill = PatternFill(start_color='2E86AB', end_color='2E86AB', fill_type='solid')
header_align = Alignment(horizontal='center', vertical='center')

for cell in ws[1]:  # Row 1
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = header_align
    cell.border = thin_border

# Style all data cells
for row in ws.iter_rows(min_row=2, max_row=ws.max_row, max_col=ws.max_column):
    for cell in row:
        cell.border = thin_border
        cell.alignment = Alignment(vertical='center')
```

**Alternating row colors:**
```python
light_fill = PatternFill(start_color='F5F5F5', end_color='F5F5F5', fill_type='solid')
white_fill = PatternFill(start_color='FFFFFF', end_color='FFFFFF', fill_type='solid')

for row_idx, row in enumerate(ws.iter_rows(min_row=2, max_row=ws.max_row, max_col=ws.max_column), 2):
    fill = light_fill if row_idx % 2 == 0 else white_fill
    for cell in row:
        cell.fill = fill
```

## Formulas

```python
# Basic formulas
ws['D2'] = '=SUM(B2:B100)'
ws['D3'] = '=AVERAGE(B2:B100)'
ws['D4'] = '=COUNT(B2:B100)'
ws['D5'] = '=MAX(B2:B100)'
ws['D6'] = '=MIN(B2:B100)'

# Conditional formulas
ws['E2'] = '=IF(B2>25,"Senior","Junior")'
ws['F2'] = '=VLOOKUP(A2,Sheet2!A:B,2,FALSE)'

# COUNTIF / SUMIF
ws['D7'] = '=COUNTIF(C2:C100,"Male")'
ws['D8'] = '=SUMIF(C2:C100,"Male",B2:B100)'
```

**CRITICAL: openpyxl stores formulas as strings — they are NOT evaluated in Python.** The formula is computed when the file is opened in Excel/LibreOffice/Google Sheets.

## Merged Cells

```python
# Merge a range
ws.merge_cells('A1:D1')
ws['A1'] = 'Merged Title'
ws['A1'].alignment = Alignment(horizontal='center')
ws['A1'].font = Font(bold=True, size=14)

# Unmerge
ws.unmerge_cells('A1:D1')

# Merge by coordinates
ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=4)
```

## Multiple Sheets

```python
wb = Workbook()
ws1 = wb.active
ws1.title = 'Data'

# Create additional sheets
ws2 = wb.create_sheet('Summary')
ws3 = wb.create_sheet('Charts')

# Insert sheet at specific position
ws4 = wb.create_sheet('Cover', 0)  # First position

# Copy sheet
wb.copy_worksheet(ws1)

# Delete sheet
del wb['Charts']

# Reorder (set sheet order)
wb.move_sheet('Summary', offset=-1)  # Move one position left
```

## Freeze Panes

```python
# Freeze top row (headers stay visible while scrolling)
ws.freeze_panes = 'A2'

# Freeze first column
ws.freeze_panes = 'B1'

# Freeze top row AND first column
ws.freeze_panes = 'B2'

# Unfreeze
ws.freeze_panes = None
```

## Auto-Filter and Sorting

```python
# Enable auto-filter on a range
ws.auto_filter.ref = f'A1:{get_column_letter(ws.max_column)}{ws.max_row}'

# Add a filter condition (shown as pre-applied filter in Excel)
ws.auto_filter.add_filter_column(0, ['Ahmed', 'Hassan'])  # Column A, specific values

# Add sort condition
ws.auto_filter.add_sort_condition(f'B1:B{ws.max_row}')
```

## Data Validation (Dropdowns)

```python
from openpyxl.worksheet.datavalidation import DataValidation

# Dropdown list
dv = DataValidation(
    type='list',
    formula1='"Option A,Option B,Option C"',
    allow_blank=True,
    showErrorMessage=True,
    errorTitle='Invalid',
    error='Please select from the list.',
)
ws.add_data_validation(dv)
dv.add('C2:C100')  # Apply to range

# Number range validation
dv_num = DataValidation(
    type='whole',
    operator='between',
    formula1='0',
    formula2='100',
    errorTitle='Invalid',
    error='Enter a number between 0 and 100.',
)
ws.add_data_validation(dv_num)
dv_num.add('B2:B100')

# Date validation
dv_date = DataValidation(
    type='date',
    operator='greaterThan',
    formula1='2024-01-01',
)
ws.add_data_validation(dv_date)
dv_date.add('D2:D100')
```

## Conditional Formatting

```python
from openpyxl.formatting.rule import (
    ColorScaleRule, CellIsRule, FormulaRule, DataBarRule, IconSetRule
)
from openpyxl.styles import PatternFill, Font

# Color scale (green → yellow → red)
ws.conditional_formatting.add('B2:B100',
    ColorScaleRule(
        start_type='min', start_color='63BE7B',   # Green
        mid_type='percentile', mid_value=50, mid_color='FFEB84',  # Yellow
        end_type='max', end_color='F8696B',        # Red
    )
)

# Highlight cells above a value
red_fill = PatternFill(start_color='FFC7CE', end_color='FFC7CE', fill_type='solid')
ws.conditional_formatting.add('B2:B100',
    CellIsRule(
        operator='greaterThan',
        formula=['80'],
        fill=red_fill,
        font=Font(color='9C0006'),
    )
)

# Data bars
ws.conditional_formatting.add('B2:B100',
    DataBarRule(
        start_type='min', end_type='max',
        color='2E86AB',
    )
)

# Icon sets (arrows, traffic lights, etc.)
ws.conditional_formatting.add('B2:B100',
    IconSetRule(
        icon_style='3Arrows',  # '3Arrows', '3TrafficLights1', '4Arrows', '5Arrows', etc.
        type='num',
        values=[0, 33, 67],
    )
)
```

## Charts

```python
from openpyxl.chart import BarChart, LineChart, PieChart, Reference

# Bar chart
chart = BarChart()
chart.title = 'Sales by Region'
chart.x_axis.title = 'Region'
chart.y_axis.title = 'Sales'
chart.style = 10  # Built-in style (1-48)

data = Reference(ws, min_col=2, min_row=1, max_row=ws.max_row)     # Values
cats = Reference(ws, min_col=1, min_row=2, max_row=ws.max_row)     # Categories
chart.add_data(data, titles_from_data=True)
chart.set_categories(cats)
chart.shape = 4  # Rounded bars

ws.add_chart(chart, 'E2')  # Anchor position

# Line chart
line = LineChart()
line.title = 'Monthly Trend'
line.add_data(Reference(ws, min_col=2, max_col=4, min_row=1, max_row=13), titles_from_data=True)
line.set_categories(Reference(ws, min_col=1, min_row=2, max_row=13))
ws.add_chart(line, 'E18')

# Pie chart
pie = PieChart()
pie.title = 'Distribution'
pie.add_data(Reference(ws, min_col=2, min_row=1, max_row=6), titles_from_data=True)
pie.set_categories(Reference(ws, min_col=1, min_row=2, max_row=6))
ws.add_chart(pie, 'E2')
```

**Chart sizing:**
```python
chart.width = 18   # cm
chart.height = 12  # cm
```

**Chart types available:** `BarChart`, `BarChart3D`, `LineChart`, `LineChart3D`, `PieChart`, `PieChart3D`, `AreaChart`, `AreaChart3D`, `ScatterChart`, `DoughnutChart`, `RadarChart`, `BubbleChart`, `StockChart`, `SurfaceChart`, `SurfaceChart3D`

## Images

```python
from openpyxl.drawing.image import Image

# Image must exist in the virtual filesystem
img = Image('/workspace/logo.png')
img.width = 200   # pixels
img.height = 100
ws.add_image(img, 'A1')  # Anchor cell
```

## Print Settings

```python
# Page setup
ws.page_setup.orientation = 'landscape'  # or 'portrait'
ws.page_setup.paperSize = ws.PAPERSIZE_LETTER  # or PAPERSIZE_A4
ws.page_setup.fitToWidth = 1
ws.page_setup.fitToHeight = 0  # 0 = as many pages as needed

# Print area
ws.print_area = 'A1:F50'

# Print title rows (repeat on every page)
ws.print_title_rows = '1:1'  # Header row

# Page margins (inches)
ws.page_margins.left = 0.5
ws.page_margins.right = 0.5
ws.page_margins.top = 0.75
ws.page_margins.bottom = 0.75

# Header/footer
ws.oddHeader.center.text = 'Report Title'
ws.oddFooter.center.text = 'Page &P of &N'
```

## Named Ranges

```python
from openpyxl.workbook.defined_name import DefinedName

# Create named range
ref = DefinedName('SalesData', attr_text="'Sheet1'!$A$1:$D$100")
wb.defined_names.add(ref)

# Use in formulas
ws['E1'] = '=SUM(SalesData)'
```

## Dates and Times

```python
from datetime import datetime, date

# Write dates (openpyxl auto-detects datetime objects)
ws['A2'] = datetime(2025, 6, 15, 14, 30)
ws['A2'].number_format = 'YYYY-MM-DD HH:MM'

ws['A3'] = date(2025, 6, 15)
ws['A3'].number_format = 'DD/MM/YYYY'
```

## RTL / Thaana Text

```python
from openpyxl.styles import Alignment

# Set RTL reading order on cells
rtl_align = Alignment(horizontal='right', reading_order=2)

cell = ws['A1']
cell.value = 'ތާނަ ލިޔުން'
cell.alignment = rtl_align
cell.font = Font(name='MV Boli')  # Thaana-supporting font

# Set sheet direction to RTL
ws.sheet_view.rightToLeft = True
```

## Protecting Sheets

```python
# Protect sheet (prevent editing)
ws.protection.sheet = True
ws.protection.password = 'password123'

# Allow specific actions
ws.protection.enable()
ws.protection.formatCells = True     # Allow formatting
ws.protection.insertRows = False     # Prevent row insertion
ws.protection.sort = True            # Allow sorting

# Lock/unlock specific cells
from openpyxl.styles import Protection

# Unlock editable cells (all cells are locked by default when sheet is protected)
ws['B2'].protection = Protection(locked=False)
```

## Critical Rules

- **Always save to `/output/`** directory
- **Use `present_file`** after saving to show the user the downloadable file
- **Formulas are NOT evaluated in Python** — they compute when opened in Excel/LibreOffice/Google Sheets
- **Set column widths explicitly** — openpyxl has no true auto-fit; approximate based on content length
- **Styles are immutable** — you cannot modify a cell's existing style in-place; assign a new style object each time
- **RTL requires both `reading_order=2` and a Thaana font** — default fonts don't render Thaana script
- **Use `append()` for sequential row writing** — faster and cleaner than cell-by-cell for bulk data
- **Close read-only workbooks** — `load_workbook(read_only=True)` requires `wb.close()`
- **Charts render in Excel/LibreOffice** — openpyxl embeds chart definitions; they are not visible until opened
- **Merged cell values** — only the top-left cell holds the value; other cells in the merge are empty
- **Each `execute_python` call is a fresh scope** — re-import everything at the top of each call
