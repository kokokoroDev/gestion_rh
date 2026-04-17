import { Sequelize } from "sequelize";

const sequelizeCon = new Sequelize({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    database: process.env.DB_DATABASE,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    logging: false 
})

export default sequelizeCon