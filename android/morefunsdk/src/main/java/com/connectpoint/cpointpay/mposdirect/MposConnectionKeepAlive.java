package com.connectpoint.cpointpay.mposdirect;

import android.content.Context;
import android.util.Log;

/**
 * Ref-counted entry point for MPOS Bluetooth keep-alive.
 * <p>
 * Starts {@link MposKeepAliveService} (foreground) so pings continue when the phone
 * screen is off. Call {@link #acquire(Context)} once from activity {@code onCreate()}
 * and {@link #release(Context)} from {@code onDestroy()} — not {@code onStop()},
 * otherwise sleep would stop the keep-alive.
 */
public final class MposConnectionKeepAlive {

    private static final String TAG = "MposConnKeepAlive";
    private static final Object LOCK = new Object();

    private static int refCount;
    private static Context appContext;

    private MposConnectionKeepAlive() {
    }

    /** Call once from MPOS Direct activity {@code onCreate()}. */
    public static void acquire(Context context) {
        synchronized (LOCK) {
            appContext = context.getApplicationContext();
            refCount++;
            Log.d(TAG, "Keep-alive acquire refCount=" + refCount);
            if (refCount == 1) {
                MposKeepAliveService.start(appContext);
            }
        }
    }

    /**
     * Call from MPOS Direct activity {@code onDestroy()} (not {@code onStop()}),
     * so screen-off does not tear down the foreground keep-alive.
     */
    public static void release(Context context) {
        synchronized (LOCK) {
            if (refCount > 0) {
                refCount--;
            }
            Log.d(TAG, "Keep-alive release refCount=" + refCount);
            if (refCount > 0) {
                return;
            }
            Context ctx = appContext != null ? appContext : context.getApplicationContext();
            MposKeepAliveService.stop(ctx);
            appContext = null;
        }
    }

    /** @deprecated Use {@link #release(Context)}. */
    @Deprecated
    public static void release() {
        synchronized (LOCK) {
            if (appContext == null) {
                Log.w(TAG, "Keep-alive release ignored — no app context");
                return;
            }
            release(appContext);
        }
    }
}
