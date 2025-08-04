package personal.project.teamwork_management.dto;

import lombok.Data;

@Data
public class ChangePasswordDto {
    String oldPassword;
    String newPassword;
}
