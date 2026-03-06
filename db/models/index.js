import Module from "./modules.js";          
import Salarie from "./salaries.js";        
import Conge from "./conge.js";             
import CongeMessage from "./congeMessage.js";
import Bulpaie from "./bulpaie.js";          
import sequelizeCon from "../config/sequelize.js";

const models = {Salarie , Conge , CongeMessage , Module , Bulpaie}

Object.values(models).forEach(model => {
    if (model.associate) {
        model.associate(models)
    }
}) 

export {sequelizeCon}
export default models