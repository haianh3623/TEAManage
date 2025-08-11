package personal.project.teamwork_management.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Entity
@Data
@NoArgsConstructor
public class InviteCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String code; // Mã mời (random)

    @ManyToOne
    @JoinColumn(name = "project_id")
    private Project project;

    private Date createdAt = new Date();

    private Date expiresAt; // ví dụ: sau 24h
}
