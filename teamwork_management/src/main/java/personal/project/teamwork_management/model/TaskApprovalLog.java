package personal.project.teamwork_management.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Table(name = "task_approval_logs")
public class TaskApprovalLog extends BaseEntity {

    @ManyToOne
    @JoinColumn(name = "task_id")
    private Task task;

    @Enumerated(EnumType.STRING)
    private ApprovalAction action; // SUBMIT, APPROVE, REJECT

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User performedBy;

    private String note;


    private Date createdAt = new Date();
}

