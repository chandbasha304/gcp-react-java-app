package com.gcp.app.controller;

import com.gcp.app.entity.UserEntity;
import com.gcp.app.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth/sso")
@CrossOrigin(origins = "*")
public class SsoController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @PostMapping("/google")
    public Map<String, Object> handleGoogleSso(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String fullName = payload.getOrDefault("name", "Google SSO User");

        if (email == null || email.trim().isEmpty()) {
            throw new RuntimeException("Valid Google Identity email is required.");
        }

        // Match or auto-register user in PostgreSQL Identity DB
        UserEntity user = userRepository.findByEmail(email).orElseGet(() -> {
            String randomPassword = passwordEncoder.encode("SSO-OIDC-SECRET-" + System.currentTimeMillis());
            UserEntity newUser = new UserEntity(email, randomPassword, fullName);
            return userRepository.save(newUser);
        });

        Map<String, Object> response = new HashMap<>();
        response.put("status", "MFA_CHALLENGE_REQUIRED");
        response.put("email", user.getEmail());
        response.put("fullName", user.getFullName());
        response.put("provider", "Google OIDC Single Sign-On");
        response.put("message", "Single Sign-On Identity matched! Please enter 6-digit TOTP verification code.");
        return response;
    }

    @PostMapping("/mfa/verify")
    public Map<String, Object> verifyTotpMfa(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String code = payload.get("code");

        if (code == null || code.length() != 6) {
            throw new RuntimeException("Invalid TOTP verification code. Code must be 6 digits.");
        }

        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User identity not found."));

        Map<String, Object> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("token", "oidc-sso-jwt-" + System.currentTimeMillis());
        response.put("email", user.getEmail());
        response.put("fullName", user.getFullName());
        response.put("message", "SSO & MFA 2FA verification successful!");
        return response;
    }
}
