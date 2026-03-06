import * as moduleService from '../services/moduleServices.js';

export const getAllModules = async (req, res) => {
  try {
    const modules = await moduleService.getAllModules();
    res.json(modules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getModuleById = async (req, res) => {
  try {
    const module = await moduleService.getModuleById(req.params.id);
    res.json(module);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const createModule = async (req, res) => {
  try {
    const module = await moduleService.createModule(req.body);
    res.status(201).json(module);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateModule = async (req, res) => {
  try {
    const module = await moduleService.updateModule(req.params.id, req.body);
    res.json(module);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteModule = async (req, res) => {
  try {
    await moduleService.deleteModule(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};