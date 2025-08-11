package personal.project.teamwork_management.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import personal.project.teamwork_management.service.TaskService;

@RestController
@RequestMapping("/api")
public class TestController {
    @Autowired
    private TaskService taskService;

    @GetMapping("/test")
    public void test() throws Exception {
        System.out.println("==================" + taskService.getTaskHierarchyForReport(7L).size() + "==================");
    }
}
