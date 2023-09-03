import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../../config";

interface IUser {
  id: string;
  fullName: string;
  email: string;
  password: string;
}

interface IRegister extends IUser {
  password2: string;
}

export const login = async (request: Request, response: Response) => {
  const { email, password }: IUser = request.body;

  const errorJson = {
    status: "error",
    message: "Login failed. Please try again.",
    error: "unauthorized",
  };

  // cari user berdasarkan email
  const result = await db.query(
    "SELECT id, email, password FROM users WHERE email = $1 LIMIT 1",
    [email]
  );

  if (result.rowCount == 0) {
    return response.status(401).send(errorJson);
  }

  // bandingkan password db dengan password dari user
  const foundedUser: IUser = result.rows[0];
  const isPasswordMatch = await bcrypt.compare(password, foundedUser.password);

  if (!isPasswordMatch) {
    return response.status(401).send(errorJson);
  }

  // buat JWT ketika pengecekan berhasil
  const accessToken = jwt.sign(
    {
      username: foundedUser.email,
    },
    process.env.ACCESS_TOKEN_SECRET as string,
    { expiresIn: "30s" }
  );

  const refreshToken = jwt.sign(
    {
      username: foundedUser.email,
    },
    process.env.REFRESH_TOKEN_SECRET as string,
    { expiresIn: "1d" }
  );

  await db.query("UPDATE users SET refreshToken = $1 WHERE id = $2", [
    refreshToken,
    foundedUser.id,
  ]);

  return response.status(200).send({
    status: "ok",
    message: "Login successful",
    data: { accessToken },
  });
};

export const register = async (request: Request, response: Response) => {
  // terima data dari user berupa fullName, email dan password
  const { fullName, email, password, password2 }: IRegister = request.body;

  // cek apakah password dan konfirmasinya benar
  if (password !== password2) {
    return response.status(400).send({
      status: "error",
      message: "Password confirmation is not match.",
    });
  }

  // cek apakah user ada di database
  const result = await db.query(
    "SELECT id FROM users WHERE email = $1 LIMIT 1",
    [email]
  );

  if (result.rowCount >= 1) {
    return response.status(409).send({
      status: "error",
      message: "User already exists. Please use another email.",
    });
  }

  try {
    // enkripsi password terlebih dahulu
    const encryptedPassword = await bcrypt.hash(password, 10);

    // buat user baru jika belum pernah dibuat sebelumnya
    await db.query(
      "INSERT INTO users (fullName, email, password) VALUES ($1, $2, $3)",
      [fullName, email, encryptedPassword]
    );

    return response.status(201).send({
      status: "created",
      message: "Registration Successful",
    });
  } catch (error) {
    return response.status(500).send({
      status: "error",
      message: "Unable to register",
      error,
    });
  }
};