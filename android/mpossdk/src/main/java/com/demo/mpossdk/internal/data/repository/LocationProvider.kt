package com.demo.mpossdk.internal.data.repository

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.util.Log
import com.demo.mpossdk.internal.domain.model.LocationResult
import com.demo.mpossdk.internal.domain.repository.SessionManager
import com.demo.mpossdk.internal.utils.hasLocationPermission

internal class LocationProvider constructor(
    private val context: Context,
    private val sessionManager: SessionManager
) : LocationListener {
    private val TAG = "LocationProvider"

    @SuppressLint("MissingPermission")
    fun getLocation(onLocationResult: ((LocationResult) -> Unit)) {
        if (!context.hasLocationPermission()) {
            Log.i(TAG, "Missing location permission")
            onLocationResult(LocationResult.NoPermission("Missing location permission"))
        }

        var location: Location? = null
        val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        val isGpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
        val isNetworkEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)

        if (!isGpsEnabled && !isNetworkEnabled) {
            onLocationResult(LocationResult.NotEnabled("Missing location permission"))
        } else {
            // First get location from Network Provider
            if (isNetworkEnabled) {
                locationManager.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    MIN_TIME_BW_UPDATES,
                    MIN_DISTANCE_CHANGE_FOR_UPDATES.toFloat(),
                    this
                )
                Log.d(TAG, "Network")
                location =
                    locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
                if (location != null) {
                    sessionManager.saveLatitude(location.latitude.toString())
                    sessionManager.saveLongitude(location.longitude.toString())

                    Log.i(TAG, "LOCATION ::::: ${sessionManager.getLatitude()},\n${sessionManager.getLongitude()}")
                }
            }
            // if GPS Enabled get lat/long using GPS Services
            if (isGpsEnabled) {
                if (location == null) {
                    locationManager.requestLocationUpdates(
                        LocationManager.GPS_PROVIDER,
                        MIN_TIME_BW_UPDATES,
                        MIN_DISTANCE_CHANGE_FOR_UPDATES.toFloat(),
                        this
                    )
                    Log.d(TAG, "GPS Enabled")
                    location = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                    if (location != null) {
                        sessionManager.saveLatitude(location.latitude.toString())
                        sessionManager.saveLongitude(location.longitude.toString())

                        Log.i(TAG, "LOCATION ::::: ${sessionManager.getLatitude()},\n${sessionManager.getLongitude()}")
                    }
                }
            }

            onLocationResult(LocationResult.Success)
        }
    }

    override fun onLocationChanged(location: Location) {
    }

    @Deprecated("Deprecated in Java")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {
    }

    override fun onProviderEnabled(provider: String) {
        super.onProviderEnabled(provider)
    }

    override fun onProviderDisabled(provider: String) {
        super.onProviderDisabled(provider)
    }

    companion object {
        // The minimum distance to change Updates in meters
        const val MIN_DISTANCE_CHANGE_FOR_UPDATES: Long = 10 // 10 meters

        // The minimum time between updates in milliseconds
        const val MIN_TIME_BW_UPDATES = (1000 * 60 * 1).toLong() // 1 minute
    }
}