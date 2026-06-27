package com.hexatombe.inventario.model;

public class CharacterProfile {
    public String id;
    public String name;
    public String activeAppearanceId;

    public CharacterProfile() {
    }

    public CharacterProfile(String id, String name) {
        this.id = id;
        this.name = name;
    }
}
