import { Router } from "express";
import {
    createCategory,
    createPaymentMethod,
    createSubcategory,
    getCategories,
    getPaymentMethods,
    getSubcategories,
} from "../repositories.js";
import { httpError, validateName } from "../validation.js";

const router = Router();

router.get("/categories", async (_req, res, next) => {
    try {
        res.json(await getCategories());
    } catch (error) {
        next(error);
    }
});

router.post("/categories", async (req, res, next) => {
    try {
        res.status(201).json(await createCategory({ name: validateName(req.body) }));
    } catch (error) {
        next(error);
    }
});

router.get("/subcategories", async (req, res, next) => {
    try {
        const categoryId = req.query.categoryId ? String(req.query.categoryId) : null;
        res.json(await getSubcategories(categoryId));
    } catch (error) {
        next(error);
    }
});

router.post("/subcategories", async (req, res, next) => {
    try {
        const categoryId = String(req.body.categoryId ?? "");
        if (!categoryId) throw httpError(400, "Selecciona una categoría.");
        res.status(201).json(await createSubcategory({ categoryId, name: validateName(req.body) }));
    } catch (error) {
        next(error);
    }
});

router.get("/payment-methods", async (_req, res, next) => {
    try {
        res.json(await getPaymentMethods());
    } catch (error) {
        next(error);
    }
});

router.post("/payment-methods", async (req, res, next) => {
    try {
        res.status(201).json(await createPaymentMethod({ name: validateName(req.body) }));
    } catch (error) {
        next(error);
    }
});

export default router;