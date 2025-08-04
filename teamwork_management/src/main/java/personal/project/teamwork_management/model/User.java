package personal.project.teamwork_management.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.List;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
public class User extends BaseEntity {

    private String firstName;
    private String lastName;
    private String password;

    @Column(unique = true)
    private String email;

    private Date dob;
    private String phoneNumber;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProjectMember> projectMembers;

    @ManyToMany(mappedBy = "assignedUsers")
    private List<Task> tasks;
}
