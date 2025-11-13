import type { Request, Response } from "express";
import { createUser, getUserByEmail, updateUser, upgradeUserToChirpyRed } from "../db/queries/users.ts";
import type { NewUser } from "../db/schema.ts";

import { checkPasswordHash, getAPIKey, hashPassword, makeJWT, makeRefreshToken, validateJWT } from "../auth.ts";
import { config } from "../config.ts";
import { saveRefreshToken } from "../db/queries/refresh.ts";
import { UserNotAuthenticatedError } from "./errors.ts";

type ResponseUser = Omit<NewUser, "hashed_password"> & { refreshToken: string };

export async function createUserFn(req: Request, res: Response) {
    const { email, password } = req.body;
    if (!email || typeof email !== "string") {
        res.status(400).json({ error: "email is required" });
        return;
    }
    if (!password || typeof password !== "string") {
        res.status(400).json({ error: "password is required" });
        return;
    }

    const hashed_password = await hashPassword(password);

    try {
        const user = await createUser({ email, hashed_password } as NewUser);
        const { hashed_password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ error: "Failed to create user", details: error });
    }
}


export async function loginUserFn(req: Request, res: Response): Promise<ResponseUser | void> {
    const { email, password, expiresInSeconds } = req.body;
    try {

        const expiresIn = typeof expiresInSeconds === "number" && expiresInSeconds > 0
            ? expiresInSeconds
            : process.env.JWT_EXPIRES_IN
                ? Number(process.env.JWT_EXPIRES_IN)
                : 3600;


        console.log(expiresIn, email, password, expiresInSeconds)
        const user = await getUserByEmail(email);
        console.log('user:', user)
        if (!user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const isValidPassword = await checkPasswordHash(password, user.hashed_password);
        console.log(isValidPassword)
        if (!isValidPassword) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const secret = process.env.JWT_SECRET;
        console.log(secret)
        if (!secret) {
            res.status(500).json({ error: "JWT secret not configured" });
            return;
        }

        const { hashed_password: _, ...resultUser } = user;

        console.log(resultUser);
        console.log(makeJWT(user.id, expiresIn, secret));

        const accessToken = makeJWT(
            user.id,
            config.jwt.defaultDuration,
            config.jwt.secret,
        );
        const refreshToken = makeRefreshToken();

        const saved = await saveRefreshToken(user.id, refreshToken);
        if (!saved) {
            throw new UserNotAuthenticatedError("could not save refresh token");
        }


        res.status(200).json({ ...resultUser, token: accessToken, refreshToken });

    } catch (error) {
        res.status(401).json(error);
        return;
    }



}

export async function updateUserFn(req: Request, res: Response) {

    try {

        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({ error: "Missing Authorization header" });
            return;
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            res.status(401).json({ error: "Malformed Authorization header" });
            return;
        }

        const secret = config.jwt.secret;
        let userId: string;

        try {
            const payload = validateJWT(token, secret);
            if (!payload || typeof payload.sub !== "string") {
                res.status(401).json({ error: "Invalid token payload" });
                return;
            }
            userId = payload.sub;
        } catch (error) {
            res.status(401).json({ error: "Invalid token" });
            return;
        }

        const { email, password } = req.body;
        if (!email || typeof email !== "string") {
            res.status(400).json({ error: "email is required" });
            return;
        }
        if (!password || typeof password !== "string") {
            res.status(400).json({ error: "password is required" });
            return;
        }

        const hashed_password = await hashPassword(password);

        const updatedUser = await updateUser(userId, { email, hashed_password });
        const { hashed_password: _, ...userWithoutPassword } = updatedUser;
        res.status(200).json(userWithoutPassword);


    } catch (error) {
        res.status(401).json({ error: "Failed to update user", details: error });
    }


}

export async function upgradeUserFn(req: Request, res: Response) {

    try {
        const { event, data } = req.body;
        if (event !== "user.upgraded") {
            res.status(204).send();
            return;
        }
        const apiKey = getAPIKey(req);
        if (apiKey !== config.api.polkaKey) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { userId } = data;
        const upgradedUser = await upgradeUserToChirpyRed(userId);
        if (!upgradedUser) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.status(204).send();


    } catch (error) {
        res.status(401).json({ error: "Failed to upgrade user", details: error });
    }
}