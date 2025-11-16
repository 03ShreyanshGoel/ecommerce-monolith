import bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

export const generateToken = (userId: number, role: string): string => {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};
