package personal.project.teamwork_management.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import personal.project.teamwork_management.dto.MemberDto;
import personal.project.teamwork_management.dto.ProjectDto;
import personal.project.teamwork_management.model.*;
import personal.project.teamwork_management.repository.ProjectMemberRepository;
import personal.project.teamwork_management.repository.ProjectRepository;
import personal.project.teamwork_management.repository.TaskRepository;
import personal.project.teamwork_management.repository.UserRepository;

import java.util.*;

@Service
public class ProjectService {

    @Autowired
    private ProjectRepository projectRepository;
    @Autowired
    private UserService userService;
    @Autowired
    private ProjectMemberRepository projectMemberRepository;
    @Autowired
    private TaskRepository taskRepository;
    @Autowired
    private ProjectInteractionService projectInteractionService;
    @Autowired
    private NotificationService notificationService;
    @Autowired
    private UserActivityService userActivityService;
    @Autowired
    private ProjectLogService projectLogService;
    @Autowired
    private UserRepository userRepository;

    public Role getCurrentUserRole(Long projectId) {
        User currentUser = userService.getCurrentUser();
        if (currentUser == null) {
            throw new RuntimeException("Current user not found");
        }
        Role role = projectMemberRepository.findRoleByProjectIdAndUserId(projectId, currentUser.getId());
        return role;
    }

    public ProjectDto getProjectById(Long id) throws Exception {
        Role currentUserRole = getCurrentUserRole(id);
        if(currentUserRole == null){
            throw new Exception("Current user does not have permission to view this project");
        }

        
        ProjectDto projectDto = projectRepository.findProjectDtoById(id);
        
        if (projectDto == null) {
            throw new Exception("Project not found with id: " + id);
        }
        Long longProgress = calculateProjectProgress(id).longValue();
        projectDto.setProgress(longProgress < 100 ? longProgress + 1 : longProgress);
        projectDto.setMembers(projectMemberRepository.findAllMembersByProjectId(id));
        projectDto.setTasks(taskRepository.findAllTasksDtoByProjectId(id));

        Date now = new Date();
        if (projectDto.getStatus() == Status.NOT_STARTED && 
            projectDto.getStartDate() != null && 
            now.compareTo(projectDto.getStartDate()) >= 0) {
            projectDto.setStatus(Status.IN_PROGRESS);
            activeProject(projectDto.getId());
        }

        projectLogService.log(
                ProjectAction.READ,
                projectDto.getId(),
                "Project viewed by user: " + SecurityContextHolder.getContext().getAuthentication().getName(),
                projectDto.getProgress(),
                projectDto.getStatus()
        );

        return projectDto;
    }

    public Double calculateProjectProgress(Long projectId){
        Project project = projectRepository.findById(projectId).get();
        List<Task> levelOneTask = taskRepository.findByProjectIdAndLevel(projectId, 1);
        Double totalWeightScore = 0D;
        Double totalProgress = 0D;
        for(Task task : levelOneTask){
            Double weightScore = (double) task.getPriority();
            totalWeightScore += weightScore;
            totalProgress += weightScore * calculateTaskProgress(task.getId()) /100;
        }
        Double progress = totalProgress / totalWeightScore * 100;
        Long longProgress = progress.longValue();
        project.setProgress(longProgress < 100 ? longProgress + 1 : longProgress);
        projectRepository.save(project);
        return progress;

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

    public ProjectDto getProjectByIdForController(Long id) throws Exception {
        ProjectDto projectDto = getProjectById(id);

        try {
            projectInteractionService.createProjectInteraction(projectRepository.findById(id).get());
        } catch (Exception e) {
            // Log but don't fail the main operation
            System.err.println("Could not create project interaction: " + e.getMessage());
        }

        return projectDto;
    }

    public Project activeProject(Long id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found with id: " + id));

        project.setStatus(Status.IN_PROGRESS);

        projectLogService.log(
                ProjectAction.STATUS_CHANGED,
                project.getId(),
                "Project status changed to IN_PROGRESS by user: " + userService.getCurrentUser().getEmail(),
                project.getProgress(),
                project.getStatus()
        );

        return projectRepository.save(project);
    }

    public Project updateStatus(Long id, Status status) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found with id: " + id));

        Role currentUserRole = getCurrentUserRole(id);
        if (currentUserRole == null || (!currentUserRole.equals(Role.LEADER) && !currentUserRole.equals(Role.VICE_LEADER))) {
            throw new RuntimeException("Current user does not have permission to update this project");
        }

        project.setStatus(status);

        projectLogService.log(
                ProjectAction.STATUS_CHANGED,
                project.getId(),
                "Project status changed to " + status + " by user: " + userService.getCurrentUser().getEmail(),
                project.getProgress(),
                project.getStatus()
        );

        return projectRepository.save(project);
    }

    public ProjectDto createProject(ProjectDto projectDto) {

        User currentUser = userService.getCurrentUser();
        if (currentUser == null) {
            throw new RuntimeException("Current user not found");
        }

        Project project = new Project();

        project.setName(projectDto.getName());
        project.setDescription(projectDto.getDescription());
        project.setProgress(0L);
        project.setStatus(Status.NOT_STARTED);
        project.setStartDate(projectDto.getStartDate());
        project.setEndDate(projectDto.getEndDate());

        ProjectMember member = new ProjectMember(
                project,
                currentUser,
                Role.LEADER
        );

        List<ProjectMember> members = project.getMembers();

        if(members == null || members.isEmpty()) {
            members = new ArrayList<>();
        }
        members.add(member);
        project.setMembers(members);

        project = projectRepository.save(project);

        // Log project creation
        userActivityService.logActivity(
                currentUser.getId(),
                "Created project: " + project.getName(),
                "Project",
                project.getId(),
                ActivityType.CREATED_PROJECT
        );

        projectLogService.log(
                ProjectAction.CREATED,
                project.getId(),
                "Project created by user: " + currentUser.getEmail(),
                project.getProgress(),
                project.getStatus()
        );

        return projectRepository.findProjectDtoById(project.getId());
    }

    public ProjectDto updateProject(Long id, ProjectDto projectDto) {
        // Tìm dự án hiện tại
        Project existingProject = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found with id: " + id));

        Role currentUserRole = getCurrentUserRole(id);
        if (currentUserRole == null || (!currentUserRole.equals(Role.LEADER) && !currentUserRole.equals(Role.VICE_LEADER) )) {
            throw new RuntimeException("Current user does not have permission to update this project");
        }

        // Cập nhật thông tin dự án
        existingProject.setName(projectDto.getName());
        existingProject.setDescription(projectDto.getDescription());
        existingProject.setProgress(projectDto.getProgress());
        if(projectDto.getStartDate() != null)
            existingProject.setStartDate(projectDto.getStartDate());
        if(projectDto.getEndDate() != null)
            existingProject.setEndDate(projectDto.getEndDate());

        // Lưu dự án đã cập nhật vào cơ sở dữ liệu
        projectRepository.save(existingProject);

        userActivityService.logActivity(
                userService.getCurrentUser().getId(),
                "Updated project: " + existingProject.getName(),
                "Project",
                existingProject.getId(),
                ActivityType.UPDATED_PROJECT
        );
        List<ProjectMember> members = existingProject.getMembers();
        for(ProjectMember member : members) {
            notificationService.createNotification(
                    "Project Updated " + existingProject.getName(),
                    NotificationType.PROJECT_UPDATED,
                    member.getUser().getId(),
                    existingProject.getId(),
                    "Project"
            );
        }

        projectLogService.log(
                ProjectAction.UPDATED,
                existingProject.getId(),
                "Project updated by user: " + userService.getCurrentUser().getEmail(),
                existingProject.getProgress(),
                existingProject.getStatus()
        );

        // Trả về ProjectDto đã cập nhật
        return projectRepository.findProjectDtoById(id);
    }

    public void deleteProject(Long id) {
        Role currentUserRole = getCurrentUserRole(id);
        if (currentUserRole == null || !currentUserRole.equals(Role.LEADER) ) {
            throw new RuntimeException("Current user does not have permission to delete this project");
        }

        userActivityService.logActivity(
                userService.getCurrentUser().getId(),
                "Deleted project with id: " + id,
                "Project",
                id,
                ActivityType.DELETED_PROJECT
        );
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found with id: " + id));
        // Gửi thông báo cho tất cả thành viên dự án
        for (ProjectMember member : project.getMembers()) {
            notificationService.createNotification(
                    "Project Deleted: " + project.getName(),
                    NotificationType.PROJECT_DELETED,
                    member.getUser().getId(),
                    project.getId(),
                    "Project"
            );
        }

        // Xóa dự án theo ID
        List<ProjectMember> projectMembers = projectMemberRepository.findAllByProjectId(id);
        projectMemberRepository.deleteAll(projectMembers);
        projectRepository.deleteById(id);
    }

    public List<MemberDto> changeProjectLeader(Long projectId, Long newLeaderId) {
        Role currentUserRole = getCurrentUserRole(projectId);
        if (currentUserRole == null || !currentUserRole.equals(Role.LEADER)) {
            throw new RuntimeException("Current user does not have permission to change the project leader");
        }

        ProjectMember oldLeader = projectMemberRepository.findLeaderByProjectId(projectId);
        if (oldLeader != null && !oldLeader.getId().equals(newLeaderId)) {
            oldLeader.setRole(Role.MEMBER);
            projectMemberRepository.save(oldLeader);
        }

        ProjectMember newLeader = projectMemberRepository.findById(newLeaderId)
                .orElseThrow(() -> new RuntimeException("New leader not found with id: " + newLeaderId));
        newLeader.setRole(Role.LEADER);
        projectMemberRepository.save(newLeader);

        return projectMemberRepository.findAllMembersByProjectId(projectId);
    }

    public List<MemberDto> addMemberToProject(Long projectId, Long userId) {
        Role currentUserRole = getCurrentUserRole(projectId);
        if (currentUserRole == null || (!currentUserRole.equals(Role.LEADER) && !currentUserRole.equals(Role.VICE_LEADER))) {
            throw new RuntimeException("Current user does not have permission to add members to this project");
        }

        Optional<ProjectMember> projectMember = projectMemberRepository.findByProjectIdAndUserId(projectId, userId);
        if(projectMember.isPresent()) {
            throw new RuntimeException("User is already a member of this project");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found with id: " + projectId));

        ProjectMember member = new ProjectMember();
        member.setProject(project);
        member.setUser(user);
        member.setRole(Role.MEMBER);

        projectMemberRepository.save(member);

        return projectMemberRepository.findAllMembersByProjectId(projectId);
    }

    public Page<ProjectDto> getAllProjects(int page, int size) {
        User currentUser = userService.getCurrentUser();
        if (currentUser == null) {
            throw new RuntimeException("Current user not found");
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by("startDate").descending());

        Page<ProjectDto> projectPage = projectRepository.findAllProjectsDtoByUserId(currentUser.getId(), pageable);

        projectPage.forEach(project -> {
            project.setMembers(projectMemberRepository.findAllMembersByProjectId(project.getId()));
            project.setTasks(taskRepository.findAllTasksDtoByProjectId(project.getId()));
        });

        return projectPage;
    }

    public void updateProjectStatus(Long projectId, Status status) {
        Role currentUserRole = getCurrentUserRole(projectId);
        if (currentUserRole == null || (!currentUserRole.equals(Role.LEADER) && !currentUserRole.equals(Role.VICE_LEADER))) {
            throw new RuntimeException("Current user does not have permission to update this project");
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found with id: " + projectId));
        project.setStatus(status);
        project = projectRepository.save(project);

        projectLogService.log(
                ProjectAction.STATUS_CHANGED,
                project.getId(),
                "Project status changed to " + status + " by user: " + userService.getCurrentUser().getEmail(),
                project.getProgress(),
                project.getStatus()
        );

        userActivityService.logActivity(
                userService.getCurrentUser().getId(),
                "Updated project status to " + status + " for project: " + project.getName(),
                "Project",
                project.getId(),
                ActivityType.UPDATED_PROJECT
        );

        for(ProjectMember member : project.getMembers()){
            notificationService.createNotification(
                    "Project Status Updated: " + project.getName(),
                    NotificationType.PROJECT_UPDATED,
                    member.getUser().getId(),
                    project.getId(),
                    "Project"
            );
        }

    }

    public List<ProjectDto> getRecentProjects(){
        User currentUser = userService.getCurrentUser();
        if (currentUser == null) {
            throw new RuntimeException("Current user not found");
        }

        try {
            List<ProjectInteraction> interactions = projectInteractionService.getProjectInteractions();
            List<Long> projectIds = new ArrayList<>();
            List<ProjectDto> recentProjects = new ArrayList<>();
            int count = 0;
            
            if (interactions == null || interactions.isEmpty()) {
                return recentProjects; // Return empty list if no interactions
            }
            
            for (ProjectInteraction interaction : interactions) {
                Project project = interaction.getProject();
                if (project != null && !projectIds.contains(project.getId())) {
                    projectIds.add(project.getId());
                    ProjectDto projectDto = projectRepository.findProjectDtoById(project.getId());
                    
                    // Skip null projects (user might not have access)
                    if (projectDto != null) {
                        projectDto.setMembers(projectMemberRepository.findAllMembersByProjectId(project.getId()));
                        projectDto.setTasks(taskRepository.findAllTasksDtoByProjectId(project.getId()));
                        recentProjects.add(projectDto);
                        count++;
                        if (count >= 10) break;
                    }
                }
            }
            return recentProjects;
        } catch (Exception e) {
            // Log error and return empty list instead of throwing
            System.err.println("Error getting recent projects: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public List<MemberDto> promoteMemberToViceLeader(Long projectId, Long memberId) {
        Role currentUserRole = getCurrentUserRole(projectId);
        if (currentUserRole == null || (!currentUserRole.equals(Role.LEADER) && !currentUserRole.equals(Role.VICE_LEADER))) {
            throw new RuntimeException("Current user does not have permission to promote members in this project");
        }

        ProjectMember member = projectMemberRepository.findByIdAndProjectId(memberId, projectId)
                .orElseThrow(() -> new RuntimeException("Project member not found with id: " + memberId));


        member.setRole(Role.VICE_LEADER);
        projectMemberRepository.save(member);

        notificationService.createNotification(
                "You have been promoted to Vice Leader in project: " + member.getProject().getName(),
                NotificationType.PROJECT_UPDATED,
                member.getUser().getId(),
                member.getProject().getId(),
                "Project"
        );

        projectLogService.log(
                ProjectAction.UPDATED,
                member.getProject().getId(),
                "Member " + member.getUser().getEmail() + " promoted to Vice Leader by user: " + userService.getCurrentUser().getEmail(),
                member.getProject().getProgress(),
                member.getProject().getStatus()
        );

        userActivityService.logActivity(
                userService.getCurrentUser().getId(),
                "Promoted member " + member.getUser().getEmail() + " to Vice Leader in project: " + member.getProject().getName(),
                "Project",
                member.getProject().getId(),
                ActivityType.UPDATED_PROJECT_MEMBER
        );

        return projectMemberRepository.findAllMembersByProjectId(projectId);
    }

    public List<MemberDto> demoteViceLeaderToMember(Long projectId, Long memberId) {
        Role currentUserRole = getCurrentUserRole(projectId);
        if (currentUserRole == null || !currentUserRole.equals(Role.LEADER) ) {
            throw new RuntimeException("Current user does not have permission to demote members in this project");
        }

        ProjectMember member = projectMemberRepository.findByIdAndProjectId(memberId, projectId)
                .orElseThrow(() -> new RuntimeException("Project member not found with id: " + memberId));

        if (member.getRole() != Role.VICE_LEADER) {
            throw new RuntimeException("Only Vice Leaders can be demoted to Members");
        }

        member.setRole(Role.MEMBER);
        projectMemberRepository.save(member);

        notificationService.createNotification(
                "You have been demoted to Member in project: " + member.getProject().getName(),
                NotificationType.PROJECT_UPDATED,
                member.getUser().getId(),
                member.getProject().getId(),
                "Project"
        );

        projectLogService.log(
                ProjectAction.UPDATED,
                member.getProject().getId(),
                "Member " + member.getUser().getEmail() + " demoted to Member by user: " + userService.getCurrentUser().getEmail(),
                member.getProject().getProgress(),
                member.getProject().getStatus()
        );

        userActivityService.logActivity(
                userService.getCurrentUser().getId(),
                "Demoted Vice Leader " + member.getUser().getEmail() + " to Member in project: " + member.getProject().getName(),
                "Project",
                member.getProject().getId(),
                ActivityType.UPDATED_PROJECT_MEMBER
        );

        return projectMemberRepository.findAllMembersByProjectId(projectId);
    }

    public List<MemberDto> removeMember(Long projectId, Long memberId) {
        Role currentUserRole = getCurrentUserRole(projectId);

        ProjectMember member = projectMemberRepository.findByIdAndProjectId(memberId, projectId)
                .orElseThrow(() -> new RuntimeException("Project member not found with id: " + memberId));

        if (currentUserRole == null || (!currentUserRole.equals(Role.LEADER) && !currentUserRole.equals(Role.VICE_LEADER))) {
            throw new RuntimeException("Current user does not have permission to remove members from this project");
        }

        if(currentUserRole == Role.LEADER || (currentUserRole == Role.VICE_LEADER && member.getRole() == Role.MEMBER)) {

            List<Task> tasksWereAssignedForMember = taskRepository.findByUserIdAndProjectId(member.getUser().getId(), projectId);

            for(Task task : tasksWereAssignedForMember){
                List<User> assignedUsers = task.getAssignedUsers();
                assignedUsers.remove(member.getUser());
                task.setAssignedUsers(assignedUsers);

                taskRepository.save(task);
            }

            projectMemberRepository.delete(member);
        }

        notificationService.createNotification(
                "You have been removed from project: " + member.getProject().getName(),
                NotificationType.PROJECT_UPDATED,
                member.getUser().getId(),
                member.getProject().getId(),
                "Project"
        );

        projectLogService.log(
                ProjectAction.UPDATED,
                member.getProject().getId(),
                "Member " + member.getUser().getEmail() + " removed from project by user: " + userService.getCurrentUser().getEmail(),
                member.getProject().getProgress(),
                member.getProject().getStatus()
        );

        userActivityService.logActivity(
                userService.getCurrentUser().getId(),
                "Removed member " + member.getUser().getEmail() + " from project: " + member.getProject().getName(),
                "Project",
                member.getProject().getId(),
                ActivityType.UPDATED_PROJECT_MEMBER
        );

        return projectMemberRepository.findAllMembersByProjectId(projectId);
    }

    /**
     * Enhanced getAllProjects with filtering and sorting
     */
    public Page<ProjectDto> getAllProjects(int page, int size, String search, String status, String sortBy, String sortDirection) {
        User currentUser = userService.getCurrentUser();
        if (currentUser == null) {
            throw new RuntimeException("Current user not found");
        }

        Sort sort = createSort(sortBy, sortDirection);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<ProjectDto> projectPage;

        if ((search != null && !search.trim().isEmpty()) || (status != null && !status.trim().isEmpty())) {
            // Convert string status to Status enum
            Status statusEnum = parseStatus(status);
            // Use custom query with filters
            projectPage = projectRepository.findProjectsWithFilters(
                currentUser.getId(), search, statusEnum, pageable
            );
        } else {
            // Use existing method for backward compatibility
            projectPage = projectRepository.findAllProjectsDtoByUserId(currentUser.getId(), pageable);
        }

        // Populate members and tasks
        projectPage.forEach(project -> {
            project.setMembers(projectMemberRepository.findAllMembersByProjectId(project.getId()));
            project.setTasks(taskRepository.findAllTasksDtoByProjectId(project.getId()));
        });

        return projectPage;
    }

    /**
     * Get projects by role with filtering
     */
    public Page<ProjectDto> getProjectsByRole(int page, int size, String role, String search, String status, String sortBy, String sortDirection) {
        User currentUser = userService.getCurrentUser();
        if (currentUser == null) {
            throw new RuntimeException("Current user not found");
        }

        Sort sort = createSort(sortBy, sortDirection);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<ProjectDto> projectPage;
        Status statusEnum = parseStatus(status);

        if ("managed".equalsIgnoreCase(role)) {
            // Projects where user is LEADER or VICE_LEADER
            projectPage = projectRepository.findManagedProjectsWithFilters(
                currentUser.getId(), search, statusEnum, pageable
            );
        } else if ("member".equalsIgnoreCase(role)) {
            // Projects where user is MEMBER
            projectPage = projectRepository.findMemberProjectsWithFilters(
                currentUser.getId(), search, statusEnum, pageable
            );
        } else {
            // Default to all projects
            return getAllProjects(page, size, search, status, sortBy, sortDirection);
        }

        // Populate members and tasks
        projectPage.forEach(project -> {
            project.setMembers(projectMemberRepository.findAllMembersByProjectId(project.getId()));
            project.setTasks(taskRepository.findAllTasksDtoByProjectId(project.getId()));
        });

        return projectPage;
    }

    /**
     * Create sort object with field mapping
     */
    private Sort createSort(String sortBy, String sortDirection) {
        // Map frontend field names to entity field names
        String mappedField = mapSortField(sortBy);
        Sort.Direction direction = "desc".equalsIgnoreCase(sortDirection) ? 
            Sort.Direction.DESC : Sort.Direction.ASC;
        
        return Sort.by(direction, mappedField);
    }

    /**
     * Map frontend sort fields to entity fields
     */
    private String mapSortField(String field) {
        if (field == null || field.trim().isEmpty()) {
            return "name";
        }

        switch (field.toLowerCase()) {
            case "name":
                return "name";
            case "startdate":
            case "start_date":
                return "startDate";
            case "enddate":
            case "end_date":
                return "endDate";
            case "progress":
                return "progress";
            case "status":
                return "status";
            case "createdat":
            case "created_at":
                return "createdAt";
            case "updatedat":
            case "updated_at":
                return "updatedAt";
            default:
                return "name"; // Default fallback
        }
    }

    /**
     * Get project statistics
     */
    public Map<String, Object> getProjectStatistics() {
        User currentUser = userService.getCurrentUser();
        if (currentUser == null) {
            throw new RuntimeException("Current user not found");
        }

        Map<String, Object> stats = new HashMap<>();
        
        // Count projects by status
        List<Object[]> statusCounts = projectRepository.countProjectsByStatusForUser(currentUser.getId());
        Map<String, Long> statusStats = new HashMap<>();
        
        for (Object[] result : statusCounts) {
            String status = result[0].toString();
            Long count = ((Number) result[1]).longValue();
            statusStats.put(status, count);
        }
        
        stats.put("byStatus", statusStats);
        
        // Count projects by role
        Long managedCount = projectRepository.countManagedProjectsForUser(currentUser.getId());
        Long memberCount = projectRepository.countMemberProjectsForUser(currentUser.getId());
        
        stats.put("byRole", Map.of(
            "managed", managedCount,
            "member", memberCount
        ));
        
        // Total projects
        stats.put("total", managedCount + memberCount);
        
        return stats;
    }

    /**
     * Helper method to parse String status to Status enum
     */
    private Status parseStatus(String statusString) {
        if (statusString == null || statusString.trim().isEmpty()) {
            return null;
        }
        
        try {
            return Status.valueOf(statusString.toUpperCase());
        } catch (IllegalArgumentException e) {
            // Return null for invalid status strings
            return null;
        }
    }

}
