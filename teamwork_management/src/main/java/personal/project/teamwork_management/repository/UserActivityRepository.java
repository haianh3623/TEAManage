package personal.project.teamwork_management.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import personal.project.teamwork_management.model.UserActivity;

import java.util.List;

@Repository
public interface UserActivityRepository extends JpaRepository<UserActivity, Long> {
    @Query("SELECT ua FROM UserActivity ua WHERE ua.userId = :userId ORDER BY ua.timestamp DESC")
    List<UserActivity> findByUserIdOrderByTimestampDesc(Long userId);
    @Query("SELECT ua FROM UserActivity ua WHERE ua.targetType = 'Project' and ua.targetId = :projectId " +
            "ORDER BY ua.timestamp DESC")
    List<UserActivity> findByProjectIdOrderByTimestampDesc(Long projectId);

    @Query("SELECT ua FROM UserActivity ua WHERE ua.userId = :userId AND ua.targetType = 'Project' " +
            "AND ua.targetId = :projectId " +
            "ORDER BY ua.timestamp DESC")
    List<UserActivity> findByUserIdAndProjectIdOrderByTimestampDesc(Long userId, Long projectId);
}
