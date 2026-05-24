package com.demo.mpossdk.internal.usb;

import android.os.Process;
import android.util.Log;

import java.io.IOException;
import java.nio.ByteBuffer;

public class SerialInputOutputManager implements Runnable {

    public enum State {
        STOPPED,
        RUNNING,
        STOPPING
    }

    public static boolean DEBUG = false;
    private static final String TAG = SerialInputOutputManager.class.getSimpleName();
    private static final int BUFSIZ = 4096;

    private int mReadTimeout = 0;
    private int mWriteTimeout = 0;

    private final Object mReadBufferLock = new Object();
    private final Object mWriteBufferLock = new Object();

    private ByteBuffer mReadBuffer; // default size = getReadEndpoint().getMaxPacketSize()
    private ByteBuffer mWriteBuffer = ByteBuffer.allocate(BUFSIZ);

    private int mThreadPriority = Process.THREAD_PRIORITY_URGENT_AUDIO;
    private State mState = State.STOPPED; // Synchronized by 'this'
    private Listener mListener; // Synchronized by 'this'
    private final UsbSerialPort mSerialPort;

    public interface Listener {
        /**
         * Called when new incoming data is available.
         */
        void onNewData(byte[] data);

        /**
         * Called when {@link SerialInputOutputManager#run()} aborts due to an error.
         */
        void onRunError(Exception e);
    }

    public SerialInputOutputManager(UsbSerialPort serialPort, Listener listener) {
        mSerialPort = serialPort;
        mListener = listener;
        mReadBuffer = ByteBuffer.allocate(serialPort.getReadEndpoint().getMaxPacketSize());
    }

    public synchronized void setListener(Listener listener) {
        mListener = listener;
    }

    public synchronized Listener getListener() {
        return mListener;
    }

    /**
     * start SerialInputOutputManager in separate thread
     */
    public void start() {
        if(mState != State.STOPPED)
            throw new IllegalStateException("already started");
        new Thread(this, this.getClass().getSimpleName()).start();
    }

    /**
     * stop SerialInputOutputManager thread
     *
     * when using readTimeout == 0 (default), additionally use usbSerialPort.close() to
     * interrupt blocking read
     */
    public synchronized void stop() {
        if (getState() == State.RUNNING) {
            Log.i(TAG, "Stop requested");
            mState = State.STOPPING;
        }
    }

    public synchronized State getState() {
        return mState;
    }

    /**
     * Continuously services the read and write buffers until {@link #stop()} is
     * called, or until a driver exception is raised.
     */
    @Override
    public void run() {
        synchronized (this) {
            if (getState() != State.STOPPED) {
                throw new IllegalStateException("Already running");
            }
            mState = State.RUNNING;
        }
        Log.i(TAG, "Running ...");
        try {
            if(mThreadPriority != Process.THREAD_PRIORITY_DEFAULT)
                Process.setThreadPriority(mThreadPriority);
            while (true) {
                if (getState() != State.RUNNING) {
                    Log.i(TAG, "Stopping mState=" + getState());
                    break;
                }
                step();
            }
        } catch (Exception e) {
            Log.w(TAG, "Run ending due to exception: " + e.getMessage(), e);
            final Listener listener = getListener();
            if (listener != null) {
              listener.onRunError(e);
            }
        } finally {
            synchronized (this) {
                mState = State.STOPPED;
                Log.i(TAG, "Stopped");
            }
        }
    }

    private void step() throws IOException {
        // Handle incoming data.
        byte[] buffer;
        synchronized (mReadBufferLock) {
            buffer = mReadBuffer.array();
        }
        int len = mSerialPort.read(buffer, mReadTimeout);
        if (len > 0) {
            if (DEBUG) {
                Log.d(TAG, "Read data len=" + len);
            }
            final Listener listener = getListener();
            if (listener != null) {
                final byte[] data = new byte[len];
                System.arraycopy(buffer, 0, data, 0, len);
                listener.onNewData(data);
            }
        }

        // Handle outgoing data.
        buffer = null;
        synchronized (mWriteBufferLock) {
            len = mWriteBuffer.position();
            if (len > 0) {
                buffer = new byte[len];
                mWriteBuffer.rewind();
                mWriteBuffer.get(buffer, 0, len);
                mWriteBuffer.clear();
            }
        }
        if (buffer != null) {
            if (DEBUG) {
                Log.d(TAG, "Writing data len=" + len);
            }
            mSerialPort.write(buffer, mWriteTimeout);
        }
    }

}
