package com.hexatombe.inventario.web;

import com.hexatombe.inventario.model.CharacterProfile;
import com.hexatombe.inventario.storage.CharacterService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/characters")
public class CharacterController {
    private final CharacterService characterService;

    public CharacterController(CharacterService characterService) {
        this.characterService = characterService;
    }

    @GetMapping
    public List<CharacterProfile> list(HttpServletRequest request) {
        return characterService.list(AuthController.currentUser(request));
    }

    @PostMapping
    public CharacterProfile create(HttpServletRequest request, @RequestBody CharacterRequest body) {
        return characterService.create(AuthController.currentUser(request), body.name);
    }

    @PutMapping("/{id}")
    public CharacterProfile rename(HttpServletRequest request, @PathVariable String id, @RequestBody CharacterRequest body) {
        return characterService.rename(AuthController.currentUser(request), PathIds.requireValidCharacterId(id), body.name);
    }

    @DeleteMapping("/{id}")
    public void delete(HttpServletRequest request, @PathVariable String id) {
        characterService.delete(AuthController.currentUser(request), PathIds.requireValidCharacterId(id));
    }
}
