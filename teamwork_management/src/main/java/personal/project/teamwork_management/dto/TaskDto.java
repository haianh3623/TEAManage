package personal.project.teamwork_management.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import personal.project.teamwork_management.model.Status;

import java.util.Date;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TaskDto {

    private Long id;
    private String title;
    private String description;
    private Integer priority;
    private Integer progress; // Progress percentage of the task
    private Integer  level;
    private Long createdById;
    private List<UserDto> assignedUsers; // List of users assigned to the task
    private Long projectId;
    private Long parentId; // ID of the parent task, if any
    private Status status;
    private Date deadline; // Deadline for the task

    public TaskDto(Long id, String title, String description, Integer priority, Integer level, Long createdById,
                   Long parentId, Integer progress, Long projectId, Status status, Date deadline) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.priority = priority;
        this.level = level;
        this.createdById = createdById;
        this.parentId = parentId;
        this.progress = progress;
        this.projectId = projectId;
        this.status = status;
        this.deadline = deadline;
    }

}
