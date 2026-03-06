import * as salarieService from '../services/salarieServices.js';


export const getAllSalaries = async (req, res) => {
  try {
    const filters = req.query;
    const salarieData = {
      role: req.salarie.role,
      module_id: req.salarie.module_id,
      sal_id : req.salarie.id
    };
    const result = await salarieService.getAllSalaries(filters, salarieData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getManagerTeam = async (req, res) => {
  try {
    const team = await salarieService.getManagerTeam(req.salarie.id);
    res.json(team);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getSalarieById = async (req, res) => {
  try {
    const {role} = req.salarie
    const salarie = await salarieService.getSalarieById(req.params.id, {role , module_id : req.salarie?.module_id});
    res.json(salarie);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

// POST /salaries
export const createSalarie = async (req, res) => {
  try {
    const managerInfo = {
      man_module : req.salarie.module_id || null,
      role : req.salarie.role,
      man_id : req.salarie.id
    }
    const newSalarie = await salarieService.createSalarie(req.body, managerInfo);
    res.status(201).json(newSalarie);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT /salaries/:id
export const updateSalarie = async (req, res) => {
  try {
    const updated = await salarieService.updateSalarie(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE /salaries/:id
export const deleteSalarie = async (req, res) => {
  try {
    await salarieService.deleteSalarie(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};