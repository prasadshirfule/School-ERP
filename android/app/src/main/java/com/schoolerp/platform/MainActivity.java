package com.schoolerp.platform;

import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebView;
import android.widget.EditText;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.CapConfig;

public class MainActivity extends BridgeActivity {
    private static final String PREFS_NAME = "SchoolErpPrefs";
    private static final String KEY_SERVER_URL = "custom_server_url";
    private static final String PROD_URL = "https://school-erp-wb73.vercel.app";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String customUrl = prefs.getString(KEY_SERVER_URL, null);

        // If developer configured a custom server URL in preferences, use it; otherwise default to PROD_URL
        if (customUrl != null && !customUrl.trim().isEmpty()) {
            this.config = new CapConfig.Builder(this).setServerUrl(customUrl).create();
        } else {
            this.config = new CapConfig.Builder(this).setServerUrl(PROD_URL).create();
        }

        super.onCreate(savedInstanceState);
    }

    @Override
    public void onBackPressed() {
        if (getBridge() != null && getBridge().getWebView() != null && getBridge().getWebView().canGoBack()) {
            getBridge().getWebView().goBack();
        } else {
            super.onBackPressed();
        }
    }

    // Optional Dev Server Selector: Double click Volume Down key to open server dialog
    private long lastVolumeDownTime = 0;
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
            long now = System.currentTimeMillis();
            if (now - lastVolumeDownTime < 500) {
                showServerSelectorDialog();
                return true;
            }
            lastVolumeDownTime = now;
        }
        return super.onKeyDown(keyCode, event);
    }

    private void showServerSelectorDialog() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String currentUrl = prefs.getString(KEY_SERVER_URL, PROD_URL);

        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("School ERP — Server Selector");
        builder.setMessage("Active Server:\n" + currentUrl + "\n\nEnter local dev URL (e.g. http://192.168.x.x:3000) or leave blank for production:");

        final EditText input = new EditText(this);
        input.setHint(PROD_URL);
        input.setText(currentUrl.equals(PROD_URL) ? "" : currentUrl);
        builder.setView(input);

        builder.setPositiveButton("Save & Switch", (dialog, which) -> {
            String newUrl = input.getText().toString().trim();
            if (newUrl.isEmpty()) {
                prefs.edit().remove(KEY_SERVER_URL).apply();
                Toast.makeText(this, "Switched to Production Server", Toast.LENGTH_SHORT).show();
            } else {
                if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
                    newUrl = "http://" + newUrl;
                }
                prefs.edit().putString(KEY_SERVER_URL, newUrl).apply();
                Toast.makeText(this, "Saved: " + newUrl, Toast.LENGTH_SHORT).show();
            }
            recreate();
        });

        builder.setNegativeButton("Reset to Production", (dialog, which) -> {
            prefs.edit().remove(KEY_SERVER_URL).apply();
            Toast.makeText(this, "Reset to Default Production", Toast.LENGTH_SHORT).show();
            recreate();
        });

        builder.setNeutralButton("Cancel", null);
        builder.show();
    }
}
