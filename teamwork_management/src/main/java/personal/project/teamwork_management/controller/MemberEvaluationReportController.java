package personal.project.teamwork_management.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.FileCopyUtils;
import org.springframework.web.bind.annotation.*;
import personal.project.teamwork_management.service.MemberEvaluationReportService;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/reports/projects/{projectId}/members")
@RequiredArgsConstructor
public class MemberEvaluationReportController {

    private final MemberEvaluationReportService memberReportService;

    /**
     * Xem trước (preview) dữ liệu báo cáo ở dạng JSON.
     * from/to: định dạng yyyy-MM-dd (ISO)
     */
    @GetMapping("/preview")
    public ResponseEntity<Map<String, Object>> preview(
            @PathVariable Long projectId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) throws Exception {
        Map<String, Object> model = memberReportService.buildModel(projectId, from, to);
        return ResponseEntity.ok(model);
    }

    /**
     * Tạo báo cáo PDF -> trả về path file đã tạo
     */
    @PostMapping("/pdf")
    public ResponseEntity<Map<String, Object>> generatePdf(
            @PathVariable Long projectId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) throws Exception {
        Path pdf = memberReportService.generatePdf(projectId, from, to);
        return ResponseEntity.ok(Map.of(
                "message", "PDF generated",
                "path", pdf.toString()
        ));
    }

    /**
     * Tạo báo cáo Excel -> trả về path file đã tạo
     */
    @PostMapping("/excel")
    public ResponseEntity<Map<String, Object>> generateExcel(
            @PathVariable Long projectId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) throws Exception {
        Path xlsx = memberReportService.generateExcel(projectId, from, to);
        return ResponseEntity.ok(Map.of(
                "message", "Excel generated",
                "path", xlsx.toString()
        ));
    }

    /**
     * Tải file PDF đã tạo (stream về client)
     * Ví dụ: /api/reports/projects/1/members/download/pdf?path=/abs/path/to/file.pdf
     */
    @GetMapping("/download/pdf")
    public ResponseEntity<byte[]> downloadPdf(@RequestParam("path") String path) throws Exception {
        Path file = Path.of(path);
        byte[] bytes = Files.readAllBytes(file);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename(file.getFileName().toString())
                .build());

        return ResponseEntity.ok()
                .headers(headers)
                .body(bytes);
    }

    /**
     * Tải file Excel đã tạo (stream về client)
     * Ví dụ: /api/reports/projects/1/members/download/excel?path=/abs/path/to/file.xlsx
     */
    @GetMapping("/download/excel")
    public ResponseEntity<byte[]> downloadExcel(@RequestParam("path") String path) throws Exception {
        Path file = Path.of(path);
        byte[] bytes;
        try (InputStream in = Files.newInputStream(file)) {
            bytes = FileCopyUtils.copyToByteArray(in);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(
                MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename(file.getFileName().toString())
                .build());

        return ResponseEntity.ok()
                .headers(headers)
                .body(bytes);
    }
}
