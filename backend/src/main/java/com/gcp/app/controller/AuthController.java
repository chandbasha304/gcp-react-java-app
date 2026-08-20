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

        Map<String, Object> response = new HashMap<>();
        response.put("message", "User registered successfully!");
        response.put("email", user.getEmail());
        response.put("fullName", user.getFullName());
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
