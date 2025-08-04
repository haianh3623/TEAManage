package personal.project.teamwork_management.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import personal.project.teamwork_management.dto.TaskDto;
import personal.project.teamwork_management.service.TaskService;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    @Autowired
    private TaskService taskService;

    @PostMapping("/create/{projectId}")
    public ResponseEntity<TaskDto> createTask(@RequestBody TaskDto taskDto, @PathVariable Long projectId) {
        try {
            TaskDto createdTask = taskService.createTask(taskDto, projectId);
            return ResponseEntity.ok(createdTask);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getTaskById(@PathVariable Long id) {
        try {
            TaskDto task = taskService.getTaskById(id);
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
            if (projectId != null) {
                return ResponseEntity.ok(taskService.getAllTasksByProjectId(projectId));
            } else if (userId != null) {
                return ResponseEntity.ok(taskService.getAllTasksByUserId(userId));
            } else {
                return ResponseEntity.ok(taskService.getAllTasksByProjectIdAndUserId(projectId, userId));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskDto> updateTask(@PathVariable Long id, @RequestBody TaskDto taskDto) {
        try {
            TaskDto updatedTask = taskService.updateTask(id, taskDto);
            return ResponseEntity.ok(updatedTask);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteTask(@PathVariable Long id) {
        try {
            taskService.deleteTask(id);
            return ResponseEntity.ok("Task deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/parent/{parentId}")
    public ResponseEntity<?> getTasksByParentId(@PathVariable Long parentId) {
        try {
            return ResponseEntity.ok(taskService.getAllTasksByParentId(parentId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }


}
