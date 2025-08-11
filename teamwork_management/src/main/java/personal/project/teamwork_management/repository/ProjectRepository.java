package personal.project.teamwork_management.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import personal.project.teamwork_management.dto.ProjectDto;
import personal.project.teamwork_management.model.Project;
import personal.project.teamwork_management.model.Status;


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

    /**
     * Find projects with search and status filters
     */
    @Query("SELECT new personal.project.teamwork_management.dto.ProjectDto(" +
            "p.id, p.name, p.description, p.status, p.progress, p.startDate, p.endDate) " +
            "FROM Project p JOIN p.members m WHERE m.user.id = :userId " +
            "AND (:search IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "     OR LOWER(p.description) LIKE LOWER(CONCAT('%', :search, '%'))) " +
            "AND (:status IS NULL OR p.status = :status)")
    Page<ProjectDto> findProjectsWithFilters(@Param("userId") Long userId,
                                             @Param("search") String search,
                                             @Param("status") Status status,
                                             Pageable pageable);


    /**
     * Find projects where user is LEADER or VICE_LEADER with filters
     */
    @Query("SELECT new personal.project.teamwork_management.dto.ProjectDto(" +
           "p.id, p.name, p.description, p.status, p.progress, p.startDate, p.endDate) " +
           "FROM Project p JOIN p.members m WHERE m.user.id = :userId " +
           "AND (m.role = 'LEADER' OR m.role = 'VICE_LEADER') " +
           "AND (:search IS NULL OR :search = '' OR " +
           "     LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "     LOWER(p.description) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:status IS NULL OR p.status = :status)")
    Page<ProjectDto> findManagedProjectsWithFilters(@Param("userId") Long userId,
                                                   @Param("search") String search,
                                                   @Param("status") Status status,
                                                   Pageable pageable);

    /**
     * Find projects where user is MEMBER with filters
     */
    @Query("SELECT new personal.project.teamwork_management.dto.ProjectDto(" +
           "p.id, p.name, p.description, p.status, p.progress, p.startDate, p.endDate) " +
           "FROM Project p JOIN p.members m WHERE m.user.id = :userId " +
           "AND m.role = 'MEMBER' " +
           "AND (:search IS NULL OR :search = '' OR " +
           "     LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "     LOWER(p.description) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:status IS NULL OR p.status = :status)")
    Page<ProjectDto> findMemberProjectsWithFilters(@Param("userId") Long userId,
                                                  @Param("search") String search,
                                                  @Param("status") Status status,
                                                  Pageable pageable);

    /**
     * Count projects by status for a user
     */
    @Query("SELECT p.status, COUNT(p) FROM Project p " +
           "JOIN p.members m WHERE m.user.id = :userId " +
           "GROUP BY p.status")
    List<Object[]> countProjectsByStatusForUser(@Param("userId") Long userId);

    /**
     * Count managed projects for a user
     */
    @Query("SELECT COUNT(DISTINCT p) FROM Project p " +
           "JOIN p.members m WHERE m.user.id = :userId " +
           "AND (m.role = 'LEADER' OR m.role = 'VICE_LEADER')")
    Long countManagedProjectsForUser(@Param("userId") Long userId);

    /**
     * Count member projects for a user
     */
    @Query("SELECT COUNT(DISTINCT p) FROM Project p " +
           "JOIN p.members m WHERE m.user.id = :userId " +
           "AND m.role = 'MEMBER'")
    Long countMemberProjectsForUser(@Param("userId") Long userId);

}
