import * as authService from "../services/authServices.js";


export const register = async (req, res) => {
  try {

    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    const newToken = await authService.refreshToken(token);
    res.json({ token: newToken });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    await authService.changePassword(req.salarie.id, oldPassword, newPassword);
    res.json({ message: 'Mot de passe changé avec succès' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};