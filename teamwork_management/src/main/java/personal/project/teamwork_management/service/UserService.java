package personal.project.teamwork_management.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import personal.project.teamwork_management.dto.*;
import personal.project.teamwork_management.model.User;
import personal.project.teamwork_management.repository.UserRepository;
import personal.project.teamwork_management.util.JwtUtil;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    PasswordEncoder passwordEncoder;
    @Autowired
    JwtUtil jwtUtil;

    public User registerUser(UserRegistrationDto dto) {
        User user = new User();
        System.out.println(dto);
        try {
            user.setFirstName(dto.getFirstName());
            user.setLastName(dto.getLastName());
            user.setEmail(dto.getEmail());
            user.setPhoneNumber(dto.getPhoneNumber());
            user.setDob(dto.getDob());
            user.setPassword(passwordEncoder.encode(dto.getPassword()));

            user = userRepository.save(user);
        } catch (Exception e) {
            throw new RuntimeException("Error registering user: " + e.getMessage());
        }
        return user;
    }

    public Map<String, Object> authenticateUser(LoginRequestDto req) {

        System.out.println("Request email: " + req.getEmail());
        System.out.println("Request password: " + req.getPassword());

        UserAuthenDto user = userRepository.findUserAuthenDtoByEmail(req.getEmail());
        if (user == null) {
            System.out.println("User not found!");
            throw new RuntimeException("User not found");
        }
        System.out.println("User found: " + user.getEmail());

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            System.out.println("Invalid password!");
            throw new RuntimeException("Invalid password");
        }

        String token = jwtUtil.generateToken(user.getEmail());
        Map<String, Object> response = new HashMap<>();
        response.put("accessToken", token);
        response.put("tokenType", "Bearer");

        Map<String, Object> userMap = new HashMap<>();
        userMap.put("id", user.getId());
        userMap.put("email", user.getEmail());
        userMap.put("firstName", user.getFirstName());
        userMap.put("lastName", user.getLastName());

        response.put("user", userMap);
        response.put("expiresIn", jwtUtil.getExpirationTime(token)); // Ensure `getExpirationTime` is implemented in `JwtUtil`
        System.out.println("someone logged in: " + user.getEmail());
        return response;
    }

    public String validateToken(String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            throw new RuntimeException("Invalid token format");
        }
        String jwt = token.substring(7);
        System.out.println(jwt);
        if (jwtUtil.validateToken(jwt) == null) {
            throw new RuntimeException("Invalid token");
        }
        System.out.println(jwtUtil.validateToken(jwt));
        return jwtUtil.validateToken(jwt);
    }

    public User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails) {
            return ((CustomUserDetails) auth.getPrincipal()).getUser();
        }
        throw new RuntimeException("Không thể lấy thông tin người dùng hiện tại");
    }

    public List<UserDto> getUsers(){
        return userRepository.findAllUserDtos();
    }

    public UserDto getUserById(Long id) {
        try {
            return userRepository.findUserDtoById(id);
        } catch (Exception e) {
            throw new RuntimeException("Error retrieving user: " + e.getMessage());
        }
    }

    public UserDto updateUser(Long id,UserDto dto){
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        try {
            user.setFirstName(dto.getFirstName());
            user.setLastName(dto.getLastName());
            user.setEmail(dto.getEmail());
            user.setPhoneNumber(dto.getPhoneNumber());
            user.setDob(dto.getDob());

            user = userRepository.save(user);
        } catch (Exception e) {
            throw new RuntimeException("Error updating user: " + e.getMessage());
        }
        return dto;
    }

    public void changePassword(Long id, ChangePasswordDto changePasswordDto) {
        String oldPassword = changePasswordDto.getOldPassword();
        String newPassword = changePasswordDto.getNewPassword();
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new RuntimeException("Old password is incorrect");
        }
        try {
            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);
        } catch (Exception e) {
            throw new RuntimeException("Error changing password: " + e.getMessage());
        }
    }

    public void deleteUser(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        try {
            userRepository.delete(user);
        } catch (Exception e) {
            throw new RuntimeException("Error deleting user: " + e.getMessage());
        }
    }

}
