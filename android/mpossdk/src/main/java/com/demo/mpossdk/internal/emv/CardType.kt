package com.demo.mpossdk.internal.emv

internal enum class CardType(val mode: Int) {
    MAG(2),
    ICC(4),
    CONTACTLESS(8),
    UNKNOWN(-1);

    companion object {
        fun fetchModes(): Int {
            return MAG.mode or ICC.mode or CONTACTLESS.mode
        }

        fun fromMode(mode: Int): CardType {
            return when(mode) {
                2 -> MAG
                4 -> ICC
                8 -> CONTACTLESS
                else -> UNKNOWN
            }
        }
    }
}

internal enum class CardScheme {
    VISA,
    MASTERCARD,
    UNKNOWN
}