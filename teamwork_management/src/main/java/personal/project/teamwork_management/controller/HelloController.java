package personal.project.teamwork_management.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @GetMapping("/hello")
    public String hello() {
        return "Hello, World!";
    }

    @PostMapping("/notify")
    public String notify(String message) {
        // This is a simple example of sending a notification to all connected clients
        message = "Hello";

        messagingTemplate.convertAndSend("/topic/notifications", message);
        return "Notification sent: " + message;
    }

}
