package personal.project.teamwork_management.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;
import personal.project.teamwork_management.dto.TaskApprovalLogDto;
import personal.project.teamwork_management.model.*;
import personal.project.teamwork_management.repository.ProjectMemberRepository;
import personal.project.teamwork_management.repository.TaskApprovalRepository;
import personal.project.teamwork_management.repository.TaskRepository;

import java.util.Date;
import java.util.List;

@Service
public class TaskApprovalService {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private TaskApprovalRepository logRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserActivityService userActivityService;

    @Autowired
    private ProjectMemberRepository projectMemberRepository;

    @Autowired
    private TaskService taskService;



    public TaskApprovalLog getTaskApprovalLogById(Long id) {
        return logRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task approval log not found"));
    }

    public List<TaskApprovalLog> getTaskApprovalLogsByTaskId(Long taskId) {
        return logRepository.findByTaskIdOrderByCreatedAtDesc(taskId);
    }

    public List<TaskApprovalLogDto> getTaskApprovalLogDtosByTaskId(Long taskId) {
        return logRepository.findByTaskId(taskId);
    }

    public TaskApprovalLog submit(Long taskId, String note) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        User currentUser = userService.getCurrentUser();
        Role role = projectService.getCurrentUserRole(task.getProject().getId());

        if (role == null) {
            throw new RuntimeException("Only MEMBERs can submit task approvals.");
        }

        TaskApprovalLog log = new TaskApprovalLog();
        log.setTask(task);
        log.setAction(ApprovalAction.SUBMIT);
        log.setPerformedBy(currentUser);
        log.setNote(note);
        log.setCreatedAt(new Date());

        log = logRepository.save(log);

        userActivityService.logActivity(
                currentUser.getId(),
                "Submitted task approval for task: " + task.getTitle(),
                "Task",
                task.getId(),
                ActivityType.SUBMITTED_TASK
        );
        List<ProjectMember> members = projectMemberRepository.findByProjectId(task.getProject().getId());
        for(ProjectMember member : members) {
            if (member.getRole() == Role.LEADER || member.getRole() == Role.VICE_LEADER) {
                notificationService.createNotification(
                        (note == null || note.isEmpty()) ? "New submission for task approval " + task.getTitle() :
                        "New submission for task approval " + task.getTitle() + " with note: " + note,
                        NotificationType.TASK_SUBMITTED,
                        member.getUser().getId(),
                        log.getId(),
                        "TaskApprovalLog"
                );
            }
        }
        return log;
    }

    public TaskApprovalLog approve(Long logId, String note) throws Exception {
        TaskApprovalLog log = logRepository.findById(logId)
                .orElseThrow(() -> new RuntimeException("Approval log not found"));

        Task task = log.getTask();
        User currentUser = userService.getCurrentUser();
        User approver = log.getPerformedBy();
        Role role = projectService.getCurrentUserRole(task.getProject().getId());

        if (!Role.LEADER.equals(role) && !Role.VICE_LEADER.equals(role)) {
            throw new RuntimeException("Only LEADER or VICE_LEADER can approve.");
        }

        TaskApprovalLog approvalLog = new TaskApprovalLog();
        approvalLog.setTask(task);
        approvalLog.setAction(ApprovalAction.APPROVE);
        approvalLog.setPerformedBy(approver);
        approvalLog.setNote(note);
        approvalLog.setCreatedAt(new Date());

        approvalLog = logRepository.save(approvalLog);

        taskService.checkTaskDone(task.getId());

        userActivityService.logActivity(
                currentUser.getId(),
                "Approved task approval for task: " + task.getTitle(),
                "Task",
                task.getId(),
                ActivityType.APPROVED_TASK
        );
        // Gửi thông báo đến người submit
        notificationService.createNotification(
                (note == null || note.isEmpty()) ?"Submission approved" : "Submission approved with note: " + note,
                NotificationType.TASK_APPROVED,
                approvalLog.getPerformedBy().getId(),
                approvalLog.getId(),
                "TaskApprovalLog"
        );
        return approvalLog;
    }

    public TaskApprovalLog reject(Long logId, String note) {
        TaskApprovalLog log = logRepository.findById(logId)
                .orElseThrow(() -> new RuntimeException("Approval log not found"));

        Task task = log.getTask();
        User currentUser = userService.getCurrentUser();
        User rejecter = log.getPerformedBy();
        Role role = projectService.getCurrentUserRole(task.getProject().getId());

        if (!Role.LEADER.equals(role) && !Role.VICE_LEADER.equals(role)) {
            throw new RuntimeException("Only LEADER or VICE_LEADER can reject.");
        }

        TaskApprovalLog rejectionLog = new TaskApprovalLog();
        rejectionLog.setTask(task);
        rejectionLog.setAction(ApprovalAction.REJECT);
        rejectionLog.setPerformedBy(rejecter);
        rejectionLog.setNote(note);
        rejectionLog.setCreatedAt(new Date());

        rejectionLog = logRepository.save(rejectionLog);

        // Gửi thông báo đến người submit
        userActivityService.logActivity(
                currentUser.getId(),
                "Rejected task approval for task: " + task.getTitle(),
                "Task",
                task.getId(),
                ActivityType.REJECTED_TASK
        );
        notificationService.createNotification(
                "Submission rejected with note: " + note,
                NotificationType.TASK_REJECTED,
                rejectionLog.getPerformedBy().getId(),
                rejectionLog.getId(),
                "TaskApprovalLog"
        );
        return rejectionLog;
    }

    @Transactional(readOnly = true)
    public long countSubmissionsByUserAndProjectBetween(Long userId, Long projectId, Date from, Date to) {
        return logRepository.countSubmissions(userId, projectId, from, to);
    }

    @Transactional(readOnly = true)
    public long countApprovalsByUserAndProjectBetween(Long userId, Long projectId, Date from, Date to) {
        return logRepository.countByStatus(userId, projectId, ApprovalAction.APPROVE, from, to);
    }

    @Transactional(readOnly = true)
    public long countRejectsByUserAndProjectBetween(Long userId, Long projectId, Date from, Date to) {
        return logRepository.countByStatus(userId, projectId, ApprovalAction.REJECT, from, to);
    }
}

