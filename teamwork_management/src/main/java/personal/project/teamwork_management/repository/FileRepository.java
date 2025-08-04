package personal.project.teamwork_management.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import personal.project.teamwork_management.model.File;

import java.util.List;

public interface FileRepository extends JpaRepository<File, Long> {
    List<File> findByTaskId(Long taskId);
    List<File> findByProjectId(Long projectId);
}