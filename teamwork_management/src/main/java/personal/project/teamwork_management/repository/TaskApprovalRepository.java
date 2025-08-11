package personal.project.teamwork_management.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import personal.project.teamwork_management.dto.TaskApprovalLogDto;
import personal.project.teamwork_management.model.ApprovalAction;
import personal.project.teamwork_management.model.TaskApprovalLog;

import java.util.Date;
import java.util.List;
import java.util.Optional;

@Repository
public interface TaskApprovalRepository extends JpaRepository<TaskApprovalLog, Long> {
    List<TaskApprovalLog> findByTaskIdOrderByCreatedAtDesc(Long taskId);
    Optional<TaskApprovalLog> findTopByTaskIdOrderByCreatedAtDesc(Long taskId);

    @Query("SELECT new personal.project.teamwork_management.dto.TaskApprovalLogDto(" +
       "log.id, log.task.id, log.action, log.performedBy.id, log.note, log.createdAt) " +
       "FROM TaskApprovalLog log " +
       "WHERE log.task.id = :taskId " +
       "ORDER BY log.createdAt DESC")
    List<TaskApprovalLogDto> findByTaskId(@Param("taskId") Long taskId);

    @Query("""
        SELECT COUNT(l) FROM TaskApprovalLog l
        WHERE l.performedBy.id = :userId
          AND l.task.project.id = :projectId
          AND l.createdAt BETWEEN :from AND :to
    """)
    long countSubmissions(@Param("userId") Long userId,
                          @Param("projectId") Long projectId,
                          @Param("from") Date from,
                          @Param("to") Date to);

    @Query("""
        SELECT COUNT(l) FROM TaskApprovalLog l
        WHERE l.performedBy.id = :userId
          AND l.task.project.id = :projectId
          AND l.action = :status
          AND l.createdAt BETWEEN :from AND :to
    """)
    long countByStatus(@Param("userId") Long userId,
                       @Param("projectId") Long projectId,
                       @Param("status") ApprovalAction status,
                       @Param("from") Date from,
                       @Param("to") Date to);
}
