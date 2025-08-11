package personal.project.teamwork_management.dto;

import java.util.Date;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import personal.project.teamwork_management.model.ApprovalAction;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TaskApprovalLogDto {
    private Long id;
    private Long taskId;
    private ApprovalAction action;
    private Long performedById;
    private String note;
    private Date createdAt;
    
}
