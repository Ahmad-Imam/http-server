import type { Request, Response, NextFunction } from "express";
import { BadRequestError } from "./errors.ts";


import { createChirp, deleteChirp, getAllChirps, getChirpById, getChirpsByAuthorId } from "../db/queries/chirps.ts";

import type { NewChirp } from "../db/schema.ts";
import { getBearerToken, validateJWT } from "../auth.ts";

function validateChirp(req: Request, res: Response, next: NextFunction) {
    try {
        type ReqBody = {
            body: string;
            userId: string;
        }
        const parsedBody: ReqBody = req.body;
        console.log("parsed", parsedBody)


        const isWithinLimit = parsedBody.body.length <= 140;
        // console.log(isWithinLimit)
        if (!isWithinLimit) {
            throw new BadRequestError("Chirp is too long");
        }
        else {

            const ignored = ['kerfuffle', 'sharbert', 'fornax'];
            const words = parsedBody.body.split(' ');

            for (let i = 0; i < words.length; i++) {
                if (ignored.includes(words[i].toLowerCase())) {
                    words[i] = '****';
                }
            }
            const cleanedBody = words.join(' ');

            return cleanedBody;

            // res.setHeader("Content-Type", "application/json");
            // res.status(200).send({
            //     cleanedBody: cleanedBody
            // });
        }

    } catch (error) {
        next(error);
    }
}



async function createChirpFn(req: Request, res: Response) {
    console.log('createChirpFn called')
    try {
        const cleanedBody = validateChirp(req, res, () => { }) as string;
        console.log(cleanedBody)

        const bearer = getBearerToken(req);
        console.log('Bearer token:', bearer);
        const validatedJWT = validateJWT(bearer, process.env.JWT_SECRET || "");
        console.log("validatedJWT", validatedJWT)

        if (!validatedJWT || typeof validatedJWT.sub !== "string") {
            res.status(401).send({ error: "Unauthorized" });
            return;
        } else {

            const newChirp: NewChirp = {
                body: cleanedBody,
                userId: validatedJWT.sub,
            };
            console.log({ newChirp })

            const createdChirp = await createChirp(newChirp);
            console.log("Created chirp:", createdChirp)

            res.setHeader("Content-Type", "application/json");
            res.status(201).send(
                createdChirp
            );
        }
    } catch (error) {
        res.status(401).send({ error: "Internal Server Error", message: error });
    }

}

async function getAllChirpsFn(req: Request, res: Response) {
    try {

        const authorId = req.query.authorId as string | undefined;
        let chirps;
        if (authorId) {
            chirps = await getChirpsByAuthorId(authorId);
        } else {
            chirps = await getAllChirps();
        }

        const sort = req.query.sort as string | undefined;
        if (sort === "asc") {
            chirps = chirps.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        } else if (sort === "desc") {
            chirps = chirps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } else {
            chirps = chirps.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }




        console.log('[chirps] db returned', Array.isArray(chirps) ? chirps.length : typeof chirps);
        res.setHeader("Content-Type", "application/json");
        res.status(200).send(chirps);
    } catch (error) {
        console.error('[chirps] handler error', error);
        res.status(500).send({ error: "Internal Server Error" });
    }
}

async function getChirpByIdFn(req: Request, res: Response) {
    try {
        const { chirpID } = req.params;
        const chirp = await getChirpById(chirpID);
        if (chirp) {
            res.setHeader("Content-Type", "application/json");
            res.status(200).send(chirp);
        } else {
            res.status(404).send({ error: "Chirp not found" });
        }
    } catch (error) {
        res.status(500).send({ error: "Internal Server Error" });
    }
}

async function deleteChirpFn(req: Request, res: Response) {

    try {
        const { chirpID } = req.params;

        const bearer = getBearerToken(req);
        const validatedJWT = validateJWT(bearer, process.env.JWT_SECRET || "");

        if (!validatedJWT || typeof validatedJWT.sub !== "string") {
            res.status(401).send({ error: "Unauthorized" });
            return;
        }

        const chirp = await getChirpById(chirpID);
        if (!chirp) {
            res.status(404).send({ error: "Chirp not found" });
            return;
        }

        if (chirp.userId !== validatedJWT.sub) {
            res.status(403).send({ error: "Forbidden" });
            return;
        }

        await deleteChirp(chirpID);
        res.status(204).send();
    } catch (error) {
        res.status(401).send({ error: "Internal Server Error" });
    }
}


export { getAllChirpsFn, createChirpFn, validateChirp, getChirpByIdFn, deleteChirpFn };