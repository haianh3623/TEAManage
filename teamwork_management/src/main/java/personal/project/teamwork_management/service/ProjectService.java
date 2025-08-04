package personal.project.teamwork_management.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import personal.project.teamwork_management.dto.ProjectDto;
import personal.project.teamwork_management.dto.ProjectMemberDto;
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

        projectDto.setMembers(projectMemberRepository.findAllMembersByProjectId(id));
        projectDto.setTasks(taskRepository.findAllTasksDtoByProjectId(id));

        Date now = new Date();
        if (projectDto.getStatus() == Status.NOT_STARTED && now.compareTo(projectDto.getStartDate()) >= 0) {
            projectDto.setStatus(Status.IN_PROGRESS);
            activeProject(projectDto.getId());
        }

        return projectDto;
    }

    public Project activeProject(Long id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found with id: " + id));

        project.setStatus(Status.IN_PROGRESS);
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

        projectRepository.save(project);
        return projectDto;
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
        existingProject.setStartDate(projectDto.getStartDate());
        existingProject.setEndDate(projectDto.getEndDate());

        // Lưu dự án đã cập nhật vào cơ sở dữ liệu
        projectRepository.save(existingProject);

        // Trả về ProjectDto đã cập nhật
        return projectRepository.findProjectDtoById(id);
    }

    public void deleteProject(Long id) {
        Role currentUserRole = getCurrentUserRole(id);
        if (currentUserRole == null || !currentUserRole.equals(Role.LEADER) ) {
            throw new RuntimeException("Current user does not have permission to delete this project");
        }
        // Xóa dự án theo ID
        List<ProjectMember> projectMembers = projectMemberRepository.findAllByProjectId(id);
        projectMemberRepository.deleteAll(projectMembers);
        projectRepository.deleteById(id);
    }

    public List<ProjectMemberDto> updateMemberList(Long projectId, List<ProjectMemberDto> memberDtos) {
        Role currentUserRole = getCurrentUserRole(projectId);
        if (currentUserRole == null || (!currentUserRole.equals(Role.LEADER) && !currentUserRole.equals(Role.VICE_LEADER))) {
            throw new RuntimeException("Current user does not have permission to update members of this project");
        }

        for(ProjectMemberDto dto : memberDtos) {
            ProjectMember projectMember = projectMemberRepository.findById(dto.getId())
                    .orElseThrow(() -> new RuntimeException("Project member not found with id: " + dto.getId()));

            if (!projectMember.getProject().getId().equals(projectId)) {
                throw new RuntimeException("Project member does not belong to the specified project");
            }

            projectMember.setRole(dto.getRole());
            projectMemberRepository.save(projectMember);
        }

        return memberDtos;
    }

    public void removeMemberFromProject(Long projectId, List<Long> memberIds) {
        Role currentUserRole = getCurrentUserRole(projectId);
        if (currentUserRole == null || (!currentUserRole.equals(Role.LEADER) && !currentUserRole.equals(Role.VICE_LEADER))) {
            throw new RuntimeException("Current user does not have permission to remove members from this project");
        }

        for(Long id: memberIds){
            ProjectMember projectMember = projectMemberRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Project member not found with id: " + id));

            if (!projectMember.getProject().getId().equals(projectId)) {
                throw new RuntimeException("Project member does not belong to the specified project");
            }

            projectMemberRepository.delete(projectMember);
        }
    }

    public void changeProjectLeader(Long projectId, Long newLeaderId) {
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

    }


}
