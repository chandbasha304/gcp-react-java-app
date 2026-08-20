package com.gcp.app.controller;

import com.gcp.app.entity.UserEntity;
import com.gcp.app.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/identity-provider")
@CrossOrigin(origins = "*")
public class IdentityProviderAdminController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/users")
    public List<UserEntity> getAllIdentityUsers() {
        return userRepository.findAll();
    }
}
