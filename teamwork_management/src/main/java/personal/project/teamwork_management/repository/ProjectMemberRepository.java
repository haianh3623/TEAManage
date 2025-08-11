package personal.project.teamwork_management.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import personal.project.teamwork_management.dto.MemberDto;
import personal.project.teamwork_management.dto.ProjectMemberDto;
import personal.project.teamwork_management.model.ProjectMember;
import personal.project.teamwork_management.model.Role;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {

    @Query("SELECT pm.role FROM ProjectMember pm WHERE pm.project.id = :projectId AND pm.user.id = :userId")
    Role findRoleByProjectIdAndUserId(Long projectId, Long userId);

    @Query("SELECT pm FROM ProjectMember pm WHERE pm.project.id = :id")
    List<ProjectMember> findAllByProjectId(Long id);

    @Query("SELECT new personal.project.teamwork_management.dto.MemberDto(pm.id, u.firstName, u.lastName, u.email, pm.role) " +
           "FROM ProjectMember pm JOIN pm.user u WHERE pm.project.id = :projectId")
    List<MemberDto> findAllMembersByProjectId(Long projectId);

    @Query("SELECT pm FROM ProjectMember pm WHERE pm.project.id = :projectId AND pm.role = 'LEADER'")
    ProjectMember findLeaderByProjectId(Long projectId);

    List<ProjectMember> findByProjectId(Long projectId);

    Optional<ProjectMember> findByProjectIdAndUserId(Long id, Long id1);

    Optional<ProjectMember> findByIdAndProjectId(Long id, Long id1);
}
