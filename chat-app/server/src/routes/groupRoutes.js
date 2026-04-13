import { Router } from "express";

import {
	createGroup,
	deleteGroup,
	getGroupById,
	getGroups,
	leaveGroup,
	searchGroupMembers,
} from "../controllers/groupController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);
router.get("/search-members", searchGroupMembers);
router.get("/", getGroups);
router.get("/:groupId", getGroupById);
router.post("/:groupId/leave", leaveGroup);
router.delete("/:groupId", deleteGroup);
router.post("/", createGroup);

export default router;
