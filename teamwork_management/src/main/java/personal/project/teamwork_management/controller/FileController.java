package personal.project.teamwork_management.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import personal.project.teamwork_management.dto.FileDto;
import personal.project.teamwork_management.model.File;
import personal.project.teamwork_management.service.FileService;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "*")
public class FileController {

    @Autowired
    private FileService fileService;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFiles(@RequestParam("files") MultipartFile[] files,
                                         @RequestParam(required = false) Long taskId,
                                         @RequestParam(required = false) Long projectId,
                                         @RequestParam(required = false) Long taskSubId) {
        try {
            List<File> uploadedFiles = new ArrayList<>();
            List<String> errors = new ArrayList<>();

            for (MultipartFile file : files) {
                try {
                    if (file.isEmpty()) {
                        errors.add("Empty file: " + file.getOriginalFilename());
                        continue;
                    }
                    
                    // Check file size (max 10MB)
                    if (file.getSize() > 10 * 1024 * 1024) {
                        errors.add("File too large (max 10MB): " + file.getOriginalFilename());
                        continue;
                    }

                    File uploaded = fileService.uploadFile(file, taskId, projectId, taskSubId);
                    uploadedFiles.add(uploaded);
                } catch (Exception e) {
                    errors.add("Failed to upload " + file.getOriginalFilename() + ": " + e.getMessage());
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("uploadedFiles", uploadedFiles);
            response.put("errors", errors);
            response.put("totalUploaded", uploadedFiles.size());
            response.put("totalErrors", errors.size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Upload failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<?> downloadFile(@PathVariable Long id) {
        try {
            File file = fileService.getFileById(id);
            byte[] fileData = fileService.downloadFile(id);

            // Determine content type
            String contentType = file.getType();
            if (contentType == null || contentType.isEmpty()) {
                contentType = "application/octet-stream";
            }

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, 
                           "attachment; filename=\"" + file.getName() + "\"")
                    .contentType(MediaType.parseMediaType(contentType))
                    .contentLength(fileData.length)
                    .body(fileData);

        } catch (RuntimeException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (IOException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to download file: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @GetMapping("/task/{taskId}")
    public ResponseEntity<?> getFilesByTask(@PathVariable Long taskId) {
        try {
            List<FileDto> files = fileService.getFilesByTaskId(taskId);
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to get files: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<?> getFilesByProject(@PathVariable Long projectId) {
        try {
            List<FileDto> files = fileService.getFilesByProjectId(projectId);
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to get files: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @GetMapping("/task-submission/{taskSubId}")
    public ResponseEntity<?> getFilesByTaskSubId(@PathVariable Long taskSubId) {
        try {
            List<FileDto> files = fileService.getFilesByTaskSubId(taskSubId);
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to get files: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFile(@PathVariable Long id) {
        try {
            fileService.deleteFile(id);
            Map<String, String> response = new HashMap<>();
            response.put("message", "File deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (IOException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to delete file: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getFileInfo(@PathVariable Long id) {
        try {
            File file = fileService.getFileById(id);
            return ResponseEntity.ok(file);
        } catch (RuntimeException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
}