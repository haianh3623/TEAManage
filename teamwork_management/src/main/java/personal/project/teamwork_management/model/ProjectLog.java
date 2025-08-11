package personal.project.teamwork_management.model;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProjectLog extends BaseEntity {
    private Long projectId;

    @Enumerated(EnumType.STRING)
    private ProjectAction action;

    private String description;

    private Long progress; // Ghi nhận tiến độ tại thời điểm log (nếu có)

    private Status newStatus;

    private Long performedBy; // userId của người thực hiện

    private Date timestamp = new Date();
}
