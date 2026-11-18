import { Router } from 'express';
import { DonationController } from '../controllers/donation-controller.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { FirestoreRepository } from '../repositories/firestore-repository.js';
import { DonationService } from '../services/donation-service.js';

const router = Router();
const controller = new DonationController(
  new DonationService(new FirestoreRepository('doacoes')),
);

router.get('/', asyncHandler(controller.list));
router.patch('/', asyncHandler(controller.applyChanges));

export default router;
