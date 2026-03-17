import Salarie           from "./salaries.js";
import Module            from "./modules.js";
import Role              from "./role.js";
import SalarieRoleModule from "./salarie_role_module.js";
import Conge             from "./conge.js";
import CongeDay          from "./conge_jour.js";
import Bulpaie           from "./bulpaie.js";
import DocumentRequest   from "./doc_demand.js";
import DocumentResponses from "./doc_responses.js";
import Notification      from "./notification.js";
import sequelizeCon      from "../config/sequelize.js";

const models = {
    Salarie,
    Module,
    Role,
    SalarieRoleModule,
    Conge,
    CongeDay,
    Bulpaie,
    DocumentRequest,
    DocumentResponses,
    Notification,
};

Object.values(models).forEach(model => {
    if (model.associate) model.associate(models);
});

export { sequelizeCon };
export default models;