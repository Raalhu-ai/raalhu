import React, { createContext, useContext, useRef, useCallback } from 'react';
import { View } from 'react-native';
import WebView from 'react-native-webview';
import { PyodideSandbox } from './sandbox';
import { PYODIDE_BRIDGE_HTML } from './pyodide-bridge-html';

const SandboxContext = createContext<PyodideSandbox | null>(null);

export function useSandbox(): PyodideSandbox | null {
	return useContext(SandboxContext);
}

interface Props {
	children: React.ReactNode;
}

export function PyodideSandboxProvider({ children }: Props) {
	const sandboxRef = useRef<PyodideSandbox | null>(null);
	const webViewRef = useRef<WebView | null>(null);

	if (!sandboxRef.current) {
		sandboxRef.current = new PyodideSandbox();
	}

	const onWebViewRef = useCallback((ref: WebView | null) => {
		webViewRef.current = ref;
		if (ref && sandboxRef.current) {
			sandboxRef.current.setSendMessage((msg: string) => {
				// Use injectJavaScript to call the global handler
				const escaped = msg.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
				ref.injectJavaScript(`window.handleRNMessage('${escaped}'); true;`);
			});
		}
	}, []);

	const onMessage = useCallback((event: { nativeEvent: { data: string } }) => {
		sandboxRef.current?.handleMessage(event.nativeEvent.data);
	}, []);

	return (
		<SandboxContext.Provider value={sandboxRef.current}>
			{children}
			<View style={{ width: 0, height: 0, position: 'absolute', overflow: 'hidden' }}>
				<WebView
					ref={onWebViewRef}
					source={{ html: PYODIDE_BRIDGE_HTML }}
					onMessage={onMessage}
					javaScriptEnabled
					originWhitelist={['*']}
					allowUniversalAccessFromFileURLs
					mixedContentMode="always"
					style={{ width: 0, height: 0 }}
				/>
			</View>
		</SandboxContext.Provider>
	);
}
