package personal.project.teamwork_management.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import personal.project.teamwork_management.model.TaskInteraction;
import personal.project.teamwork_management.model.User;
import personal.project.teamwork_management.repository.TaskInteractionRepository;
import personal.project.teamwork_management.model.Task;

import java.util.Date;
import java.util.List;

@Service
public class TaskInteractionService {
    @Autowired
    private TaskInteractionRepository taskInteractionRepository;
    @Autowired
    private UserService userService;

    public List<TaskInteraction> getTaskInteractions() {
        User user = userService.getCurrentUser();
        if (user == null) {
            return List.of(); // Return an empty list if the user is not authenticated
        }
        List<TaskInteraction> interactions = taskInteractionRepository.findByUserIdOrderByLastViewedAtDesc(user.getId());
        return interactions;
    }

    public TaskInteraction createTaskInteraction(Task task) {
        User user = userService.getCurrentUser();
        if (user == null) {
            throw new RuntimeException("User not authenticated");
        }
        TaskInteraction taskInteraction = new TaskInteraction();
        taskInteraction.setUser(user);
        taskInteraction.setTask(task);
        Date now = new Date();
        taskInteraction.setLastViewedAt(now);

        return taskInteractionRepository.save(taskInteraction);
    }
}
