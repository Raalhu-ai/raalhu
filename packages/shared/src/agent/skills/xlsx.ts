export default `# Spreadsheet Processing (openpyxl) in Pyodide

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
- **Each \`execute_python\` call is a fresh scope**`;
