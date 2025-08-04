package personal.project.teamwork_management.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import personal.project.teamwork_management.model.*;
import personal.project.teamwork_management.repository.*;

import java.util.Date;
import java.util.UUID;

@Service
public class InviteService {

    @Autowired private InviteCodeRepository inviteCodeRepo;
    @Autowired private ProjectRepository projectRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private ProjectMemberRepository projectMemberRepo;
    @Autowired
    private UserService userService;

    public String createInviteCode(Long projectId) {
        Project project = projectRepo.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        InviteCode invite = new InviteCode();
        invite.setProject(project);
        invite.setCode(UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        invite.setExpiresAt(new Date(System.currentTimeMillis() + 1000 * 60 * 60 * 24)); // 1 ngày

        inviteCodeRepo.save(invite);
        return invite.getCode();
    }

    public void joinProjectByCode(String code) {
        InviteCode invite = inviteCodeRepo.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Mã mời không hợp lệ"));

        if (invite.isUsed() || invite.getExpiresAt().before(new Date())) {
            throw new RuntimeException("Mã mời đã hết hạn hoặc đã sử dụng");
        }

        Project project = invite.getProject();
        User user = userService.getCurrentUser();

        // Tạo liên kết thành viên
        ProjectMember member = new ProjectMember();
        member.setProject(project);
        member.setUser(user);
        member.setRole(Role.MEMBER); // hoặc enum mặc định
        try {
            projectMemberRepo.save(member);
        } catch (Exception e) {
            throw new RuntimeException("Bạn đã là thành viên của dự án này");
        }

        // Đánh dấu đã dùng
        invite.setUsed(true);
        inviteCodeRepo.save(invite);
    }
}
