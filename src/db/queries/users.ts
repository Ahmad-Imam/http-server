import type { Request, Response } from "express";
import { db } from "../index.ts";
import { users } from "../schema.ts";
import type { NewUser } from "../schema.ts";
import { eq } from "drizzle-orm";

export async function createUser(user: NewUser) {
    const [result] = await db
        .insert(users)
        .values(user)
        .onConflictDoNothing()
        .returning();
    return result;
}

export async function deleteAllUsers(req: Request, res: Response) {
    try {

        await db.delete(users);

        res.status(200).json({ message: "All users deleted." });

    } catch (error) {
        console.error("Failed to delete all users:", error);
        throw error;
    }
}


export async function getUserByEmail(email: string) {
    const user = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
    if (user.length === 0) {
        throw new Error("User not found");
    }
    return user[0];
}

export async function updateUser(userId: string, updatedFields: Partial<NewUser>) {
    const [updatedUser] = await db
        .update(users)
        .set(updatedFields)
        .where(eq(users.id, userId))
        .returning();
    return updatedUser;
}

export async function upgradeUserToChirpyRed(userId: string) {
    const [updatedUser] = await db
        .update(users)
        .set({ isChirpyRed: true })
        .where(eq(users.id, userId))
        .returning();
    return updatedUser;
}