import Salarie           from "./salaries.js";
import Role              from "./role.js";
import SalarieRoleModule from "./salarie_role_module.js";
import Conge             from "./conge.js";
import Module            from "./modules.js";
import Bulpaie           from "./bulpaie.js";
import Notification      from "./notification.js";
import DocumentRequest   from "./doc_demand.js";
import sequelizeCon      from "../config/sequelize.js";

const models = {
    Salarie,
    DocumentRequest,
    Role,
    SalarieRoleModule,
    Conge,
    Module,
    Bulpaie,
    Notification,
};

Object.values(models).forEach(model => {
    if (model.associate) model.associate(models);
});

export { sequelizeCon };
export default models;