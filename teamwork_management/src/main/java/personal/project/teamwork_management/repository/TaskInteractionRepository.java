package personal.project.teamwork_management.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import personal.project.teamwork_management.model.TaskInteraction;

import java.util.List;

@Repository
public interface TaskInteractionRepository extends JpaRepository<TaskInteraction, Long> {

    @Query("SELECT ti FROM TaskInteraction ti WHERE ti.user.id = :userId ORDER BY ti.lastViewedAt DESC")
    List<TaskInteraction> findByUserIdOrderByLastViewedAtDesc(Long userId);
}
