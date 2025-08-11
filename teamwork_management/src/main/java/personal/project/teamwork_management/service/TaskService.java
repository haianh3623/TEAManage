package personal.project.teamwork_management.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import personal.project.teamwork_management.dto.TaskDto;
import personal.project.teamwork_management.dto.UserDto;
import personal.project.teamwork_management.model.*;
import personal.project.teamwork_management.repository.ProjectRepository;
import personal.project.teamwork_management.repository.TaskRepository;
import personal.project.teamwork_management.repository.UserRepository;

import java.util.*;

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
    @Autowired
    private TaskInteractionService taskInteractionService;
    @Autowired
    private UserActivityService userActivityService;

    public TaskDto createTask(TaskDto taskDto, Long projectId) throws Exception {
        User currentUser = userService.getCurrentUser();
        Role currentUserRole = projectService.getCurrentUserRole(projectId);

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new Exception("Project not found"));
        if(currentUserRole == null) {
            throw new Exception("User does not have permission to create tasks in this project");
        }

        Task task = new Task();
        task.setTitle(taskDto.getTitle());
        task.setDescription(taskDto.getDescription() != null ? taskDto.getDescription() : "");
        task.setPriority(taskDto.getPriority() != null ? taskDto.getPriority() : 1);
        task.setProgress(0);
        task.setStatus(Status.IN_PROGRESS);
        task.setCreatedBy(currentUser);
//        task.setDeadline(taskDto.getDeadline() != null ? taskDto.getDeadline() : new Date());

        task.setProject(project);
        if (taskDto.getParentId() != null) {
            Task parentTask = taskRepository.findById(taskDto.getParentId())
                    .orElseThrow(() -> new Exception("Parent task not found"));
            task.setParent(parentTask);


            if(taskDto.getDeadline().after(parentTask.getDeadline())){
                throw new Exception("Deadline cannot be after the parent task's deadline");
            } else {
                task.setDeadline(taskDto.getDeadline());
            }

            task.setLevel(task.getParent().getLevel() +1);
        } else{
            task.setLevel(1);
        }

        if(taskDto.getDeadline() != null && taskDto.getDeadline().after(project.getEndDate())){
            throw new Exception("Deadline cannot be after the project's end date");
        } else {
            task.setDeadline(taskDto.getDeadline());
        }

        task = taskRepository.save(task);

        if(currentUserRole == Role.MEMBER){
            List<User> users = new ArrayList<>();
            users.add(currentUser);
            task.setAssignedUsers(users);
        } else{
            List<User> assignedUsers = new ArrayList<>();
            List<UserDto> userDtos = taskDto.getAssignedUsers();
            if(userDtos != null && !userDtos.isEmpty()){
                for (UserDto userDto : userDtos) {
                    User user = userRepository.findById(userDto.getId())
                            .orElseThrow(() -> new Exception("User not found: " + userDto.getId()));
                    assignedUsers.add(user);

                    notificationService.createNotification(
                            "You have been assigned to task: " + task.getTitle(),
                            NotificationType.TASK_ASSIGNED,
                            user.getId(),
                            task.getId(),
                            "Task"
                    );
                }
            }
            task.setAssignedUsers(assignedUsers);
        }

        notificationService.createNotification(
                "New task created: " + task.getTitle(),
                NotificationType.TASK_ASSIGNED,
                currentUser.getId(),
                task.getId(),
                "Task"
        );
        userActivityService.logActivity(
                currentUser.getId(),
                "Created task: " + task.getTitle(),
                "Task",
                task.getId(),
                ActivityType.CREATED_TASK
        );

        task = taskRepository.save(task);

        return getTaskById(task.getId());
    }

    public TaskDto getTaskById(Long taskId) throws Exception {

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new Exception("Task not found"));

        Role currentUserRole = projectService.getCurrentUserRole(task.getProject().getId());
        if(currentUserRole == null) {
            throw new Exception("User does not have permission to view this task");
        }

        updateOverdueTask(task);

        TaskDto taskDto = new TaskDto();

        taskDto.setId(task.getId());
        taskDto.setTitle(task.getTitle());
        taskDto.setDescription(task.getDescription());
        taskDto.setPriority(task.getPriority());
//        taskDto.setProgress(task.getProgress());

        Integer intProgress = calculateTaskProgress(task.getId()).intValue();
        taskDto.setProgress(intProgress < 100 ? intProgress + 1 : intProgress);

        taskDto.setLevel(task.getLevel());
//        taskDto.setStatus(task.getStatus());

        if(taskDto.getProgress() == 100 && task.getStatus() != Status.COMPLETED && task.getStatus() != Status.OVERDUE) {
            task.setStatus(Status.COMPLETED);
            task = taskRepository.save(task);
        }
        taskDto.setStatus(task.getStatus());

        taskDto.setCreatedById(task.getCreatedBy().getId());
        taskDto.setProjectId(task.getProject().getId());
        taskDto.setParentId(task.getParent() != null ? task.getParent().getId() : null);
        taskDto.setDeadline(task.getDeadline());

        List<UserDto> assignedUsers = new ArrayList<>();
        Set<Long> assignedUserIds = getAllAssignedUserIds(taskDto.getId());
        for(Long id : assignedUserIds){
            UserDto user = userRepository.findUserDtoById(id);
            assignedUsers.add(user);
        }

        taskDto.setAssignedUsers(assignedUsers);

        return taskDto;
    }

    public Double calculateTaskProgress(Long taskId){
        Double totalWeightScore = 0D;
        Double totalProgress = 0D;
        Task task = taskRepository.findById(taskId).get();
        List<Task> subTasks = taskRepository.findByParentId(taskId);
        if(subTasks == null || subTasks.isEmpty()) {
            return (double) task.getProgress(); // No sub-tasks, return 100% progress
        }
        for(Task subTask: subTasks){
            Double weightScore = (double) subTask.getPriority() / (double) subTask.getLevel();
            totalWeightScore += weightScore;
            totalProgress += weightScore * calculateTaskProgress(subTask.getId()) /100;
        }
        Double progress = totalProgress / totalWeightScore * 100;
        Integer intProgress = progress.intValue();
        task.setProgress(intProgress < 100 ? intProgress + 1 : intProgress);
        taskRepository.save(task);

        return progress;
    }

    public Set<Long> getAllAssignedUserIds(Long taskId) {
        Set<Long> userIds = new HashSet<>();
        Deque<Long> stack = new ArrayDeque<>();
        stack.push(taskId);

        while (!stack.isEmpty()) {
            Long currentId = stack.pop();
            Task task = taskRepository.findById(currentId)
                    .orElseThrow(() -> new RuntimeException("Task not found: " + currentId));

            if (task.getAssignedUsers() != null) {
                task.getAssignedUsers().forEach(user -> userIds.add(user.getId()));
            }

            List<Task> subTasks = taskRepository.findByParentId(currentId);
            for (Task subTask : subTasks) {
                stack.push(subTask.getId());
            }
        }
        List<User> users = new ArrayList<>();
        for(Long userId : userIds) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found: " + userId));
            users.add(user);
        }
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found: " + taskId));
        task.setAssignedUsers(users);
        taskRepository.save(task);

        return userIds;
    }

    public TaskDto getTaskByIdForController(Long taskId) throws Exception {
        TaskDto taskDto = getTaskById(taskId);

        taskInteractionService.createTaskInteraction(taskRepository.findById(taskId).get());

        return taskDto;
    }

    public void updateOverdueTask(Task task) {
        Date now = new Date();
        if (task.getDeadline().before(now)
                && task.getStatus() != Status.COMPLETED
                && task.getStatus() != Status.OVERDUE
                && task.getStatus() != Status.CANCELED) {
            task.setStatus(Status.OVERDUE);

            for(User user : task.getAssignedUsers()){
            notificationService.createNotification(
               "Task " + task.getTitle() + " is overdue",
                NotificationType.TASK_UPDATED,
                user.getId(),
                task.getId(),
                "Task"
            );
        }
        }
        taskRepository.save(task);   

    }

    public TaskDto checkTaskDone(Long id) throws Exception{
        Task task = taskRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Task not found"));

        Queue<Task> tasks = new LinkedList<>();

        tasks.add(task);
        while(!tasks.isEmpty()){
            List<Task> subTasks = taskRepository.findByParentId(tasks.peek().getId());
            tasks.addAll(subTasks);

            Task currentTask = tasks.peek();
            if (currentTask != null && currentTask.getStatus() != Status.COMPLETED
                    && currentTask.getStatus() != Status.OVERDUE) {
                currentTask.setStatus(Status.COMPLETED);
                currentTask.setProgress(100);
            }
            currentTask.setProgress(100);
            taskRepository.save(currentTask);

            tasks.poll();
        }

        for(User user : task.getAssignedUsers()) {
            notificationService.createNotification(
                "Task " + task.getTitle() + " is completed",
                NotificationType.TASK_UPDATED,
                user.getId(),
                task.getId(),
                "Task"
            );
        }

        return getTaskById(task.getId());
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
        List<TaskDto> tasks = taskRepository.findAllTasksDtoByProjectIdAndUserId(projectId, userId);
        for (TaskDto taskDto : tasks) {
            Task task = taskRepository.findById(taskDto.getId()).orElse(null);
            if (task != null) {
                updateOverdueTask(task);
            }
        }
        return taskRepository.findAllTasksDtoByProjectIdAndUserId(projectId, userId);
    }

    public TaskDto updateTask(Long id, TaskDto taskDto) throws Exception {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new Exception("Task not found"));

        Role currentUserRole = projectService.getCurrentUserRole(task.getProject().getId());

        if(currentUserRole == null) {
            throw new Exception("User does not have permission to update this task");
        }

        User currentUser = userService.getCurrentUser();
        if ((!task.getCreatedBy().getId().equals(currentUser.getId()) && currentUserRole == Role.MEMBER)
            || (currentUserRole != Role.LEADER && currentUserRole != Role.VICE_LEADER)) {
            throw new Exception("Only the creator and managers can update the task");
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
                currentUser.getId(),
                task.getId(),
                "Task"
        );
        userActivityService.logActivity(
                currentUser.getId(),
                "Updated task: " + task.getTitle(),
                "Task",
                task.getId(),
                ActivityType.UPDATED_TASK
        );

        return getTaskById(task.getId());
    }

    public void deleteTask(Long taskId) throws Exception {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new Exception("Task not found"));

        Role currentUserRole = projectService.getCurrentUserRole(task.getProject().getId());
        User currentUser = userService.getCurrentUser();
        if(currentUserRole == null ) {
            throw new Exception("User does not have permission to delete this task");
        }
        if((!currentUserRole.equals(Role.LEADER) && !currentUserRole.equals(Role.VICE_LEADER))
            || currentUser.getId().equals(task.getCreatedBy().getId())){
            throw new Exception("User does not have permission to delete this task");
        }

        List<User> assignees = task.getAssignedUsers();
        for(User user : assignees){
            notificationService.createNotification(
                    "Deleted task " + task.getTitle(),
                    NotificationType.TASK_DELETED,
                    user.getId(),
                    task.getId(),
                    "Task"
            );

        }
        userActivityService.logActivity(
                currentUser.getId(),
                "Deleted task " + task.getTitle(),
                "Task",
                taskId,
                ActivityType.DELETED_TASK
        );


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
                "Task status updated: " + task.getTitle() + " to " + status,
                NotificationType.TASK_UPDATED,
                currentUser.getId(),
                task.getId(),
                "Task"
        );
        userActivityService.logActivity(
                currentUser.getId(),
                "Task status updated " + task.getTitle(),
                "Task",
                task.getId(),
                ActivityType.UPDATED_TASK
        );

        return getTaskById(task.getId());
    }

    public List<TaskDto> getTasksNearDeadline() {
        User currentUser = userService.getCurrentUser();
        List<TaskDto> tasks = taskRepository.findAllTasksDtoByUserId(currentUser.getId());
        List<TaskDto> nearDeadlineTasks = new ArrayList<>();
        long twelveHoursInMillis = 12 * 60 * 60 * 1000L;
        Date now = new Date();
        for (TaskDto task : tasks) {
            if (task.getDeadline() != null) {
                long diff = task.getDeadline().getTime() - now.getTime();
                if (diff > 0 && diff <= twelveHoursInMillis) {
                    nearDeadlineTasks.add(task);
                }
            }
        }
        return nearDeadlineTasks;
    }

    public List<UserDto> addAssignedUserToTask(Long taskId, Long userId) throws Exception {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new Exception("Task not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new Exception("User not found"));

        Role role = projectService.getCurrentUserRole(task.getProject().getId());

        if(!role.equals(Role.LEADER) && !role.equals(Role.VICE_LEADER)) {
            throw new Exception("You do not have permission to assign users to this task");
        }

        // Check if the user is already assigned
        if (task.getAssignedUsers().stream().anyMatch(u -> u.getId().equals(userId))) {
            throw new Exception("User is already assigned to this task");
        }

        // Add user to assigned users
        task.getAssignedUsers().add(user);
        taskRepository.save(task);

        notificationService.createNotification(
                "You have been assigned to task: " + task.getTitle(),
                NotificationType.TASK_ASSIGNED,
                user.getId(),
                task.getId(),
                "Task"
        );

        return getTaskById(taskId).getAssignedUsers();
    }

    public List<UserDto> removeAssignedUserFromTask(Long taskId, Long userId) throws Exception {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new Exception("Task not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new Exception("User not found"));

        Role role = projectService.getCurrentUserRole(task.getProject().getId());

        if(!role.equals(Role.LEADER) && !role.equals(Role.VICE_LEADER)) {
            throw new Exception("You do not have permission to remove users from this task");
        }

        // Check if the user is assigned
        if (!task.getAssignedUsers().stream().anyMatch(u -> u.getId().equals(userId))) {
            throw new Exception("User is not assigned to this task");
        }

        // Remove user from assigned users
        task.getAssignedUsers().removeIf(u -> u.getId().equals(userId));
        taskRepository.save(task);

        notificationService.createNotification(
                "You have been removed from task: " + task.getTitle(),
                NotificationType.TASK_UPDATED,
                user.getId(),
                task.getId(),
                "Task"
        );

        return getTaskById(taskId).getAssignedUsers();
    }

    /**
     * Enhanced method to get user-related tasks with filtering, searching, and sorting
     */
    public Page<TaskDto> getUserTasksWithFilters(
            String search, String status, Long projectId, Boolean dueSoon,
            int page, int size, String sort) throws Exception {
        
        User currentUser = userService.getCurrentUser();
        
        // Parse status
        Status statusEnum = parseStatus(status);
        
        // Calculate due soon threshold (12 hours from now)
        Date dueSoonThreshold = null;
        if (dueSoon != null && dueSoon) {
            dueSoonThreshold = new Date(System.currentTimeMillis() + 12 * 60 * 60 * 1000); // 12 hours
        }
        
        // Create Pageable with sorting
        Pageable pageable = createPageable(page, size, sort);
        
        // Get tasks from repository
        Page<Task> taskPage = taskRepository.findUserTasksWithFilters(
                currentUser.getId(), search, statusEnum, projectId, dueSoon, dueSoonThreshold, pageable);
        
        // Convert to DTO
        return taskPage.map(this::convertToDto);
    }

    /**
     * Get tasks created by the current user
     */
    public Page<TaskDto> getCreatedTasksWithFilters(
            String search, String status, Long projectId, Boolean dueSoon,
            int page, int size, String sort) throws Exception {
        
        User currentUser = userService.getCurrentUser();
        Status statusEnum = parseStatus(status);
        
        Date dueSoonThreshold = null;
        if (dueSoon != null && dueSoon) {
            dueSoonThreshold = new Date(System.currentTimeMillis() + 12 * 60 * 60 * 1000);
        }
        
        Pageable pageable = createPageable(page, size, sort);
        
        Page<Task> taskPage = taskRepository.findCreatedTasksWithFilters(
                currentUser.getId(), search, statusEnum, projectId, dueSoon, dueSoonThreshold, pageable);
        
        return taskPage.map(this::convertToDto);
    }

    /**
     * Get tasks assigned to the current user
     */
    public Page<TaskDto> getAssignedTasksWithFilters(
            String search, String status, Long projectId, Boolean dueSoon,
            int page, int size, String sort) throws Exception {
        
        User currentUser = userService.getCurrentUser();
        Status statusEnum = parseStatus(status);
        
        Date dueSoonThreshold = null;
        if (dueSoon != null && dueSoon) {
            dueSoonThreshold = new Date(System.currentTimeMillis() + 12 * 60 * 60 * 1000);
        }
        
        Pageable pageable = createPageable(page, size, sort);
        
        Page<Task> taskPage = taskRepository.findAssignedTasksWithFilters(
                currentUser.getId(), search, statusEnum, projectId, dueSoon, dueSoonThreshold, pageable);
        
        return taskPage.map(this::convertToDto);
    }

    /**
     * Get task statistics for the current user
     */
    public TaskStatsDto getUserTaskStats() throws Exception {
        User currentUser = userService.getCurrentUser();
        Date dueSoonThreshold = new Date(System.currentTimeMillis() + 12 * 60 * 60 * 1000);
        
        Long totalTasks = taskRepository.countUserTasks(currentUser.getId());
        Long dueSoonTasks = taskRepository.countUserTasksDueSoon(currentUser.getId(), dueSoonThreshold);
        
        return new TaskStatsDto(totalTasks, dueSoonTasks);
    }

    /**
     * Helper method to parse status string to Status enum
     */
    private Status parseStatus(String status) {
        if (status == null || status.trim().isEmpty()) {
            return null;
        }
        
        try {
            // Handle both formats: "IN_PROGRESS" and "in_progress"
            String upperStatus = status.toUpperCase().replace(" ", "_");
            return Status.valueOf(upperStatus);
        } catch (IllegalArgumentException e) {
            return null; // Invalid status, ignore filter
        }
    }

    /**
     * Helper method to create Pageable with sorting
     */
    private Pageable createPageable(int page, int size, String sort) {
        if (sort == null || sort.trim().isEmpty()) {
            return PageRequest.of(page, size, Sort.by("createdAt").descending());
        }
        
        try {
            String[] sortParts = sort.split(",");
            String field = sortParts[0];
            String direction = sortParts.length > 1 ? sortParts[1] : "asc";
            
            // Map frontend fields to entity fields
            String entityField = mapSortField(field);
            
            Sort.Direction sortDirection = "desc".equalsIgnoreCase(direction) 
                ? Sort.Direction.DESC 
                : Sort.Direction.ASC;
            
            return PageRequest.of(page, size, Sort.by(sortDirection, entityField));
        } catch (Exception e) {
            // Default sorting if parse fails
            return PageRequest.of(page, size, Sort.by("createdAt").descending());
        }
    }

    /**
     * Helper method to map frontend sort fields to entity fields
     */
    private String mapSortField(String field) {
        return switch (field) {
            case "title" -> "title";
            case "deadline" -> "deadline";
            case "status" -> "status";
            case "priority" -> "priority";
            case "progress" -> "progress";
            case "project" -> "project.name";
            case "created" -> "createdAt";
            default -> "createdAt";
        };
    }

    /**
     * Helper method to convert Task entity to TaskDto
     */
    private TaskDto convertToDto(Task task) {
        TaskDto dto = new TaskDto();
        dto.setId(task.getId());
        dto.setTitle(task.getTitle());
        dto.setDescription(task.getDescription());
        dto.setPriority(task.getPriority());
        dto.setLevel(task.getLevel());
        dto.setProgress(task.getProgress());
        dto.setStatus(task.getStatus());
        dto.setDeadline(task.getDeadline());
        
        if (task.getCreatedBy() != null) {
            dto.setCreatedById(task.getCreatedBy().getId());
        }
        
        if (task.getProject() != null) {
            dto.setProjectId(task.getProject().getId());
        }
        
        if (task.getParent() != null) {
            dto.setParentId(task.getParent().getId());
        }
        
        // Convert assigned users
        if (task.getAssignedUsers() != null) {
            List<UserDto> assignedUserDtos = task.getAssignedUsers().stream()
                .map(user -> {
                    UserDto userDto = new UserDto();
                    userDto.setId(user.getId());
                    userDto.setFirstName(user.getFirstName());
                    userDto.setLastName(user.getLastName());
                    userDto.setEmail(user.getEmail());
                    userDto.setPhoneNumber(user.getPhoneNumber());
                    userDto.setDob(user.getDob());
                    return userDto;
                })
                .toList();
            dto.setAssignedUsers(assignedUserDtos);
        }
        
        return dto;
    }

    /**
     * Assign task to users
     */
    public TaskDto assignTask(Long taskId, List<Long> userIds) throws Exception {
        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new Exception("Task not found"));
        
        User currentUser = userService.getCurrentUser();
        
        // Check if current user has permission to assign tasks
        if (!task.getCreatedBy().getId().equals(currentUser.getId())) {
            throw new Exception("You don't have permission to assign this task");
        }
        
        // Clear existing assignments
        task.getAssignedUsers().clear();
        
        // Add new assignments
        for (Long userId : userIds) {
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new Exception("User not found: " + userId));
            task.getAssignedUsers().add(user);
        }
        
        task = taskRepository.save(task);
        
        // Send notifications to assigned users
        for (User assignedUser : task.getAssignedUsers()) {
            if (!assignedUser.getId().equals(currentUser.getId())) {
                notificationService.createNotification(
                    "Bạn được giao nhiệm vụ: " + task.getTitle(),
                    NotificationType.TASK_ASSIGNED,
                    assignedUser.getId(),
                    task.getId(),
                    "Task"
                );
            }
        }
        
        return convertToDto(task);
    }
    
    /**
     * Update task progress
     */
    public TaskDto updateTaskProgress(Long taskId, Integer progress) throws Exception {
        Task task = taskRepository.findById(taskId)
            .orElseThrow(() -> new Exception("Task not found"));
        
        User currentUser = userService.getCurrentUser();
        
        // Check if current user has permission to update progress
        if (!task.getCreatedBy().getId().equals(currentUser.getId()) && 
            !task.getAssignedUsers().contains(currentUser)) {
            throw new Exception("You don't have permission to update progress for this task");
        }
        
        // Validate progress value
        if (progress < 0 || progress > 100) {
            throw new Exception("Progress must be between 0 and 100");
        }
        
        task.setProgress(progress);
        
        // Auto-update status based on progress
        if (progress == 0) {
            task.setStatus(Status.NOT_STARTED);
        } else if (progress == 100) {
            task.setStatus(Status.COMPLETED);
        } else if (task.getStatus() == Status.NOT_STARTED) {
            task.setStatus(Status.IN_PROGRESS);
        }
        
        task = taskRepository.save(task);
        return convertToDto(task);
    }
    
    /**
     * Get recent tasks for current user (using TaskInteraction tracking)
     */
    public List<TaskDto> getRecentTasks() throws Exception {
        User currentUser = userService.getCurrentUser();

        List<TaskInteraction> interactions = taskInteractionService.getTaskInteractions();
        if (interactions.isEmpty()) {
            return new ArrayList<>(); // No recent tasks
        }


        Set<Long> seenTaskIds = new HashSet<>(); // Track seen task IDs to avoid duplicates
        List<TaskDto> taskDtos = new ArrayList<>();
        int count = 0;
        
        for (TaskInteraction interaction : interactions) {
            Task task = interaction.getTask();
            if (task != null && !seenTaskIds.contains(task.getId()) && 
                (task.getCreatedBy().getId().equals(currentUser.getId()) || 
                 task.getAssignedUsers().stream().anyMatch(user -> user.getId().equals(currentUser.getId())))) {
                try {
                    TaskDto taskDto = getTaskById(task.getId());
                    taskDtos.add(taskDto);
                    seenTaskIds.add(task.getId()); // Mark this task as seen
                    count++;
                    if (count >= 10) break; // Limit to 10 recent tasks
                } catch (Exception e) {
                    // Ignore tasks that cannot be retrieved
                }
            }
        }

        return taskDtos;
    }

    /**
     * Helper class for task statistics
     */
    public static class TaskStatsDto {
        private Long totalTasks;
        private Long dueSoonTasks;
        
        public TaskStatsDto(Long totalTasks, Long dueSoonTasks) {
            this.totalTasks = totalTasks;
            this.dueSoonTasks = dueSoonTasks;
        }
        
        // Getters and setters
        public Long getTotalTasks() { return totalTasks; }
        public void setTotalTasks(Long totalTasks) { this.totalTasks = totalTasks; }
        public Long getDueSoonTasks() { return dueSoonTasks; }
        public void setDueSoonTasks(Long dueSoonTasks) { this.dueSoonTasks = dueSoonTasks; }
    }

    public List<TaskDto> getTaskHierarchy(Long taskId) throws Exception {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new Exception("Task not found"));
        Long ancestorTaskId = getAncestorTaskId(taskId);

        Task ancestorTask = taskRepository.findById(ancestorTaskId)
                .orElseThrow(() -> new Exception("Ancestor task not found"));
        List<TaskDto> taskHierarchy = new ArrayList<>();
        buildTaskHierarchy(ancestorTask, taskHierarchy);
        return taskHierarchy;
    }

    public Long getAncestorTaskId(Long taskId) throws Exception {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new Exception("Task not found"));

        while (task.getParent() != null) {
            task = task.getParent();
        }
        return task.getId();
    }

    private void buildTaskHierarchy(Task task, List<TaskDto> taskHierarchy) {
        TaskDto taskDto = new TaskDto();
        try{
            taskDto = getTaskById(task.getId());
        } catch (Exception e) {
            // Handle exception if task not found
            return;
        }

        if (task.getCreatedBy() != null) {
            taskDto.setCreatedById(task.getCreatedBy().getId());
        }

        if (task.getProject() != null) {
            taskDto.setProjectId(task.getProject().getId());
        }

        if (task.getParent() != null) {
            taskDto.setParentId(task.getParent().getId());
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

        taskHierarchy.add(taskDto);

        List<Task> subTasks = taskRepository.findByParentId(task.getId());
        for (Task subTask : subTasks) {
            buildTaskHierarchy(subTask, taskHierarchy);
        }
    }

    // Dùng cho REPORT: không side-effect, không permission check, không save.
    @Transactional(readOnly = true)
    public List<TaskDto> getTaskHierarchyForReport(Long rootTaskId) throws Exception {
        Task root = taskRepository.findById(rootTaskId)
                .orElseThrow(() -> new Exception("Task not found"));

        // Nếu vẫn muốn giữ 1 check quyền nhẹ:
        Role role = projectService.getCurrentUserRole(root.getProject().getId());
        if (role == null) {
            throw new Exception("No permission to read this project");
        }

        List<TaskDto> list = new ArrayList<>();
        buildTaskHierarchyLite(root, list);
        return list;
    }

    private void buildTaskHierarchyLite(Task task, List<TaskDto> out) {

        // Tự map sang DTO, KHÔNG gọi getTaskById()
        TaskDto dto = new TaskDto();
        dto.setId(task.getId());
        dto.setTitle(task.getTitle());
        dto.setDescription(task.getDescription());
        dto.setPriority(task.getPriority());
        dto.setLevel(task.getLevel());
        dto.setProgress(task.getProgress());   // giữ nguyên, không tính lại
        dto.setStatus(task.getStatus());
        dto.setDeadline(task.getDeadline());
        if (task.getCreatedBy() != null) dto.setCreatedById(task.getCreatedBy().getId());
        if (task.getProject() != null)   dto.setProjectId(task.getProject().getId());
        if (task.getParent() != null)    dto.setParentId(task.getParent().getId());

        // map assigned users (chỉ đọc)
        if (task.getAssignedUsers() != null) {
            List<UserDto> users = new ArrayList<>();

            for (User user : task.getAssignedUsers()) {
                if (user != null) { // tránh NullPointerException nếu có phần tử null
                    UserDto ud = new UserDto();
                    ud.setId(user.getId());
                    ud.setFirstName(user.getFirstName());
                    ud.setLastName(user.getLastName());
                    ud.setEmail(user.getEmail());
                    ud.setPhoneNumber(user.getPhoneNumber());
                    ud.setDob(user.getDob());
                    users.add(ud);
                }
            }

            dto.setAssignedUsers(users);
        }

        out.add(dto);

        // duyệt con
        List<Task> children = taskRepository.findByParentId(task.getId());
        for (Task child : children) {
            buildTaskHierarchyLite(child, out);
        }
    }


}