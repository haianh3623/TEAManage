package personal.project.teamwork_management.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import personal.project.teamwork_management.service.ProjectReportService;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ProjectReportService projectReportService;

    /**
     * Tạo báo cáo Excel (HTML -> XLSX)
     */
    @PostMapping("/projects/{projectId}/excel")
    public ResponseEntity<Map<String, Object>> generateExcel(@PathVariable Long projectId) throws Exception {
        Path path = projectReportService.generateExcel(projectId);
        return ResponseEntity.ok(Map.of(
                "message", "Excel generated",
                "path", path.toString()
        ));
    }

    /**
     * Tạo báo cáo PDF (HTML -> PDF)
     */
    @PostMapping("/projects/{projectId}/pdf")
    public ResponseEntity<Map<String, Object>> generatePdf(@PathVariable Long projectId) throws Exception {
        Path path = projectReportService.generatePdf(projectId);
        return ResponseEntity.ok(Map.of(
                "message", "PDF generated",
                "path", path.toString()
        ));
    }

    /* (Tuỳ chọn) Endpoint tải file về trực tiếp nếu bạn muốn trả file thay vì trả path */

    @GetMapping(value = "/download", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<byte[]> download(@RequestParam("path") String filePath) throws Exception {
        Path p = Path.of(filePath);
        byte[] bytes = Files.readAllBytes(p);
        String filename = p.getFileName().toString();
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"" + filename + "\"")
                .body(bytes);
    }

    @GetMapping(value = "/download/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadPdf(@RequestParam("path") String filePath) throws Exception {
        Path p = Path.of(filePath);
        byte[] bytes = Files.readAllBytes(p);
        return ResponseEntity.ok()
                .header("Content-Disposition", "inline; filename=\"" + p.getFileName() + "\"")
                .body(bytes);
    }
}
