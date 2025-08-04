package personal.project.teamwork_management.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.CommonsRequestLoggingFilter;

@Configuration
public class RequestLoggingConfig {
    @Bean
    public CommonsRequestLoggingFilter logFilter() {
        CommonsRequestLoggingFilter filter = new CommonsRequestLoggingFilter();
        filter.setIncludeQueryString(true);
        filter.setIncludePayload(true); // log cả body
        filter.setMaxPayloadLength(10000); // độ dài tối đa log body
        filter.setIncludeHeaders(false); // có thể bật nếu cần
        filter.setAfterMessagePrefix("REQUEST DATA : ");
        return filter;
    }
}

