import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";

import express from "express";

import type { Request, Response, NextFunction } from "express";
import { config } from "./config.ts";
import { middlewareLogResponses, middlewareMetricsInc } from "./api/middleware.ts";
import { BadRequestError } from "./api/errors.ts";
import { createUserFn, loginUserFn, updateUserFn, upgradeUserFn } from "./api/users.ts";
import { deleteAllUsers } from "./db/queries/users.ts";
import { createChirpFn, deleteChirpFn, getAllChirpsFn, getChirpByIdFn, validateChirp } from "./api/chirps.ts";
import { handlerRefresh, handlerRevoke } from "./auth.ts";

const migrationClient = postgres(config.db.url, { max: 1 });
await migrate(drizzle(migrationClient), config.db.migrationConfig);

const app = express();
const PORT = config.api.port;
app.use(express.json());

app.use("/app", middlewareMetricsInc, express.static("./src/app"));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
    next();
});

app.get('/admin/metrics', printMetrics)
app.post('/admin/reset', deleteAllUsers)

app.post('/api/validate_chirp', validateChirp)
app.post('/api/users', createUserFn)
app.put('/api/users', updateUserFn)

app.post('/api/login', loginUserFn)

app.post("/api/refresh", handlerRefresh);
app.post("/api/revoke", handlerRevoke);


app.post('/api/chirps', createChirpFn)
app.get('/api/chirps', getAllChirpsFn)
app.get('/api/chirps/:chirpID', getChirpByIdFn)
app.delete('/api/chirps/:chirpID', deleteChirpFn)

app.post('/api/polka/webhooks', upgradeUserFn)


app.get("/api/healthz", middlewareLogResponses, handlerReadiness);

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});


app.use(errorHandler);



function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction,
) {
    if (err instanceof BadRequestError) {
        res.status(400).json({ error: 'Chirp is too long. Max length is 140' });
    } else {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

function printMetrics(req: Request, res: Response) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(`<html><body>    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${config.api.fileServerHits} times!</p></body></html>`);
}

function handlerReadiness(req: Request, res: Response) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200).send("OK");
}
