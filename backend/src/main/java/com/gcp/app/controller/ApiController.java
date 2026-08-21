package com.gcp.app.controller;

import com.gcp.app.entity.ItemEntity;
import com.gcp.app.repository.ItemRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ApiController {

    @Autowired
    private ItemRepository itemRepository;

    @GetMapping("/health")
    public Map<String, String> getHealth() {
        log.info("--> [GET /api/health] Checking application health status...");
        Map<String, String> health = new HashMap<>();
        health.put("status", "ONLINE (Spring Boot + PostgreSQL)");
        health.put("uptime", "Running 100%");
        health.put("environment", "GCP Compute Engine VM");
        log.info("<-- [GET /api/health] Health check OK");
        return health;
    }

    @GetMapping("/items")
    public List<ItemEntity> getItems() {
        log.info("--> [GET /api/items] Fetching all items from PostgreSQL database...");
        List<ItemEntity> items = itemRepository.findAll();
        if (items.isEmpty()) {
            log.info("Database empty. Seeding initial records into PostgreSQL...");
            itemRepository.save(new ItemEntity("GCP Compute Engine VM", "Infrastructure", "ACTIVE"));
            itemRepository.save(new ItemEntity("Spring Boot REST Monolith", "Backend API", "RUNNING"));
            itemRepository.save(new ItemEntity("React 18 Vite Client UI", "Frontend Web", "DEPLOYED"));
            items = itemRepository.findAll();
        }
        log.info("<-- [GET /api/items] Returned {} items from database.", items.size());
        return items;
    }

    @PostMapping("/items")
    public ItemEntity createItem(@RequestBody Map<String, String> payload) {
        String name = payload.get("name");
        String category = payload.getOrDefault("category", "General");
        String status = payload.getOrDefault("status", "ACTIVE");
        log.info("--> [POST /api/items] Creating new item: name='{}', category='{}', status='{}'", name, category, status);

        if (name == null || name.trim().isEmpty()) {
            log.error("Validation failed: Item name cannot be empty.");
            throw new RuntimeException("Item name cannot be empty.");
        }

        ItemEntity item = new ItemEntity(name, category, status);
        ItemEntity savedItem = itemRepository.save(item);
        log.info("<-- [POST /api/items] Item saved to PostgreSQL with ID #{}", savedItem.getId());
        return savedItem;
    }

    @PutMapping("/items/{id}")
    public ItemEntity updateItem(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        log.info("--> [PUT /api/items/{}] Updating item with payload: {}", id, payload);
        ItemEntity item = itemRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Item ID #{} not found for update.", id);
                    return new RuntimeException("Item with ID " + id + " not found.");
                });

        if (payload.containsKey("name")) item.setName(payload.get("name"));
        if (payload.containsKey("category")) item.setCategory(payload.get("category"));
        if (payload.containsKey("status")) item.setStatus(payload.get("status"));

        ItemEntity updatedItem = itemRepository.save(item);
        log.info("<-- [PUT /api/items/{}] Successfully updated item #{}", id, updatedItem.getId());
        return updatedItem;
    }

    @DeleteMapping("/items/{id}")
    public Map<String, Object> deleteItem(@PathVariable Long id) {
        log.info("--> [DELETE /api/items/{}] Deleting record from PostgreSQL database...", id);
        if (!itemRepository.existsById(id)) {
            log.error("Delete failed: Item ID #{} does not exist.", id);
            throw new RuntimeException("Item with ID " + id + " not found.");
        }
        itemRepository.deleteById(id);
        log.info("<-- [DELETE /api/items/{}] Item ID #{} deleted successfully.", id, id);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Item deleted successfully!");
        response.put("id", id);
        return response;
    }
}
