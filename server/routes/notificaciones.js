import { Router } from 'express';
import { getNotificaciones, createNotificacion, markNotificacionesLeidas } from '../repositories.js';
import { httpError } from '../validation.js';

const router = Router();

// GET /api/notificaciones — obtener todas las notificaciones
router.get('/', async (_req, res, next) => {
    try { res.json(await getNotificaciones()); } catch (error) { next(error); }
});

// POST /api/notificaciones — crear notificación al alcanzar una meta
router.post('/', async (req, res, next) => {
    try {
        const metaId = Number(req.body.metaId);
        if (!Number.isFinite(metaId) || metaId <= 0) throw httpError(400, 'metaId inválido.');
        const mensaje = String(req.body.mensaje ?? '').trim();
        if (!mensaje) throw httpError(400, 'El mensaje es obligatorio.');
        res.status(201).json(await createNotificacion({ metaId, mensaje }));
    } catch (error) { next(error); }
});

// PATCH /api/notificaciones/leer — marcar todas como leídas
router.patch('/leer', async (_req, res, next) => {
    try { res.json(await markNotificacionesLeidas()); } catch (error) { next(error); }
});

export default router;
