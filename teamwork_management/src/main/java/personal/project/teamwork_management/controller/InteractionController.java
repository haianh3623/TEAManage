package personal.project.teamwork_management.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import personal.project.teamwork_management.service.ProjectInteractionService;
import personal.project.teamwork_management.service.TaskInteractionService;

@RestController
@RequestMapping("/api/recent")
public class InteractionController {
    @Autowired
    private ProjectInteractionService projectInteractionService;
    @Autowired
    private TaskInteractionService taskInteractionService;

    @GetMapping("/project")
    public ResponseEntity<?> getRecentProjectInteractions() {
        return ResponseEntity.ok(projectInteractionService.getProjectInteractions());
    }
    @GetMapping("/task")
    public ResponseEntity<?> getRecentTaskInteractions() {
        return ResponseEntity.ok(taskInteractionService.getTaskInteractions());
    }

}
