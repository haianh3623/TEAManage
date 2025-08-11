package personal.project.teamwork_management.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

// MemberEvalReportDto.java
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MemberEvalReport {
    private Long   projectId;
    private String projectName;
    private String projectStatus;

    private Date fromDate;      // khoảng thời gian báo cáo
    private Date   toDate;

    private List<MemberEvalRow> rows;
}

