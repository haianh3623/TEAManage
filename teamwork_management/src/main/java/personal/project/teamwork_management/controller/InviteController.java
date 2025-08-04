package personal.project.teamwork_management.controller;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import personal.project.teamwork_management.service.InviteService;

@RestController
@RequestMapping("/api/invites")
public class InviteController {

    @Autowired
    private InviteService inviteService;

    @PostMapping("/generate")
    public ResponseEntity<String> generate(@RequestParam Long projectId) {
        System.out.println("Generating invite code for project ID: " + projectId);
        String code = inviteService.createInviteCode(projectId);
        return ResponseEntity.ok(code);
    }

    @PostMapping("/join")
    public ResponseEntity<String> join(@RequestParam String code) {
        inviteService.joinProjectByCode(code);
        return ResponseEntity.ok("Tham gia dự án thành công");
    }
}

