import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:involve_app/features/school/domain/repositories/lesson_note_repository.dart';
import 'package:involve_app/features/school/domain/entities/lesson_note_models.dart';
import 'package:involve_app/core/utils/device_info_service.dart';

class LessonNoteSyncService {
  final ILessonNoteRepository repository;
  final Random _random = Random();
  
  // Singleton Lock
  Completer<void>? _syncCompleter;
  
  // Clock Drift Protection
  DateTime? _lastKnownServerTime;

  LessonNoteSyncService(this.repository);

  // Constants for exponential backoff (Micro-Hardened)
  static const Duration baseDelay = Duration(seconds: 2);
  static const Duration maxDelay = Duration(seconds: 120);
  static const int maxRetries = 5;

  /// Main sync loop: prevents concurrent executions using a singleton Completer lock.
  Future<void> sync() async {
    if (_syncCompleter != null) {
      debugPrint('LessonNoteSyncService: Sync already in progress, skipping.');
      return _syncCompleter!.future;
    }
    
    _syncCompleter = Completer<void>();

    try {
      debugPrint('LessonNoteSyncService: Starting hardened sync loop...');
      
      // 1. Recover any stuck syncs
      await repository.resetStuckSyncs();

      // 2. Fetch pending or failed records (including soft-deleted)
      final items = await repository.getSyncReadyLessons();
      if (items.isEmpty) {
        debugPrint('LessonNoteSyncService: No local changes to push.');
      } else {
        for (final item in items) {
          await _syncItem(item);
        }
      }

      // 3. Pull Changes from Server
      await _pullChanges();

    } catch (e) {
      debugPrint('LessonNoteSyncService: Sync loop failed: $e');
    } finally {
      final c = _syncCompleter;
      _syncCompleter = null;
      c?.complete();
    }
  }

  Future<void> _pullChanges() async {
    try {
      debugPrint('LessonNoteSyncService: Pulling remote changes...');
      
      // MOCK API FETCH: In a real implementation, you would call your apiClient here
      // final remoteItems = await apiClient.fetchLessonNotes(since: _lastKnownServerTime);
      final List<LessonNote> remoteItems = []; // Mock empty response

      if (remoteItems.isEmpty) {
        debugPrint('LessonNoteSyncService: No remote changes to pull.');
        return;
      }

      for (final remoteNote in remoteItems) {
        // Fetch local version to check for conflicts
        final localNote = await repository.getLatestLessonByHash(remoteNote.contentHash);

        if (localNote == null) {
          // No local record exists, safely insert
          await repository.saveLessonNote(remoteNote);
          debugPrint('LessonNoteSyncService: Inserted new remote note: ${remoteNote.syncId}');
        } else {
          // Conflict Resolution
          final resolvedNote = resolveConflict(localNote, remoteNote);
          
          if (resolvedNote == remoteNote) {
            // Remote won, overwrite local
            await repository.saveLessonNote(resolvedNote);
            debugPrint('LessonNoteSyncService: Remote note overwrote local: ${remoteNote.syncId}');
          } else {
            // Local won, do nothing (it will be pushed up on the next sync loop)
            debugPrint('LessonNoteSyncService: Local note kept during conflict: ${localNote.syncId}');
          }
        }
      }
      
      // Update our clock drift tracker if server provided a timestamp
      _lastKnownServerTime = DateTime.now(); 
      debugPrint('LessonNoteSyncService: Successfully pulled remote changes.');
    } catch (e) {
      debugPrint('LessonNoteSyncService: Failed to pull remote changes: $e');
    }
  }

  Future<void> _syncItem(LessonNote item) async {
    final syncId = item.syncId;
    if (syncId == null) return;

    try {
      // Mark as syncing
      await repository.updateSyncStatus(syncId, SyncStatus.syncing);

      // Deterministic Backoff Check
      if (item.retryCount > 0) {
        final delay = _calculateBackoff(item.retryCount);
        final lastUpdate = item.updatedAt ?? DateTime.now();
        if (DateTime.now().difference(lastUpdate) < delay) {
          // Too soon to retry, back to failed or pending
          await repository.updateSyncStatus(syncId, SyncStatus.failed);
          return;
        }
      }

      // Server Clock-Drift Simulation:
      // If server returns a time, update our drift tracker
      // _lastKnownServerTime = response.serverTime;

      if (item.isDeleted) {
        // PUSH DELETE
        debugPrint('LessonNoteSyncService: Pushing DELETE for ${item.syncId}');
        // await apiClient.deleteLesson(item.syncId);
      } else {
        // PUSH DATA
        // await apiClient.pushLesson(item);
      }
      
      // MOCK SUCCESS
      await Future.delayed(const Duration(milliseconds: 300));
      await repository.updateSyncStatus(syncId, SyncStatus.synced, retryCount: 0);
      
      debugPrint('LessonNoteSyncService: Successfully processed $syncId');
    } catch (e) {
      debugPrint('LessonNoteSyncService: Failed to process $syncId: $e');
      final newRetryCount = item.retryCount + 1;
      final status = newRetryCount >= maxRetries ? SyncStatus.failed : SyncStatus.pending;
      await repository.updateSyncStatus(syncId, status, retryCount: newRetryCount);
    }
  }

  /// Calculates deterministic backoff with jitter and 120s cap.
  Duration _calculateBackoff(int retryCount) {
    if (retryCount <= 0) return Duration.zero;
    
    // delay = min(120s, baseDelay * 2^retryCount)
    final expBase = pow(2, retryCount).toInt();
    int seconds = baseDelay.inSeconds * expBase;
    
    if (seconds > maxDelay.inSeconds) {
      seconds = maxDelay.inSeconds;
    }

    // Add random jitter (1-5 seconds)
    final jitter = _random.nextInt(4) + 1;
    
    return Duration(seconds: seconds + jitter);
  }

  /// Deterministic conflict resolution logic.
  /// Rule Hierarchy: Version > UpdatedAt > DeviceID
  LessonNote resolveConflict(LessonNote local, LessonNote remote) {
    // 1. Higher Version wins
    if (remote.version > local.version) return remote;
    if (local.version > remote.version) return local;

    // 2. Latest UpdatedAt wins
    if (remote.updatedAt != null && local.updatedAt != null) {
      if (remote.updatedAt!.isAfter(local.updatedAt!)) return remote;
      if (local.updatedAt!.isAfter(remote.updatedAt!)) return local;
    }

    // 3. Device ID tie-breaker (lexicographical - greater string wins)
    final localId = local.deviceId ?? '';
    final remoteId = remote.deviceId ?? '';
    if (remoteId.compareTo(localId) > 0) return remote;

    return local;
  }
}
