package personal.project.teamwork_management.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import personal.project.teamwork_management.model.ProjectLog;
import personal.project.teamwork_management.service.ProjectLogService;

import java.util.Date;
import java.util.List;

@RestController
@RequestMapping("/api/project-logs")
public class ProjectLogController {
    @Autowired
    private ProjectLogService projectLogService;

    @GetMapping("/{projectId}")
    public ResponseEntity<?> getProjectLogs(@PathVariable Long projectId,
                                         @RequestParam(required = false) Date startDate,
                                         @RequestParam(required = false) Date endDate) {
        try{
            return ResponseEntity.ok(projectLogService.getLogs(projectId, startDate, endDate));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error retrieving project logs: " + e.getMessage());
        }
    }
}
