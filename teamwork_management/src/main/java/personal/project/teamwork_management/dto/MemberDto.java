package personal.project.teamwork_management.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import personal.project.teamwork_management.model.Role;

@Data
@AllArgsConstructor
public class MemberDto {
    private String firstName;
    private String lastName;
    private String email;
    private Role role;
}
