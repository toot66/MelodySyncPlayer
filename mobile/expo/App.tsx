import React, { useMemo, useRef, useState } from 'react';
import { Platform, SafeAreaView, StatusBar, View, Text, TouchableOpacity } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
let WebViewComp: any = null;
try {
  // 尝试加载原生 WebView，如果 Expo Go/SDK 缓存异常导致不可用，则使用兜底
  // 注意：不要在导入失败时崩溃
  WebViewComp = require('react-native-webview').WebView;
} catch (e) {
  WebViewComp = null;
}

/**
 * Expo Go test shell that loads the Melody Sync web app inside a WebView.
 *
 * Configure the web URL in app.json -> expo.extra.WEB_APP_URL
 * Example for local dev: http://<your-lan-ip>:5173/
 */
export default function App() {
  const webUrl = useMemo(() => {
    const url = (Constants?.expoConfig?.extra as any)?.WEB_APP_URL as string | undefined;
    // Fallback for developers: change to your LAN ip:port if needed
    return url || 'http://127.0.0.1:5173/';
  }, []);
  const webRef = useRef<any>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'light-content' : 'default'} />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#0b1220' }}>
        <TouchableOpacity
          onPress={() => { if (webRef.current && canGoBack) webRef.current.goBack(); }}
          disabled={!canGoBack}
          style={{ paddingHorizontal: 10, paddingVertical: 6, opacity: canGoBack ? 1 : 0.5 }}
        >
          <Text style={{ color: '#fff' }}>返回</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { if (webRef.current) webRef.current.reload(); }} style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: '#fff' }}>刷新</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(webUrl)} style={{ paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: '#8bdb9b' }}>在浏览器打开</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1 }}>
        {WebViewComp ? (
          <WebViewComp
            ref={webRef}
            source={{ uri: webUrl }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            allowsBackForwardNavigationGestures
            incognito={false}
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
            startInLoadingState
            onNavigationStateChange={(navState: any) => setCanGoBack(!!navState.canGoBack)}
          />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' }}>
            <Text style={{ color: '#fff', marginBottom: 12 }}>WebView 模块不可用（可能是缓存或 SDK 不匹配）</Text>
            <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(webUrl)} style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#16a34a', borderRadius: 8 }}>
              <Text style={{ color: '#fff' }}>在系统浏览器中打开</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
