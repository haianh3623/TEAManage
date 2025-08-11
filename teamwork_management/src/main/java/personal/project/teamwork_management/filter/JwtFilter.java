package personal.project.teamwork_management.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import personal.project.teamwork_management.dto.CustomUserDetails;
import personal.project.teamwork_management.service.UserDetailsServiceImpl;
import personal.project.teamwork_management.util.JwtUtil;

import java.io.IOException;

@Component
public class JwtFilter extends OncePerRequestFilter {

    @Autowired
    JwtUtil jwtUtil;
    @Autowired
    UserDetailsServiceImpl userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getServletPath();
        System.out.println("🔍 JwtFilter: Processing path: " + path);
        
        // Bỏ qua xác thực với các đường dẫn công khai
        if (path.equals("/api/auth/login") || path.equals("/api/users/register") || 
                        path.equals("/api/hello") || path.equals("/api/actuator/health")) {
            System.out.println("✅ JwtFilter: Skipping authentication for public path: " + path);
            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");
        System.out.println("🔑 JwtFilter: Auth header: " + authHeader);
        
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            String username = jwtUtil.validateToken(token);
            if (username == null) {
                System.out.println("❌ JwtFilter: Invalid token");
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }

            CustomUserDetails userDetails = (CustomUserDetails) userDetailsService.loadUserByUsername(username);
            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());

            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContextHolder.getContext().setAuthentication(authToken);
            System.out.println("✅ JwtFilter: Authentication successful for user: " + username);
        } else {
            System.out.println("⚠️ JwtFilter: No Bearer token found");
        }

        filterChain.doFilter(request, response);
    }

}