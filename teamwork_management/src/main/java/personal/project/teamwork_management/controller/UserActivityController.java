package personal.project.teamwork_management.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import personal.project.teamwork_management.service.UserActivityService;

@RestController
@RequestMapping("/api/user-activity")
public class UserActivityController {

    @Autowired
    private UserActivityService userActivityService;

    @GetMapping("")
    public ResponseEntity<?> getUserActivities(@RequestParam(required = false) Long userId,
                                               @RequestParam(required = false) Long projectId) {
        if (userId != null && projectId != null) {
            return ResponseEntity.ok(userActivityService.getActivitiesByUserIdAndProjectId(userId, projectId));
        } else if (userId != null) {
            return ResponseEntity.ok(userActivityService.getActivitiesByUserId(userId));
        } else if (projectId != null) {
            return ResponseEntity.ok(userActivityService.getActivitiesByProjectId(projectId));
        } else {
            return ResponseEntity.badRequest().body("Either userId or projectId must be provided");
        }
    }
}
