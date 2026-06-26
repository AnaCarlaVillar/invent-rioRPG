package com.hexatombe.inventario.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthInterceptor implements HandlerInterceptor {
    public static final String USERNAME_ATTR = "username";
    private static final String AUTH_PREFIX = "Bearer ";

    private final SessionService sessionService;

    public AuthInterceptor(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String header = request.getHeader("Authorization");
        String token = header != null && header.startsWith(AUTH_PREFIX) ? header.substring(AUTH_PREFIX.length()) : null;
        String username = sessionService.requireUser(token);
        request.setAttribute(USERNAME_ATTR, username);
        return true;
    }
}
