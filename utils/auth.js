import jwt from 'jsonwebtoken';
import {  hash , compare  } from "bcrypt";


export const generateToken = (payload) => {
  return jwt.sign(payload, process.env.SECRET_JWT, { expiresIn: '7d' });
};

export const verifyToken = (token) => {
  return jwt.verify(token, process.env.SECRET_JWT);
};

export const hashPassword = async (password) => {
  return await hash(password,parseInt(process.env.SALT_ROUNDS));
};

export const comparePassword = async (password, hashedPassword) => {
  return await compare(password, hashedPassword);
};
