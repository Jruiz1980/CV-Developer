import express from 'express';
import { getMain } from '../controllers/mainController.mjs';

const router = express.Router();

router.get('/', getMain);

export default router;