package com.demo.mpossdk.internal.ui.common

import androidx.recyclerview.widget.DiffUtil

internal object DeviceNameDiffer: DiffUtil.ItemCallback<String>() {
    override fun areItemsTheSame(oldItem: String, newItem: String): Boolean {
        return newItem == oldItem
    }

    override fun areContentsTheSame(oldItem: String, newItem: String): Boolean {
        return newItem == oldItem
    }
}