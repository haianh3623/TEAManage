package personal.project.teamwork_management.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import personal.project.teamwork_management.dto.TaskDto;
import personal.project.teamwork_management.dto.UserDto;
import personal.project.teamwork_management.model.Role;
import personal.project.teamwork_management.model.Status;
import personal.project.teamwork_management.model.Task;
import personal.project.teamwork_management.model.User;
import personal.project.teamwork_management.repository.ProjectRepository;
import personal.project.teamwork_management.repository.TaskRepository;
import personal.project.teamwork_management.repository.UserRepository;
import personal.project.teamwork_management.model.NotificationType;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Service
public class TaskService {

    @Autowired
    private TaskRepository taskRepository;
    @Autowired
    private UserService userService;
    @Autowired
    private ProjectService projectService;
    @Autowired
    private ProjectRepository projectRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private NotificationService notificationService;

    public TaskDto createTask(TaskDto taskDto, Long projectId) throws Exception {
        User currentUser = userService.getCurrentUser();
        Role currentUserRole = projectService.getCurrentUserRole(projectId);
        if(currentUserRole == null) {
            throw new Exception("User does not have permission to create tasks in this project");
        }

        Task task = new Task();
        task.setTitle(taskDto.getTitle());
        task.setDescription(taskDto.getDescription());
        task.setPriority(taskDto.getPriority());
        task.setProgress(0);
        task.setStatus(Status.NOT_STARTED);
        task.setCreatedBy(currentUser);
        task.setDeadline(taskDto.getDeadline());

        if (taskDto.getParentId() != null) {
            Task parentTask = taskRepository.findById(taskDto.getParentId())
                    .orElseThrow(() -> new Exception("Parent task not found"));
            task.setParent(parentTask);
            task.setLevel(task.getParent().getLevel() +1);
        } else{
            task.setLevel(1);
        }

        task.setProject(projectRepository.findById(projectId).orElseThrow(() -> new Exception("Project not found")));

        if(currentUserRole == Role.MEMBER){
            List<User> users = new ArrayList<>();
            users.add(currentUser);
            task.setAssignedUsers(users);
        } else{
            List<User> assignedUsers = new ArrayList<>();
            for (UserDto userDto : taskDto.getAssignedUsers()) {
                User user = userRepository.findById(userDto.getId())
                        .orElseThrow(() -> new Exception("User not found: " + userDto.getId()));
                assignedUsers.add(user);
            }
            task.setAssignedUsers(assignedUsers);
        }

        task = taskRepository.save(task);

        notificationService.createNotification(
                "New task created: " + task.getTitle(),
                NotificationType.TASK_ASSIGNED,
                currentUser.getId()
        );

        return getTaskById(task.getId());
    }

    public TaskDto getTaskById(Long taskId) throws Exception {

//        Role currentUserRole = projectService.getCurrentUserRole(taskId);
//        if(currentUserRole == null) {
//            throw new Exception("User does not have permission to view this task");
//        }

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new Exception("Task not found"));
        updateOverdueTask(task);

        TaskDto taskDto = new TaskDto();

        taskDto.setId(task.getId());
        taskDto.setTitle(task.getTitle());
        taskDto.setDescription(task.getDescription());
        taskDto.setPriority(task.getPriority());
        taskDto.setProgress(task.getProgress());
        taskDto.setLevel(task.getLevel());
        taskDto.setStatus(task.getStatus());
        taskDto.setCreatedById(task.getCreatedBy().getId());
        taskDto.setProjectId(task.getProject().getId());
        taskDto.setParentId(task.getParent() != null ? task.getParent().getId() : null);
        taskDto.setDeadline(task.getDeadline());
        List<UserDto> assignedUsers = new ArrayList<>();
        for (User user : task.getAssignedUsers()) {
            UserDto userDto = new UserDto();
            userDto.setId(user.getId());
            userDto.setFirstName(user.getFirstName());
            userDto.setLastName(user.getLastName());
            userDto.setEmail(user.getEmail());
            userDto.setPhoneNumber(user.getPhoneNumber());
            userDto.setDob(user.getDob());
            assignedUsers.add(userDto);
        }
        taskDto.setAssignedUsers(assignedUsers);

        return taskDto;
    }

    public void updateOverdueTask(Task task) {
        Date now = new Date();
        if (!task.getDeadline().before(now)
                && task.getStatus() != Status.COMPLETED
                && task.getStatus() != Status.OVERDUE
                && task.getStatus() != Status.CANCELED) {
            task.setStatus(Status.OVERDUE);

        }
        taskRepository.save(task);

    }

    public List<TaskDto> getAllTasksByProjectId(Long projectId) {
        List<TaskDto> tasks = taskRepository.findAllTasksDtoByProjectId(projectId);
        for (TaskDto taskDto : tasks) {
            Task task = taskRepository.findById(taskDto.getId()).orElse(null);
            if (task != null) {
                updateOverdueTask(task);
            }

            List<UserDto> assignedUsers = new ArrayList<>();
            for (User user : task.getAssignedUsers()) {
                UserDto userDto = new UserDto();
                userDto.setId(user.getId());
                userDto.setFirstName(user.getFirstName());
                userDto.setLastName(user.getLastName());
                userDto.setEmail(user.getEmail());
                userDto.setPhoneNumber(user.getPhoneNumber());
                userDto.setDob(user.getDob());
                assignedUsers.add(userDto);
            }
            taskDto.setAssignedUsers(assignedUsers);
        }
        return taskRepository.findAllTasksDtoByProjectId(projectId);
    }

    public List<TaskDto> getAllTasksByUserId(Long userId) {
        List<TaskDto> tasks = taskRepository.findAllTasksDtoByUserId(userId);
        for (TaskDto taskDto : tasks) {
            Task task = taskRepository.findById(taskDto.getId()).orElse(null);
            if (task != null) {
                updateOverdueTask(task);
            }

            List<UserDto> assignedUsers = new ArrayList<>();
            for (User user : task.getAssignedUsers()) {
                UserDto userDto = new UserDto();
                userDto.setId(user.getId());
                userDto.setFirstName(user.getFirstName());
                userDto.setLastName(user.getLastName());
                userDto.setEmail(user.getEmail());
                userDto.setPhoneNumber(user.getPhoneNumber());
                userDto.setDob(user.getDob());
                assignedUsers.add(userDto);
            }
            taskDto.setAssignedUsers(assignedUsers);
        }
        return taskRepository.findAllTasksDtoByUserId(userId);
    }

    public List<TaskDto> getAllTasksByProjectIdAndUserId(Long projectId, Long userId) {
        List<TaskDto> tasks = taskRepository.fidnAllTasksDtoByProjectIdAndUserId(projectId, userId);
        for (TaskDto taskDto : tasks) {
            Task task = taskRepository.findById(taskDto.getId()).orElse(null);
            if (task != null) {
                updateOverdueTask(task);
            }
        }
        return taskRepository.fidnAllTasksDtoByProjectIdAndUserId(projectId, userId);
    }

    public TaskDto updateTask(Long id, TaskDto taskDto) throws Exception {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new Exception("Task not found"));

        Role currentUserRole = projectService.getCurrentUserRole(task.getProject().getId());

        if(currentUserRole == null) {
            throw new Exception("User does not have permission to update this task");
        }

        User currentUser = userService.getCurrentUser();
        if (!task.getCreatedBy().getId().equals(currentUser.getId()) && currentUserRole == Role.MEMBER) {
            throw new Exception("Only the creator can update the task");
        }

        task.setTitle(taskDto.getTitle());
        task.setDescription(taskDto.getDescription());
        task.setPriority(taskDto.getPriority());
        task.setProgress(taskDto.getProgress());
        task.setStatus(taskDto.getStatus());
        task.setDeadline(taskDto.getDeadline());

        if (taskDto.getParentId() != null) {
            Task parentTask = taskRepository.findById(taskDto.getParentId())
                    .orElseThrow(() -> new Exception("Parent task not found"));
            task.setParent(parentTask);
            task.setLevel(parentTask.getLevel() + 1);
        } else {
            task.setParent(null);
            task.setLevel(1);
        }

        List<User> assignedUsers = new ArrayList<>();
        for (UserDto userDto : taskDto.getAssignedUsers()) {
            User user = userRepository.findById(userDto.getId())
                    .orElseThrow(() -> new Exception("User not found: " + userDto.getId()));
            assignedUsers.add(user);
        }
        task.setAssignedUsers(assignedUsers);

        task = taskRepository.save(task);

        notificationService.createNotification(
                "Task updated: " + task.getTitle(),
                NotificationType.TASK_UPDATED,
                currentUser.getId()
        );

        return getTaskById(task.getId());
    }

    public void deleteTask(Long taskId) throws Exception {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new Exception("Task not found"));

        Role currentUserRole = projectService.getCurrentUserRole(task.getProject().getId());
        if(currentUserRole == null || (!currentUserRole.equals(Role.LEADER) && !currentUserRole.equals(Role.VICE_LEADER))) {
            throw new Exception("User does not have permission to delete this task");
        }

        taskRepository.delete(task);
    }

    public TaskDto updateTaskStatus(TaskDto taskDto, Status status) throws Exception {
        Task task = taskRepository.findById(taskDto.getId())
                .orElseThrow(() -> new Exception("Task not found"));

        Role currentUserRole = projectService.getCurrentUserRole(task.getProject().getId());
        User currentUser = userService.getCurrentUser();

        boolean isAssignedUser = task.getAssignedUsers().stream()
                .anyMatch(user -> user.getId().equals(currentUser.getId()));

        if (!(currentUserRole == Role.LEADER || currentUserRole == Role.VICE_LEADER || isAssignedUser)) {
            throw new Exception("User does not have permission to update the status of this task");
        }

        task.setStatus(status);
        task = taskRepository.save(task);

        notificationService.createNotification(
                "Task status updated: " + task.getTitle(),
                NotificationType.TASK_UPDATED,
                currentUser.getId()
        );

        return getTaskById(task.getId());
    }

    public List<TaskDto> getAllTasksByParentId(Long parentId) {
        List<TaskDto> tasks = taskRepository.findAllTasksDtoByParentId(parentId);
        for (TaskDto taskDto : tasks) {
            Task task = taskRepository.findById(taskDto.getId()).orElse(null);
            if (task != null) {
                updateOverdueTask(task);
            }
        }
        return tasks;
    }

}