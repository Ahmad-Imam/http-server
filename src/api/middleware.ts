import type { Request, Response } from "express";
import { config } from "../config.ts";

export function middlewareLogResponses(req: Request, res: Response, next: () => void) {
    res.on("finish", () => {
        if (res.statusCode !== 200) {
            console.log(`[NON-OK] ${req.method} ${req.originalUrl} - Status: ${res.statusCode}`);
        }
    });

    next();
}


export function middlewareMetricsInc(req: Request, res: Response, next: () => void) {

    config.api.fileServerHits += 1;

    next();
}