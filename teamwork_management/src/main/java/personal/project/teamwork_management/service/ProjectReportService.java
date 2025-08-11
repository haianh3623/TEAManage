package personal.project.teamwork_management.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import personal.project.teamwork_management.dto.ProjectDto;
import personal.project.teamwork_management.dto.TaskDto;
import personal.project.teamwork_management.dto.UserDto;
import personal.project.teamwork_management.model.Role;
import personal.project.teamwork_management.model.Task;
import personal.project.teamwork_management.repository.TaskRepository;

import java.nio.file.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ProjectReportService {

    private final ProjectService projectService;
    private final TaskService taskService;
    private final TaskRepository taskRepository;

    // NEW: renderer/converters cho HTML
    private final HtmlReportRenderer htmlRenderer;     // -> render HTML từ Thymeleaf
    private final HtmlToPdfService htmlToPdfService;   // -> HTML -> PDF (OpenHTMLtoPDF)
    private final HtmlToExcelService htmlToExcelService; // -> HTML table -> XLSX (Jsoup + POI)

    private static final ZoneId ZONE = ZoneId.of("Asia/Bangkok");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TS_FMT   = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");

    // ---------------- Build model cho template ----------------
    @Transactional(propagation = Propagation.SUPPORTS)
    public Map<String, Object> buildModel(Long projectId) throws Exception {
        Role role = projectService.getCurrentUserRole(projectId);
        if (role == null || !(Role.LEADER.equals(role) || Role.VICE_LEADER.equals(role))) {
            throw new RuntimeException("Access denied: Only LEADER/VICE_LEADER can create project report.");
        }

        ProjectDto project = projectService.getProjectById(projectId);
        Double progress = projectService.calculateProjectProgress(projectId);
        long progressRounded = Math.round(progress != null ? progress : 0);

        List<Task> roots = taskRepository.findByProjectIdAndLevel(projectId, 1);
        List<Map<String,Object>> items = new ArrayList<>();
        int rootIndex = 0;

        for (Task root : roots) {
            rootIndex++;
            List<TaskDto> chain = taskService.getTaskHierarchyForReport(root.getId()); // pre-order

            Deque<Integer> counters = new ArrayDeque<>();
            int lastLevel = 0;

            for (TaskDto t : chain) {
                int level = (t.getLevel() != null) ? t.getLevel() : 1;

                if (level == 1) { counters.clear(); counters.push(rootIndex); }
                else if (level > lastLevel) counters.push(1);
                else if (level == lastLevel) counters.push(counters.pop() + 1);
                else { while (counters.size() > level) counters.pop(); counters.push(counters.pop() + 1); }
                lastLevel = level;

                String number = joinCounters(counters);

                // top assignee cho level 1
                String topAssignee = "";
                List<UserDto> users = t.getAssignedUsers() != null ? t.getAssignedUsers() : Collections.emptyList();
                if (users.size() == 1) {
                    UserDto u = users.get(0);
                    boolean hasFullName = u != null
                            && u.getFirstName() != null && !u.getFirstName().isBlank()
                            && u.getLastName()  != null && !u.getLastName().isBlank();
                    topAssignee = hasFullName
                            ? (u.getFirstName() + " " + u.getLastName())
                            : (u != null && u.getEmail() != null ? u.getEmail() : "(no name)");
                }

                Map<String,Object> row = new HashMap<>();
                row.put("number", number);
                row.put("taskId", t.getId());
                row.put("title", t.getTitle());
                row.put("level", level);
                row.put("priority", t.getPriority());
                row.put("progress", t.getProgress());
                row.put("deadline", formatDate(t.getDeadline()));
                row.put("status", t.getStatus() != null ? t.getStatus().name() : "");
                row.put("topAssignee", topAssignee); // hoặc đổi template đọc "topAssignee"

                items.add(row);
            }
        }

        Map<String,Object> model = new HashMap<>();
        model.put("projectId", project.getId());
        model.put("projectName", project.getName());
        model.put("status", project.getStatus());
        model.put("progress", progressRounded);
        model.put("generatedAt", LocalDateTime.now(ZONE).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        model.put("items", items);
        return model;
    }

    // ---------------- HTML -> PDF ----------------
    @Transactional(propagation = Propagation.SUPPORTS)
    public Path generatePdf(Long projectId) throws Exception {
        Map<String, Object> model = buildModel(projectId);

        String html = htmlRenderer.renderHtml("report/project-report", model); // templates/report/project-report.html
        Path dir = Paths.get("uploads","report");
        Files.createDirectories(dir);

        String safe = toSafe(String.valueOf(model.getOrDefault("projectName","project")));
        String ts = LocalDateTime.now(ZONE).format(TS_FMT);
        Path pdfPath = dir.resolve(safe + "-" + ts + ".pdf");

        htmlToPdfService.writePdf(html, pdfPath);
        return pdfPath.toAbsolutePath();
    }

    // ---------------- HTML -> Excel ----------------
    @Transactional(propagation = Propagation.SUPPORTS)
    public Path generateExcel(Long projectId) throws Exception {
        Map<String, Object> model = buildModel(projectId);

        String html = htmlRenderer.renderHtml("report/project-report", model); // templates/report/project-report.html
        byte[] xlsx = htmlToExcelService.htmlTableToXlsx(html, "#report-table"); // id table trong template

        Path dir = Paths.get("uploads","report");
        Files.createDirectories(dir);

        String safe = toSafe(String.valueOf(model.getOrDefault("projectName","project")));
        String ts = LocalDateTime.now(ZONE).format(TS_FMT);
        Path out = dir.resolve(safe + "-" + ts + ".xlsx");

        Files.write(out, xlsx, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        return out.toAbsolutePath();
    }

    // ---------------- Helpers ----------------
    private static String joinCounters(Deque<Integer> counters) {
        List<Integer> tmp = new ArrayList<>(counters);
        Collections.reverse(tmp);
        return tmp.stream().map(String::valueOf).reduce((a,b)->a+"."+b).orElse("1");
    }

    private static String formatDate(Object date) {
        if (date == null) return "";
        if (date instanceof java.sql.Date sqlDate) {
            return sqlDate.toLocalDate().format(DATE_FMT);
        }
        if (date instanceof java.util.Date uDate) {
            return Instant.ofEpochMilli(uDate.getTime()).atZone(ZONE).toLocalDate().format(DATE_FMT);
        }
        if (date instanceof LocalDate ld) return ld.format(DATE_FMT);
        if (date instanceof LocalDateTime ldt) return ldt.toLocalDate().format(DATE_FMT);
        return String.valueOf(date);
    }

    private static String toSafe(String name) {
        return name.replaceAll("[^a-zA-Z0-9-_]","_");
    }
}
