package com.hexatombe.inventario.web;

import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;

public class PathIds {
    private static final Pattern VALID_CHARACTER_ID = Pattern.compile("^char_[0-9a-f]+$");

    private PathIds() {
    }

    public static String requireValidCharacterId(String id) {
        if (id == null || !VALID_CHARACTER_ID.matcher(id).matches()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Identificador de personagem inválido.");
        }
        return id;
    }
}
