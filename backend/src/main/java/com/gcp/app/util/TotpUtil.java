package com.gcp.app.util;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.GeneralSecurityException;

/**
 * RFC 6238 Compliant Time-Based One-Time Password (TOTP) Verification Engine.
 * Formally defined by IETF RFC 6238 Specification.
 */
public class TotpUtil {

    public static final String DEFAULT_SECRET = "JBSWY3DPEHPK3PXP"; // Base32 RFC 6238 Secret

    /**
     * Dynamically computes current 6-digit TOTP for the active 30-second window.
     */
    public static String getCurrentTotpCode(String base32Secret) {
        String secret = (base32Secret != null && !base32Secret.isBlank()) ? base32Secret : DEFAULT_SECRET;
        long currentStep = System.currentTimeMillis() / 1000L / 30L;
        return generateTotp(secret, currentStep);
    }

    /**
     * Verifies 6-digit TOTP code according to RFC 6238 IETF Specification.
     * @param inputCode 6-digit TOTP entered by user
     * @param userSecret Base32 shared secret key
     * @param allowTimeDrift If true, allows +/-30s transmission delay per RFC 6238 §5.2. If false, enforces strict exact window T0 only.
     */
    public static boolean verifyCode(String inputCode, String userSecret, boolean allowTimeDrift) {
        if (inputCode == null || !inputCode.matches("\\d{6}")) {
            return false;
        }

        //enter data

        String secret = (userSecret != null && !userSecret.isBlank()) ? userSecret : DEFAULT_SECRET;
        long currentStep = System.currentTimeMillis() / 1000L / 30L;

        int windowMin = allowTimeDrift ? -1 : 0;
        int windowMax = allowTimeDrift ? 1 : 0;

        for (int i = windowMin; i <= windowMax; i++) {
            String expectedCode = generateTotp(secret, currentStep + i);
            if (inputCode.equals(expectedCode)) {
                return true;
            }
        }
        return false;
    }

    public static boolean verifyCode(String inputCode, String userSecret) {
        return verifyCode(inputCode, userSecret, true);
    }

    /**
     * Computes RFC 6238 Time-Based One-Time Password using HMAC-SHA1 algorithm.
     */
    public static String generateTotp(String base32Secret, long timeStep) {
        try {
            byte[] key = decodeBase32(base32Secret);
            byte[] data = ByteBuffer.allocate(8).putLong(timeStep).array();

            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(data);

            int offset = hash[hash.length - 1] & 0xf;
            int binary = ((hash[offset] & 0x7f) << 24) |
                         ((hash[offset + 1] & 0xff) << 16) |
                         ((hash[offset + 2] & 0xff) << 8) |
                         (hash[offset + 3] & 0xff);

            int otp = binary % 1000000;
            return String.format("%06d", otp);
        } catch (GeneralSecurityException e) {
            return "";
        }
    }

    private static byte[] decodeBase32(String base32) {
        String base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        base32 = base32.toUpperCase().replaceAll("[^A-Z2-7]", "");
        byte[] bytes = new byte[base32.length() * 5 / 8];
        int buffer = 0, bitsLeft = 0, count = 0;

        for (char c : base32.toCharArray()) {
            buffer = (buffer << 5) | base32Chars.indexOf(c);
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                bytes[count++] = (byte) (buffer >> (bitsLeft - 8));
                bitsLeft -= 8;
            }
        }
        return bytes;
    }
}
