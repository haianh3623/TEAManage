package personal.project.teamwork_management.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

// MemberEvalRowDto.java
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MemberEvalRow {
    private Long   userId;
    private String fullName;      // "First Last" hoặc email nếu thiếu tên

    private long assignedCount;   // số task được giao (deadline trong kỳ)
    private long completedCount;  // số task COMPLETED (deadline trong kỳ)
    private long overdueCount;    // số task OVERDUE   (deadline trong kỳ)

    private long createdByUser;   // số task user tự tạo (deadline trong kỳ)

    private long submissionCount; // tổng submission trong kỳ
    private long approvedCount;   // số approval trong kỳ
    private long rejectedCount;   // số reject trong kỳ

    private double score;         // điểm tổng
    private int rank;             // xếp hạng
}

