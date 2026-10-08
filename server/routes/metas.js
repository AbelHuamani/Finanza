import { Router } from 'express';
import { getMetas, createMeta, updateMeta, deleteMeta, alcanzarMeta } from '../repositories.js';
import { httpError, validateMetaInput } from '../validation.js';

const router = Router();

router.get('/', async (_req, res, next) => {
    try { res.json(await getMetas()); } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
    try { res.status(201).json(await createMeta(validateMetaInput(req.body))); } catch (error) { next(error); }
});

router.put('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id) || id <= 0) throw httpError(400, 'ID inválido.');
        const changes = {};
        const body = req.body;
        if (body.nombre !== undefined) changes.nombre = String(body.nombre).trim();
        if (body.montoObjetivo !== undefined) changes.montoObjetivo = Number(body.montoObjetivo);
        if (body.categoria !== undefined) changes.categoria = String(body.categoria ?? '');
        if (body.descripcion !== undefined) changes.descripcion = String(body.descripcion ?? '');
        if (body.activa !== undefined) changes.activa = Boolean(body.activa);
        if (body.alcanzada !== undefined) changes.alcanzada = Boolean(body.alcanzada);
        if (body.fechaAlcanzada !== undefined) changes.fechaAlcanzada = body.fechaAlcanzada || null;
        res.json(await updateMeta(id, changes));
    } catch (error) { next(error); }
});

/**
 * PUT /api/metas/:id/alcanzar
 * Marca la meta como alcanzada e inserta la notificación en una sola transacción.
 * Idempotente: si ya estaba alcanzada, garantiza que exista la notificación.
 */
router.put('/:id/alcanzar', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id) || id <= 0) throw httpError(400, 'ID inválido.');
        res.json(await alcanzarMeta(id));
    } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id) || id <= 0) throw httpError(400, 'ID inválido.');
        res.status(204).send(await deleteMeta(id));
    } catch (error) { next(error); }
});

export default router;
