import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import * as ordreMissionController from "../controllers/ordreMissionController.js";

const router = Router();
router.use(authenticate);

router.get("/mine", ordreMissionController.getMyOrdresMission);
router.post("/", ordreMissionController.createOrdreMission);
router.get("/:id/pdf", ordreMissionController.downloadOrdreMissionPdf);

export default router;
