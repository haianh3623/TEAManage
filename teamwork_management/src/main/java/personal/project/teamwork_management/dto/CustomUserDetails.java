package personal.project.teamwork_management.dto;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import personal.project.teamwork_management.model.User;

import java.util.Collection;
import java.util.List;

public class CustomUserDetails implements UserDetails {

    private final User user;

    public CustomUserDetails(User user) {
        this.user = user;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // TODO: bạn có thể lấy role từ user.getRole() nếu có
        return List.of(); // trả về danh sách quyền, nếu chưa dùng role thì để rỗng
    }

    @Override
    public String getPassword() {
        return user.getPassword();
    }

    @Override
    public String getUsername() {
        return user.getEmail(); // hoặc user.getUsername() nếu bạn có
    }

    @Override
    public boolean isAccountNonExpired() {
        return true; // bạn có thể custom nếu quản lý thời hạn tài khoản
    }

    @Override
    public boolean isAccountNonLocked() {
        return true; // bạn có thể gắn cờ khóa tài khoản trong DB
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true; // true nếu không quản lý thời hạn mật khẩu
    }

    @Override
    public boolean isEnabled() {
        return true; // hoặc user.isEnabled() nếu có
    }

    public User getUser() {
        return user; // để có thể lấy toàn bộ thông tin nếu cần
    }
}
