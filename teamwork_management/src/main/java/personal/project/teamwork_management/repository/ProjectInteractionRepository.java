package personal.project.teamwork_management.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import personal.project.teamwork_management.model.ProjectInteraction;

import java.util.List;

@Repository
public interface ProjectInteractionRepository extends JpaRepository<ProjectInteraction, Long> {

    @Query("SELECT pi FROM ProjectInteraction pi WHERE pi.user.id = :userId ORDER BY pi.lastViewedAt DESC")
    List<ProjectInteraction> findByUserIdOrderByLastViewedAtDesc(Long userId);
}
