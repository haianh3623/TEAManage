package personal.project.teamwork_management.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import personal.project.teamwork_management.model.Status;

import java.util.Date;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProjectDto {

    private Long id; // ID của dự án
    private String name; // Tên của dự án
    private String description; // Mô tả của dự án
    private Status status; // Trạng thái của dự án (ví dụ: "Đang hoạt động", "Hoàn thành", "Hủy bỏ")
    private Long progress; // Tiến độ của dự án (từ 0 đến 100)
    private Date startDate; // Ngày bắt đầu dự án
    private Date endDate; // Ngày kết thúc dự án
    private List<MemberDto> members; // Danh sách thành viên tham gia dự án
    private List<TaskDto> tasks; // Danh sách các nhiệm vụ trong dự án

    public ProjectDto(Long id, String name, String description, Status status, Long progress, Date startDate, Date endDate) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.status = status;
        this.progress = progress;
        this.startDate = startDate;
        this.endDate = endDate;
    }

}
