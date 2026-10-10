import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  getPresets,
  getPreset,
  createPreset,
  updatePreset,
  deletePreset,
  setDefaultPreset,
} from '../controllers/aiPromptPresets';
import { getAiConfig, updateAiConfig, getOllamaModels } from '../controllers/userAiConfig';

const router = Router();

router.use(authenticate);

router.get('/presets', getPresets);
router.get('/presets/:id', getPreset);
router.post('/presets', createPreset);
router.put('/presets/:id', updatePreset);
router.delete('/presets/:id', deletePreset);
router.post('/presets/:id/set-default', setDefaultPreset);

router.get('/ai-config', getAiConfig);
router.put('/ai-config', updateAiConfig);
router.get('/ollama-models', getOllamaModels);

export default router;
