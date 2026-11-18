import { Router } from 'express';
import { BazarController } from '../controllers/bazar-controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { FirestoreRepository } from '../repositories/firestore-repository.js';
import { BazarService } from '../services/bazar-service.js';

const router = Router();
const controller = new BazarController(
  new BazarService(new FirestoreRepository('bazar')),
);

router.get('/', asyncHandler(controller.list));
router.patch('/', asyncHandler(controller.applyChanges));

export default router;
