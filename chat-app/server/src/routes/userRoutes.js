import { Router } from "express";

import { getUsers } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", protect, getUsers);

export default router;
