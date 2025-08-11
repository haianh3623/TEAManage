package personal.project.teamwork_management.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FileDto {
    private Long id;
    private String name;
    private String path;
    private Long size;
    private Long taskId;
    private Long projectId;
    private Long taskSubmissionId;

}