package com.connectpoint.cpointpay.mposdirect;

/**
 * NIBSS terminal EMV profile — 6 AIDs and 9 CAPKs from host parameter JSON.
 */
final class MposEmvProfileData {

    private MposEmvProfileData() {
    }

    static String[] aids() {
        return new String[]{
                buildAid("A0000000031010", "0096", "dc4000a800", "dc4004f800",
                        "10000000", "9f0206", 0, 4000, 99, 99, 0, 0, 50001),
                buildAid("A0000000032010", "0096", "dc4000a800", "dc4004f800",
                        "10000000", "9f0206", 0, 4000, 99, 99, 0, 0, 50001),
                buildAid("A0000000041010", "0002", "fc50b8a000", "fc50808800",
                        "10000000", "9f3704", 0, 4000, 99, 99, 0, 0, 50001),
                buildAid("A0000000043060", "0002", "fc50bca000", "fc50bcf800",
                        "800000", "9f3704", 0, 4000, 99, 99, 0, 0, 50001),
                // Host JSON had ddol "9f0607" (AID TLV fragment) — MoreFun needs real DDOL 9F3704.
                // ASI=1 exact match matches DownloadAidActivity Verve sample.
                buildAid("A0000003710001", "0010", "d84000a800", "d84004f800",
                        "0010000000", "9f3704", 0, 1500100, 99, 99, 0, 1, 1500100),
                buildAid("A0000003710002", "0010", "d84000a800", "d84004f800",
                        "0010000000", "9f3704", 0, 1500100, 99, 99, 0, 1, 1500100),
                buildAid("A0000008910101", "0100", "D84000A800", "D84004F800",
                        "0010000000", "9f3704", 0, 50000, 0, 0, 0, 1, 6000),
        };
    }

    /** Labels aligned with {@link #capks()} for failure logs. */
    static String[] capkLabels() {
        return new String[]{
                "Verve/3",
                "Verve/4",
                "Verve/5",
                "Verve/6",
                "Visa/8",
                "Visa/9",
                "MasterCard/5",
                "MasterCard/6",
                "Afrigo/5",
        };
    }

    /**
     * CAPKs ordered with payment schemes first. MoreFun devices often hold only 8 CAPK slots —
     * Afrigo is last so Verve/Visa/MC still load if capacity is exceeded.
     * Expiry dates past 2024-12-31 are extended — firmware rejects expired CAPKs.
     * Visa arithIndex must be 1 (RSA), matching MoreFun sample / ParamUtils.
     */
    static String[] capks() {
        return new String[]{
                buildCapk("A000000371", 3,
                        "D06238B856CF2C8890A7F668CA17C19247498D193A7C11E7105DEDEEE6A873E8189E50493E9B17547C42EA4FA88BBEF30BB6BC2409246CCC95F36622A7F4D92D46444F20B1B24BF63C5B28395D8EF18C23205C2119DFE5FBA2FBFC311B2FE8A6A75B35A7DAB72D421792A500CDFD8133B8A97D84A49C0BD22D52D06EA5E0EF3E471D47D8370C37AA48B564689D0035D9",
                        "319F3C608B67F1118C729B0E1516EAB07CB290C8", "20301231", 1, 1),
                buildCapk("A000000371", 4,
                        "D13CD5E1B921E4E0F0D40E2DE14CCE73E3A34ED2DCFA826531D8195641091E37C8474D19B686E8243F089A69F7B18D2D34CB4824F228F7750F96D1EFBDFF881F259A8C04DE64915A3A3D7CB846135F4083C93CDE755BC808886F600542DFF085558D5EA7F45CB15EC835064AA856D602A0A44CD021F54CF8EC0CC680B54B3665ABE74A7C43D02897FF84BB4CB98BC91D",
                        "8B36A3E3D814CE6C6EBEAAF27674BB7BC67275B1", "20301231", 1, 1),
                buildCapk("A000000371", 5,
                        "B036A8CAE0593A480976BFE84F8A67759E52B3D9F4A68CCC37FE720E594E5694CD1AE20E1B120D7A18FA5C70E044D3B12E932C9BBD9FDEA4BE11071EF8CA3AF48FF2B5DDB307FC752C5C73F5F274D4238A92B4FCE66FC93DA18E6C1CC1AA3CFAFCB071B67DAACE96D9314DB494982F5C967F698A05E1A8A69DA931B8E566270F04EAB575F5967104118E4F12ABFF9DEC92379CD955A10675282FE1B60CAD13F9BB80C272A40B6A344EA699FB9EFA6867",
                        "676822D335AB0D2C3848418CB546DF7B6A6C32C0", "20301231", 1, 1),
                buildCapk("A000000371", 6,
                        "D2DA0134B4DFC93A75EE8960C99896D50A91527B87BA7B16CDB77E5B6FDB750EB70B54026CADDA1D562C77A2C6DA541E94BC415D43E68489B16980F2E887C09E4CF90E2E639B179277BBA0E982CCD1F80521D1457209125B3ABCD309E1B92B5AEDA2EB1CBF933BEAD9CE7365E52B7D17FCB405AA28E5DE6AA3F08E764F745E70859ABCBA41E570A6E4367B3D6FECE723B73ABF3EB53DCDE3816E8A813460447021509D0DFDF2EEEE74CC35485FB55C26836EB3BF9C7DEBEE6C0B77B7BE059233801CF76B321FCA25FB1E63117AE1865E23161EC39D7B1FB84256C2BE72BF8EC771548DB9F00BEF77C509FADA15E2B53FF950D383F96211D3",
                        "F5BAB84ECE5F8BD45511E5CA861B80C7E6C51F55", "20331231", 1, 1),
                buildCapk("A000000003", 8,
                        "D9FD6ED75D51D0E30664BD157023EAA1FFA871E4DA65672B863D255E81E137A51DE4F72BCC9E44ACE12127F87E263D3AF9DD9CF35CA4A7B01E907000BA85D24954C2FCA3074825DDD4C0C8F186CB020F683E02F2DEAD3969133F06F7845166ACEB57CA0FC2603445469811D293BFEFBAFAB57631B3DD91E796BF850A25012F1AE38F05AA5C4D6D03B1DC2E568612785938BBC9B3CD3A910C1DA55A5A9218ACE0F7A21287752682F15832A678D6E1ED0B",
                        "20D213126955DE205ADC2FD2822BD22DE21CF9A8", "20311231", 1, 1),
                buildCapk("A000000003", 9,
                        "9D912248DE0A4E39C1A7DDE3F6D2588992C1A4095AFBD1824D1BA74847F2BC4926D2EFD904B4B54954CD189A54C5D1179654F8F9B0D2AB5F0357EB642FEDA95D3912C6576945FAB897E7062CAA44A4AA06B8FE6E3DBA18AF6AE3738E30429EE9BE03427C9D64F695FA8CAB4BFE376853EA34AD1D76BFCAD15908C077FFE6DC5521ECEF5D278A96E26F57359FFAEDA19434B937F1AD999DC5C41EB11935B44C18100E857F431A4A5A6BB65114F174C2D7B59FDF237D6BB1DD0916E644D709DED56481477C75D95CDD68254615F7740EC07F330AC5D67BCD75BF23D28A140826C026DBDE971A37CD3EF9B8DF644AC385010501EFC6509D7A41",
                        "1FF80A40173F52D7D27E0F26A146A1C8CCB29046", "20281231", 1, 1),
                buildCapk("A000000004", 5,
                        "B8048ABC30C90D976336543E3FD7091C8FE4800DF820ED55E7E94813ED00555B573FECA3D84AF6131A651D66CFF4284FB13B635EDD0EE40176D8BF04B7FD1C7BACF9AC7327DFAA8AA72D10DB3B8E70B2DDD811CB4196525EA386ACC33C0D9D4575916469C4E4F53E8E1C912CC618CB22DDE7C3568E90022E6BBA770202E4522A2DD623D180E215BD1D1507FE3DC90CA310D27B3EFCCD8F83DE3052CAD1E48938C68D095AAC91B5F37E28BB49EC7ED597",
                        "EBFA0D5D06D8CE702DA3EAE890701D45E274C845", "20311231", 1, 1),
                buildCapk("A000000004", 6,
                        "CB26FC830B43785B2BCE37C81ED334622F9622F4C89AAE641046B2353433883F307FB7C974162DA72F7A4EC75D9D657336865B8D3023D3D645667625C9A07A6B7A137CF0C64198AE38FC238006FB2603F41F4F3BB9DA1347270F2F5D8C606E420958C5F7D50A71DE30142F70DE468889B5E3A08695B938A50FC980393A9CBCE44AD2D64F630BB33AD3F5F5FD495D31F37818C1D94071342E07F1BEC2194F6035BA5DED3936500EB82DFDA6E8AFB655B1EF3D0D7EBF86B66DD9F29F6B1D324FE8B26CE38AB2013DD13F611E7A594D675C4432350EA244CC34F3873CBA06592987A1D7E852ADC22EF5A2EE28132031E48F74037E3B34AB747F",
                        "F910A1504D5FFB793D94F3B500765E1ABCAD72D9", "20311228", 1, 1),
                buildCapk("A000000891", 5,
                        "E2C471DA374BF87116AEFDEF9A8101A454E4BFB4352380609AC2B0C163AA7A5F8366A6AFB5D138A4B5AFC2D4F10CF68F8881B299890CEAA1AF4FA3C08597903FF35E789755A10DE1CA78680219CF5A7510BB4554D3CB7F0D8694401D865CA1074AF65D3A5F31FF84E82A956005CE3A2B477FB00BCF8AD041632DC9528EF11AAE7B441D27A08F6BAE65C314C02EE8CAF3CA245DCFFBEAB6E3FDECC8855DDAFADD03BB7613EEEC14CCD6EB616545E29454DA1C4E97100112DB0C5B35EEE57786F9E9CB18634E17A13CBA3D70EF41D76A1ED57BF0DCE150C530D117026289A87576737233C1E10840647CA059EC1C632A0F699F109BB4DA2BCB7",
                        "D9ECCD2EA52CC41C0D16F923BD15B76042C66FA7", "20271229", 1, 1),
        };
    }

    private static String buildAid(String aid, String appVerNum, String tacDefault, String tacOnline,
                                   String tacDenial, String ddol, int floorLimit, int transLimit,
                                   int targetPercent, int maxTargetPercent, int threshold, int asi,
                                   int contactlessTransLimit) {
        String aidHex = aid.toUpperCase();
        int aidLen = aidHex.length() / 2;
        String ddolHex = ddol.replace(" ", "").toUpperCase();
        int ddolLen = ddolHex.length() / 2;

        return "9F06" + hexLen(aidLen) + aidHex
                + "DF010100"
                + "9F0802" + padHex(appVerNum, 4)
                + "DF1105" + padHex(tacDefault, 10)
                + "DF1205" + padHex(tacOnline, 10)
                + "DF1305" + padHex(tacDenial, 10)
                + "9F1B04" + padHex(Integer.toHexString(floorLimit), 8)
                + "DF1504" + padHex(Integer.toHexString(threshold), 8)
                + "DF1601" + padHex(Integer.toHexString(maxTargetPercent), 2)
                + "DF1701" + padHex(Integer.toHexString(targetPercent), 2)
                + "DF14" + hexLen(ddolLen) + ddolHex
                + "DF1801" + padHex(Integer.toHexString(asi), 2)
                + "9F7B06" + padHex(Integer.toHexString(transLimit), 12)
                + "DF1906" + padHex(Integer.toHexString(contactlessTransLimit), 12)
                + "DF2006" + padHex(Integer.toHexString(transLimit), 12)
                + "DF2106" + padHex(Integer.toHexString(contactlessTransLimit), 12);
    }

    private static String buildCapk(String rid, int keyIndex, String modulus, String checksum,
                                    String expiredWhen, int hashIndex, int arithIndex) {
        String ridHex = rid.toUpperCase();
        int ridLen = ridHex.length() / 2;
        String modulusHex = modulus.toUpperCase();
        int modulusLen = modulusHex.length() / 2;
        String checksumHex = padHex(checksum, 40);
        String expiry = expiredWhen.length() >= 8 ? expiredWhen.substring(0, 8) : expiredWhen;

        StringBuilder tlv = new StringBuilder();
        tlv.append("9F06").append(hexLen(ridLen)).append(ridHex);
        tlv.append("9F2201").append(padHex(Integer.toHexString(keyIndex), 2));
        tlv.append("DF0504").append(expiry);
        tlv.append("DF0601").append(padHex(Integer.toHexString(hashIndex), 2));
        tlv.append("DF0701").append(padHex(Integer.toHexString(arithIndex), 2));
        tlv.append("DF02");
        if (modulusLen < 0x80) {
            tlv.append(hexLen(modulusLen));
        } else {
            tlv.append("81").append(hexLen(modulusLen));
        }
        tlv.append(modulusHex);
        tlv.append("DF040103");
        tlv.append("DF0314").append(checksumHex);
        return tlv.toString();
    }

    private static String hexLen(int value) {
        return String.format("%02X", value);
    }

    private static String padHex(String value, int length) {
        String hex = value.replace(" ", "").toUpperCase();
        if (hex.length() > length) {
            return hex.substring(hex.length() - length);
        }
        StringBuilder sb = new StringBuilder();
        while (sb.length() < length - hex.length()) {
            sb.append('0');
        }
        sb.append(hex);
        return sb.toString();
    }
}
