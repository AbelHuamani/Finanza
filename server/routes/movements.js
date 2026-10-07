import { Router } from "express";
import {
    createMovements,
    createMovement,
    deleteMovement,
    getMovements,
    updateMovement,
} from "../repositories.js";
import { httpError, validateMovementInput } from "../validation.js";

const router = Router();

router.get("/", async (_req, res, next) => {
    try {
        res.json(await getMovements());
    } catch (error) {
        next(error);
    }
});

router.post("/", async (req, res, next) => {
    try {
        res.status(201).json(await createMovement(validateMovementInput(req.body)));
    } catch (error) {
        next(error);
    }
});

router.post("/bulk", async (req, res, next) => {
    try {
        if (!Array.isArray(req.body.movements) || req.body.movements.length === 0) {
            throw httpError(400, "Envía al menos un movimiento en 'movements'.");
        }
        const inputs = req.body.movements.map((movement) => validateMovementInput(movement));
        res.status(201).json(await createMovements(inputs));
    } catch (error) {
        next(error);
    }
});

router.put("/:id", async (req, res, next) => {
    try {
        res.json(await updateMovement(req.params.id, validateMovementInput(req.body)));
    } catch (error) {
        next(error);
    }
});

router.delete("/:id", async (req, res, next) => {
    try {
        res.status(204).json(await deleteMovement(req.params.id));
    } catch (error) {
        next(error);
    }
});

export default router;