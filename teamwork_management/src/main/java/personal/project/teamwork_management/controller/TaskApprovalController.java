package personal.project.teamwork_management.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import personal.project.teamwork_management.dto.TaskApprovalLogDto;
import personal.project.teamwork_management.model.TaskApprovalLog;
import personal.project.teamwork_management.service.TaskApprovalService;

@RestController
@RequestMapping("/api/task-approvals")
public class TaskApprovalController {

    @Autowired
    private TaskApprovalService approvalService;

    @PostMapping("/{taskId}/submit")
    public ResponseEntity<?> submit(@PathVariable Long taskId,
                                    @RequestParam(required = false) String note) {
        
        return ResponseEntity.ok(approvalService.submit(taskId, note));
    }

    @PostMapping("/{taskId}/approve")
    public ResponseEntity<?> approve(@PathVariable Long logId,
                                     @RequestParam(required = false) String note) throws Exception {
        
        return ResponseEntity.ok(approvalService.approve(logId, note));
    }

    @PostMapping("/{taskId}/reject")
    public ResponseEntity<?> reject(@PathVariable Long logId,
                                    @RequestParam String note) {
        
        return ResponseEntity.ok(approvalService.reject(logId, note));
    }

    @GetMapping("/{logId}")
    public ResponseEntity<TaskApprovalLog> getTaskApprovalLogById(@PathVariable Long logId) {
        TaskApprovalLog log = approvalService.getTaskApprovalLogById(logId);
        return ResponseEntity.ok(log);
    }

    @GetMapping("/task/{taskId}")
    public ResponseEntity<?> getTaskApprovalLogs(@PathVariable Long taskId) {
        List<TaskApprovalLogDto> logs = approvalService.getTaskApprovalLogDtosByTaskId(taskId);
        return ResponseEntity.ok(logs);
    }
}
