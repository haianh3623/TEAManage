package personal.project.teamwork_management;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;

@SpringBootApplication
//@EnableAutoConfiguration(exclude = {
//		DataSourceAutoConfiguration.class,
//		HibernateJpaAutoConfiguration.class
//})
public class TeamworkManagementApplication {

	public static void main(String[] args) {

//		Dotenv dotenv = Dotenv.load();
//		dotenv.entries().forEach(entry ->
//				System.setProperty(entry.getKey(), entry.getValue())
//		);

		SpringApplication.run(TeamworkManagementApplication.class, args);
	}

}
