package personal.project.teamwork_management.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import personal.project.teamwork_management.service.ProjectMemberReportService;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/reports/member")
@RequiredArgsConstructor
public class ProjectMemberReportController {

    private final ProjectMemberReportService reportService;

    @GetMapping("/{projectId}/pdf")
    public ResponseEntity<Resource> pdf(
            @PathVariable Long projectId,
            @RequestParam Long memberId,
            @RequestParam LocalDate fromDate,
            @RequestParam LocalDate toDate
    ) throws Exception {
        Path file = reportService.generatePdf(projectId, memberId, fromDate, toDate);
        ByteArrayResource res = new ByteArrayResource(Files.readAllBytes(file));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getFileName() + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(res);
    }

    @GetMapping("/{projectId}/excel")
    public ResponseEntity<Resource> excel(
            @PathVariable Long projectId,
            @RequestParam Long memberId,
            @RequestParam LocalDate fromDate,
            @RequestParam LocalDate toDate
    ) throws Exception {
        Path file = reportService.generateExcel(projectId, memberId, fromDate, toDate);
        ByteArrayResource res = new ByteArrayResource(Files.readAllBytes(file));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getFileName() + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(res);
    }
}
