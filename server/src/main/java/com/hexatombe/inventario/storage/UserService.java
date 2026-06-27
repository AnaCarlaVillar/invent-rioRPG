package com.hexatombe.inventario.storage;

import com.fasterxml.jackson.core.type.TypeReference;
import com.hexatombe.inventario.auth.PasswordUtil;
import com.hexatombe.inventario.model.User;
import com.hexatombe.inventario.web.ApiException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class UserService {
    private static final Path USERS_FILE = Path.of("users.json");

    private final JsonDbStore store;

    public UserService(JsonDbStore store) {
        this.store = store;
    }

    private List<User> loadUsers() {
        return store.read(USERS_FILE, new TypeReference<List<User>>() {
        }, new ArrayList<>());
    }

    private void saveUsers(List<User> users) {
        store.write(USERS_FILE, users);
    }

    private Optional<User> findUser(List<User> users, String username) {
        return users.stream().filter(u -> u.username.equalsIgnoreCase(username)).findFirst();
    }

    // The username doubles as a folder name on disk, so it just needs to stay free of
    // path separators — any normal username (with accents, spaces, etc.) is fine.
    private boolean isSafeUsername(String username) {
        if (username == null) return false;
        String trimmed = username.trim();
        if (trimmed.length() < 3 || trimmed.length() > 40) return false;
        if (trimmed.equals(".") || trimmed.equals("..")) return false;
        return !trimmed.contains("/") && !trimmed.contains("\\");
    }

    public synchronized User register(String username, String password) {
        if (!isSafeUsername(username)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Use um nome de usuário comum, sem barras (/ ou \\).");
        }
        String trimmedUsername = username.trim();
        if (password == null || password.length() < 4) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A senha precisa ter ao menos 4 caracteres.");
        }
        List<User> users = loadUsers();
        if (findUser(users, trimmedUsername).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "Esse usuário já existe.");
        }
        User user = new User();
        user.username = trimmedUsername;
        user.salt = PasswordUtil.newSalt();
        user.passwordHash = PasswordUtil.hash(password, user.salt);
        users.add(user);
        saveUsers(users);
        return user;
    }

    public User authenticate(String username, String password) {
        List<User> users = loadUsers();
        User user = username == null ? null : findUser(users, username).orElse(null);
        if (user == null || password == null || !PasswordUtil.matches(password, user.salt, user.passwordHash)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Usuário ou senha inválidos.");
        }
        return user;
    }
}
