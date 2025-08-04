package personal.project.teamwork_management.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;

public class DotenvPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Dotenv dotenv = Dotenv.configure()
                .directory("./") // thư mục chứa file .env
                .ignoreIfMissing()
                .load();

        dotenv.entries().forEach(entry -> {
            environment.getSystemProperties().put(entry.getKey(), entry.getValue());
        });
    }
}
