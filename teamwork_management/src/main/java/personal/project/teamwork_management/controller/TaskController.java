package personal.project.teamwork_management.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import personal.project.teamwork_management.dto.TaskDto;
import personal.project.teamwork_management.dto.UserDto;
import personal.project.teamwork_management.service.TaskService;
import personal.project.teamwork_management.model.Status;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    @Autowired
    private TaskService taskService;

    // Original endpoints (keeping for backward compatibility)
    @PostMapping("/create/{projectId}")
    public ResponseEntity<TaskDto> createTask(@RequestBody TaskDto taskDto, @PathVariable Long projectId) {
        try {
            TaskDto createdTask = taskService.createTask(taskDto, projectId);
            return ResponseEntity.ok(createdTask);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    @GetMapping("/{id:[0-9]+}")
    public ResponseEntity<?> getTaskById(@PathVariable Long id) {
        try {
            TaskDto task = taskService.getTaskByIdForController(id);
            return ResponseEntity.ok(task);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("")
    public ResponseEntity<?> getAllTasksByProjectIdOrUserId(
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long userId) {
        try {
            if(projectId != null && userId != null){
                return ResponseEntity.ok(taskService.getAllTasksByProjectIdAndUserId(projectId, userId));
            }
            if (projectId != null) {
                return ResponseEntity.ok(taskService.getAllTasksByProjectId(projectId));
            }
            
            return ResponseEntity.ok(taskService.getAllTasksByUserId(userId));
   
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/add-assignee")
    public ResponseEntity<?> addAssigneeToTask(@PathVariable Long id, @RequestParam Long userId){
        try {
            List<UserDto> updatedTask = taskService.addAssignedUserToTask(id, userId);
            return ResponseEntity.ok(updatedTask);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/remove-assignee")
    public ResponseEntity<?> removeAssigneeFromTask(@PathVariable Long id, @RequestParam Long userId){
        try {
            List<UserDto> updatedTask = taskService.removeAssignedUserFromTask(id, userId);
            return ResponseEntity.ok(updatedTask);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Enhanced endpoints with filtering, searching, and sorting

    /**
     * Get all tasks related to the current user (created by or assigned to)
     * Supports filtering, searching, and sorting
     */
    @GetMapping("/my")
    public ResponseEntity<?> getMyTasks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Boolean dueSoon,
            @RequestParam(defaultValue = "created,desc") String sort) {
        try {
            Page<TaskDto> tasks = taskService.getUserTasksWithFilters(
                    search, status, projectId, dueSoon, page, size, sort);
            return ResponseEntity.ok(tasks);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get tasks created by the current user
     */
    @GetMapping("/created")
    public ResponseEntity<?> getCreatedTasks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Boolean dueSoon,
            @RequestParam(defaultValue = "created,desc") String sort) {
        try {
            Page<TaskDto> tasks = taskService.getCreatedTasksWithFilters(
                    search, status, projectId, dueSoon, page, size, sort);
            return ResponseEntity.ok(tasks);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get tasks assigned to the current user
     */
    @GetMapping("/assigned")
    public ResponseEntity<?> getAssignedTasks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Boolean dueSoon,
            @RequestParam(defaultValue = "created,desc") String sort) {
        try {
            Page<TaskDto> tasks = taskService.getAssignedTasksWithFilters(
                    search, status, projectId, dueSoon, page, size, sort);
            return ResponseEntity.ok(tasks);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get task statistics for the current user
     */
    @GetMapping("/stats")
    public ResponseEntity<?> getTaskStats() {
        try {
            TaskService.TaskStatsDto stats = taskService.getUserTaskStats();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Existing endpoints continue below...
    @PutMapping("/update")
    public ResponseEntity<?> updateTask(@RequestBody TaskDto taskDto) {
        try {
            TaskDto updatedTask = taskService.updateTask(taskDto.getId(), taskDto);
            return ResponseEntity.ok(updatedTask);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id:[0-9]+}")
    public ResponseEntity<?> deleteTask(@PathVariable Long id) {
        try {
            taskService.deleteTask(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id:[0-9]+}/assign")
    public ResponseEntity<?> assignTask(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        try {
            @SuppressWarnings("unchecked")
            java.util.List<Long> userIds = (java.util.List<Long>) request.get("userIds");
            TaskDto updatedTask = taskService.assignTask(id, userIds);
            return ResponseEntity.ok(updatedTask);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id:[0-9]+}/status")
    public ResponseEntity<?> updateTaskStatus(@PathVariable Long id, @RequestBody Map<String, String> request) {
        try {
            String status = request.get("status");
            TaskDto taskDto = taskService.getTaskById(id);
            TaskDto updatedTask = taskService.updateTaskStatus(taskDto,
                personal.project.teamwork_management.model.Status.valueOf(status.toUpperCase()));
            return ResponseEntity.ok(updatedTask);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id:[0-9]+}/progress")
    public ResponseEntity<?> updateTaskProgress(@PathVariable Long id, @RequestBody Map<String, Integer> request) {
        try {
            Integer progress = request.get("progress");
            TaskDto updatedTask = taskService.updateTaskProgress(id, progress);
            return ResponseEntity.ok(updatedTask);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/recent")
    public ResponseEntity<?> getRecentTasks() {
        try {
            return ResponseEntity.ok(taskService.getRecentTasks());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/deadline")
    public ResponseEntity<?> getTasksNearDeadline(
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            List<TaskDto> tasks = taskService.getTasksNearDeadline();            return ResponseEntity.ok(tasks);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}/hierarchy")
    public ResponseEntity<?> getTaskHierarchy(@PathVariable Long id) {
        try {
            List<TaskDto> hierarchy = taskService.getTaskHierarchy(id);
            return ResponseEntity.ok(hierarchy);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
