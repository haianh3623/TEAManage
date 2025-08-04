package personal.project.teamwork_management.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@AllArgsConstructor
@Data
public class UserAuthenDto {
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String password;
}
