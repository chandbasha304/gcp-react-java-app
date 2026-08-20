package com.gcp.app.controller;

import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ApiController {

    @GetMapping("/health")
    public Map<String, String> getHealth() {
        Map<String, String> health = new HashMap<>();
        health.put("status", "ONLINE (Spring Boot Monolith)");
        health.put("uptime", "Running 100%");
        health.put("environment", "GCP Compute Engine VM");
        return health;
    }

    @GetMapping("/items")
    public List<Map<String, Object>> getItems() {
        List<Map<String, Object>> items = new ArrayList<>();
        
        Map<String, Object> i1 = new HashMap<>();
        i1.put("id", 1);
        i1.put("name", "GCP Compute Engine VM Instance");
        i1.put("category", "Infrastructure");
        i1.put("status", "RUNNING");
        items.add(i1);

        Map<String, Object> i2 = new HashMap<>();
        i2.put("id", 2);
        i2.put("name", "Spring Boot Monolith Backend");
        i2.put("category", "Backend API");
        i2.put("status", "ACTIVE");
        items.add(i2);

        Map<String, Object> i3 = new HashMap<>();
        i3.put("id", 3);
        i3.put("name", "React 18 Vite Client UI");
        i3.put("category", "Frontend Web");
        i3.put("status", "DEPLOYED");
        items.add(i3);

        return items;
    }
}
