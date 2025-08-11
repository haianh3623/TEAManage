package personal.project.teamwork_management.service;

import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import personal.project.teamwork_management.dto.TaskDto;
import personal.project.teamwork_management.model.ProjectMember;
import personal.project.teamwork_management.model.Status;
import personal.project.teamwork_management.model.Task;
import personal.project.teamwork_management.model.User;
import personal.project.teamwork_management.dto.ProjectDto;
import personal.project.teamwork_management.repository.ProjectMemberRepository;
import personal.project.teamwork_management.repository.TaskRepository;

import java.nio.file.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MemberEvaluationReportService {

    private final ProjectService projectService;
    private final UserService userService;
    private final TaskService taskService;                // nếu cần tái sử dụng
    private final TaskApprovalService taskApprovalService;

    private final HtmlReportRenderer htmlRenderer;        // đã có
    private final HtmlToPdfService htmlToPdfService;      // đã có
    private final HtmlToExcelService htmlToExcelService;  // đã có

    private final ProjectMemberRepository projectMemberRepository;
    private final TaskRepository taskRepository;          // nếu cần tái sử dụng

    private static final ZoneId ZONE = ZoneId.of("Asia/Bangkok");
    private static final DateTimeFormatter TS_FMT = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");

    /**
     * Repository NOTE:
     * Nên tạo thêm 1 method trong TaskRepository để tránh Lazy (fetch assignedUsers):
     *
     * @EntityGraph(attributePaths = {"assignedUsers","createdBy","project"})
     * List<Task> findByProjectIdAndDeadlineBetween(Long projectId, Date from, Date to);
     *
     * hoặc JPQL với JOIN FETCH assignedUsers.
     */


    public Map<String, Object> buildModel(Long projectId, LocalDate from, LocalDate to) throws Exception {
        // Quyền: chỉ cần xem dự án? Tuỳ bạn, mình tái sử dụng như báo cáo trước.
        var role = projectService.getCurrentUserRole(projectId);
        if (role == null) {
            throw new RuntimeException("Access denied");
        }

        ProjectDto project = projectService.getProjectById(projectId);

        // Chuẩn hoá mốc thời gian (theo deadline trong kỳ)
        ZonedDateTime zFrom = from.atStartOfDay(ZONE);
        ZonedDateTime zTo   = to.plusDays(1).atStartOfDay(ZONE).minusNanos(1);
        Date fromDate = Date.from(zFrom.toInstant());
        Date toDate   = Date.from(zTo.toInstant());

        // Lấy tasks trong kỳ (deadline trong [from, to])
        // >>>> QUAN TRỌNG: query này cần fetch assignedUsers để khỏi Lazy
        List<Task> periodTasks = fetchTasksWithAssignees(projectId, fromDate, toDate);

        // Tập thành viên trong dự án: ưu tiên lấy từ Project membership,
        // nếu không sẵn có thì gom từ task.assignedUsers trong kỳ
        Set<User> members = new LinkedHashSet<>();
        try {
            List<ProjectMember> projectMembers = projectMemberRepository.findByProjectId(projectId);
            List<User> users = new ArrayList<>();
            for(ProjectMember member : projectMembers){
                users.add(member.getUser());
            }

            members.addAll(users); // nếu có
        } catch (Exception ignore) {
            // fallback từ task
            for (Task t : periodTasks) {
                if (t.getAssignedUsers() != null) members.addAll(t.getAssignedUsers());
            }
        }

        // Gom số liệu per user
        List<MemberRow> rows = new ArrayList<>();
        for (User u : members) {
            long assigned = 0;
            long onTime = 0;     // COMPLETED
            long late = 0;       // OVERDUE
            long selfCreated = 0;

            for (Task t : periodTasks) {
                // assigned?
                boolean isAssigned = t.getAssignedUsers() != null &&
                        t.getAssignedUsers().stream().anyMatch(x -> Objects.equals(x.getId(), u.getId()));
                if (isAssigned) {
                    assigned++;
                    if (t.getStatus() == Status.COMPLETED) onTime++;
                    else if (t.getStatus() == Status.OVERDUE) late++;
                }
                // tự khởi tạo trong kỳ: dùng createdAt nếu có, không thì xét deadline trong kỳ
                boolean createdByUser = (t.getCreatedBy() != null && Objects.equals(t.getCreatedBy().getId(), u.getId()));
                if (createdByUser) {
                    // Nếu entity có createdAt, check in-range; nếu không, coi như theo deadline
                    // (bạn có thể thay bằng t.getCreatedAt() != null)
                    selfCreated++;
                }
            }

            // submissions/approval/reject trong kỳ (triển khai trong TaskApprovalService)
            long submissions = taskApprovalService.countSubmissionsByUserAndProjectBetween(u.getId(), projectId, fromDate, toDate);
            long approvals   = taskApprovalService.countApprovalsByUserAndProjectBetween(u.getId(), projectId, fromDate, toDate);
            long rejects     = taskApprovalService.countRejectsByUserAndProjectBetween(u.getId(), projectId, fromDate, toDate);

            double deadlineRate = assigned > 0 ? (double) onTime / assigned : 0.0;
            double approvalRate = submissions > 0 ? (double) approvals / submissions : 0.0;

            double score = score(deadlineRate, approvalRate, selfCreated);

            rows.add(MemberRow.builder()
                    .userId(u.getId())
                    .memberName(fullNameOrEmail(u))
                    .assigned(assigned)
                    .onTime(onTime)
                    .late(late)
                    .selfCreated(selfCreated)
                    .submissions(submissions)
                    .approvals(approvals)
                    .rejects(rejects)
                    .deadlineRate(Math.round(deadlineRate * 100))
                    .approvalRate(Math.round(approvalRate * 100))
                    .score(Math.round(score))
                    .build());
        }

        // Xếp hạng
        List<MemberRow> ranked = rows.stream()
                .sorted(Comparator.comparingLong(MemberRow::getScore).reversed()
                        .thenComparing(MemberRow::getMemberName))
                .toList();

        int rank = 1;
        for (MemberRow r : ranked) r.setRank(rank++);

        Map<String, Object> model = new HashMap<>();
        model.put("projectId", project.getId());
        model.put("projectName", project.getName());

        // đổi "from" -> "fromDate", "to" -> "toDate"
        model.put("fromDate", from.toString());
        model.put("toDate",  to.toString());

        model.put("generatedAt", ZonedDateTime.now(ZONE).toString());
        model.put("items", ranked);

        return model;
    }

    // ===== Export PDF =====
//    @Transactional(readOnly = true)
    public Path generatePdf(Long projectId, LocalDate from, LocalDate to) throws Exception {
        Map<String, Object> model = buildModel(projectId, from, to);
        String html = htmlRenderer.renderHtml("report/member-evaluation-report", model);

        Path dir = Paths.get("uploads", "report");
        Files.createDirectories(dir);

        String safe = safe(String.valueOf(model.getOrDefault("projectName", "project")));
        String ts = LocalDateTime.now(ZONE).format(TS_FMT);
        Path pdf = dir.resolve(safe + "-member-eval-" + ts + ".pdf");

        htmlToPdfService.writePdf(html, pdf);
        return pdf.toAbsolutePath();
    }

    // ===== Export Excel ===== (trích bảng #member-table từ template HTML)
//    @Transactional(readOnly = true)
    public Path generateExcel(Long projectId, LocalDate from, LocalDate to) throws Exception {
        Map<String, Object> model = buildModel(projectId, from, to);
        String html = htmlRenderer.renderHtml("report/member-evaluation-report", model);

        byte[] xlsx = htmlToExcelService.htmlTableToXlsx(html, "#member-table");

        Path dir = Paths.get("uploads", "report");
        Files.createDirectories(dir);

        String safe = safe(String.valueOf(model.getOrDefault("projectName", "project")));
        String ts = LocalDateTime.now(ZONE).format(TS_FMT);
        Path out = dir.resolve(safe + "-member-eval-" + ts + ".xlsx");

        Files.write(out, xlsx, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        return out.toAbsolutePath();
    }

    // ========= Helpers =========

    // Tính điểm (có thể điều chỉnh trọng số theo ý bạn)
    private double score(double deadlineRate, double approvalRate, long selfCreated) {
        // 50% deadline, 40% approval, 10% bonus theo số task tự tạo (log để tránh lệch)
        double base = 0.5 * deadlineRate + 0.4 * approvalRate; // cả hai là [0..1]
        double bonus = Math.log1p(selfCreated) / Math.log(2) * 0.1; // 0.. ~
        double s = (base + bonus) * 100.0;
        return Math.min(100.0, s);
    }

    private String fullNameOrEmail(User u) {
        String fn = safeStr(u.getFirstName());
        String ln = safeStr(u.getLastName());
        String name = (fn + " " + ln).trim();
        return !name.isBlank() ? name : safeStr(u.getEmail());
    }

    private String safeStr(String s) {
        return s == null ? "" : s;
    }

    private String safe(String name) {
        return name.replaceAll("[^a-zA-Z0-9-_]", "_");
    }

    // Bạn nên thay thế bằng repository thật có fetch join:
    @Transactional(readOnly = true)
    protected List<Task> fetchTasksWithAssignees(Long projectId, Date from, Date to) {
        // TODO: thay bằng taskRepository.findByProjectIdAndDeadlineBetween(...) có @EntityGraph("assignedUsers")
        // Tạm thời dùng TaskService + lọc (nhưng cẩn thận Lazy nếu assignedUsers là LAZY):
        List<TaskDto> dtos = taskService.getAllTasksByProjectId(projectId);
        List<Task> stub = new ArrayList<>(); // Chỉ minh hoạ, bạn hãy dùng repository thật để lấy entity

        for (TaskDto dto : dtos) {
            if (dto.getDeadline() != null && !dto.getDeadline().before(from) && !dto.getDeadline().after(to)) {
                Task task = taskRepository.findById(dto.getId()).orElseThrow(); // Chuyển đổi từ DTO sang entity nếu cần

                stub.add(task);
            }
        }

        // => Khuyến nghị: viết một query EntityGraph để trả về List<Task> đã fetch assignedUsers.
        return stub;
    }

    // ===== Row DTO cho template =====
    @Data
    @Builder
    public static class MemberRow {
        private Long userId;
        private String memberName;

        private long assigned;     // số task được giao trong kỳ
        private long onTime;       // COMPLETED
        private long late;         // OVERDUE
        private long selfCreated;  // task do chính user tạo

        private long submissions;
        private long approvals;
        private long rejects;

        private long deadlineRate; // %
        private long approvalRate; // %

        private long score;        // 0..100 (rounded)
        private int rank;

        // --- ALIAS GETTERS cho Thymeleaf template ---
        public long getAssignedTasks()      { return assigned; }
        public long getOnTimeTasks()        { return onTime; }
        public long getLateTasks()          { return late; }
        public long getSelfCreatedTasks()   { return selfCreated; }
        public long getTotalScore()         { return score; }
    }
}
