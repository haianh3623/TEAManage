package personal.project.teamwork_management.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import personal.project.teamwork_management.dto.FileDto;
import personal.project.teamwork_management.model.File;
import personal.project.teamwork_management.model.Project;
import personal.project.teamwork_management.model.Task;
import personal.project.teamwork_management.model.TaskApprovalLog;
import personal.project.teamwork_management.repository.FileRepository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
public class FileService {

    @Value("${spring.file.upload-dir:/app/uploads}")
    private String uploadDir;

    @Autowired
    public FileRepository fileRepository;

    public File uploadFile(MultipartFile file, Long taskId, Long projectId, Long taskSubId) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        // Sanitize filename
        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
        if (originalFilename.contains("..")) {
            throw new IllegalArgumentException("Invalid file path: " + originalFilename);
        }

        // Create unique filename to prevent conflicts
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String uniqueId = UUID.randomUUID().toString().substring(0, 8);
        String fileExtension = "";
        if (originalFilename.contains(".")) {
            fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        
        String uniqueFilename = timestamp + "_" + uniqueId + "_" + 
                               originalFilename.replaceAll("[^a-zA-Z0-9\\.\\-_]", "_");

        // Ensure upload directory exists
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Save file
        Path filePath = uploadPath.resolve(uniqueFilename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        // Create File entity
        File uploadedFile = new File();
        uploadedFile.setName(originalFilename); // Keep original name for display
        uploadedFile.setType(file.getContentType());
        uploadedFile.setPath(filePath.toString());
        uploadedFile.setSize(file.getSize());
        
        // Set relationships
        if (taskId != null) {
            Task task = new Task();
            task.setId(taskId);
            uploadedFile.setTask(task);
        }
        if (projectId != null) {
            Project project = new Project();
            project.setId(projectId);
            uploadedFile.setProject(project);
        }
        if (taskSubId != null) {
            TaskApprovalLog taskSubmission = new TaskApprovalLog();
            taskSubmission.setId(taskSubId);
            uploadedFile.setTaskSubmission(taskSubmission);
        }

        return fileRepository.save(uploadedFile);
    }

    public byte[] downloadFile(Long fileId) throws IOException {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + fileId));
        
        Path filePath = Paths.get(file.getPath());
        if (!Files.exists(filePath)) {
            throw new RuntimeException("Physical file not found: " + file.getPath());
        }
        
        return Files.readAllBytes(filePath);
    }

    public File getFileById(Long fileId) {
        return fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + fileId));
    }

    public List<FileDto> getFilesByTaskId(Long taskId) {
        return fileRepository.findFileDtoByTaskId(taskId);
    }

    public List<FileDto> getFilesByProjectId(Long projectId) {
        return fileRepository.findFileDtoByProjectId(projectId);
    }

    public void deleteFile(Long fileId) throws IOException {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found with id: " + fileId));
        
        // Delete physical file
        Path filePath = Paths.get(file.getPath());
        if (Files.exists(filePath)) {
            Files.delete(filePath);
        }
        
        // Delete database record
        fileRepository.delete(file);
    }

    public List<FileDto> getFilesByTaskSubId(Long taskSubId) {
        return fileRepository.findFileDtoByTaskSubmissionId(taskSubId);
    }
}