# Data Processing with pandas/csv in Pyodide

## Setup (pandas)
```python
import micropip
await micropip.install('pandas')
import pandas as pd
```

## CSV without pandas (lighter)
```python
import csv, io

# Parse CSV string
reader = csv.DictReader(io.StringIO(csv_text))
rows = list(reader)

# Write CSV
with open('/output/data.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['Name', 'Value', 'Category'])
    writer.writerows(data)
```

## pandas Basics
```python
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
```

## Data Analysis
```python
# Aggregations
total = df['amount'].sum()
average = df['amount'].mean()
counts = df['category'].value_counts()

# Pivot tables
pivot = df.pivot_table(values='amount', index='category', aggfunc='sum')

# Cross-tabulation
ct = pd.crosstab(df['category'], df['status'])
```

## Export
```python
# To CSV
df.to_csv('/output/result.csv', index=False, encoding='utf-8')

# To JSON
df.to_json('/output/result.json', orient='records', force_ascii=False)

# To formatted string (for display)
summary = df.to_string()
```

## Key Gotchas
- pandas is ~15MB to install — use `csv` module for simple tasks
- Always use `encoding='utf-8'` and `force_ascii=False` for Thaana data
- Save results to `/output/` and use `present_file` to share
- For large datasets, consider chunked reading: `pd.read_csv(path, chunksize=1000)`
