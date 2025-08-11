package personal.project.teamwork_management.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import personal.project.teamwork_management.model.InviteCode;
import personal.project.teamwork_management.model.Project;

import java.util.Date;
import java.util.List;
import java.util.Optional;

public interface InviteCodeRepository extends JpaRepository<InviteCode, Long> {
    Optional<InviteCode> findByCode(String code);

    InviteCode findFirstByProjectAndExpiresAtAfterOrderByExpiresAtDesc(Project project, Date date);
    List<InviteCode> findByProjectId(Long projectId);

}
