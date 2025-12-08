package com.areiva.raksha_ireland

import android.content.Intent
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.areiva.raksha_ireland/widget"
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleWidgetIntent(intent)
    }
    
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleWidgetIntent(intent)
    }
    
    private fun handleWidgetIntent(intent: Intent?) {
        intent?.let {
            val triggerSos = it.getBooleanExtra("trigger_sos", false)
            val openEmergency = it.getBooleanExtra("open_emergency", false)
            val fromWidget = it.getBooleanExtra("from_widget", false)
            
            if (triggerSos || openEmergency) {
                // Widget was pressed - navigate to emergency screen and trigger SOS
                flutterEngine?.dartExecutor?.binaryMessenger?.let { messenger ->
                    MethodChannel(messenger, CHANNEL).invokeMethod("openEmergency", mapOf(
                        "fromWidget" to fromWidget,
                        "triggerSos" to triggerSos
                    ))
                }
            }
        }
    }
}
