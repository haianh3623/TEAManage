package personal.project.teamwork_management.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class EnvConfig {

    @Bean
    public Dotenv dotenv() {
        return Dotenv.configure()
                .directory("./") // hoặc "src/main/resources" nếu bạn đặt ở đó
                .ignoreIfMissing()
                .load();
    }
}
