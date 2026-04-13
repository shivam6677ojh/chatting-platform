import { Router } from "express";

import {
  getConversationMessages,
  getGroupMessages,
  markConversationSeen,
  sendGroupMessage,
  sendMessage,
} from "../controllers/messageController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);
router.get("/group/:groupId", getGroupMessages);
router.get("/:userId", getConversationMessages);
router.post("/", sendMessage);
router.post("/group", sendGroupMessage);
router.patch("/:userId/seen", markConversationSeen);

export default router;
