package personal.project.teamwork_management.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import personal.project.teamwork_management.model.File;
import personal.project.teamwork_management.model.Project;
import personal.project.teamwork_management.model.Task;
import personal.project.teamwork_management.repository.FileRepository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Service
public class FileService {

    @Value("${spring.file.upload-dir}")
    private String uploadDir;

    @Autowired
    public FileRepository fileRepository;

    public File uploadFile(MultipartFile file, Long taskId, Long projectId) throws IOException {
        Path filePath = Paths.get(uploadDir, file.getOriginalFilename());
        Files.createDirectories(filePath.getParent());
        Files.write(filePath, file.getBytes());

        File uploadedFile = new File();
        uploadedFile.setName(file.getOriginalFilename());
        uploadedFile.setType(file.getContentType());
        uploadedFile.setPath(filePath.toString());
        if (taskId != null) {
            uploadedFile.setTask(new Task());
            uploadedFile.getTask().setId(taskId);
        }
        if (projectId != null) {
            uploadedFile.setProject(new Project());
            uploadedFile.getProject().setId(projectId);
        }
        return fileRepository.save(uploadedFile);
    }

    public byte[] downloadFile(Long fileId) throws IOException {
        File file = fileRepository.findById(fileId).orElseThrow(() -> new RuntimeException("File not found"));
        Path filePath = Paths.get(file.getPath());
        return Files.readAllBytes(filePath);
    }

    public List<File> getFilesByTaskId(Long taskId) {
        return fileRepository.findByTaskId(taskId);
    }

    public List<File> getFilesByProjectId(Long projectId) {
        return fileRepository.findByProjectId(projectId);
    }
}