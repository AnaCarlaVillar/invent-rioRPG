package com.hexatombe.inventario.web;

import com.hexatombe.inventario.auth.AuthInterceptor;
import com.hexatombe.inventario.auth.SessionService;
import com.hexatombe.inventario.model.User;
import com.hexatombe.inventario.storage.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AuthController {
    private final UserService userService;
    private final SessionService sessionService;

    public AuthController(UserService userService, SessionService sessionService) {
        this.userService = userService;
        this.sessionService = sessionService;
    }

    @PostMapping("/register")
    public AuthResponse register(@RequestBody AuthRequest request) {
        User user = userService.register(request.username, request.password);
        String token = sessionService.createSession(user.username);
        return new AuthResponse(token, user.username);
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody AuthRequest request) {
        User user = userService.authenticate(request.username, request.password);
        String token = sessionService.createSession(user.username);
        return new AuthResponse(token, user.username);
    }

    @PostMapping("/logout")
    public void logout(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        String token = header != null && header.startsWith("Bearer ") ? header.substring(7) : null;
        sessionService.invalidate(token);
    }

    static String currentUser(HttpServletRequest request) {
        return (String) request.getAttribute(AuthInterceptor.USERNAME_ATTR);
    }
}
