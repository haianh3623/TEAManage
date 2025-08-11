package personal.project.teamwork_management.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

// CORS is already configured in SecurityConfig, this is backup/alternative config
@Configuration
public class WebConfig implements WebMvcConfigurer {

    // Comment out to use SecurityConfig CORS only
    /*
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*", "file://*") // Allow all localhost ports and file protocol
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600); // Cache preflight for 1 hour
    }
    */
}
