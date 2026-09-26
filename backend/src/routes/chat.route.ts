import { Router } from 'express';
import { handleChatMessage, handleImageMessage, handleHealthCheck } from '../controllers/chat.controller.js';

const router = Router();

router.post('/chat', handleChatMessage);
router.post('/image', handleImageMessage);
router.get('/health', handleHealthCheck);

export default router;
