import { Router } from "express";

import { createGroup, getGroups } from "../controllers/groupController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);
router.get("/", getGroups);
router.post("/", createGroup);

export default router;
