package personal.project.teamwork_management.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import personal.project.teamwork_management.model.File;
import personal.project.teamwork_management.service.FileService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/api/files")
public class FileController {

    @Autowired
    private FileService fileService;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam MultipartFile file,
                                        @RequestParam(required = false) Long taskId,
                                        @RequestParam(required = false) Long projectId) throws IOException {
        File uploadedFile = fileService.uploadFile(file, taskId, projectId);
        return ResponseEntity.ok(uploadedFile);
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<?> downloadFile(@PathVariable Long id) throws IOException {
        File file = fileService.fileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("File not found"));
        Path filePath = Paths.get(file.getPath());
        byte[] fileData = Files.readAllBytes(filePath);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getName() + "\"")
                .contentType(MediaType.parseMediaType(file.getType()))
                .body(fileData);
    }

    @GetMapping("/task/{taskId}")
    public ResponseEntity<?> getFilesByTask(@PathVariable Long taskId) {
        List<File> files = fileService.getFilesByTaskId(taskId);
        return ResponseEntity.ok(files);
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<?> getFilesByProject(@PathVariable Long projectId) {
        List<File> files = fileService.getFilesByProjectId(projectId);
        return ResponseEntity.ok(files);
    }
}