// MemberEvalReportService.java
package personal.project.teamwork_management.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import personal.project.teamwork_management.dto.ProjectDto;
import personal.project.teamwork_management.dto.UserDto;
import personal.project.teamwork_management.dto.MemberEvalReport;
import personal.project.teamwork_management.dto.MemberEvalRow;
import personal.project.teamwork_management.model.ApprovalAction;
import personal.project.teamwork_management.repository.TaskApprovalRepository;
import personal.project.teamwork_management.repository.TaskRepository;
import personal.project.teamwork_management.repository.UserRepository;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MemberEvalReportService {

    private final ProjectService projectService;
    private final TaskRepository taskRepository;
    private final TaskApprovalRepository approvalLogRepository;
    private final UserRepository userRepository; // dùng để lấy tên/email

    @Transactional(readOnly = true)
    public MemberEvalReport buildReport(Long projectId, Date from, Date to) throws Exception {
        if (from == null || to == null || from.after(to)) {
            throw new IllegalArgumentException("Khoảng thời gian không hợp lệ");
        }

        // Thông tin dự án
        ProjectDto project = projectService.getProjectById(projectId);

        // Lấy danh sách user theo assigned trong dự án
        List<Long> userIds = taskRepository.findDistinctAssigneeIdsByProject(projectId);
        if (userIds.isEmpty()) {
            return MemberEvalReport.builder()
                    .projectId(project.getId())
                    .projectName(project.getName())
                    .projectStatus(String.valueOf(project.getStatus()))
                    .fromDate(from).toDate(to)
                    .rows(Collections.emptyList())
                    .build();
        }

        // Map userId -> UserDto (để ghép tên)
        Map<Long, UserDto> userMap = userRepository.findAllById(userIds).stream()
                .map(u -> {
                    UserDto dto = new UserDto();
                    dto.setId(u.getId());
                    dto.setFirstName(u.getFirstName());
                    dto.setLastName(u.getLastName());
                    dto.setEmail(u.getEmail());
                    return dto;
                })
                .collect(Collectors.toMap(UserDto::getId, x -> x));

        List<MemberEvalRow> rows = new ArrayList<>();

        for (Long uid : userIds) {
            long assigned   = taskRepository.countAssignedInRange(projectId, uid, from, to);
            long completed  = taskRepository.countCompletedInRange(projectId, uid, from, to);
            long overdue    = taskRepository.countOverdueInRange(projectId, uid, from, to);
            long created    = taskRepository.countCreatedByUser(projectId, uid, from, to);

            long submissions = approvalLogRepository.countSubmissions(projectId, uid, from, to);
            long approved    = approvalLogRepository.countByStatus(projectId, uid, ApprovalAction.APPROVE, from, to);
            long rejected    = approvalLogRepository.countByStatus(projectId, uid, ApprovalAction.REJECT, from, to);

            double onTimeRate   = assigned > 0 ? (double) completed / assigned : 0.0;
            double approvalRate = submissions > 0 ? (double) approved / submissions : 0.0;
            double selfInitNorm = assigned > 0 ? Math.min((double) created / assigned, 1.0) : 0.0;

            double score = 60 * onTimeRate + 30 * approvalRate + 10 * selfInitNorm;

            UserDto u = userMap.get(uid);
            String fullName = (u != null && u.getFirstName() != null && !u.getFirstName().isBlank()
                    && u.getLastName()  != null && !u.getLastName().isBlank())
                    ? (u.getFirstName() + " " + u.getLastName())
                    : (u != null ? u.getEmail() : ("User#" + uid));

            rows.add(MemberEvalRow.builder()
                    .userId(uid)
                    .fullName(fullName)
                    .assignedCount(assigned)
                    .completedCount(completed)
                    .overdueCount(overdue)
                    .createdByUser(created)
                    .submissionCount(submissions)
                    .approvedCount(approved)
                    .rejectedCount(rejected)
                    .score(round1(score))
                    .rank(0) // sẽ điền sau
                    .build());
        }

        // Xếp hạng theo score giảm dần (tie cùng hạng)
        rows.sort(Comparator.comparingDouble(MemberEvalRow::getScore).reversed());
        int rank = 0;
        Double lastScore = null;
        int seen = 0;
        for (MemberEvalRow r : rows) {
            seen++;
            if (lastScore == null || Double.compare(r.getScore(), lastScore) != 0) {
                rank = seen;
                lastScore = r.getScore();
            }
            r.setRank(rank);
        }

        return MemberEvalReport.builder()
                .projectId(project.getId())
                .projectName(project.getName())
                .projectStatus(String.valueOf(project.getStatus()))
                .fromDate(from).toDate(to)
                .rows(rows)
                .build();
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
