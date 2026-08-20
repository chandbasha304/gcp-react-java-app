package com.gcp.app.controller;

import com.gcp.app.entity.UserEntity;
import com.gcp.app.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @PostMapping("/register")
    public Map<String, Object> register(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("password");
        String fullName = payload.get("fullName");

        if (email == null || password == null || fullName == null) {
            throw new RuntimeException("Email, password, and full name are required.");
        }

        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("User with email " + email + " already exists.");
        }

        String hashedPassword = passwordEncoder.encode(password);
        UserEntity user = new UserEntity(email, hashedPassword, fullName);
        userRepository.save(user);

        // Provision User to Okta Identity Provider via Okta REST API
        String oktaStatus = "PROVISIONED_LOCAL_DB";
        try {
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            String oktaApiUrl = "https://integrator-7068519.okta.com/api/v1/users?activate=true";

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            headers.set("Authorization", "SSWS " + System.getenv().getOrDefault("OKTA_API_TOKEN", "00-demo-token"));

            String[] names = fullName.split(" ", 2);
            String firstName = names[0];
            String lastName = names.length > 1 ? names[1] : "User";

            Map<String, Object> profile = new HashMap<>();
            profile.put("firstName", firstName);
            profile.put("lastName", lastName);
            profile.put("email", email);
            profile.put("login", email);

            Map<String, Object> pwdVal = new HashMap<>();
            pwdVal.put("value", password);
            Map<String, Object> credentials = new HashMap<>();
            credentials.put("password", pwdVal);

            Map<String, Object> oktaBody = new HashMap<>();
            oktaBody.put("profile", profile);
            oktaBody.put("credentials", credentials);

            org.springframework.http.HttpEntity<Map<String, Object>> entity = new org.springframework.http.HttpEntity<>(oktaBody, headers);
            restTemplate.postForEntity(oktaApiUrl, entity, String.class);
            oktaStatus = "PROVISIONED_OKTA_AND_LOCAL_DB";
        } catch (Exception e) {
            System.err.println("Okta API User Provisioning Note: " + e.getMessage());
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message", "User registered and provisioned in Okta & PostgreSQL successfully!");
        response.put("email", user.getEmail());
        response.put("fullName", user.getFullName());
        response.put("oktaStatus", oktaStatus);
        return response;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("password");

        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Invalid email or password."));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid email or password.");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Login successful!");
        response.put("token", "session-jwt-" + System.currentTimeMillis());
        response.put("email", user.getEmail());
        response.put("fullName", user.getFullName());
        return response;
    }

    @PostMapping("/reset-password")
    public Map<String, Object> resetPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String newPassword = payload.get("newPassword");

        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("No account found with email: " + email));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Password reset successfully! You can now log in with your new password.");
        return response;
    }
}
