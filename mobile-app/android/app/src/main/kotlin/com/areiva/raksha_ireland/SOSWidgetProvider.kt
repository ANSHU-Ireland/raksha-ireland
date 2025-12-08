package com.areiva.raksha_ireland

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.widget.RemoteViews
import android.widget.Toast

/**
 * SOS Widget Provider
 * Handles widget updates and user interactions
 */
class SOSWidgetProvider : AppWidgetProvider() {

    companion object {
        private const val ACTION_WIDGET_CLICK = "com.areiva.raksha_ireland.WIDGET_CLICK"
        private const val ACTION_TRIGGER_SOS = "com.areiva.raksha_ireland.TRIGGER_SOS"
        private const val TRIPLE_CLICK_WINDOW_MS = 5000L // 5 seconds window
        private const val REQUIRED_CLICKS = 3
        
        private var clickCount = 0
        private var firstClickTime: Long = 0
        private var resetHandler: Handler? = null
        private var resetRunnable: Runnable? = null
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        when (intent.action) {
            ACTION_WIDGET_CLICK -> handleWidgetClick(context)
            ACTION_TRIGGER_SOS -> triggerSOS(context)
        }
    }

    private fun handleWidgetClick(context: Context) {
        val currentTime = System.currentTimeMillis()
        
        // Initialize reset handler if needed
        if (resetHandler == null) {
            resetHandler = Handler(Looper.getMainLooper())
        }
        
        // Reset if this is the first click or window expired
        if (clickCount == 0 || (currentTime - firstClickTime) > TRIPLE_CLICK_WINDOW_MS) {
            clickCount = 1
            firstClickTime = currentTime
            
            // Schedule reset after window expires
            resetRunnable?.let { resetHandler?.removeCallbacks(it) }
            resetRunnable = Runnable {
                clickCount = 0
                firstClickTime = 0
            }
            resetHandler?.postDelayed(resetRunnable!!, TRIPLE_CLICK_WINDOW_MS)
            
            Toast.makeText(context, "Tap 2 more times to trigger SOS", Toast.LENGTH_SHORT).show()
        } else {
            // Increment click count
            clickCount++
            
            when {
                clickCount >= REQUIRED_CLICKS -> {
                    // Triple click detected - trigger SOS
                    resetRunnable?.let { resetHandler?.removeCallbacks(it) }
                    clickCount = 0
                    firstClickTime = 0
                    triggerSOS(context)
                }
                clickCount == 2 -> {
                    Toast.makeText(context, "Tap 1 more time to trigger SOS", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun triggerSOS(context: Context) {
        // Cancel any pending reset timer
        resetRunnable?.let { resetHandler?.removeCallbacks(it) }
        resetRunnable = null
        
        // Launch the app with SOS trigger intent
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        launchIntent?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("trigger_sos", true)
            putExtra("from_widget", true)
        }
        
        // Show confirmation
        Toast.makeText(context, "🚨 SOS Alert Triggered!", Toast.LENGTH_LONG).show()
        
        // Start the app
        if (launchIntent != null) {
            context.startActivity(launchIntent)
        }
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        // Create RemoteViews for the widget layout
        val views = RemoteViews(context.packageName, R.layout.sos_widget)
        
        // Set up click intent for triple-click detection
        val clickIntent = Intent(context, SOSWidgetProvider::class.java).apply {
            action = ACTION_WIDGET_CLICK
        }
        val clickPendingIntent = PendingIntent.getBroadcast(
            context,
            0,
            clickIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        // Set click listener on the entire widget
        views.setOnClickPendingIntent(R.id.widget_container, clickPendingIntent)
        
        // Update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    override fun onEnabled(context: Context) {
        // Widget is being added for the first time
        Toast.makeText(context, "SOS Widget added. Tap 3 times within 5s to trigger.", Toast.LENGTH_LONG).show()
    }

    override fun onDisabled(context: Context) {
        // Last widget instance removed
        resetRunnable?.let { resetHandler?.removeCallbacks(it) }
        resetHandler = null
    }
}
