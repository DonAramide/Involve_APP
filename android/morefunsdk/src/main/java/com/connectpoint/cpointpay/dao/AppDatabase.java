package com.connectpoint.cpointpay.dao;

/** Stub — IsoMessageClient references AppDatabase but MPOS Direct NIBSS path does not use it. */
public class AppDatabase {
    public UserProfileDAO userProfileDAO() {
        return new UserProfileDAO();
    }

    public static class UserProfileDAO {
        public ParamInfo getParamInfo(String category) {
            return null;
        }

        public void saveParamInfo(ParamInfo info) {
        }

        public void updateParamInfo(ParamInfo info) {
        }
    }
}
