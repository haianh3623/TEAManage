package personal.project.teamwork_management.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import personal.project.teamwork_management.dto.FileDto;
import personal.project.teamwork_management.model.File;

import java.util.List;

public interface FileRepository extends JpaRepository<File, Long> {
    @Query("SELECT new personal.project.teamwork_management.dto.FileDto(" +
    "f.id, f.name, f.path, f.size, f.task.id, f.project.id, f.taskSubmission.id) " +
    "FROM File f WHERE f.task.id = :taskId")
    List<FileDto> findFileDtoByTaskId(Long taskId);

    @Query("SELECT new personal.project.teamwork_management.dto.FileDto(" +
    "f.id, f.name, f.path, f.size, f.task.id, f.project.id, f.taskSubmission.id) " +
    "FROM File f WHERE f.project.id = :projectId")
    List<FileDto> findFileDtoByProjectId(Long projectId);
    
    @Query("SELECT new personal.project.teamwork_management.dto.FileDto(" +
    "f.id, f.name, f.path, f.size, f.task.id, f.project.id, f.taskSubmission.id) " +
    "FROM File f WHERE f.taskSubmission.id = :taskSubId")
    List<FileDto> findFileDtoByTaskSubmissionId(Long taskSubId);
}