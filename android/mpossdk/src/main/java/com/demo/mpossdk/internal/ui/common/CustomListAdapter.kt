package com.demo.mpossdk.internal.ui.common

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import androidx.viewbinding.ViewBinding

/**
 * A generic custom adapter that could be used for simple lists. You want to supply the diffCallback for the [Item],
 * optional [clickListener], [viewCreator] for creating the view, and [bindView] for binding each item to the view
 * @param diffCallback is used to asyn-diff the items. this is used by [ListAdapter]
 * @param clickListener if you wish to know when an item is clicked
 * @param viewCreator you will receive a [LayoutInflater] and parent [ViewGroup] for use in inflating the item view
 * @param bindView you will receive the [Item] that requires binding and the corresponding [VBinding] [ViewBinding] and any change payload. The consumer would be able to make sense of the payload
 * @param itemViewType use to supply the custom viewtype that would be used to identify the item (if any)
 * @param otherClickListeners if you have other child views you want to attach listeners to, you can add them here
 */
internal class CustomListAdapter<Item, VBinding : ViewBinding>(
    diffCallback: DiffUtil.ItemCallback<Item>,
    private val clickListener: ((View, Item) -> Unit)? = null,
    private val itemViewType: ((Item) -> Int)? = null,
    private val otherClickListeners: List<Pair<Int, ItemClickListener<Item>>> = emptyList(),
    private val viewCreator: (LayoutInflater, ViewGroup, Int) -> VBinding,
    private val bindView: (Item, VBinding, Any?) -> Unit
) :
    ListAdapter<Item, CustomListAdapter<Item, VBinding>.ViewHolder>(diffCallback) {

    inner class ViewHolder(val binding: VBinding) : RecyclerView.ViewHolder(binding.root) {
        private var currentItem: Item? = null
        fun setItem(item: Item) {
            currentItem = item
        }
        init {
            clickListener?.let { listener ->
                itemView.setOnClickListener { v ->
                    currentItem?.let { item -> listener(v, item) }
                }
            }
            otherClickListeners.forEach { listener ->
                itemView.findViewById<View>(listener.first)?.setOnClickListener { v ->
                    currentItem?.let { item -> listener.second.onClick(v, item) }
                }
            }
        }
    }

    override fun getItemViewType(position: Int): Int {
        return getItem(position)?.let { itemViewType?.invoke(it) }
            ?: super.getItemViewType(position)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        return parent.context
            .let(LayoutInflater::from)
            .let { viewCreator(it, parent, viewType) }
            .let { ViewHolder(it) }
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = getItem(position)
        if (item != null) {
            holder.setItem(item)
            bindView(item, holder.binding, null)
        }
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int, payloads: MutableList<Any>) {
        val item = getItem(position)
        if (item != null) {
            holder.setItem(item)
            bindView(item, holder.binding, payloads.firstOrNull())
        }
    }
}

internal fun interface ItemClickListener<T> {
    fun onClick(view: View, item: T)
}
