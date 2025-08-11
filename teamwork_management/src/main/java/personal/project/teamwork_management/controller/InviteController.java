package personal.project.teamwork_management.controller;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import personal.project.teamwork_management.dto.InviteCodeDTO;
import personal.project.teamwork_management.model.InviteCode;
import personal.project.teamwork_management.service.InviteService;

@RestController
@RequestMapping("/api/invites")
public class InviteController {

    @Autowired
    private InviteService inviteService;

    @PostMapping("/generate")
    public ResponseEntity<?> generate(@RequestParam Long projectId) {
        System.out.println("Generating invite code for project ID: " + projectId);
        InviteCodeDTO code = inviteService.createInviteCode(projectId);
        return ResponseEntity.ok(code);
    }

    @PostMapping("/join")
    public ResponseEntity<?> join(@RequestParam String code) {

        return ResponseEntity.ok(inviteService.joinProjectByCode(code));

    }
}

