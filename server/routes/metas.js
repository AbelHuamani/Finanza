import { Router } from 'express';
import { getMetas, createMeta, updateMeta, deleteMeta, alcanzarMeta, reclamarMeta } from '../repositories.js';
import { httpError, validateMetaInput, validateMovementInput } from '../validation.js';

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
        if (body.categoriaId !== undefined) changes.categoriaId = body.categoriaId ? Number(body.categoriaId) : null;
        if (body.descripcion !== undefined) changes.descripcion = String(body.descripcion ?? '');
        if (body.prioridad !== undefined) changes.prioridad = String(body.prioridad);
        if (body.estado !== undefined) changes.estado = String(body.estado);
        if (body.activa !== undefined) changes.activa = Boolean(body.activa);
        if (body.alcanzada !== undefined) changes.alcanzada = Boolean(body.alcanzada);
        if (body.fechaAlcanzada !== undefined) changes.fechaAlcanzada = body.fechaAlcanzada || null;
        if (body.reclamadaEn !== undefined) changes.reclamadaEn = body.reclamadaEn || null;
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

/**
 * POST /api/metas/:id/reclamar
 * Reclama una meta creando un movimiento de gasto asociado.
 * Actualiza el estado de la meta a RECLAMADA o ACTIVA (si es parcial).
 */
router.post('/:id/reclamar', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id) || id <= 0) throw httpError(400, 'ID inválido.');
        const movementInput = validateMovementInput(req.body);
        // Forzar tipo GASTO
        if (movementInput.type !== 'EXPENSE') {
            throw httpError(400, 'Solo se pueden registrar gastos al reclamar una meta.');
        }
        res.status(201).json(await reclamarMeta(id, movementInput));
    } catch (error) { next(error); }
});

export default router;
