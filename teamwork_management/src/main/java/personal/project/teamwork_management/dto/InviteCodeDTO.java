package personal.project.teamwork_management.dto;

import lombok.Data;
import personal.project.teamwork_management.model.InviteCode;

import java.util.Date;

@Data
public class InviteCodeDTO {
    private Long id;
    private String code;
    private Long projectId;
    private Date createdAt;
    private Date expiresAt;

    public InviteCodeDTO(InviteCode inviteCode) {
        this.id = inviteCode.getId();
        this.code = inviteCode.getCode();
        this.projectId = inviteCode.getProject().getId();
        this.createdAt = inviteCode.getCreatedAt();
        this.expiresAt = inviteCode.getExpiresAt();
    }
}