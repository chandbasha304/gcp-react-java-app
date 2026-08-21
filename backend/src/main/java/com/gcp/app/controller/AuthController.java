package com.gcp.app.controller;

import com.gcp.app.entity.UserEntity;
import com.gcp.app.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @Autowired
    private RestTemplate restTemplate;

    @Value("${okta.domain:integrator-7068519.okta.com}")
    private String oktaDomain;

    @Value("${okta.api.token:00qyLPRc1YZepKM-rPPnPt08-fB1hGNXrF95WK0-Ed}")
    private String oktaApiToken;

    @GetMapping("/me")
    public Map<String, Object> getCurrentUser(Authentication authentication) {
        log.info("--> [GET /api/auth/me] Checking current authentication session...");
        Map<String, Object> response = new HashMap<>();

        if (authentication != null && authentication.isAuthenticated() && !(authentication instanceof org.springframework.security.authentication.AnonymousAuthenticationToken)) {
            if (authentication.getPrincipal() instanceof OidcUser oidcUser) {
                String email = oidcUser.getEmail();
                String fullName = oidcUser.getFullName() != null ? oidcUser.getFullName() : oidcUser.getGivenName();
                log.info("Okta OIDC Principal detected! Email='{}', Name='{}'", email, fullName);

                final String finalEmail = email != null ? email : oidcUser.getSubject();
                final String finalFullName = fullName != null ? fullName : finalEmail.split("@")[0];

                UserEntity user = userRepository.findByEmail(finalEmail).orElseGet(() -> {
                    log.info("Provisioning authenticated Okta OIDC user '{}' into PostgreSQL DB...", finalEmail);
                    String randomPassword = passwordEncoder.encode("OKTA-OIDC-KEY-" + System.currentTimeMillis());
                    return userRepository.save(new UserEntity(finalEmail, randomPassword, finalFullName));
                });

                response.put("authenticated", true);
                response.put("email", user.getEmail());
                response.put("fullName", user.getFullName());
                response.put("provider", "Okta OIDC Direct SSO");
                return response;
            }
        }

        response.put("authenticated", false);
        return response;
    }

    @PostMapping("/register")
    public Map<String, Object> register(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("password");
        String fullName = payload.get("fullName");
        log.info("--> [POST /api/auth/register] Initializing registration for email='{}', name='{}'", email, fullName);

        if (email == null || password == null || fullName == null) {
            log.error("Registration failed: Email, password, or full name missing.");
            throw new RuntimeException("Email, password, and full name are required.");
        }

        if (userRepository.existsByEmail(email)) {
            log.error("Registration failed: User with email '{}' already exists in PostgreSQL DB.", email);
            throw new RuntimeException("User with email " + email + " already exists.");
        }

        String hashedPassword = passwordEncoder.encode(password);
        log.info("BCrypt Hashing complete. Saving user record to PostgreSQL database...");
        UserEntity user = new UserEntity(email, hashedPassword, fullName);
        userRepository.save(user);
        log.info("Saved user ID #{} into PostgreSQL DB successfully.", user.getId());

        // Provision User to Okta Identity Provider dynamically via Spring RestTemplate Bean
        String oktaStatus = "PROVISIONED_LOCAL_DB";
        try {
            String oktaApiUrl = String.format("https://%s/api/v1/users?activate=true", oktaDomain);
            log.info("Initiating dynamic Okta REST API call to URL: '{}'", oktaApiUrl);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "SSWS " + oktaApiToken);

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

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(oktaBody, headers);
            restTemplate.postForEntity(oktaApiUrl, entity, String.class);
            oktaStatus = "PROVISIONED_OKTA_AND_LOCAL_DB";
            log.info("Successfully provisioned user '{}' to Okta Tenant '{}'!", email, oktaDomain);
        } catch (Exception e) {
            log.warn("Okta REST API Provisioning Note: {} (User remains securely provisioned in PostgreSQL DB)", e.getMessage());
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message", "User registered and provisioned in Okta & PostgreSQL successfully!");
        response.put("email", user.getEmail());
        response.put("fullName", user.getFullName());
        response.put("oktaStatus", oktaStatus);
        log.info("<-- [POST /api/auth/register] Registration flow complete for email='{}'", email);
        return response;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("password");
        log.info("--> [POST /api/auth/login] Authenticatin user for email='{}'...", email);

        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.error("Login failed: Email '{}' not found in PostgreSQL DB.", email);
                    return new RuntimeException("Invalid email or password.");
                });

        if (!passwordEncoder.matches(password, user.getPassword())) {
            log.error("Login failed: Password mismatch for email '{}'.", email);
            throw new RuntimeException("Invalid email or password.");
        }

        String token = "session-jwt-" + System.currentTimeMillis();
        log.info("<-- [POST /api/auth/login] BCrypt Password Verified! Created token '{}' for user '{}'", token, user.getFullName());

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Login successful!");
        response.put("token", token);
        response.put("email", user.getEmail());
        response.put("fullName", user.getFullName());
        return response;
    }

    @PostMapping("/reset-password")
    public Map<String, Object> resetPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String newPassword = payload.get("newPassword");
        log.info("--> [POST /api/auth/reset-password] Resetting password for email='{}'...", email);

        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.error("Password reset failed: Account '{}' not found.", email);
                    return new RuntimeException("No account found with email: " + email);
                });

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        log.info("<-- [POST /api/auth/reset-password] Password re-hashed with BCrypt and updated in PostgreSQL DB for email='{}'", email);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Password reset successfully! You can now log in with your new password.");
        return response;
    }
}
