import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { allowRoles } from "../middleware/role.js";
import * as clientController from "../controllers/clientController.js";

const router = Router();
router.use(authenticate);

router.get("/", clientController.getClients);
router.post("/", allowRoles("rh", "manager"), clientController.createClient);

export default router;
