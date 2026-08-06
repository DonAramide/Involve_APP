package com.connectpoint.cpointpay.mposdirect;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import com.connectpoint.cpointpay.R;

/**
 * Foreground service that pings the MoreFun MPOS over Bluetooth while any MPOS Direct
 * screen is in the task (including when the phone screen is off / dozing).
 */
public class MposKeepAliveService extends Service {

    private static final String TAG = "MposKeepAliveSvc";

    public static final String ACTION_START = "com.connectpoint.cpointpay.mposdirect.KEEPALIVE_START";
    public static final String ACTION_STOP = "com.connectpoint.cpointpay.mposdirect.KEEPALIVE_STOP";

    private static final String CHANNEL_ID = "mpos_keepalive";
    private static final int NOTIFICATION_ID = 7109;

    private static final long PING_INTERVAL_MS = 150_000L;
    private static final long FIRST_PING_DELAY_MS = 3_000L;
    private static final long RETRY_INTERVAL_MS = 15_000L;

    private HandlerThread workerThread;
    private Handler workerHandler;
    private Runnable pingRunnable;
    private MposDeviceManager deviceManager;
    private PowerManager.WakeLock wakeLock;
    private boolean running;

    public static void start(Context context) {
        Intent intent = new Intent(context, MposKeepAliveService.class);
        intent.setAction(ACTION_START);
        ContextCompat.startForegroundService(context, intent);
    }

    public static void stop(Context context) {
        Intent intent = new Intent(context, MposKeepAliveService.class);
        intent.setAction(ACTION_STOP);
        context.startService(intent);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        ensureNotificationChannel();
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "cpointpay:mpos_keepalive");
            wakeLock.setReferenceCounted(false);
        }
        deviceManager = new MposDeviceManager(getApplicationContext());
        deviceManager.initializeSdk();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_START;
        if (ACTION_STOP.equals(action)) {
            Log.i(TAG, "Stop requested");
            stopKeepAlive();
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }

        startAsForeground();
        startKeepAlive();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        stopKeepAlive();
        releaseWakeLock();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void startAsForeground() {
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void startKeepAlive() {
        if (running) {
            Log.d(TAG, "Keep-alive already running");
            return;
        }
        running = true;

        if (workerThread == null) {
            workerThread = new HandlerThread("MposKeepAliveSvc");
            workerThread.start();
            workerHandler = new Handler(workerThread.getLooper());
        }

        if (pingRunnable == null) {
            pingRunnable = new Runnable() {
                @Override
                public void run() {
                    long nextDelay = runPing();
                    scheduleNext(nextDelay);
                }
            };
        }

        workerHandler.removeCallbacks(pingRunnable);
        workerHandler.postDelayed(pingRunnable, FIRST_PING_DELAY_MS);
        Log.i(TAG, "Keep-alive started intervalMs=" + PING_INTERVAL_MS
                + " firstPingMs=" + FIRST_PING_DELAY_MS + " foreground=true");
    }

    private void stopKeepAlive() {
        running = false;
        if (workerHandler != null && pingRunnable != null) {
            workerHandler.removeCallbacks(pingRunnable);
        }
        if (workerThread != null) {
            workerThread.quitSafely();
        }
        workerThread = null;
        workerHandler = null;
        pingRunnable = null;
        Log.i(TAG, "Keep-alive stopped");
    }

    private void scheduleNext(long delayMs) {
        if (!running || workerHandler == null || pingRunnable == null) {
            return;
        }
        workerHandler.removeCallbacks(pingRunnable);
        workerHandler.postDelayed(pingRunnable, delayMs);
    }

    private long runPing() {
        if (!running || deviceManager == null) {
            return PING_INTERVAL_MS;
        }
        if (MposDeviceManager.isDeviceOperationInProgress()) {
            Log.d(TAG, "Skip ping — device operation in progress");
            return PING_INTERVAL_MS;
        }
        String mac = deviceManager.getSavedMac();
        if (mac == null || mac.isEmpty()) {
            Log.d(TAG, "Skip ping — no paired device");
            return PING_INTERVAL_MS;
        }

        acquireWakeLock();
        try {
            boolean ok = deviceManager.pingOrReconnect();
            boolean connected = deviceManager.isConnected();
            Log.i(TAG, "Keep-alive ping result=" + ok + " connected=" + connected);
            return ok ? PING_INTERVAL_MS : RETRY_INTERVAL_MS;
        } catch (Exception ex) {
            Log.e(TAG, "Keep-alive ping failed", ex);
            return RETRY_INTERVAL_MS;
        } finally {
            releaseWakeLock();
        }
    }

    private void acquireWakeLock() {
        try {
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(60_000L);
            }
        } catch (Exception ignored) {
        }
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception ignored) {
        }
    }

    private void ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm == null) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                getString(R.string.mpos_direct_keepalive_channel),
                NotificationManager.IMPORTANCE_LOW);
        channel.setDescription(getString(R.string.mpos_direct_keepalive_channel_desc));
        channel.setShowBadge(false);
        nm.createNotificationChannel(channel);
    }

    private Notification buildNotification() {
        Intent open = new Intent(this, MposHomeActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
                this,
                0,
                open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_sync)
                .setContentTitle(getString(R.string.mpos_direct_keepalive_title))
                .setContentText(getString(R.string.mpos_direct_keepalive_text))
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setContentIntent(pi)
                .build();
    }
}
