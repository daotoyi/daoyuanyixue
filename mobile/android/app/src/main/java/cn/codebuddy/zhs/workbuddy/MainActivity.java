package cn.codebuddy.zhs.workbuddy;

import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * 道元易学 · Android 入口
 *
 * 返回手势 / 返回键处理:
 * - WebView 有历史记录 → 返回上一页 (不退出 App)
 * - 无历史记录(首页) → 最小化到后台 (不退出 App)
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onBackPressed() {
        WebView webView = getBridge().getWebView();
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            // 首页: 退到后台而非退出应用
            moveTaskToBack(true);
        }
    }
}
