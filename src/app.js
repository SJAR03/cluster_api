const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || "secret";

// Configuración de Swagger
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Movie API",
      version: "1.0.0",
      description: "API para reservas de cine",
    },
    servers: [
      {
        url: "http://localhost:5000",
      },
    ],
  },
  apis: ["./*.js"], // Archivos con documentación de rutas
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         email:
 *           type: string
 *           example: usuario@correo.com
 *     Reservation:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         movie:
 *           type: string
 *           example: "The Matrix"
 *         date:
 *           type: string
 *           format: date
 *           example: "2025-04-01"
 *         time:
 *           type: string
 *           format: time
 *           example: "19:30:00"
 *         sala:
 *           type: integer
 *           example: 5
 *         userId:
 *           type: integer
 *           example: 1
 */

// Middleware para autenticación
const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Acceso denegado" });

  try {
    const verified = jwt.verify(token, SECRET);
    req.user = verified;
    next();
  } catch {
    res.status(400).json({ message: "Token inválido" });
  }
};

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registra un nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: usuario@correo.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Usuario registrado con éxito
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/User"
 *       400:
 *         description: Error al registrar usuario
 */
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: { email, pwd: hashedPassword },
    });
    res.json({ id: user.id, email: user.email });
  } catch {
    res.status(400).json({ message: "Error al registrar usuario" });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Inicia sesión y obtiene un token JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: usuario@correo.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOi..."
 *       401:
 *         description: Credenciales incorrectas
 */
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.pwd))) {
    return res.status(401).json({ message: "Credenciales incorrectas" });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, {
    expiresIn: "1h",
  });
  res.json({ token });
});

/**
 * @swagger
 * /api/reservations:
 *   post:
 *     summary: Crea una reserva de cine
 *     tags: [Reservations]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               movie:
 *                 type: string
 *                 example: "The Matrix"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-04-01"
 *               time:
 *                 type: string
 *                 format: time
 *                 example: "19:30:00"
 *               sala:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       200:
 *         description: Reserva creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Reservation"
 *       401:
 *         description: Token inválido
 */
app.post("/api/reservations", authMiddleware, async (req, res) => {
  const { movie, date, time, sala } = req.body;
  const reservation = await prisma.reservation.create({
    data: {
      movie,
      date: new Date(date),
      time,
      sala,
      userId: req.user.id,
    },
  });
  res.json(reservation);
});

/**
 * @swagger
 * /api/reservations:
 *   get:
 *     summary: Obtiene las reservas del usuario autenticado
 *     tags: [Reservations]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de reservas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Reservation"
 *       401:
 *         description: Token inválido
 */
app.get("/api/reservations", authMiddleware, async (req, res) => {
  const reservations = await prisma.reservation.findMany({
    where: { userId: req.user.id },
  });
  res.json(reservations);
});

module.exports = app;
