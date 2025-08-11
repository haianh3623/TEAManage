package personal.project.teamwork_management.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import personal.project.teamwork_management.dto.TaskDto;
import personal.project.teamwork_management.model.Status;
import personal.project.teamwork_management.model.Task;

import java.util.Date;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    
    // Original methods (keeping for backward compatibility)
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
    List<TaskDto> findAllTasksDtoByProjectIdAndUserId(Long projectId, Long userId);

    // Enhanced method for user-related tasks with filtering, searching, and sorting
    @Query("SELECT DISTINCT t FROM Task t " +
            "LEFT JOIN t.project p " +
            "LEFT JOIN t.assignedUsers au " +
            "WHERE (t.createdBy.id = :userId OR au.id = :userId) " +
            "AND (:search IS NULL OR " +
            "    LOWER(t.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "    LOWER(t.description) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "    LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%'))) " +
            "AND (:status IS NULL OR t.status = :status) " +
            "AND (:projectId IS NULL OR p.id = :projectId) " +
            "AND (:dueSoon IS NULL OR :dueSoon = false OR " +
            "    (t.deadline IS NOT NULL AND t.deadline <= :dueSoonThreshold))")
    Page<Task> findUserTasksWithFilters(
            @Param("userId") Long userId,
            @Param("search") String search,
            @Param("status") Status status,
            @Param("projectId") Long projectId,
            @Param("dueSoon") Boolean dueSoon,
            @Param("dueSoonThreshold") Date dueSoonThreshold,
            Pageable pageable);

    // Method to get tasks created by user
    @Query("SELECT DISTINCT t FROM Task t " +
            "LEFT JOIN t.project p " +
            "WHERE t.createdBy.id = :userId " +
            "AND (:search IS NULL OR " +
            "    LOWER(t.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "    LOWER(t.description) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "    LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%'))) " +
            "AND (:status IS NULL OR t.status = :status) " +
            "AND (:projectId IS NULL OR p.id = :projectId) " +
            "AND (:dueSoon IS NULL OR :dueSoon = false OR " +
            "    (t.deadline IS NOT NULL AND t.deadline <= :dueSoonThreshold))")
    Page<Task> findCreatedTasksWithFilters(
            @Param("userId") Long userId,
            @Param("search") String search,
            @Param("status") Status status,
            @Param("projectId") Long projectId,
            @Param("dueSoon") Boolean dueSoon,
            @Param("dueSoonThreshold") Date dueSoonThreshold,
            Pageable pageable);

    // Method to get tasks assigned to user
    @Query("SELECT DISTINCT t FROM Task t " +
            "LEFT JOIN t.project p " +
            "LEFT JOIN t.assignedUsers au " +
            "WHERE au.id = :userId " +
            "AND (:search IS NULL OR " +
            "    LOWER(t.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "    LOWER(t.description) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "    LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%'))) " +
            "AND (:status IS NULL OR t.status = :status) " +
            "AND (:projectId IS NULL OR p.id = :projectId) " +
            "AND (:dueSoon IS NULL OR :dueSoon = false OR " +
            "    (t.deadline IS NOT NULL AND t.deadline <= :dueSoonThreshold))")
    Page<Task> findAssignedTasksWithFilters(
            @Param("userId") Long userId,
            @Param("search") String search,
            @Param("status") Status status,
            @Param("projectId") Long projectId,
            @Param("dueSoon") Boolean dueSoon,
            @Param("dueSoonThreshold") Date dueSoonThreshold,
            Pageable pageable);

    // Count methods for statistics
    @Query("SELECT COUNT(DISTINCT t) FROM Task t " +
            "LEFT JOIN t.assignedUsers au " +
            "WHERE (t.createdBy.id = :userId OR au.id = :userId)")
    Long countUserTasks(@Param("userId") Long userId);

    @Query("SELECT COUNT(DISTINCT t) FROM Task t " +
            "LEFT JOIN t.assignedUsers au " +
            "WHERE (t.createdBy.id = :userId OR au.id = :userId) " +
            "AND t.deadline IS NOT NULL AND t.deadline <= :dueSoonThreshold")
    Long countUserTasksDueSoon(@Param("userId") Long userId, @Param("dueSoonThreshold") Date dueSoonThreshold);

    List<Task> findByParentId(Long parentId);
    List<Task> findByProjectIdAndLevel(Long projectId, Integer level);

    @Query("SELECT t FROM Task t " +
           "JOIN t.assignedUsers u " +
           "WHERE u.id = :userId AND t.project.id = :projectId")
    List<Task> findByUserIdAndProjectId(Long userId, Long projectId);

    // Lấy danh sách user tham gia dự án (từ assignedUsers)
    @Query("""
        select distinct u.id
        from Task t
        join t.assignedUsers u
        where t.project.id = :projectId
    """)
    List<Long> findDistinctAssigneeIdsByProject(@Param("projectId") Long projectId);

    // Đếm task user được giao trong kỳ (deadline trong khoảng)
    @Query("""
        select count(t) from Task t
        join t.assignedUsers u
        where t.project.id = :projectId
          and u.id = :userId
          and t.deadline between :from and :to
    """)
    long countAssignedInRange(@Param("projectId") Long projectId,
                              @Param("userId") Long userId,
                              @Param("from") Date from,
                              @Param("to") Date to);

    // Đếm task COMPLETED trong kỳ (deadline trong khoảng)
    @Query("""
        select count(t) from Task t
        join t.assignedUsers u
        where t.project.id = :projectId
          and u.id = :userId
          and t.status = personal.project.teamwork_management.model.Status.COMPLETED
          and t.deadline between :from and :to
    """)
    long countCompletedInRange(@Param("projectId") Long projectId,
                               @Param("userId") Long userId,
                               @Param("from") Date from,
                               @Param("to") Date to);

    // Đếm task OVERDUE trong kỳ (deadline trong khoảng)
    @Query("""
        select count(t) from Task t
        join t.assignedUsers u
        where t.project.id = :projectId
          and u.id = :userId
          and t.status = personal.project.teamwork_management.model.Status.OVERDUE
          and t.deadline between :from and :to
    """)
    long countOverdueInRange(@Param("projectId") Long projectId,
                             @Param("userId") Long userId,
                             @Param("from") Date from,
                             @Param("to") Date to);

    // Đếm task user tự tạo (deadline trong khoảng)
    @Query("""
        select count(t) from Task t
        where t.project.id = :projectId
          and t.createdBy.id = :userId
          and t.deadline between :from and :to
    """)
    long countCreatedByUser(@Param("projectId") Long projectId,
                            @Param("userId") Long userId,
                            @Param("from") Date from,
                            @Param("to") Date to);
}
