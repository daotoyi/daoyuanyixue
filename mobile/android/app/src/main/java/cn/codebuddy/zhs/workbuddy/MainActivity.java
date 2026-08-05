package cn.codebuddy.zhs.workbuddy;

import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

/**
 * 道元易学 · Android 入口
 *
 * 返回手势 / 返回键处理 (AndroidX 标准回调, Capacitor 8 下覆写 onBackPressed() 不生效):
 * - WebView 有历史记录 → 返回上一页 (不退出 App)
 * - 无历史记录(首页) → 最小化到后台 (不退出 App)
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 注册返回回调: 系统返回键 / 手势返回(Android 10+) 都会走这里
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge().getWebView();
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    // 首页: 退到后台而非退出应用
                    moveTaskToBack(true);
                }
            }
        });
    }
}
