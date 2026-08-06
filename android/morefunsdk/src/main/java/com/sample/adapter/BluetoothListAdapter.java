package com.sample.adapter;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.CheckBox;
import android.widget.TextView;

import com.connectpoint.cpointpay.R;

import java.util.ArrayList;


public class BluetoothListAdapter extends BaseAdapter {

    private final Context mContext;

    private final ArrayList<BluetoothItem> devices;

    public BluetoothListAdapter(Context context) {
        this.mContext = context;
        this.devices = new ArrayList<BluetoothItem>();
    }

    @Override
    public int getCount() {
        return devices.size();
    }

    @Override
    public Object getItem(int position) {
        return devices.get(position);
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    public void clear() {
        devices.clear();
    }

    public void addItem(BluetoothItem item) {
        for (BluetoothItem ditem : devices) {
            if (ditem.getAddress().equals(item.getAddress())) {
                if (item.getName().length() > 0) {
                    ditem.setName(item.getName());
                }
                return;
            }
        }
        devices.add(item);
    }

    //Toggle selected items
    public void setSelected(int index) {
        int nSize = devices.size();

        for (int i = 0; i < nSize; ++i) {
            devices.get(i).setSelected(index == i);
        }

        notifyDataSetChanged();
    }

    public int getSelected() {
        int nSize = devices.size();

        for (int i = 0; i < nSize; ++i) {
            if (devices.get(i).isSelected()) {
                return i;
            }
        }

        return -1;
    }

    @Override
    public View getView(int position, View convertView, ViewGroup parent) {

        ViewHolder viewHolder = null;
        BluetoothItem device = devices.get(position);
        if (convertView == null) {
            convertView = LayoutInflater.from(mContext).inflate(R.layout.bluetoothlist_item, null);
            viewHolder = new ViewHolder(
                    convertView.findViewById(R.id.checkBox),
                    convertView.findViewById(R.id.name)
            );
            convertView.setTag(viewHolder);
        } else {
            viewHolder = (ViewHolder) convertView.getTag();
        }

        //Set selected or not
        viewHolder.clickedCheck.setChecked(device.isSelected());
        viewHolder.clickedCheck.setText("[" + device.getAddress() + "]" + device.getName());
        //Set name
        //	viewHolder.msg.setText(device.getName());

        return convertView;
    }


    class ViewHolder {
        protected CheckBox clickedCheck;
        protected TextView msg;

        public ViewHolder(CheckBox clickedCheck, TextView msg) {
            this.clickedCheck = clickedCheck;
            this.clickedCheck.setClickable(false);
            this.clickedCheck.setFocusable(false);
            this.msg = msg;

        }
    }
}
