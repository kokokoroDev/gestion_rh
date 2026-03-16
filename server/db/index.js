import sequelizeCon from "./config/sequelize.js";
import models from "./models/index.js";

export const test = async () => {
    try {
        await sequelizeCon.authenticate();
        console.log('connected successfully')

    } catch (error) {
        console.log('Not connected', error)
    }
}

export const testandsync = async () => {
    try {
        await sequelizeCon.sync({ alter: true })
        console.log('db is synced')
    } catch (error) {
        console.log(error)
        console.log('not synced')
    }
}

