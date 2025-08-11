package personal.project.teamwork_management.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import personal.project.teamwork_management.dto.UserAuthenDto;
import personal.project.teamwork_management.dto.UserDto;
import personal.project.teamwork_management.model.User;

import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    User findByEmail(String email);

    @Query("SELECT new personal.project.teamwork_management.dto.UserAuthenDto(" +
            "u.id, u.firstName, u.lastName, u.email, u.password) " +
           "FROM User u WHERE u.email = :email")
    UserAuthenDto findUserAuthenDtoByEmail(String email);

    @Query("SELECT new personal.project.teamwork_management.dto.UserDto(" +
            "u.id, u.firstName, u.lastName, u.email, u.phoneNumber, u.dob) " +
           "FROM User u ")
    List<UserDto> findAllUserDtos();

    @Query("SELECT new personal.project.teamwork_management.dto.UserDto(" +
            "u.id, u.firstName, u.lastName, u.email, u.phoneNumber, u.dob) " +
           "FROM User u WHERE u.id = :id")
    UserDto findUserDtoById(Long id);

    @Query("SELECT new personal.project.teamwork_management.dto.UserDto(" +
            "u.id, u.firstName, u.lastName, u.email, u.phoneNumber, u.dob) " +
           "FROM User u WHERE u.email = :email")
    UserDto findUserDtoByEmail(String email);

}
