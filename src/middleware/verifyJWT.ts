import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const verifyJWT = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const unauthorizedError = {
    status: "error",
    message: "Authentication failed.",
    error: "unauthorized",
  };
  try {
    const authHeader = request.headers["authorization"];
    if (!authHeader) {
      return response.status(401).send(unauthorizedError);
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string
    ) as jwt.JwtPayload;
    const { email, id } = decoded;
    request.user = { email, id };
    next();
  } catch (error) {
    return response.status(401).send(unauthorizedError);
  }
};
