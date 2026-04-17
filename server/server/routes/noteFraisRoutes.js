import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { allowRoles } from "../middleware/role.js";
import * as noteFraisController from "../controllers/noteFraisController.js";

const router = Router();
router.use(authenticate);

router.get("/mine", noteFraisController.getMyNote);
router.put("/mine", noteFraisController.saveMyNote);
router.post("/mine/:id/send", noteFraisController.sendMyNoteToRh);
router.get("/mine/:id/pdf", noteFraisController.downloadMyNotePdf);

router.get("/rh/inbox", allowRoles("rh"), noteFraisController.getRhInbox);
router.put("/rh/:id/review", allowRoles("rh"), noteFraisController.markAsReviewed);

export default router;
