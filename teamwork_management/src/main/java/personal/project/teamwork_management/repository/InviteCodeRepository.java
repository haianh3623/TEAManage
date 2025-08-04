package personal.project.teamwork_management.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import personal.project.teamwork_management.model.InviteCode;

import java.util.Optional;

public interface InviteCodeRepository extends JpaRepository<InviteCode, Long> {
    Optional<InviteCode> findByCode(String code);
}
