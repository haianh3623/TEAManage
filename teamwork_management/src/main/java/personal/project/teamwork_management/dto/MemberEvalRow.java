package personal.project.teamwork_management.dto;

// MemberEvalRow.java
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import personal.project.teamwork_management.dto.TaskDto;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MemberEvalRow {
    private Long userId;
    private String memberName;

    private long assigned;
    private long onTime;
    private long late;
    private long selfCreated;

    private long submissions;
    private long approvals;
    private long rejects;

    private long deadlineRate; // %
    private long approvalRate; // %

    private long score;        // 0..100 (rounded)
    private int rank;

    // NEW: danh sách task trong khoảng thời gian được giao cho member này
    private List<TaskDto> assignedTasks;

    // Alias getters (nếu template đang dùng các tên này)
    public long getAssignedTasks()    { return assigned; }
    public long getOnTimeTasks()      { return onTime; }
    public long getLateTasks()        { return late; }
    public long getSelfCreatedTasks() { return selfCreated; }
    public long getTotalScore()       { return score; }
}

