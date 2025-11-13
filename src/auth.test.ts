import { describe, it, expect, beforeAll } from "vitest";
import { checkPasswordHash, hashPassword, makeJWT, validateJWT } from "./auth.ts";


describe("Password Hashing", () => {
    const password1 = "correctPassword123!";
    const password2 = "anotherPassword456!";
    let hash1: string;
    let hash2: string;

    beforeAll(async () => {
        hash1 = await hashPassword(password1);
        hash2 = await hashPassword(password2);
    });

    it("should return true for the correct password", async () => {
        const result = await checkPasswordHash(password1, hash1);
        expect(result).toBe(true);
    });
});


describe("JWT Creation and Validation", () => {
    const userID = "123e4567-e89b-12d3-a456-426614174000";
    const secret = "supersecretkey";
    const expiresIn = 2
    let token: string;

    it("should create a valid JWT", () => {
        token = makeJWT(userID, expiresIn, secret);
        expect(token).toBeDefined();
    });

    it("should validate a valid JWT", () => {
        const payload = validateJWT(token, secret);
        expect(payload.sub).toBe(userID);
    });

    it("should reject an expired JWT", async () => {
        // Wait for the token to expire
        await new Promise((resolve) => setTimeout(resolve, 3000));
        expect(() => validateJWT(token, secret)).toThrow();
    });

    it("should reject a JWT with the wrong secret", () => {
        const wrongSecret = "wrongsecretkey";
        expect(() => validateJWT(token, wrongSecret)).toThrow();
    });
});