package com.gcp.app.controller;

import com.gcp.app.entity.UserEntity;
import com.gcp.app.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/admin/identity-provider")
@CrossOrigin(origins = "*")
public class IdentityProviderAdminController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/users")
    public List<UserEntity> getAllIdentityUsers() {
        log.info("--> [GET /api/admin/identity-provider/users] Admin fetching all registered user identities from PostgreSQL DB...");
        List<UserEntity> users = userRepository.findAll();
        log.info("<-- [GET /api/admin/identity-provider/users] Returned {} user identities.", users.size());
        return users;
    }
}
