package com.demo.mpossdk.internal.domain.model

internal sealed class LocationResult {
    data class NoPermission(val message: String): LocationResult()
    data class NotEnabled(val message: String): LocationResult()
    data object Success: LocationResult()
}
