package personal.project.teamwork_management.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import personal.project.teamwork_management.model.Notification;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserIdAndIsReadFalse(Long userId);
}