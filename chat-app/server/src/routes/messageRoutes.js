import { Router } from "express";

import {
  getConversationMessages,
  markConversationSeen,
  sendMessage,
} from "../controllers/messageController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);
router.get("/:userId", getConversationMessages);
router.post("/", sendMessage);
router.patch("/:userId/seen", markConversationSeen);

export default router;
