import argon2 from "argon2";

import crypto from "crypto";
import type { JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

import jwt from 'jsonwebtoken';
import { revokeRefreshToken, userForRefreshToken } from "./db/queries/refresh.ts";
import { UserNotAuthenticatedError } from "./api/errors.ts";
import { config } from "./config.ts";

export async function hashPassword(password: string): Promise<string> {
    return await argon2.hash(password);
}

export async function checkPasswordHash(password: string, hash: string): Promise<boolean> {
    return await argon2.verify(hash, password);
}


type payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;



export function makeJWT(userID: string, expiresIn: number, secret: string): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: payload = {
        iss: "chirpy",
        sub: userID,
        iat: now,
        exp: now + expiresIn,
    };

    return jwt.sign(payload, secret);
}

export function validateJWT(token: string, secret: string): payload {
    return jwt.verify(token, secret) as payload;
}


export function getBearerToken(req: Request): string {

    const authHeader = req.headers.authorization;


    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("Invalid authorization header");
    }
    return authHeader.substring(7);
}



export function makeRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
}



export async function handlerRefresh(req: Request, res: Response) {
    try {

        let refreshToken = getBearerToken(req);

        const result = await userForRefreshToken(refreshToken);
        if (!result) {
            throw new UserNotAuthenticatedError("invalid refresh token");
        }

        const user = result.user;
        const accessToken = makeJWT(
            user.id,
            config.jwt.defaultDuration,
            config.jwt.secret,
        );

        type response = {
            token: string;
        };
        const responseBody: response = {
            token: accessToken,
        };
        res.status(200).json(responseBody);
    } catch (err) {
        res.status(401).json({ error: "Unauthorized" });
    }
}

export async function handlerRevoke(req: Request, res: Response) {
    const refreshToken = getBearerToken(req);
    await revokeRefreshToken(refreshToken);
    res.status(204).send();
}
export function getAPIKey(req: Request): string {

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("ApiKey ")) {
        throw new Error("Invalid authorization header");
    }
    return authHeader.substring(7).trim();
}
