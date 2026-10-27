package com.demo.mpossdk.internal.utils

import java.util.Locale
import kotlin.math.abs

/**
 * NUS Field 120 TLV for POS geo-coordinates (CBN / NIBSS geo-tagging).
 * Sample: 010806.524400209003.37921
 */
internal object PosGeoCoordinates {
    fun toField120(latitude: Double, longitude: Double): String {
        val lat = formatLatitude(latitude)
        val lon = formatLongitude(longitude)
        return buildString {
            append("01")
            append(lat.length.toString().padStart(2, '0'))
            append(lat)
            append("02")
            append(lon.length.toString().padStart(2, '0'))
            append(lon)
        }
    }

    fun formatLatitude(latitude: Double): String = formatCoordinate(latitude, degreeWidth = 2)

    fun formatLongitude(longitude: Double): String = formatCoordinate(longitude, degreeWidth = 3)

    private fun formatCoordinate(value: Double, degreeWidth: Int): String {
        val sign = if (value < 0) "-" else ""
        val absolute = abs(value)
        val formatted = String.format(Locale.US, "%.5f", absolute)
        val separator = formatted.indexOf('.')
        val degrees = formatted.substring(0, separator).padStart(degreeWidth, '0')
        val fraction = formatted.substring(separator + 1)
        return "$sign$degrees.$fraction"
    }
}
