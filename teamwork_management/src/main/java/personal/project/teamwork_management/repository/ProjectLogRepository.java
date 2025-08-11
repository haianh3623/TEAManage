package personal.project.teamwork_management.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import personal.project.teamwork_management.model.ProjectLog;

import java.util.Date;
import java.util.List;

@Repository
public interface ProjectLogRepository extends JpaRepository<ProjectLog, Long> {
    List<ProjectLog> findByProjectIdOrderByTimestampDesc(Long projectId);

    @Query("SELECT l FROM ProjectLog l WHERE l.projectId = :projectId AND l.createdAt BETWEEN :startDate AND :endDate")
    List<ProjectLog> findByProjectIdAndCreatedAtBetween(@Param("projectId") Long projectId,
                                                        @Param("startDate") Date startDate,
                                                        @Param("endDate") Date endDate);

}
