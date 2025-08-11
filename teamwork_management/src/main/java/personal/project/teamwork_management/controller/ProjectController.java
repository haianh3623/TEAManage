package personal.project.teamwork_management.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import personal.project.teamwork_management.dto.MemberDto;
import personal.project.teamwork_management.dto.ProjectDto;
import personal.project.teamwork_management.dto.ProjectMemberDto;
import personal.project.teamwork_management.model.Status;
import personal.project.teamwork_management.service.ProjectService;

import java.util.*;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    @Autowired
    private ProjectService projectService;

    @GetMapping("/{id:[0-9]+}")
    public ResponseEntity<?> getProjectById(@PathVariable Long id) {
        try {
            ProjectDto projectDto = projectService.getProjectByIdForController(id);
            return ResponseEntity.ok(projectDto);
        } catch (Exception e) {
            System.err.println("Error getting project by id " + id + ": " + e.getMessage());
            return ResponseEntity.status(403).body(Map.of(
                "error", "Access denied or project not found",
                "message", e.getMessage()
            ));
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

    @PutMapping("/{id:[0-9]+}")
    public ResponseEntity<ProjectDto> updateProject(@PathVariable Long id, @RequestBody ProjectDto projectDto) {
        try {
            ProjectDto updatedProject = projectService.updateProject(id, projectDto);
            return ResponseEntity.ok(updatedProject);
        } catch (Exception e) {
            return ResponseEntity.status(404).body(null); // Return 404 Not Found if project does not exist
        }
    }


    @DeleteMapping("/{id:[0-9]+}")
    public ResponseEntity<Void> deleteProject(@PathVariable Long id) {
        try {
            projectService.deleteProject(id);
            return ResponseEntity.noContent().build(); // Return 204 No Content on successful deletion
        } catch (Exception e) {
            return ResponseEntity.status(404).build(); // Return 404 Not Found if project does not exist
        }
    }

    @PatchMapping("/{id:[0-9]+}/status")
    public ResponseEntity<?> patchProjectStatus(@PathVariable Long id, @RequestParam Status status) {
        try {
            projectService.updateProjectStatus(id, status);
            return ResponseEntity.ok("Project status updated successfully");
        } catch (Exception e) {
            return ResponseEntity.status(400).body(e.getMessage()); // Return 400 Bad Request if there is an error
        }
    }

//    @PutMapping("/{id:[0-9]+}/members")
//    public ResponseEntity<?> updateProjectMembers(@PathVariable Long id, @RequestBody List<ProjectMemberDto> members) {
//        try {
//            projectService.updateMemberList(id, members);
//            return ResponseEntity.ok().build(); // Return 200 OK on successful update
//        } catch (Exception e) {
//            return ResponseEntity.status(400).body(e.getMessage()); // Return 400 Bad Request if there is an error
//        }
//    }

    @PatchMapping("/{id:[0-9]+}/change-leader")
    public ResponseEntity<?> changeProjectLeader(@PathVariable Long id, @RequestParam Long newLeaderId) {
        try {

            return ResponseEntity.ok( projectService.changeProjectLeader(id, newLeaderId)); // Return 200 OK on successful change
        } catch (Exception e) {
            return ResponseEntity.status(400).body(e.getMessage()); // Return 400 Bad Request if there is an error
        }
    }

    @PatchMapping("/{id:[0-9]+}/promote-vice-leader")
    public ResponseEntity<?> promoteToViceLeader(@PathVariable Long id, @RequestParam Long memberId) {
        try {

            return ResponseEntity.ok(projectService.promoteMemberToViceLeader(id, memberId)); // Return 200 OK on successful promotion
        } catch (Exception e) {
            return ResponseEntity.status(400).body(e.getMessage()); // Return 400 Bad Request if there is an error
        }
    }

    @PatchMapping("/{id:[0-9]+}/demote-vice-leader")
    public ResponseEntity<?> demoteViceLeader(@PathVariable Long id, @RequestParam Long memberId) {
        try {

            return ResponseEntity.ok(projectService.demoteViceLeaderToMember(id, memberId)); // Return 200 OK on successful demotion
        } catch (Exception e) {
            return ResponseEntity.status(400).body(e.getMessage()); // Return 400 Bad Request if there is an error
        }
    }

    @PatchMapping("/{id:[0-9]+}/add-member")
    public ResponseEntity<?> addProjectMember(@PathVariable Long id, @RequestParam Long userId) {
        try {
            List<MemberDto> addedMember = projectService.addMemberToProject(id, userId);
            return ResponseEntity.ok(addedMember); // Return 200 OK with the added member details
        } catch (Exception e) {
            return ResponseEntity.status(400).body(e.getMessage()); // Return 400 Bad Request if there is an error
        }
    }

    @PatchMapping("/{id:[0-9]+}/remove-member")
    public ResponseEntity<?> removeProjectMember(@PathVariable Long id, @RequestParam Long memberId) {
        try {

            return ResponseEntity.ok(projectService.removeMember(id, memberId)); // Return 200 OK on successful removal
        } catch (Exception e) {
            return ResponseEntity.status(400).body(e.getMessage()); // Return 400 Bad Request if there is an error
        }
    }

    /**
     * Get all projects with advanced filtering, sorting, and pagination
     */
    @GetMapping("")
    public ResponseEntity<Page<ProjectDto>> getAllProjects(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "name,asc") String sort,
            @RequestParam(required = false) String role) {
        
        try {
            // Parse sort parameter
            String sortBy = "name";
            String sortDirection = "asc";
            
            if (sort != null && !sort.trim().isEmpty()) {
                String[] sortParts = sort.split(",");
                sortBy = sortParts[0];
                sortDirection = sortParts.length > 1 ? sortParts[1] : "asc";
            }

            // Validate parameters
            if (page < 0) page = 0;
            if (size <= 0 || size > 100) size = 12;

            Page<ProjectDto> projects;

            // Handle role-based filtering
            if (role != null && !role.trim().isEmpty()) {
                projects = projectService.getProjectsByRole(
                    page, size, role, search, status, sortBy, sortDirection
                );
            } else {
                projects = projectService.getAllProjects(
                    page, size, search, status, sortBy, sortDirection
                );
            }

            return ResponseEntity.ok(projects);

        } catch (Exception e) {
            System.err.println("Error getting projects: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.ok(Page.empty());
        }
    }

    @GetMapping("/recent")
    public ResponseEntity<?> getRecentProjects() {
        try {
            List<ProjectDto> recentProjects = projectService.getRecentProjects();
            return ResponseEntity.ok(recentProjects);
        } catch (Exception e) {
            System.err.println("Error getting recent projects: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                "error", "Could not fetch recent projects",
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Get projects by specific status
     */
    @GetMapping("/by-status/{status}")
    public ResponseEntity<Page<ProjectDto>> getProjectsByStatus(
            @PathVariable String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "name,asc") String sort) {
        
        String sortBy = "name";
        String sortDirection = "asc";
        
        if (sort != null && !sort.trim().isEmpty()) {
            String[] sortParts = sort.split(",");
            sortBy = sortParts[0];
            sortDirection = sortParts.length > 1 ? sortParts[1] : "asc";
        }

        Page<ProjectDto> projects = projectService.getAllProjects(
            page, size, null, status, sortBy, sortDirection
        );
        
        return ResponseEntity.ok(projects);
    }

    /**
     * Search projects by name or description
     */
    @GetMapping("/search")
    public ResponseEntity<Page<ProjectDto>> searchProjects(
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "name,asc") String sort) {
        
        String sortBy = "name";
        String sortDirection = "asc";
        
        if (sort != null && !sort.trim().isEmpty()) {
            String[] sortParts = sort.split(",");
            sortBy = sortParts[0];
            sortDirection = sortParts.length > 1 ? sortParts[1] : "asc";
        }

        Page<ProjectDto> projects = projectService.getAllProjects(
            page, size, query, null, sortBy, sortDirection
        );
        
        return ResponseEntity.ok(projects);
    }

    /**
     * Get managed projects (LEADER or VICE_LEADER)
     */
    @GetMapping("/managed")
    public ResponseEntity<Page<ProjectDto>> getManagedProjects(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "name,asc") String sort) {
        
        String sortBy = "name";
        String sortDirection = "asc";
        
        if (sort != null && !sort.trim().isEmpty()) {
            String[] sortParts = sort.split(",");
            sortBy = sortParts[0];
            sortDirection = sortParts.length > 1 ? sortParts[1] : "asc";
        }

        Page<ProjectDto> projects = projectService.getProjectsByRole(
            page, size, "managed", search, status, sortBy, sortDirection
        );
        
        return ResponseEntity.ok(projects);
    }

    /**
     * Get member projects (MEMBER role)
     */
    @GetMapping("/member")
    public ResponseEntity<Page<ProjectDto>> getMemberProjects(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "name,asc") String sort) {
        
        String sortBy = "name";
        String sortDirection = "asc";
        
        if (sort != null && !sort.trim().isEmpty()) {
            String[] sortParts = sort.split(",");
            sortBy = sortParts[0];
            sortDirection = sortParts.length > 1 ? sortParts[1] : "asc";
        }

        Page<ProjectDto> projects = projectService.getProjectsByRole(
            page, size, "member", search, status, sortBy, sortDirection
        );
        
        return ResponseEntity.ok(projects);
    }

    /**
     * Get project statistics
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getProjectStats() {
        try {
            Map<String, Object> stats = projectService.getProjectStatistics();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            System.err.println("Error fetching project stats: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Could not fetch project statistics"));
        }
    }

    /**
     * Get filter options for frontend
     */
    @GetMapping("/filters")
    public ResponseEntity<Map<String, Object>> getFilterOptions() {
        Map<String, Object> filters = new HashMap<>();
        
        // Status options
        filters.put("statuses", Arrays.asList(
            Map.of("value", "NOT_STARTED", "label", "Chưa bắt đầu"),
            Map.of("value", "IN_PROGRESS", "label", "Đang thực hiện"),
            Map.of("value", "ON_HOLD", "label", "Tạm dừng"),
            Map.of("value", "COMPLETED", "label", "Đã hoàn thành"),
            Map.of("value", "CANCELED", "label", "Đã hủy"),
            Map.of("value", "OVERDUE", "label", "Quá hạn")
        ));
        
        // Sort options
        filters.put("sortOptions", Arrays.asList(
            Map.of("value", "name,asc", "label", "Tên A-Z"),
            Map.of("value", "name,desc", "label", "Tên Z-A"),
            Map.of("value", "startDate,desc", "label", "Mới nhất"),
            Map.of("value", "startDate,asc", "label", "Cũ nhất"),
            Map.of("value", "endDate,asc", "label", "Deadline gần"),
            Map.of("value", "endDate,desc", "label", "Deadline xa"),
            Map.of("value", "progress,desc", "label", "Tiến độ cao"),
            Map.of("value", "progress,asc", "label", "Tiến độ thấp")
        ));
        
        // Role options
        filters.put("roles", Arrays.asList(
            Map.of("value", "managed", "label", "Dự án quản lý"),
            Map.of("value", "member", "label", "Dự án tham gia")
        ));
        
        return ResponseEntity.ok(filters);
    }

}


