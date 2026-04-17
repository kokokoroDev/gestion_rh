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
import TeletravailSchedule from "./teletravail_schedule.js";
import TeletravailEntry from "./teletravail_entry.js";
import TeletravailParticipant from "./teletravail_participant.js";
import Client from "./client.js";
import OrdreMission from "./ordre_mission.js";
import NoteFrais from "./note_frais.js";
import NoteFraisLine from "./note_frais_line.js";
import sequelizeCon      from "../config/sequelize.js";

const models = {
    Salarie, DocumentRequest, DocumentResponses,
    Role, SalarieRoleModule, Conge, CongeDay,
    Module, Notification, NoteService, TeletravailSchedule, TeletravailEntry, TeletravailParticipant,
    Client, OrdreMission, NoteFrais, NoteFraisLine
};

Object.values(models).forEach(model => {
    if (model.associate) model.associate(models);
});

export { sequelizeCon };
export default models;
