package personal.project.teamwork_management.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import personal.project.teamwork_management.model.Project;
import personal.project.teamwork_management.model.ProjectInteraction;
import personal.project.teamwork_management.model.User;
import personal.project.teamwork_management.repository.ProjectInteractionRepository;

import java.util.List;
import java.util.Date;

@Service
public class ProjectInteractionService {

    @Autowired
    private ProjectInteractionRepository projectInteractionRepository;
    @Autowired
    private UserService userService;

    public List<ProjectInteraction> getProjectInteractions(){
        User user = userService.getCurrentUser();
        if (user == null) {
            return List.of(); // Return an empty list if the user is not authenticated
        }
        List<ProjectInteraction> interactions = projectInteractionRepository.findByUserIdOrderByLastViewedAtDesc(user.getId());
        return interactions;
    }

    public ProjectInteraction createProjectInteraction(Project project) {
        User user = userService.getCurrentUser();
        if (user == null) {
            throw new RuntimeException("User not authenticated");
        }
        ProjectInteraction interaction = new ProjectInteraction();
        interaction.setProject(project);
        interaction.setUser(user);
        Date now = new Date();
        interaction.setLastViewedAt(now);

        return projectInteractionRepository.save(interaction);
    }

}
