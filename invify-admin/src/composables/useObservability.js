// invify-admin/src/composables/useObservability.js
import { ref, computed, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import { joinApiUrl } from '../config/env';
import { readAccessToken } from '../auth/session';

/**
 * useObservability Composable
 *
 * Coordinates real-time infrastructure telemetry, initial REST hydration,
 * authenticated Server-Sent Events (SSE) live streaming, and bounded reconnection.
 *
 * Strictly read-only: Pause/resume controls are FRONTEND display gates only
 * and never transmit operational or mutation commands to the backend.
 */
export function useObservability() {
  const snapshot = ref(null);
  const logs = ref([]);
  const connectionState = ref('OFFLINE'); // 'LIVE' | 'RECONNECTING' | 'OFFLINE'
  const backendState = ref('ACTIVE'); // 'ACTIVE' | 'DEGRADED' | 'DOWN'
  const isPaused = ref(false);
  const lastTelemetryUpdate = ref(null);
  const isLoading = ref(true);
  const errorMessage = ref(null);

  // Filter and search controls
  const selectedSeverity = ref('ALL');
  const searchQuery = ref('');

  // Reconnection management
  let abortController = null;
  let reconnectTimer = null;
  let reconnectAttempts = 0;
  let isUnmounted = false;

  const RECONNECT_INTERVALS = [1000, 2000, 4000, 8000, 15000];

  function getReconnectDelay(attempt) {
    const idx = Math.min(attempt, RECONNECT_INTERVALS.length - 1);
    return RECONNECT_INTERVALS[idx];
  }

  /**
   * Fetches initial snapshot via REST.
   */
  async function fetchSnapshot() {
    try {
      const token = readAccessToken();
      const url = joinApiUrl('/api/admin/observability/snapshot');
      const res = await axios.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 10000,
      });

      if (res.data) {
        if (!isPaused.value) {
          snapshot.value = res.data;
          lastTelemetryUpdate.value = new Date();
        }
        if (res.data.health?.status === 'degraded') {
          backendState.value = 'DEGRADED';
        } else {
          backendState.value = 'ACTIVE';
        }
        errorMessage.value = null;
      }
    } catch (err) {
      console.warn('[useObservability] Snapshot fetch failed:', err?.message || err);
      if (!snapshot.value) {
        backendState.value = 'DOWN';
      }
      errorMessage.value = err?.response?.data?.error || err?.message || 'Failed to retrieve snapshot';
    }
  }

  /**
   * Fetches initial logs via REST.
   */
  async function fetchLogs(limit = 100) {
    try {
      const token = readAccessToken();
      const url = joinApiUrl('/api/admin/observability/logs');
      const res = await axios.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: { limit },
        timeout: 10000,
      });

      if (Array.isArray(res.data?.logs)) {
        if (!isPaused.value) {
          logs.value = res.data.logs;
        }
      }
    } catch (err) {
      console.warn('[useObservability] Logs fetch failed:', err?.message || err);
    }
  }

  /**
   * Parses and dispatches an SSE event block (text between \n\n).
   */
  function handleSseBlock(block) {
    if (!block || !block.trim()) return;

    // Comments / heartbeats start with ':'
    if (block.trim().startsWith(':')) {
      // Heartbeat comment received; keep-alive confirmed
      return;
    }

    let eventName = 'message';
    let dataStr = '';

    const lines = block.split('\n');
    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataStr += (dataStr ? '\n' : '') + line.slice(5).trim();
      }
    }

    if (!dataStr) return;

    try {
      const parsed = JSON.parse(dataStr);

      if (eventName === 'snapshot') {
        if (!isPaused.value) {
          snapshot.value = parsed;
          lastTelemetryUpdate.value = new Date();
          backendState.value = parsed.health?.status === 'degraded' ? 'DEGRADED' : 'ACTIVE';
        }
      } else if (eventName === 'log') {
        if (!isPaused.value && parsed && typeof parsed === 'object') {
          // Prepend newest log, keeping buffer bounded to 500
          logs.value = [parsed, ...logs.value.slice(0, 499)];
        }
      }
    } catch (e) {
      // Ignore malformed JSON frames safely
    }
  }

  /**
   * Establishes the authenticated SSE stream using native fetch with ReadableStream.
   */
  async function connectSse() {
    if (isUnmounted) return;

    const token = readAccessToken();
    if (!token) {
      connectionState.value = 'OFFLINE';
      backendState.value = 'DOWN';
      return;
    }

    // Clean up previous controller
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    const streamUrl = joinApiUrl('/api/admin/observability/stream');

    try {
      const response = await fetch(streamUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
        signal: abortController.signal,
      });

      if (response.status === 401 || response.status === 403) {
        connectionState.value = 'OFFLINE';
        errorMessage.value = response.status === 403 ? 'Access Denied: Super Admin role required' : 'Authentication required';
        return;
      }

      if (response.status === 429) {
        connectionState.value = 'RECONNECTING';
        scheduleReconnect();
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error ${response.status}`);
      }

      // Stream successfully connected
      connectionState.value = 'LIVE';
      reconnectAttempts = 0;
      errorMessage.value = null;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!isUnmounted) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop(); // Keep incomplete chunk in buffer

        for (const block of parts) {
          handleSseBlock(block);
        }
      }
    } catch (err) {
      if (err.name === 'AbortError' || isUnmounted) return;
      console.warn('[useObservability] Stream connection interrupted:', err.message);
      connectionState.value = 'RECONNECTING';
      scheduleReconnect();
    }
  }

  function scheduleReconnect() {
    if (isUnmounted || reconnectTimer) return;

    const delay = getReconnectDelay(reconnectAttempts);
    reconnectAttempts++;

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (!isUnmounted) {
        connectSse();
      }
    }, delay);
  }

  /**
   * Pause visual display updates.
   * Completely client-side; does NOT transmit commands to backend.
   */
  function pause() {
    isPaused.value = true;
  }

  /**
   * Resume visual display updates and immediately refresh state.
   */
  function resume() {
    isPaused.value = false;
    fetchSnapshot();
  }

  /**
   * Manually trigger a fresh REST pull of telemetry and logs.
   */
  async function refresh() {
    isLoading.value = true;
    await Promise.all([fetchSnapshot(), fetchLogs(100)]);
    isLoading.value = false;
  }

  function clearSearch() {
    searchQuery.value = '';
  }

  /**
   * Filtered logs computed property based on severity and search text.
   */
  const filteredLogs = computed(() => {
    let list = logs.value;

    if (selectedSeverity.value && selectedSeverity.value !== 'ALL') {
      const sev = selectedSeverity.value.toUpperCase();
      list = list.filter((item) => String(item.level || '').toUpperCase() === sev);
    }

    if (searchQuery.value && searchQuery.value.trim()) {
      const query = searchQuery.value.trim().toLowerCase();
      list = list.filter((item) =>
        String(item.message || '').toLowerCase().includes(query) ||
        String(item.level || '').toLowerCase().includes(query) ||
        String(item.id || '').toLowerCase().includes(query)
      );
    }

    return list;
  });

  /**
   * Copies sanitized text to clipboard safely.
   */
  async function copyText(text) {
    if (!text) return false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fallback
    }
    return false;
  }

  onMounted(async () => {
    isUnmounted = false;
    isLoading.value = true;
    await Promise.all([fetchSnapshot(), fetchLogs(100)]);
    isLoading.value = false;
    connectSse();
  });

  onUnmounted(() => {
    isUnmounted = true;
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  });

  return {
    snapshot,
    logs,
    filteredLogs,
    connectionState,
    backendState,
    isPaused,
    lastTelemetryUpdate,
    isLoading,
    errorMessage,
    selectedSeverity,
    searchQuery,
    pause,
    resume,
    refresh,
    clearSearch,
    copyText,
  };
}
