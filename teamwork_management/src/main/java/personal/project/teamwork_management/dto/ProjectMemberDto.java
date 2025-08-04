package personal.project.teamwork_management.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import personal.project.teamwork_management.model.Role;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProjectMemberDto {

    private Long id;
    private Long projectId;
    private Long userId;
    private Role role;

}
