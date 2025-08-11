package personal.project.teamwork_management.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import personal.project.teamwork_management.dto.TaskDto;
import personal.project.teamwork_management.dto.UserDto;
import personal.project.teamwork_management.model.ProjectMember;
import personal.project.teamwork_management.model.Task; // dùng entity Task như ProjectReportService
import personal.project.teamwork_management.repository.ProjectMemberRepository;
import personal.project.teamwork_management.repository.TaskRepository;

import java.nio.file.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectMemberReportService {

    private static final ZoneId ZONE = ZoneId.of("Asia/Bangkok");
    private static final DateTimeFormatter TS_FMT = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");

    private final TaskRepository taskRepository;
    private final TaskService taskService;
    private final ProjectMemberRepository projectMemberRepository;

    private final HtmlReportRenderer htmlRenderer;
    private final HtmlToPdfService htmlToPdfService;
    private final HtmlToExcelService htmlToExcelService;

    // tái dùng toàn bộ tính toán chỉ số từ service cũ
    private final MemberEvaluationReportService evalService;

    /**
     * Build model cho template: chỉ 1 thành viên duy nhất.
     * - Tận dụng evalService.buildModel(projectId, from, to) để lấy đủ các chỉ số
     * - Lọc đúng 1 member theo memberId
     * - Gom danh sách task assign cho member đó trong [from, to]
     */
//    @Transactional(propagation = Propagation.SUPPORTS)
    public Map<String, Object> buildModel(Long projectId, Long memberId, LocalDate from, LocalDate to) throws Exception {
        Long userId = getUserIdFroMemberId(memberId);

        // 1) Lấy sẵn model tổng (projectName/status/fromDate/toDate/items...) từ service cũ
        Map<String, Object> model = evalService.buildModel(projectId, from, to);

        // 2) Lọc đúng member
        @SuppressWarnings("unchecked")
        List<MemberEvaluationReportService.MemberRow> all =
                (List<MemberEvaluationReportService.MemberRow>) model.getOrDefault("items", Collections.emptyList());

        List<MemberEvaluationReportService.MemberRow> filtered = all.stream()
                .filter(r -> Objects.equals(r.getUserId(), userId))
                .collect(Collectors.toList());

        if (filtered.isEmpty()) {
            throw new IllegalArgumentException("MemberId=" + memberId + " không có dữ liệu trong khoảng thời gian này.");
        }

        // Chuẩn hóa rank nếu cần (1 thành viên)
        filtered.get(0).setRank(1);

        // 3) Gom task của member theo khoảng thời gian (lọc theo deadline)
        List<Map<String, Object>> memberTasks = collectTasksForMember(projectId, memberId, from, to);

        // 4) Điền lại vào model để template single-member render
        model.put("items", filtered); // vẫn dùng 'items' nhưng là list 1 phần tử
        model.put("memberId", memberId);
        model.put("memberName", filtered.get(0).getMemberName());
        model.put("memberTasks", memberTasks);
        return model;
    }

    /** Xuất PDF: ghi thẳng ra Path (dùng writePdf(html, outPath)) */
    @Transactional
    public Path generatePdf(Long projectId, Long memberId, LocalDate fromDate, LocalDate toDate) throws Exception {
        Map<String, Object> model = buildModel(projectId, memberId, fromDate, toDate);
        String html = htmlRenderer.renderHtml("report/member-evaluation-report-single", model);

        Path dir = Paths.get("uploads", "report");
        Files.createDirectories(dir);

        String projectName = String.valueOf(model.getOrDefault("projectName", "project"));
        String safe = toSafe(projectName) + "-member-" + memberId;
        String ts = LocalDateTime.now(ZONE).format(TS_FMT);
        Path out = dir.resolve(safe + "-" + ts + ".pdf");

        htmlToPdfService.writePdf(html, out); // overload ghi thẳng vào Path
        return out.toAbsolutePath();
    }

    /** Xuất Excel: lấy từ bảng #report-table (bảng chỉ số của member) */
    @Transactional
    public Path generateExcel(Long projectId, Long memberId, LocalDate fromDate, LocalDate toDate) throws Exception {
        Map<String, Object> model = buildModel(projectId, memberId, fromDate, toDate);
        String html = htmlRenderer.renderHtml("report/member-evaluation-report-single", model);

        byte[] xlsx = htmlToExcelService.htmlTableToXlsx(html, "#report-table");

        Path dir = Paths.get("uploads", "report");
        Files.createDirectories(dir);

        String projectName = String.valueOf(model.getOrDefault("projectName", "project"));
        String safe = toSafe(projectName) + "-member-" + memberId;
        String ts = LocalDateTime.now(ZONE).format(TS_FMT);
        Path out = dir.resolve(safe + "-" + ts + ".xlsx");

        Files.write(out, xlsx, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        return out.toAbsolutePath();
    }

    // ----------------- helpers -----------------

    /** Duyệt cây task như ProjectReportService và lọc task assign cho memberId trong [from, to] theo deadline */
    private List<Map<String, Object>> collectTasksForMember(Long projectId, Long memberId, LocalDate from, LocalDate to) {
        Long userId = getUserIdFroMemberId(memberId);

        List<Map<String, Object>> rows = new ArrayList<>();

        List<Task> roots = taskRepository.findByProjectIdAndLevel(projectId, 1);
        int seq = 0;
        for (Task root : roots) {
            List<TaskDto> chain = new ArrayList<>();
            try {
                chain = taskService.getTaskHierarchyForReport(root.getId());
            } catch (Exception e) {
                log.error("Error fetching task chain for root task ID: {}", root.getId(), e);
                continue; // skip this root if there's an error
            }
            for (TaskDto t : chain) {
                LocalDate dl = toLocalDate(t.getDeadline());
                if (dl == null || dl.isBefore(from) || dl.isAfter(to)) continue;

                List<UserDto> assignees = t.getAssignedUsers() != null ? t.getAssignedUsers() : Collections.emptyList();
                boolean assignedToMember = assignees.stream().anyMatch(u -> u != null && Objects.equals(u.getId(), userId));
                if (!assignedToMember) continue;

                seq++;
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("no", seq);
                row.put("id", t.getId());
                row.put("title", t.getTitle());
                row.put("deadline", formatDate(t.getDeadline()));
                row.put("status", String.valueOf(t.getStatus()));
                row.put("priority", String.valueOf(t.getPriority()));

                // tên hiển thị: lấy từ đúng userId
                String displayName = assignees.stream()
                        .filter(u -> u != null && Objects.equals(u.getId(), userId))
                        .findFirst()
                        .map(u -> {
                            String fn = u.getFirstName() == null ? "" : u.getFirstName().trim();
                            String ln = u.getLastName() == null ? "" : u.getLastName().trim();
                            String name = (fn + " " + ln).trim();
                            return name.isEmpty() ? (u.getEmail() != null ? u.getEmail() : "(no name)") : name;
                        })
                        .orElse("(no name)");
                row.put("assignee", displayName);

                rows.add(row);
            }
        }

        // sort theo deadline ↑ rồi id ↑
        rows.sort(Comparator
                .comparing((Map<String, Object> m) -> String.valueOf(m.get("deadline")), Comparator.nullsLast(String::compareTo))
                .thenComparing(m -> Long.parseLong(String.valueOf(m.get("id")))));
        return rows;
    }

    private static LocalDate toLocalDate(Object date) {
        if (date == null) return null;
        if (date instanceof java.sql.Date d)     return d.toLocalDate();
        if (date instanceof java.util.Date d)    return Instant.ofEpochMilli(d.getTime()).atZone(ZONE).toLocalDate();
        if (date instanceof LocalDate d)         return d;
        if (date instanceof LocalDateTime d)     return d.toLocalDate();
        return null;
    }

    private static String formatDate(Object date) {
        LocalDate d = toLocalDate(date);
        return d == null ? "" : d.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }

    private static String toSafe(String s) {
        return s == null ? "report" : s.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9-_]+", "-")
                .replaceAll("-+", "-");
    }

    private Long getUserIdFroMemberId(Long memberId) {
        // Giả sử có phương thức để lấy userId từ memberId
        // Thực tế sẽ cần truy vấn database hoặc service khác để lấy thông tin này

        ProjectMember member = projectMemberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found with ID: " + memberId));

        return member.getUser().getId(); // tạm thời trả về memberId như userId
    }
}
