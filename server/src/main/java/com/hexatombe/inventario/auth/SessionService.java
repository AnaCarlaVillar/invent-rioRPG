package com.hexatombe.inventario.auth;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import com.hexatombe.inventario.web.ApiException;

@Component
public class SessionService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final ConcurrentHashMap<String, String> tokenToUsername = new ConcurrentHashMap<>();

    public String createSession(String username) {
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        String token = HexFormat.of().formatHex(bytes);
        tokenToUsername.put(token, username);
        return token;
    }

    public String requireUser(String token) {
        String username = token == null ? null : tokenToUsername.get(token);
        if (username == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Sessão inválida ou expirada. Faça login novamente.");
        }
        return username;
    }

    public void invalidate(String token) {
        if (token != null) {
            tokenToUsername.remove(token);
        }
    }
}
