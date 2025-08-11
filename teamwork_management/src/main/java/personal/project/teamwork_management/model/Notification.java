package personal.project.teamwork_management.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class Notification extends BaseEntity {


    private String message;

    @Enumerated(EnumType.STRING)
    private NotificationType type;

    private Long userId;

    private boolean isRead;

    private Long relatedId;

    private String relatedType;
}