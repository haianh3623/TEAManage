package personal.project.teamwork_management.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import personal.project.teamwork_management.dto.InviteCodeDTO;
import personal.project.teamwork_management.dto.ProjectDto;
import personal.project.teamwork_management.model.*;
import personal.project.teamwork_management.repository.*;

import java.util.Date;
import java.util.List;
import java.util.UUID;

@Service
public class InviteService {

    @Autowired private InviteCodeRepository inviteCodeRepo;
    @Autowired private ProjectRepository projectRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private ProjectMemberRepository projectMemberRepo;
    @Autowired
    private UserService userService;

    public InviteCodeDTO createInviteCode(Long projectId) {
        Project project = projectRepo.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        Date now = new Date();
        System.out.println("Current time: " + now);

        List<InviteCode> allCodes = inviteCodeRepo.findByProjectId(projectId);

        if (!allCodes.isEmpty()) {
            InviteCode last = allCodes.get(allCodes.size() - 1); // phần tử cuối danh sách
            System.out.println("Last code: " + last.getCode() + " | expiresAt: " + last.getExpiresAt());

            if (last.getExpiresAt().after(now)) {
                System.out.println("✅ Found valid invite code");
                return new InviteCodeDTO(last);
            }
        }

        // Nếu không có mã nào còn hạn → tạo mới
        InviteCode invite = new InviteCode();
        invite.setProject(project);
        invite.setCode(UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        invite.setExpiresAt(new Date(now.getTime() + 1000L * 60 * 60 * 24 * 30)); // 30 ngày

        InviteCode savedInvite = inviteCodeRepo.save(invite);


        return new InviteCodeDTO(savedInvite);
    }




    public ProjectDto joinProjectByCode(String code) {
        InviteCode invite = inviteCodeRepo.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Mã mời không hợp lệ"));

        // Only check if expired, remove the used check
        if (invite.getExpiresAt().before(new Date())) {
            throw new RuntimeException("Mã mời đã hết hạn");
        }

        Project project = invite.getProject();
        User user = userService.getCurrentUser();

        // Create member association
        ProjectMember member = new ProjectMember();
        member.setProject(project);
        member.setUser(user);
        member.setRole(Role.MEMBER);

        projectMemberRepo.findByProjectIdAndUserId(project.getId(), user.getId())
                .ifPresent(existingMember -> {
                    throw new RuntimeException("Bạn đã là thành viên của dự án này");
                });

        projectMemberRepo.save(member);

        ProjectDto projectDto = new ProjectDto();
        try {
            projectDto = projectRepo.findProjectDtoById(project.getId());
        } catch (Exception e) {
            throw new RuntimeException("Không thể lấy thông tin dự án");
        }

        return projectDto;
    }
}