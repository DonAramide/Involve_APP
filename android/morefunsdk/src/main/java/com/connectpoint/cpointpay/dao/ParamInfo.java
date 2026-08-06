package com.connectpoint.cpointpay.dao;

import java.util.Date;

/** Stub — unused by MPOS Direct NIBSS purchase / key-exchange paths. */
public class ParamInfo {
    public String category;
    public String data;
    public String code;
    public String name;
    public Date lastUpdate;

    public void setCode(String code) { this.code = code; }
    public void setName(String name) { this.name = name; }
    public void setLastUpdate(Date lastUpdate) { this.lastUpdate = lastUpdate; }
}
