package personal.project.teamwork_management.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import personal.project.teamwork_management.dto.ProjectDto;
import personal.project.teamwork_management.model.Project;


import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    @Query ("SELECT new personal.project.teamwork_management.dto.ProjectDto(" +
            "p.id, p.name, p.description, p.status, p.progress, p.startDate, p.endDate) " +
            "FROM Project p WHERE p.id = ?1")
    ProjectDto findProjectDtoById(Long id);

    @Query("SELECT new personal.project.teamwork_management.dto.ProjectDto(" +
            "p.id, p.name, p.description, p.status, p.progress, p.startDate, p.endDate) " +
            "FROM Project p JOIN p.members m WHERE m.user.id = ?1")
    Page<ProjectDto> findAllProjectsDtoByUserId(Long userId, Pageable pageable);

}
