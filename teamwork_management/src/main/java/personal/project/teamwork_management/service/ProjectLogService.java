package personal.project.teamwork_management.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import personal.project.teamwork_management.model.Project;
import personal.project.teamwork_management.model.ProjectAction;
import personal.project.teamwork_management.model.ProjectLog;
import personal.project.teamwork_management.model.Status;
import personal.project.teamwork_management.repository.ProjectLogRepository;
import personal.project.teamwork_management.repository.ProjectRepository;

import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectLogService {

    private final ProjectLogRepository projectLogRepository;
    private final UserService userService;
    private final ProjectRepository projectRepository;

    public void log(ProjectAction action, Long projectId, String description,
                    Long progress, Status newStatus) {
        ProjectLog log = new ProjectLog();
        log.setAction(action);
        log.setProjectId(projectId);
        log.setDescription(description);
        log.setProgress(progress);
        log.setNewStatus(newStatus);
        log.setPerformedBy(userService.getCurrentUser().getId());

        projectLogRepository.save(log);
    }

    public List<ProjectLog> getLogs(Long projectId, Date startDate, Date endDate) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found with id: " + projectId));
        if(startDate == null){
            startDate = project.getStartDate();
        }
        if(endDate == null){
            Date now = new Date();
            if(now.before(project.getEndDate())){
                endDate = now;
            } else {
                endDate = project.getEndDate();
            }
        }

        return projectLogRepository.findByProjectIdAndCreatedAtBetween(projectId, startDate, endDate);
    }
}

