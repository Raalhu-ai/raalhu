function triggerDownload(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

const WORD_HTML_TEMPLATE = (body: string) => `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<style>
body {
	font-family: "MV Typewriter", "Faruma", Arial, sans-serif;
	direction: rtl;
	line-height: 1.8;
	color: #1a1a1a;
}
h1, h2, h3, h4, h5, h6 {
	font-family: "Sangu Suruhee", "MV Typewriter", "Faruma", sans-serif;
}
code {
	font-family: Consolas, monospace;
	background: #f5f5f5;
	padding: 0.15em 0.35em;
	border-radius: 4px;
	direction: ltr;
	unicode-bidi: isolate;
}
pre {
	background: #f5f5f5;
	padding: 0.75em 1em;
	border-radius: 8px;
	overflow-x: auto;
	direction: ltr;
	unicode-bidi: isolate;
}
blockquote {
	border-right: 3px solid #d4a574;
	padding: 0.25em 1em;
	color: #666;
}
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #ddd; padding: 0.4em 0.6em; text-align: right; }
</style>
</head>
<body dir="rtl">${body}</body>
</html>`;

export function downloadAsWord(htmlContent: string) {
	const doc = WORD_HTML_TEMPLATE(htmlContent);
	const blob = new Blob(['\ufeff', doc], { type: 'application/msword' });
	triggerDownload(blob, `mogger-${Date.now()}.doc`);
}

export function downloadAsPdf(htmlContent: string) {
	const printWindow = window.open('', '_blank');
	if (!printWindow) {
		alert('Please allow popups for PDF export');
		return;
	}
	printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="dv">
<head>
<meta charset="UTF-8">
<title>Mogger Export</title>
<style>
@font-face {
	font-family: "MV Typewriter";
	src: url("/fonts/mvtyper.ttf") format("truetype");
	font-weight: 400;
}
@font-face {
	font-family: "MV Typewriter";
	src: url("/fonts/mvtypebold.ttf") format("truetype");
	font-weight: 700;
}
@font-face {
	font-family: "Sangu Suruhee";
	src: url("/fonts/SanguSuruhee-Regular.woff2") format("woff2"),
		 url("/fonts/SanguSuruhee-Regular.woff") format("woff");
	font-weight: 400;
}
body {
	font-family: "MV Typewriter", "Faruma", sans-serif;
	direction: rtl;
	line-height: 1.8;
	padding: 2cm;
	color: #1a1a1a;
}
h1, h2, h3, h4, h5, h6 {
	font-family: "Sangu Suruhee", "MV Typewriter", "Faruma", sans-serif;
}
code {
	font-family: monospace;
	background: #f5f5f5;
	padding: 0.15em 0.35em;
	border-radius: 4px;
	direction: ltr;
}
pre {
	background: #f5f5f5;
	padding: 0.75em 1em;
	border-radius: 8px;
	overflow-x: auto;
	direction: ltr;
}
blockquote {
	border-right: 3px solid #d4a574;
	padding: 0.25em 1em;
	color: #666;
}
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #ddd; padding: 0.4em 0.6em; text-align: right; }
@media print { body { padding: 0; } }
</style>
</head>
<body>${htmlContent}</body>
</html>`);
	printWindow.document.close();
	printWindow.onload = () => {
		setTimeout(() => {
			printWindow.print();
			printWindow.close();
		}, 500);
	};
}

export async function openInGoogleDocs(markdownContent: string) {
	await navigator.clipboard.writeText(markdownContent);
	window.open('https://docs.google.com/document/create', '_blank');
}
