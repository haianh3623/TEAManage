package personal.project.teamwork_management.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserDto {
    private Long id;
    private String firstName; // Tên người dùng
    private String lastName; // Họ người dùng
    private String email; // Email của người dùng
    private String phoneNumber; // Số điện thoại của người dùng
    private Date dob; // Ngày sinh của người dùng
}
