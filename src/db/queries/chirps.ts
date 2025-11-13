import type { Request, Response } from "express";
import { db } from "../index.ts";
import { chirps } from "../schema.ts";
import type { NewChirp } from "../schema.ts";
import { eq } from "drizzle-orm";


export async function createChirp(chirp: NewChirp) {
    const [result] = await db
        .insert(chirps)
        .values(chirp)
        .returning();
    return result;
}


export async function getAllChirps() {

    return await db.select().from(chirps).orderBy(chirps.createdAt);
}

export async function getChirpById(id: string) {
    const chirp = await db
        .select()
        .from(chirps)
        .where(eq(chirps.id, id))
        .limit(1);
    return chirp[0];
}

export async function getChirpsByAuthorId(authorId: string) {
    return await db
        .select()
        .from(chirps)
        .where(eq(chirps.userId, authorId))
        .orderBy(chirps.createdAt);
}


export async function deleteChirp(id: string) {
    await db
        .delete(chirps)
        .where(eq(chirps.id, id));
}