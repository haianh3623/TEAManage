package personal.project.teamwork_management.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import personal.project.teamwork_management.dto.ChangePasswordDto;
import personal.project.teamwork_management.dto.UserDto;
import personal.project.teamwork_management.dto.UserRegistrationDto;
import personal.project.teamwork_management.model.User;
import personal.project.teamwork_management.service.UserService;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/profile")
    public ResponseEntity<?> getUserProfile(){
        try {
            return ResponseEntity.ok(userService.getUserProfile());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error fetching user profile: " + e.getMessage());
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody UserRegistrationDto userRegistrationDto) {
        try {
            User user = userService.registerUser(userRegistrationDto);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error registering user: " + e.getMessage());
        }
    }

    @GetMapping("/email")
    public ResponseEntity<?> getUserByEmail(@RequestParam String email) {
        try {
            UserDto user = userService.getUserByEmail(email);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error fetching user by email: " + e.getMessage());
        }
    }

    @GetMapping("")
    public ResponseEntity<?> getAllUsers() {
        try {
            return ResponseEntity.ok(userService.getUsers());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error fetching users: " + e.getMessage());
        }
    }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(userService.getUserById(id));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error fetching user: " + e.getMessage());
        }
    }

    @PutMapping("/{id:\\d+}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody UserDto dto) {
        try {
            UserDto updatedUser = userService.updateUser(id, dto);
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error updating user: " + e.getMessage());
        }
    }

    @PutMapping("/{id:\\d+}/password")
    public ResponseEntity<?> updateUserPassword(@PathVariable Long id, @RequestBody ChangePasswordDto changePasswordDto) {
        try {
            userService.changePassword(id, changePasswordDto);
            return ResponseEntity.ok("Password updated successfully");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error updating password: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        try {
            userService.deleteUser(id);
            return ResponseEntity.ok("User deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error deleting user: " + e.getMessage());
        }
    }

 }
