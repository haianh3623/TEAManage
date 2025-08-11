package personal.project.teamwork_management.model;

import jakarta.persistence.Entity;
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
public class UserActivity extends BaseEntity {

    private Long userId;
    private String action; // ex: "created_task", "updated_project"
    private String targetType; // ex: "Task", "Project", "Comment"
    private Long targetId;
    private ActivityType activityType; // Enum to define the type of activity
    private Date timestamp;
}