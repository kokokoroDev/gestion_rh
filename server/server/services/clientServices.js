import models from "../db/models/index.js";

const { Client } = models;

export const getClients = async (query = {}) => {
    const { search } = query;
    const { Op } = await import("sequelize");

    const where = { is_active: true };
    if (search?.trim()) {
        where.name = { [Op.like]: `%${search.trim()}%` };
    }

    return Client.findAll({
        where,
        order: [["name", "ASC"]],
    });
};

export const createClient = async (data) => {
    const name = data?.name?.trim();
    if (!name) throw new Error("Le nom du client est requis");
    return Client.create({ name });
};
