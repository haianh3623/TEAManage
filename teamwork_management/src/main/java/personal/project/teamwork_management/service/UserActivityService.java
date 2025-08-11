package personal.project.teamwork_management.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import personal.project.teamwork_management.model.ActivityType;
import personal.project.teamwork_management.model.UserActivity;
import personal.project.teamwork_management.repository.UserActivityRepository;

import java.util.Date;
import java.util.List;

@Service
public class UserActivityService {
    @Autowired
    private UserActivityRepository userActivityRepository;

    public void logActivity(Long userId, String action, String targetType, Long targetId, ActivityType activityType) {
        UserActivity activity = UserActivity.builder()
                .userId(userId)
                .action(action)
                .targetType(targetType)
                .targetId(targetId)
                .activityType(activityType)
                .timestamp(new Date())
                .build();
        userActivityRepository.save(activity);
    }

    public List<UserActivity> getActivitiesByUserId(Long userId) {
        return userActivityRepository.findByUserIdOrderByTimestampDesc(userId);
    }

    public List<UserActivity> getActivitiesByProjectId(Long projectId) {
        return userActivityRepository.findByProjectIdOrderByTimestampDesc(projectId);
    }

    public List<UserActivity> getActivitiesByUserIdAndProjectId(Long userId, Long projectId) {
        return userActivityRepository.findByUserIdAndProjectIdOrderByTimestampDesc(userId, projectId);
    }
}
