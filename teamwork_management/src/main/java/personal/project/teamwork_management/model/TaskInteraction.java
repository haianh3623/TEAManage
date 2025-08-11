package personal.project.teamwork_management.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import lombok.Data;

import java.util.Date;

@Entity
@Data
public class TaskInteraction extends BaseEntity {

    @ManyToOne
    private User user;
    @ManyToOne
    private Task task;
    private Date lastViewedAt;

}
