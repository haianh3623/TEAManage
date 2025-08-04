package personal.project.teamwork_management.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import personal.project.teamwork_management.dto.TaskDto;
import personal.project.teamwork_management.model.Task;
import personal.project.teamwork_management.model.User;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    @Query("SELECT new personal.project.teamwork_management.dto.TaskDto(" +
            "t.id, t.title, t.description, t.priority, t.level, t.createdBy.id, t.parent.id, " +
            "t.progress, p.id, t.status, t.deadline) " +
            "FROM Task t JOIN t.project p WHERE p.id = :projectId")
    List<TaskDto> findAllTasksDtoByProjectId(Long projectId);

    @Query("SELECT new personal.project.teamwork_management.dto.TaskDto(" +
            "t.id, t.title, t.description, t.priority, t.level, t.createdBy.id, t.parent.id, " +
            "t.progress, p.id, t.status, t.deadline) " +
            "FROM Task t JOIN t.project p JOIN t.assignedUsers u WHERE u.id = :userId")
    List<TaskDto> findAllTasksDtoByUserId(Long userId);

    @Query("SELECT new personal.project.teamwork_management.dto.TaskDto(" +
            "t.id, t.title, t.description, t.priority, t.level, t.createdBy.id, t.parent.id, " +
            "t.progress, p.id, t.status, t.deadline) " +
            "FROM Task t JOIN t.project p JOIN t.assignedUsers u WHERE p.id = :projectId AND u.id = :userId")
    List<TaskDto> fidnAllTasksDtoByProjectIdAndUserId(Long projectId, Long userId);

    @Query("SELECT new personal.project.teamwork_management.dto.TaskDto(" +
            "t.id, t.title, t.description, t.priority, t.level, t.createdBy.id, t.parent.id, " +
            "t.progress, p.id, t.status, t.deadline) " +
            "FROM Task t JOIN t.project p WHERE t.parent.id = :parentId")
    List<TaskDto> findAllTasksDtoByParentId(Long parentId);
}
