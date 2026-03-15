export default `# Text & Thaana Processing in Pyodide

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
- Use \`present_file\` after saving results to \`/output/\``;
