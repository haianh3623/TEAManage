package personal.project.teamwork_management.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import personal.project.teamwork_management.dto.ProjectDto;
import personal.project.teamwork_management.dto.ProjectMemberDto;
import personal.project.teamwork_management.model.Status;
import personal.project.teamwork_management.service.ProjectService;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    @Autowired
    private ProjectService projectService;

    @GetMapping("/{id}")
    public ResponseEntity<ProjectDto> getProjectById(@PathVariable Long id) {
        try {
            ProjectDto projectDto = projectService.getProjectById(id);
            return ResponseEntity.ok(projectDto);
        } catch (Exception e) {
            return ResponseEntity.status(403).body(null); // Return 403 Forbidden if user does not have permission
        }
    }

    @PostMapping("/create")
    public ResponseEntity<ProjectDto> createProject(@RequestBody ProjectDto projectDto) {
        try {
            ProjectDto createdProject = projectService.createProject(projectDto);
            return ResponseEntity.ok(createdProject);
        } catch (Exception e) {
            return ResponseEntity.status(400).body(null); // Return 400 Bad Request if there is an error
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectDto> updateProject(@PathVariable Long id, @RequestBody ProjectDto projectDto) {
        try {
            ProjectDto updatedProject = projectService.updateProject(id, projectDto);
            return ResponseEntity.ok(updatedProject);
        } catch (Exception e) {
            return ResponseEntity.status(404).body(null); // Return 404 Not Found if project does not exist
        }
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable Long id) {
        try {
            projectService.deleteProject(id);
            return ResponseEntity.noContent().build(); // Return 204 No Content on successful deletion
        } catch (Exception e) {
            return ResponseEntity.status(404).build(); // Return 404 Not Found if project does not exist
        }
    }

    @PutMapping("/{id}/members")
    public ResponseEntity<?> updateProjectMembers(@PathVariable Long id, @RequestBody List<ProjectMemberDto> members) {
        try {
            projectService.updateMemberList(id, members);
            return ResponseEntity.ok().build(); // Return 200 OK on successful update
        } catch (Exception e) {
            return ResponseEntity.status(400).body(e.getMessage()); // Return 400 Bad Request if there is an error
        }
    }

    @PutMapping("/{id}/change-leader")
    public ResponseEntity<?> changeProjectLeader(@PathVariable Long id, @RequestParam Long newLeaderId) {
        try {
            projectService.changeProjectLeader(id, newLeaderId);
            return ResponseEntity.ok().build(); // Return 200 OK on successful change
        } catch (Exception e) {
            return ResponseEntity.status(400).body(e.getMessage()); // Return 400 Bad Request if there is an error
        }
    }

    @GetMapping("")
    public ResponseEntity<Page<ProjectDto>> getAllProjects(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(projectService.getAllProjects(page, size));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateProjectStatus(@PathVariable Long id, @RequestParam Status status) {
        try {
            projectService.updateProjectStatus(id, status);
            return ResponseEntity.ok("Updated project status successfully");
        } catch (Exception e) {
            return ResponseEntity.status(400).body(null); // Return 400 Bad Request if there is an error
        }
    }


}


