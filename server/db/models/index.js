import Salarie           from "./salaries.js";
import Role              from "./role.js";
import SalarieRoleModule from "./salarie_role_module.js";
import Conge             from "./conge.js";
import CongeDay          from "./conge_jour.js";
import Module            from "./modules.js";
import Notification      from "./notification.js";
import DocumentRequest   from "./doc_demand.js";
import DocumentResponses from "./doc_responses.js";
import NoteService       from "./note_service.js";
import TeletravailData   from "./teletravail.js";
import sequelizeCon      from "../config/sequelize.js";

const models = {
    Salarie, DocumentRequest, DocumentResponses,
    Role, SalarieRoleModule, Conge, CongeDay,
    Module, Notification, NoteService, TeletravailData,
};

Object.values(models).forEach(model => {
    if (model.associate) model.associate(models);
});

export { sequelizeCon };
export default models;