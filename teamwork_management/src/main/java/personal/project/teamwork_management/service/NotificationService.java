package personal.project.teamwork_management.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import personal.project.teamwork_management.model.Notification;
import personal.project.teamwork_management.model.NotificationType;
import personal.project.teamwork_management.repository.NotificationRepository;

import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public Notification createNotification(String message, NotificationType type, Long userId,
                                            Long relatedId, String relatedType) {
        Notification notification = new Notification();
        notification.setMessage(message);
        notification.setType(type);
        notification.setUserId(userId);
        notification.setRead(false);
        if(relatedId != null && relatedType != null) {
            notification.setRelatedId(relatedId);
            notification.setRelatedType(relatedType);
        }
        notification = notificationRepository.save(notification);

        // Send real-time notification
        messagingTemplate.convertAndSend("/topic/notifications/" + userId, notification);

        return notification;
    }

    public List<Notification> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalse(userId);
    }

    public void markAsRead(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setRead(true);
        notificationRepository.save(notification);
    }
}