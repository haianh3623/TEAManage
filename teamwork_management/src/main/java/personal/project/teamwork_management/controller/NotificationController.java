package personal.project.teamwork_management.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import personal.project.teamwork_management.model.Notification;
import personal.project.teamwork_management.model.NotificationType;
import personal.project.teamwork_management.service.NotificationService;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    // Test endpoint để tạo notification
    @PostMapping("/test")
    public Notification createTestNotification(@RequestParam String message,
                                             @RequestParam NotificationType type,
                                             @RequestParam Long userId,
                                             @RequestParam(required = false) Long relatedId,
                                             @RequestParam(required = false) String relatedType) {
        return notificationService.createNotification(message, type, userId, relatedId, relatedType);
    }

    @GetMapping("/unread/{userId}")
    public List<Notification> getUnreadNotifications(@PathVariable Long userId) {
        return notificationService.getUnreadNotifications(userId);
    }

    @PutMapping("/{id}/read")
    public void markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
    }
}