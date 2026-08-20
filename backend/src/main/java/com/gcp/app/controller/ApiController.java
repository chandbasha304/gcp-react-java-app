package com.gcp.app.controller;

import com.gcp.app.entity.ItemEntity;
import com.gcp.app.repository.ItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ApiController {

    @Autowired
    private ItemRepository itemRepository;

    @GetMapping("/health")
    public Map<String, String> getHealth() {
        Map<String, String> health = new HashMap<>();
        health.put("status", "ONLINE (Spring Boot + PostgreSQL)");
        health.put("uptime", "Running 100%");
        health.put("environment", "GCP Compute Engine VM");
        return health;
    }

    @GetMapping("/items")
    public List<ItemEntity> getItems() {
        List<ItemEntity> items = itemRepository.findAll();
        if (items.isEmpty()) {
            itemRepository.save(new ItemEntity("GCP Compute Engine VM", "Infrastructure", "ACTIVE"));
            itemRepository.save(new ItemEntity("Spring Boot REST Monolith", "Backend API", "RUNNING"));
            itemRepository.save(new ItemEntity("React 18 Vite Client UI", "Frontend Web", "DEPLOYED"));
            items = itemRepository.findAll();
        }
        return items;
    }

    @PostMapping("/items")
    public ItemEntity createItem(@RequestBody Map<String, String> payload) {
        String name = payload.get("name");
        String category = payload.getOrDefault("category", "General");
        String status = payload.getOrDefault("status", "ACTIVE");

        if (name == null || name.trim().isEmpty()) {
            throw new RuntimeException("Item name cannot be empty.");
        }

        ItemEntity item = new ItemEntity(name, category, status);
        return itemRepository.save(item);
    }

    @PutMapping("/items/{id}")
    public ItemEntity updateItem(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        ItemEntity item = itemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Item with ID " + id + " not found."));

        if (payload.containsKey("name")) item.setName(payload.get("name"));
        if (payload.containsKey("category")) item.setCategory(payload.get("category"));
        if (payload.containsKey("status")) item.setStatus(payload.get("status"));

        return itemRepository.save(item);
    }

    @DeleteMapping("/items/{id}")
    public Map<String, Object> deleteItem(@PathVariable Long id) {
        if (!itemRepository.existsById(id)) {
            throw new RuntimeException("Item with ID " + id + " not found.");
        }
        itemRepository.deleteById(id);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Item deleted successfully!");
        response.put("id", id);
        return response;
    }
}
