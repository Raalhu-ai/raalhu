import React, { useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface WidgetDisplayProps {
	data: {
		title: string;
		widget_code: string;
		mode: 'html' | 'svg';
	};
	onSendPrompt?: (text: string) => void;
}

export function WidgetDisplay({ data, onSendPrompt }: WidgetDisplayProps) {
	const webViewRef = useRef<WebView>(null);
	const [height, setHeight] = useState(300);

	let html: string;
	if (data.mode === 'svg') {
		html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
html, body { margin: 0; padding: 16px; background: #242526; display: flex; align-items: center; justify-content: center; min-height: 100%; }
svg { max-width: 100%; height: auto; }
</style></head>
<body>${data.widget_code}
<script>
new ResizeObserver(function() {
	var h = document.documentElement.scrollHeight;
	window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'resize', height: h }));
}).observe(document.body);
</script>
</body></html>`;
	} else {
		const trimmed = data.widget_code.trimStart().toLowerCase();
		if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
			html = data.widget_code;
		} else {
			html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
html, body { margin: 0; padding: 16px; background: #242526; color: #e4e6eb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
* { box-sizing: border-box; }
</style></head>
<body>${data.widget_code}
<script>
function sendPrompt(text) {
	window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'sendPrompt', text: text }));
}
new ResizeObserver(function() {
	var h = document.documentElement.scrollHeight;
	window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'resize', height: h }));
}).observe(document.body);
</script>
</body></html>`;
		}
	}

	const onMessage = useCallback((event: any) => {
		try {
			const msg = JSON.parse(event.nativeEvent.data);
			if (msg.type === 'resize') {
				setHeight(Math.min(Math.max(msg.height + 32, 200), 600));
			}
			if (msg.type === 'sendPrompt' && onSendPrompt) {
				onSendPrompt(msg.text);
			}
		} catch {}
	}, [onSendPrompt]);

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>{data.title}</Text>
			</View>
			<WebView
				ref={webViewRef}
				source={{ html }}
				style={{ height }}
				scrollEnabled={true}
				javaScriptEnabled={true}
				onMessage={onMessage}
				originWhitelist={['*']}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginTop: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#333',
		overflow: 'hidden',
		backgroundColor: '#242526',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderBottomWidth: 1,
		borderBottomColor: '#333',
		backgroundColor: 'rgba(255,255,255,0.05)',
	},
	title: {
		fontSize: 11,
		color: '#999',
		fontFamily: 'monospace',
	},
});
