package personal.project.teamwork_management.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserRegistrationDto {
    private String firstName; // Tên người dùng
    private String lastName; // Họ người dùng
    private String email; // Email của người dùng
    private String phoneNumber; // Số điện thoại của người dùng
    @JsonFormat(pattern = "yyyy-MM-dd")
    private Date dob; // Ngày sinh của người dùng
    private String password; // Mật khẩu của người dùngh
}
