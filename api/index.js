var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server/vercelHandler.ts
var vercelHandler_exports = {};
__export(vercelHandler_exports, {
  default: () => vercelHandler_default
});
module.exports = __toCommonJS(vercelHandler_exports);

// server/app.ts
var import_express_async_errors = require("express-async-errors");
var import_express22 = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);

// server/routes/authRoutes.ts
var import_express = require("express");

// server/controllers/authController.ts
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_client2 = require("@prisma/client");

// server/utils/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = globalThis;
var prisma = globalForPrisma.prisma ?? new import_client.PrismaClient({
  log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"]
});
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// server/utils/jwt.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error(
    "JWT_SECRET is not set. Refusing to start in production with an insecure default signing secret."
  );
}
var JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret-change-me";
var JWT_EXPIRES_IN = "7d";
function signToken(payload) {
  return import_jsonwebtoken.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
function verifyToken(token) {
  return import_jsonwebtoken.default.verify(token, JWT_SECRET);
}

// server/utils/tokens.ts
var import_crypto = __toESM(require("crypto"), 1);
function generateSecureToken() {
  return import_crypto.default.randomBytes(32).toString("hex");
}
function generateOtpCode() {
  return import_crypto.default.randomInt(0, 1e6).toString().padStart(6, "0");
}

// server/services/emailService.ts
async function sendEmail({ to, subject, body }) {
  console.log(`[email-service] (stub) Would send email to ${to}`);
  console.log(`[email-service] Subject: ${subject}`);
  console.log(`[email-service] Body: ${body}`);
}
async function sendVerificationEmail(to, code) {
  await sendEmail({
    to,
    subject: "Verify your JustCarSale account",
    body: `Your verification code is: ${code}

Enter this 6-digit code to verify your account. It expires in 10 minutes.`
  });
}
async function sendPasswordResetEmail(to, token) {
  await sendEmail({
    to,
    subject: "Reset your JustCarSale password",
    body: `Your password reset token is: ${token}

Use POST /api/auth/reset-password with this token and a new password.`
  });
}

// server/utils/validation.ts
function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function isStrongEnoughPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

// server/controllers/authController.ts
var SALT_ROUNDS = 10;
var VERIFICATION_CODE_TTL_MS = 10 * 60 * 1e3;
var RESET_TOKEN_TTL_MS = 60 * 60 * 1e3;
var OTP_CREATE_MAX_ATTEMPTS = 5;
async function createVerificationCode(userId) {
  for (let attempt = 0; attempt < OTP_CREATE_MAX_ATTEMPTS; attempt++) {
    const code = generateOtpCode();
    try {
      await prisma.emailVerificationToken.create({
        data: {
          userId,
          token: code,
          expiresAt: new Date(Date.now() + VERIFICATION_CODE_TTL_MS)
        }
      });
      return code;
    } catch (err) {
      if (err instanceof import_client2.Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        continue;
      }
      throw err;
    }
  }
  throw new Error("Could not generate a unique verification code");
}
function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatar: user.avatar,
    country: user.country,
    city: user.city,
    role: user.role,
    emailVerified: user.emailVerified,
    identityVerified: user.identityVerified,
    createdAt: user.createdAt
  };
}
async function register(req, res) {
  const { email, password, firstName, lastName, phone } = req.body ?? {};
  if (!isValidEmail(email)) {
    res.status(400).json({ error: "A valid email is required" });
    return;
  }
  if (!isStrongEnoughPassword(password)) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  if (!isNonEmptyString(firstName) || !isNonEmptyString(lastName)) {
    res.status(400).json({ error: "firstName and lastName are required" });
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }
  const passwordHash = await import_bcryptjs.default.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      phone: isNonEmptyString(phone) ? phone : null
    }
  });
  const code = await createVerificationCode(user.id);
  await sendVerificationEmail(user.email, code);
  const jwtToken = signToken({ userId: user.id, email: user.email, role: user.role });
  res.status(201).json({ user: publicUser(user), token: jwtToken });
}
async function resendVerification(req, res) {
  const userId = req.user.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (user.emailVerified) {
    res.status(400).json({ error: "Email is already verified" });
    return;
  }
  await prisma.emailVerificationToken.deleteMany({ where: { userId } });
  const code = await createVerificationCode(userId);
  await sendVerificationEmail(user.email, code);
  res.json({ success: true, message: "A new verification code has been sent" });
}
async function login(req, res) {
  const { email, password } = req.body ?? {};
  if (!isValidEmail(email) || !isNonEmptyString(password)) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || user.deletedAt) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const valid = await import_bcryptjs.default.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const jwtToken = signToken({ userId: user.id, email: user.email, role: user.role });
  res.json({ user: publicUser(user), token: jwtToken });
}
async function verifyEmail(req, res) {
  const { token } = req.body ?? {};
  if (!isNonEmptyString(token)) {
    res.status(400).json({ error: "token is required" });
    return;
  }
  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record || record.expiresAt < /* @__PURE__ */ new Date()) {
    res.status(400).json({ error: "Invalid or expired verification token" });
    return;
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
    prisma.emailVerificationToken.delete({ where: { id: record.id } })
  ]);
  res.json({ success: true, message: "Email verified successfully" });
}
async function forgotPassword(req, res) {
  const { email } = req.body ?? {};
  if (!isValidEmail(email)) {
    res.status(400).json({ error: "A valid email is required" });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (user && !user.deletedAt) {
    const token = generateSecureToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS)
      }
    });
    await sendPasswordResetEmail(user.email, token);
  }
  res.json({ success: true, message: "If that email exists, a reset link has been sent" });
}
async function resetPassword(req, res) {
  const { token, newPassword } = req.body ?? {};
  if (!isNonEmptyString(token)) {
    res.status(400).json({ error: "token is required" });
    return;
  }
  if (!isStrongEnoughPassword(newPassword)) {
    res.status(400).json({ error: "newPassword must be at least 8 characters" });
    return;
  }
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.usedAt || record.expiresAt < /* @__PURE__ */ new Date()) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }
  const passwordHash = await import_bcryptjs.default.hash(newPassword, SALT_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: /* @__PURE__ */ new Date() } })
  ]);
  res.json({ success: true, message: "Password reset successfully" });
}
async function me(req, res) {
  const userId = req.user.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user: publicUser(user) });
}
async function completeProfile(req, res) {
  const userId = req.user.userId;
  const { country, city, avatar } = req.body ?? {};
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      country: isNonEmptyString(country) ? country : void 0,
      city: isNonEmptyString(city) ? city : void 0,
      avatar: isNonEmptyString(avatar) ? avatar : void 0
    }
  });
  res.json({ user: publicUser(user) });
}
var UPGRADABLE_ROLES = ["BUSINESS", "INSURANCE", "WORKSHOP", "LOGISTICS", "GOVERNMENT", "POLICE"];
async function selectRole(req, res) {
  const userId = req.user.userId;
  const { role } = req.body ?? {};
  if (typeof role !== "string" || !UPGRADABLE_ROLES.includes(role)) {
    res.status(400).json({
      error: `role must be one of: ${UPGRADABLE_ROLES.join(", ")}`
    });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  await prisma.notification.create({
    data: {
      userId,
      type: "ROLE_UPGRADE_REQUEST",
      title: "Role upgrade requested",
      message: `Request to upgrade role to ${role} is pending admin approval`
    }
  });
  res.json({
    success: true,
    message: "Role upgrade request submitted for admin approval",
    pendingRole: role
  });
}

// server/middleware/auth.ts
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }
  const token = authHeader.slice("Bearer ".length);
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions for this action" });
      return;
    }
    next();
  };
}

// server/routes/authRoutes.ts
var router = (0, import_express.Router)();
router.post("/register", register);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", requireAuth, resendVerification);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", requireAuth, me);
router.put("/complete-profile", requireAuth, completeProfile);
router.put("/select-role", requireAuth, selectRole);
var authRoutes_default = router;

// server/routes/vehicleRoutes.ts
var import_express2 = require("express");

// server/utils/response.ts
function ok(res, data, status = 200) {
  res.status(status).json({ success: true, data });
}
function okPaginated(res, data, meta) {
  res.status(200).json({
    success: true,
    data,
    meta: {
      page: meta.page,
      limit: meta.limit,
      total: meta.total,
      totalPages: Math.max(1, Math.ceil(meta.total / meta.limit))
    }
  });
}
function fail(res, status, error) {
  res.status(status).json({ success: false, error });
}
function parsePagination(query, defaultLimit = 20, maxLimit = 100) {
  let page = parseInt(String(query.page ?? "1"), 10);
  let limit = parseInt(String(query.limit ?? String(defaultLimit)), 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;
  return { page, limit, skip: (page - 1) * limit };
}

// server/controllers/vehicleController.ts
var VEHICLE_CONDITIONS = ["NEW", "USED", "DAMAGED", "EXPORT"];
var VEHICLE_STATUSES = ["ACTIVE", "SOLD", "RESERVED", "EXPIRED", "FLAGGED"];
var publicVehicleInclude = {
  photos: { orderBy: { order: "asc" } },
  seller: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
      phone: true,
      country: true,
      city: true,
      role: true
    }
  }
};
function toNumber(value) {
  if (value === void 0 || value === null || value === "") return void 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : void 0;
}
function toInt(value) {
  if (value === void 0 || value === null || value === "") return void 0;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : void 0;
}
async function createVehicle(req, res) {
  const userId = req.user.userId;
  const body = req.body ?? {};
  const requiredStrings = ["vin", "make", "model", "fuelType", "transmission", "country", "city"];
  for (const field of requiredStrings) {
    if (!isNonEmptyString(body[field])) {
      fail(res, 400, `${field} is required`);
      return;
    }
  }
  const year = toInt(body.year);
  const mileage = toInt(body.mileage);
  const price = toNumber(body.price);
  if (year === void 0 || year < 1900 || year > (/* @__PURE__ */ new Date()).getFullYear() + 1) {
    fail(res, 400, "A valid year is required");
    return;
  }
  if (mileage === void 0 || mileage < 0) {
    fail(res, 400, "A valid mileage is required");
    return;
  }
  if (price === void 0 || price <= 0) {
    fail(res, 400, "A valid price is required");
    return;
  }
  if (body.condition !== void 0 && !VEHICLE_CONDITIONS.includes(body.condition)) {
    fail(res, 400, `condition must be one of: ${VEHICLE_CONDITIONS.join(", ")}`);
    return;
  }
  const existingVin = await prisma.vehicle.findUnique({ where: { vin: body.vin } });
  if (existingVin) {
    fail(res, 409, "A vehicle with this VIN already exists");
    return;
  }
  let photos = [];
  if (Array.isArray(body.photos)) {
    photos = body.photos.filter((p) => p && typeof p === "object" && isNonEmptyString(p.url)).map((p, idx) => ({
      url: p.url,
      isPrimary: Boolean(p.isPrimary),
      order: typeof p.order === "number" ? p.order : idx
    }));
  }
  try {
    const vehicle = await prisma.vehicle.create({
      data: {
        sellerId: userId,
        vin: body.vin,
        make: body.make,
        model: body.model,
        year,
        mileage,
        fuelType: body.fuelType,
        transmission: body.transmission,
        color: isNonEmptyString(body.color) ? body.color : null,
        bodyType: isNonEmptyString(body.bodyType) ? body.bodyType : null,
        engineSize: isNonEmptyString(body.engineSize) ? body.engineSize : null,
        power: isNonEmptyString(body.power) ? body.power : null,
        price,
        currency: isNonEmptyString(body.currency) ? body.currency : "USD",
        country: body.country,
        city: body.city,
        condition: body.condition ?? "USED",
        description: isNonEmptyString(body.description) ? body.description : null,
        photos: photos.length > 0 ? { create: photos } : void 0
      },
      include: publicVehicleInclude
    });
    ok(res, vehicle, 201);
  } catch (err) {
    fail(res, 400, "Failed to create vehicle listing");
  }
}
async function listVehicles(req, res) {
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const where = {
    deletedAt: null,
    status: isNonEmptyString(q.status) && VEHICLE_STATUSES.includes(q.status) ? q.status : "ACTIVE"
  };
  if (isNonEmptyString(q.search)) {
    const search = q.search;
    where.OR = [
      { make: { contains: search, mode: "insensitive" } },
      { model: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } }
    ];
  }
  if (isNonEmptyString(q.make)) where.make = { equals: q.make, mode: "insensitive" };
  if (isNonEmptyString(q.model)) where.model = { equals: q.model, mode: "insensitive" };
  if (toInt(q.year) !== void 0) where.year = toInt(q.year);
  const minPrice = toNumber(q.minPrice);
  const maxPrice = toNumber(q.maxPrice);
  if (minPrice !== void 0 || maxPrice !== void 0) {
    where.price = {};
    if (minPrice !== void 0) where.price.gte = minPrice;
    if (maxPrice !== void 0) where.price.lte = maxPrice;
  }
  const minYear = toInt(q.minYear);
  const maxYear = toInt(q.maxYear);
  if (minYear !== void 0 || maxYear !== void 0) {
    where.year = { ...typeof where.year === "object" ? where.year : {}, ...minYear !== void 0 ? { gte: minYear } : {}, ...maxYear !== void 0 ? { lte: maxYear } : {} };
  }
  const minMileage = toInt(q.minMileage);
  const maxMileage = toInt(q.maxMileage);
  if (minMileage !== void 0 || maxMileage !== void 0) {
    where.mileage = {};
    if (minMileage !== void 0) where.mileage.gte = minMileage;
    if (maxMileage !== void 0) where.mileage.lte = maxMileage;
  }
  if (isNonEmptyString(q.fuelType)) where.fuelType = { equals: q.fuelType, mode: "insensitive" };
  if (isNonEmptyString(q.transmission)) where.transmission = { equals: q.transmission, mode: "insensitive" };
  if (isNonEmptyString(q.bodyType)) where.bodyType = { equals: q.bodyType, mode: "insensitive" };
  if (isNonEmptyString(q.color)) where.color = { equals: q.color, mode: "insensitive" };
  if (isNonEmptyString(q.condition) && VEHICLE_CONDITIONS.includes(q.condition)) {
    where.condition = q.condition;
  }
  if (isNonEmptyString(q.country)) where.country = { equals: q.country, mode: "insensitive" };
  if (isNonEmptyString(q.city)) where.city = { equals: q.city, mode: "insensitive" };
  let orderBy = { createdAt: "desc" };
  switch (q.sortBy) {
    case "price_asc":
      orderBy = { price: "asc" };
      break;
    case "price_desc":
      orderBy = { price: "desc" };
      break;
    case "year_desc":
      orderBy = { year: "desc" };
      break;
    case "mileage_asc":
      orderBy = { mileage: "asc" };
      break;
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
  }
  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      include: publicVehicleInclude,
      orderBy,
      skip,
      take: limit
    }),
    prisma.vehicle.count({ where })
  ]);
  okPaginated(res, vehicles, { page, limit, total });
}
async function myListings(req, res) {
  const userId = req.user.userId;
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const where = { sellerId: userId, deletedAt: null };
  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      include: publicVehicleInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.vehicle.count({ where })
  ]);
  okPaginated(res, vehicles, { page, limit, total });
}
async function getVehicle(req, res) {
  const { id } = req.params;
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, deletedAt: null },
    include: publicVehicleInclude
  });
  if (!vehicle) {
    fail(res, 404, "Vehicle not found");
    return;
  }
  ok(res, vehicle);
}
async function loadOwnedVehicle(id, userId) {
  return prisma.vehicle.findFirst({ where: { id, deletedAt: null } });
}
async function updateVehicle(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const vehicle = await loadOwnedVehicle(id, userId);
  if (!vehicle) {
    fail(res, 404, "Vehicle not found");
    return;
  }
  if (vehicle.sellerId !== userId) {
    fail(res, 403, "You do not own this vehicle listing");
    return;
  }
  const body = req.body ?? {};
  const data = {};
  const stringFields = ["make", "model", "fuelType", "transmission", "color", "bodyType", "engineSize", "power", "currency", "country", "city", "description"];
  for (const field of stringFields) {
    if (body[field] !== void 0) {
      if (!isNonEmptyString(body[field]) && body[field] !== null) {
        fail(res, 400, `${field} must be a non-empty string`);
        return;
      }
      data[field] = body[field];
    }
  }
  if (body.year !== void 0) {
    const year = toInt(body.year);
    if (year === void 0 || year < 1900 || year > (/* @__PURE__ */ new Date()).getFullYear() + 1) {
      fail(res, 400, "A valid year is required");
      return;
    }
    data.year = year;
  }
  if (body.mileage !== void 0) {
    const mileage = toInt(body.mileage);
    if (mileage === void 0 || mileage < 0) {
      fail(res, 400, "A valid mileage is required");
      return;
    }
    data.mileage = mileage;
  }
  if (body.price !== void 0) {
    const price = toNumber(body.price);
    if (price === void 0 || price <= 0) {
      fail(res, 400, "A valid price is required");
      return;
    }
    data.price = price;
  }
  if (body.condition !== void 0) {
    if (!VEHICLE_CONDITIONS.includes(body.condition)) {
      fail(res, 400, `condition must be one of: ${VEHICLE_CONDITIONS.join(", ")}`);
      return;
    }
    data.condition = body.condition;
  }
  const updated = await prisma.vehicle.update({
    where: { id },
    data,
    include: publicVehicleInclude
  });
  ok(res, updated);
}
async function deleteVehicle(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const vehicle = await loadOwnedVehicle(id, userId);
  if (!vehicle) {
    fail(res, 404, "Vehicle not found");
    return;
  }
  if (vehicle.sellerId !== userId) {
    fail(res, 403, "You do not own this vehicle listing");
    return;
  }
  await prisma.vehicle.update({ where: { id }, data: { deletedAt: /* @__PURE__ */ new Date() } });
  ok(res, { id, deleted: true });
}
async function updateVehicleStatus(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const { status } = req.body ?? {};
  if (!isNonEmptyString(status) || !VEHICLE_STATUSES.includes(status)) {
    fail(res, 400, `status must be one of: ${VEHICLE_STATUSES.join(", ")}`);
    return;
  }
  const vehicle = await loadOwnedVehicle(id, userId);
  if (!vehicle) {
    fail(res, 404, "Vehicle not found");
    return;
  }
  if (vehicle.sellerId !== userId) {
    fail(res, 403, "You do not own this vehicle listing");
    return;
  }
  const updated = await prisma.vehicle.update({
    where: { id },
    data: { status },
    include: publicVehicleInclude
  });
  ok(res, updated);
}
async function addPhotos(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const body = req.body;
  const photosInput = Array.isArray(body) ? body : body?.photos;
  if (!Array.isArray(photosInput) || photosInput.length === 0) {
    fail(res, 400, "photos must be a non-empty array of {url, isPrimary, order}");
    return;
  }
  const vehicle = await loadOwnedVehicle(id, userId);
  if (!vehicle) {
    fail(res, 404, "Vehicle not found");
    return;
  }
  if (vehicle.sellerId !== userId) {
    fail(res, 403, "You do not own this vehicle listing");
    return;
  }
  const validPhotos = [];
  for (const p of photosInput) {
    if (!p || typeof p !== "object" || !isNonEmptyString(p.url)) {
      fail(res, 400, "Each photo requires a url");
      return;
    }
    validPhotos.push({
      vehicleId: id,
      url: p.url,
      isPrimary: Boolean(p.isPrimary),
      order: typeof p.order === "number" ? p.order : 0
    });
  }
  await prisma.vehiclePhoto.createMany({ data: validPhotos });
  const photos = await prisma.vehiclePhoto.findMany({ where: { vehicleId: id }, orderBy: { order: "asc" } });
  ok(res, photos, 201);
}
async function deletePhoto(req, res) {
  const userId = req.user.userId;
  const { vehicleId, photoId } = req.params;
  const vehicle = await loadOwnedVehicle(vehicleId, userId);
  if (!vehicle) {
    fail(res, 404, "Vehicle not found");
    return;
  }
  if (vehicle.sellerId !== userId) {
    fail(res, 403, "You do not own this vehicle listing");
    return;
  }
  const photo = await prisma.vehiclePhoto.findFirst({ where: { id: photoId, vehicleId } });
  if (!photo) {
    fail(res, 404, "Photo not found");
    return;
  }
  await prisma.vehiclePhoto.delete({ where: { id: photoId } });
  ok(res, { id: photoId, deleted: true });
}
async function updatePhoto(req, res) {
  const userId = req.user.userId;
  const { vehicleId, photoId } = req.params;
  const { isPrimary, order } = req.body ?? {};
  const vehicle = await loadOwnedVehicle(vehicleId, userId);
  if (!vehicle) {
    fail(res, 404, "Vehicle not found");
    return;
  }
  if (vehicle.sellerId !== userId) {
    fail(res, 403, "You do not own this vehicle listing");
    return;
  }
  const photo = await prisma.vehiclePhoto.findFirst({ where: { id: photoId, vehicleId } });
  if (!photo) {
    fail(res, 404, "Photo not found");
    return;
  }
  const data = {};
  if (isPrimary !== void 0) data.isPrimary = Boolean(isPrimary);
  if (order !== void 0) {
    const orderNum = toInt(order);
    if (orderNum === void 0) {
      fail(res, 400, "order must be a number");
      return;
    }
    data.order = orderNum;
  }
  const updated = await prisma.vehiclePhoto.update({ where: { id: photoId }, data });
  ok(res, updated);
}

// server/routes/vehicleRoutes.ts
var router2 = (0, import_express2.Router)();
router2.get("/my-listings", requireAuth, myListings);
router2.post("/", requireAuth, createVehicle);
router2.get("/", listVehicles);
router2.get("/:id", getVehicle);
router2.put("/:id", requireAuth, updateVehicle);
router2.delete("/:id", requireAuth, deleteVehicle);
router2.patch("/:id/status", requireAuth, updateVehicleStatus);
router2.post("/:id/photos", requireAuth, addPhotos);
router2.delete("/:vehicleId/photos/:photoId", requireAuth, deletePhoto);
router2.patch("/:vehicleId/photos/:photoId", requireAuth, updatePhoto);
var vehicleRoutes_default = router2;

// server/routes/businessRoutes.ts
var import_express3 = require("express");

// server/utils/businessTypes.ts
var BUSINESS_TYPES = [
  "DEALER",
  "WORKSHOP",
  "TIRE_SHOP",
  "DRIVING_SCHOOL",
  "RENTAL",
  "DISMANTLER",
  "LAWYER",
  "PAINTER",
  "GLASS_REPAIR",
  "METALWORK",
  "WRAPPING",
  "DETAILING"
];

// server/controllers/businessController.ts
function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
async function generateUniqueSlug(name) {
  const base = slugify(name) || "business";
  let slug = base;
  let counter = 1;
  while (await prisma.businessProfile.findUnique({ where: { slug } })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}
async function createBusiness(req, res) {
  const userId = req.user.userId;
  const body = req.body ?? {};
  if (!isNonEmptyString(body.businessName)) {
    fail(res, 400, "businessName is required");
    return;
  }
  if (!isNonEmptyString(body.businessType) || !BUSINESS_TYPES.includes(body.businessType)) {
    fail(res, 400, `businessType must be one of: ${BUSINESS_TYPES.join(", ")}`);
    return;
  }
  const slug = isNonEmptyString(body.slug) ? slugify(body.slug) : await generateUniqueSlug(body.businessName);
  const existingSlug = await prisma.businessProfile.findUnique({ where: { slug } });
  if (existingSlug) {
    fail(res, 409, "That slug is already taken");
    return;
  }
  const business = await prisma.businessProfile.create({
    data: {
      userId,
      businessType: body.businessType,
      businessName: body.businessName,
      slug,
      description: isNonEmptyString(body.description) ? body.description : null,
      logo: isNonEmptyString(body.logo) ? body.logo : null,
      coverImage: isNonEmptyString(body.coverImage) ? body.coverImage : null,
      address: isNonEmptyString(body.address) ? body.address : null,
      country: isNonEmptyString(body.country) ? body.country : null,
      city: isNonEmptyString(body.city) ? body.city : null,
      phone: isNonEmptyString(body.phone) ? body.phone : null,
      website: isNonEmptyString(body.website) ? body.website : null,
      taxId: isNonEmptyString(body.taxId) ? body.taxId : null,
      verified: false
    }
  });
  ok(res, business, 201);
}
async function listBusinesses(req, res) {
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const where = { verified: true };
  if (isNonEmptyString(q.businessType) && BUSINESS_TYPES.includes(q.businessType)) {
    where.businessType = q.businessType;
  }
  if (isNonEmptyString(q.country)) where.country = { equals: q.country, mode: "insensitive" };
  if (isNonEmptyString(q.city)) where.city = { equals: q.city, mode: "insensitive" };
  if (isNonEmptyString(q.search)) {
    where.businessName = { contains: q.search, mode: "insensitive" };
  }
  let orderBy = { createdAt: "desc" };
  switch (q.sortBy) {
    case "rating":
      orderBy = { rating: "desc" };
      break;
    case "reviewCount":
      orderBy = { reviewCount: "desc" };
      break;
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
  }
  const [businesses, total] = await Promise.all([
    prisma.businessProfile.findMany({ where, orderBy, skip, take: limit }),
    prisma.businessProfile.count({ where })
  ]);
  okPaginated(res, businesses, { page, limit, total });
}
async function getBusinessBySlug(req, res) {
  const { slug } = req.params;
  const business = await prisma.businessProfile.findUnique({
    where: { slug },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }
    }
  });
  if (!business) {
    fail(res, 404, "Business not found");
    return;
  }
  ok(res, business);
}
async function getBusinessVehicles(req, res) {
  const { id } = req.params;
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const business = await prisma.businessProfile.findUnique({ where: { id } });
  if (!business) {
    fail(res, 404, "Business not found");
    return;
  }
  const where = {
    sellerId: business.userId,
    status: "ACTIVE",
    deletedAt: null
  };
  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      include: { photos: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.vehicle.count({ where })
  ]);
  okPaginated(res, vehicles, { page, limit, total });
}
async function updateBusiness(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const business = await prisma.businessProfile.findUnique({ where: { id } });
  if (!business) {
    fail(res, 404, "Business not found");
    return;
  }
  if (business.userId !== userId) {
    fail(res, 403, "You do not own this business profile");
    return;
  }
  const body = req.body ?? {};
  const data = {};
  const stringFields = ["businessName", "description", "logo", "coverImage", "address", "country", "city", "phone", "website", "taxId"];
  for (const field of stringFields) {
    if (body[field] !== void 0) {
      data[field] = isNonEmptyString(body[field]) ? body[field] : null;
    }
  }
  if (body.businessType !== void 0) {
    if (!BUSINESS_TYPES.includes(body.businessType)) {
      fail(res, 400, `businessType must be one of: ${BUSINESS_TYPES.join(", ")}`);
      return;
    }
    data.businessType = body.businessType;
  }
  const updated = await prisma.businessProfile.update({ where: { id }, data });
  ok(res, updated);
}
async function myBusiness(req, res) {
  const userId = req.user.userId;
  const businesses = await prisma.businessProfile.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });
  ok(res, businesses);
}

// server/services/notificationService.ts
async function createNotification(userId, type, title, message, link) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      link: link ?? null
    }
  });
}

// server/controllers/reviewController.ts
async function createReview(req, res) {
  const userId = req.user.userId;
  const { id: businessId } = req.params;
  const { rating, comment } = req.body ?? {};
  const ratingNum = Number(rating);
  if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    fail(res, 400, "rating must be a number between 1 and 5");
    return;
  }
  const business = await prisma.businessProfile.findUnique({ where: { id: businessId } });
  if (!business) {
    fail(res, 404, "Business not found");
    return;
  }
  if (business.userId === userId) {
    fail(res, 400, "You cannot review your own business");
    return;
  }
  const existing = await prisma.review.findUnique({
    where: { reviewerId_businessId: { reviewerId: userId, businessId } }
  });
  if (existing) {
    fail(res, 409, "You have already reviewed this business");
    return;
  }
  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        reviewerId: userId,
        businessId,
        rating: Math.round(ratingNum),
        comment: typeof comment === "string" && comment.trim().length > 0 ? comment : null
      }
    });
    const agg = await tx.review.aggregate({
      where: { businessId },
      _avg: { rating: true },
      _count: { rating: true }
    });
    await tx.businessProfile.update({
      where: { id: businessId },
      data: {
        rating: agg._avg.rating ?? 0,
        reviewCount: agg._count.rating
      }
    });
    return created;
  });
  await createNotification(
    business.userId,
    "NEW_REVIEW",
    "New review received",
    `Your business received a new ${Math.round(ratingNum)}-star review`,
    `/businesses/${business.slug}`
  );
  ok(res, review, 201);
}
async function listReviews(req, res) {
  const { id: businessId } = req.params;
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { businessId },
      include: {
        reviewer: { select: { id: true, firstName: true, lastName: true, avatar: true } }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.review.count({ where: { businessId } })
  ]);
  okPaginated(res, reviews, { page, limit, total });
}
async function deleteReview(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    fail(res, 404, "Review not found");
    return;
  }
  if (review.reviewerId !== userId) {
    fail(res, 403, "You can only delete your own review");
    return;
  }
  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id } });
    const agg = await tx.review.aggregate({
      where: { businessId: review.businessId },
      _avg: { rating: true },
      _count: { rating: true }
    });
    await tx.businessProfile.update({
      where: { id: review.businessId },
      data: {
        rating: agg._avg.rating ?? 0,
        reviewCount: agg._count.rating
      }
    });
  });
  ok(res, { id, deleted: true });
}

// server/routes/businessRoutes.ts
var router3 = (0, import_express3.Router)();
router3.get("/my-business", requireAuth, myBusiness);
router3.post("/", requireAuth, createBusiness);
router3.get("/", listBusinesses);
router3.get("/:slug", getBusinessBySlug);
router3.get("/:id/vehicles", getBusinessVehicles);
router3.put("/:id", requireAuth, updateBusiness);
router3.post("/:id/reviews", requireAuth, createReview);
router3.get("/:id/reviews", listReviews);
var businessRoutes_default = router3;

// server/routes/reviewRoutes.ts
var import_express4 = require("express");
var router4 = (0, import_express4.Router)();
router4.delete("/:id", requireAuth, deleteReview);
var reviewRoutes_default = router4;

// server/routes/bookingRoutes.ts
var import_express5 = require("express");

// server/controllers/bookingController.ts
var BOOKING_STATUSES = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];
async function createBooking(req, res) {
  const userId = req.user.userId;
  const { businessId, serviceType, date, timeSlot, notes } = req.body ?? {};
  if (!isNonEmptyString(businessId)) {
    fail(res, 400, "businessId is required");
    return;
  }
  if (!isNonEmptyString(serviceType)) {
    fail(res, 400, "serviceType is required");
    return;
  }
  const parsedDate = new Date(date);
  if (!date || Number.isNaN(parsedDate.getTime())) {
    fail(res, 400, "A valid date is required");
    return;
  }
  const business = await prisma.businessProfile.findUnique({ where: { id: businessId } });
  if (!business) {
    fail(res, 404, "Business not found");
    return;
  }
  const booking = await prisma.booking.create({
    data: {
      userId,
      businessId,
      serviceType,
      date: parsedDate,
      timeSlot: isNonEmptyString(timeSlot) ? timeSlot : null,
      notes: isNonEmptyString(notes) ? notes : null
    }
  });
  ok(res, booking, 201);
}
async function myBookings(req, res) {
  const userId = req.user.userId;
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: { userId },
      include: {
        business: { select: { id: true, businessName: true, slug: true, logo: true } }
      },
      orderBy: { date: "desc" },
      skip,
      take: limit
    }),
    prisma.booking.count({ where: { userId } })
  ]);
  okPaginated(res, bookings, { page, limit, total });
}
async function businessBookings(req, res) {
  const userId = req.user.userId;
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const businesses = await prisma.businessProfile.findMany({ where: { userId }, select: { id: true } });
  const businessIds = businesses.map((b) => b.id);
  if (businessIds.length === 0) {
    okPaginated(res, [], { page, limit, total: 0 });
    return;
  }
  const where = { businessId: { in: businessIds } };
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true, phone: true } },
        business: { select: { id: true, businessName: true, slug: true } }
      },
      orderBy: { date: "desc" },
      skip,
      take: limit
    }),
    prisma.booking.count({ where })
  ]);
  okPaginated(res, bookings, { page, limit, total });
}
async function updateBookingStatus(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const { status } = req.body ?? {};
  if (!isNonEmptyString(status) || !BOOKING_STATUSES.includes(status)) {
    fail(res, 400, `status must be one of: ${BOOKING_STATUSES.join(", ")}`);
    return;
  }
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { business: { select: { userId: true } } }
  });
  if (!booking) {
    fail(res, 404, "Booking not found");
    return;
  }
  const isCreator = booking.userId === userId;
  const isBusinessOwner = booking.business.userId === userId;
  if (!isCreator && !isBusinessOwner) {
    fail(res, 403, "You do not have permission to update this booking");
    return;
  }
  const updated = await prisma.booking.update({
    where: { id },
    data: { status }
  });
  const notifyUserId = isCreator ? booking.business.userId : booking.userId;
  await createNotification(
    notifyUserId,
    "BOOKING_STATUS_UPDATED",
    "Booking status updated",
    `Your booking status changed to ${status}`,
    `/bookings/${id}`
  );
  ok(res, updated);
}

// server/routes/bookingRoutes.ts
var router5 = (0, import_express5.Router)();
router5.get("/my-bookings", requireAuth, myBookings);
router5.get("/business-bookings", requireAuth, businessBookings);
router5.post("/", requireAuth, createBooking);
router5.patch("/:id/status", requireAuth, updateBookingStatus);
var bookingRoutes_default = router5;

// server/routes/marketplaceRoutes.ts
var import_express6 = require("express");

// server/controllers/marketplaceController.ts
var import_client3 = require("@prisma/client");
async function stats(_req, res) {
  const now = /* @__PURE__ */ new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
  const totalActiveVehicles = await prisma.vehicle.count({ where: { status: "ACTIVE", deletedAt: null } });
  const totalDealers = await prisma.businessProfile.count({ where: { verified: true } });
  const countries = await prisma.vehicle.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    select: { country: true },
    distinct: ["country"]
  });
  const vehiclesThisWeek = await prisma.vehicle.count({
    where: { status: "ACTIVE", deletedAt: null, createdAt: { gte: weekAgo } }
  });
  ok(res, {
    totalActiveVehicles,
    totalDealers,
    totalCountries: countries.length,
    vehiclesAddedThisWeek: vehiclesThisWeek
  });
}
async function featured(_req, res) {
  const sample = await prisma.$queryRaw(
    import_client3.Prisma.sql`SELECT id FROM vehicles WHERE status = 'ACTIVE' AND "deletedAt" IS NULL ORDER BY random() LIMIT 8`
  );
  const ids = sample.map((v) => v.id);
  const vehicles = await prisma.vehicle.findMany({
    where: { id: { in: ids } },
    include: {
      photos: { orderBy: { order: "asc" } },
      seller: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } }
    }
  });
  ok(res, vehicles);
}
async function makes(_req, res) {
  const grouped = await prisma.vehicle.groupBy({
    by: ["make"],
    where: { status: "ACTIVE", deletedAt: null },
    _count: { make: true },
    orderBy: { _count: { make: "desc" } }
  });
  ok(
    res,
    grouped.map((g) => ({ make: g.make, count: g._count.make }))
  );
}
async function recent(_req, res) {
  const vehicles = await prisma.vehicle.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    include: {
      photos: { orderBy: { order: "asc" } },
      seller: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });
  ok(res, vehicles);
}

// server/routes/marketplaceRoutes.ts
var router6 = (0, import_express6.Router)();
router6.get("/stats", stats);
router6.get("/featured", featured);
router6.get("/makes", makes);
router6.get("/recent", recent);
var marketplaceRoutes_default = router6;

// server/routes/auctionRoutes.ts
var import_express7 = require("express");

// server/controllers/auctionController.ts
var DURATIONS = ["H24", "H48", "D7"];
var DURATION_MS = {
  H24: 24 * 60 * 60 * 1e3,
  H48: 48 * 60 * 60 * 1e3,
  D7: 7 * 24 * 60 * 60 * 1e3
};
function toNumber2(value) {
  if (value === void 0 || value === null || value === "") return void 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : void 0;
}
var auctionInclude = {
  vehicle: { include: { photos: { orderBy: { order: "asc" } } } },
  seller: { select: { id: true, firstName: true, lastName: true, avatar: true } }
};
async function createAuction(req, res) {
  const userId = req.user.userId;
  const { vehicleId, startingPrice, reservePrice, duration, depositRequired } = req.body ?? {};
  if (!isNonEmptyString(vehicleId)) {
    fail(res, 400, "vehicleId is required");
    return;
  }
  const startPrice = toNumber2(startingPrice);
  if (startPrice === void 0 || startPrice <= 0) {
    fail(res, 400, "A valid startingPrice is required");
    return;
  }
  if (!isNonEmptyString(duration) || !DURATIONS.includes(duration)) {
    fail(res, 400, `duration must be one of: ${DURATIONS.join(", ")}`);
    return;
  }
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, deletedAt: null } });
  if (!vehicle) {
    fail(res, 404, "Vehicle not found");
    return;
  }
  if (vehicle.sellerId !== userId) {
    fail(res, 403, "You do not own this vehicle");
    return;
  }
  const existingActive = await prisma.auction.findFirst({ where: { vehicleId, status: "ACTIVE" } });
  if (existingActive) {
    fail(res, 409, "This vehicle already has an active auction");
    return;
  }
  const startTime = /* @__PURE__ */ new Date();
  const endTime = new Date(startTime.getTime() + DURATION_MS[duration]);
  const reserve = toNumber2(reservePrice);
  const auction = await prisma.auction.create({
    data: {
      vehicleId,
      sellerId: userId,
      startingPrice: startPrice,
      reservePrice: reserve,
      currentBid: startPrice,
      duration,
      startTime,
      endTime,
      status: "ACTIVE",
      depositRequired: toNumber2(depositRequired) ?? 0
    },
    include: auctionInclude
  });
  ok(res, auction, 201);
}
async function closeAuctionIfExpired(auctionId) {
  const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
  if (!auction || auction.status !== "ACTIVE" || auction.endTime.getTime() > Date.now()) {
    return;
  }
  const { count } = await prisma.auction.updateMany({
    where: { id: auctionId, status: "ACTIVE" },
    data: { status: "ENDED" }
  });
  if (count === 0) {
    return;
  }
  const topBid = await prisma.bid.findFirst({ where: { auctionId }, orderBy: { amount: "desc" } });
  await createNotification(
    auction.sellerId,
    "AUCTION_ENDED",
    "Your auction has ended",
    topBid ? `Your auction ended with a winning bid of ${topBid.amount}` : "Your auction ended with no bids",
    `/auctions/${auctionId}`
  );
  if (topBid) {
    await createNotification(
      topBid.bidderId,
      "AUCTION_ENDED",
      "Auction you bid on has ended",
      `The auction you bid on has ended. Your bid of ${topBid.amount} won!`,
      `/auctions/${auctionId}`
    );
  }
  const otherBidders = await prisma.bid.findMany({
    where: { auctionId, ...topBid ? { bidderId: { not: topBid.bidderId } } : {} },
    distinct: ["bidderId"]
  });
  for (const bid of otherBidders) {
    await createNotification(
      bid.bidderId,
      "AUCTION_ENDED",
      "Auction you bid on has ended",
      "The auction you bid on has ended. Unfortunately your bid did not win.",
      `/auctions/${auctionId}`
    );
  }
}
async function listAuctions(req, res) {
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const expiring = await prisma.auction.findMany({
    where: { status: "ACTIVE", endTime: { lte: /* @__PURE__ */ new Date() } },
    select: { id: true }
  });
  for (const { id } of expiring) {
    await closeAuctionIfExpired(id);
  }
  const where = { status: "ACTIVE" };
  let orderBy = { endTime: "asc" };
  switch (q.sortBy) {
    case "ending_soon":
      orderBy = { endTime: "asc" };
      break;
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
    case "price_asc":
      orderBy = { currentBid: "asc" };
      break;
    case "price_desc":
      orderBy = { currentBid: "desc" };
      break;
  }
  const [auctions, total] = await Promise.all([
    prisma.auction.findMany({ where, include: auctionInclude, orderBy, skip, take: limit }),
    prisma.auction.count({ where })
  ]);
  okPaginated(res, auctions, { page, limit, total });
}
async function getAuction(req, res) {
  const { id } = req.params;
  await closeAuctionIfExpired(id);
  const auction = await prisma.auction.findUnique({
    where: { id },
    include: {
      ...auctionInclude,
      bids: {
        orderBy: { amount: "desc" },
        include: { bidder: { select: { id: true, firstName: true, lastName: true, avatar: true } } }
      }
    }
  });
  if (!auction) {
    fail(res, 404, "Auction not found");
    return;
  }
  const timeRemainingMs = Math.max(0, auction.endTime.getTime() - Date.now());
  ok(res, { ...auction, timeRemainingMs });
}
async function placeBid(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const { amount } = req.body ?? {};
  const bidAmount = toNumber2(amount);
  if (bidAmount === void 0 || bidAmount <= 0) {
    fail(res, 400, "A valid bid amount is required");
    return;
  }
  const auction = await prisma.auction.findUnique({ where: { id } });
  if (!auction) {
    fail(res, 404, "Auction not found");
    return;
  }
  if (auction.sellerId === userId) {
    fail(res, 403, "You cannot bid on your own auction");
    return;
  }
  if (auction.status !== "ACTIVE") {
    fail(res, 400, "This auction is not active");
    return;
  }
  if (auction.endTime.getTime() <= Date.now()) {
    fail(res, 400, "This auction has expired");
    return;
  }
  const minimumBid = auction.currentBid > 0 ? auction.currentBid : auction.startingPrice;
  if (bidAmount <= minimumBid) {
    fail(res, 400, `Bid must be higher than ${minimumBid}`);
    return;
  }
  const [, updatedAuction] = await prisma.$transaction([
    prisma.bid.create({ data: { auctionId: id, bidderId: userId, amount: bidAmount } }),
    prisma.auction.update({ where: { id }, data: { currentBid: bidAmount }, include: auctionInclude })
  ]);
  await createNotification(
    auction.sellerId,
    "NEW_BID",
    "New bid on your auction",
    `A new bid of ${bidAmount} was placed on your auction`,
    `/auctions/${id}`
  );
  ok(res, updatedAuction, 201);
}
async function myAuctions(req, res) {
  const userId = req.user.userId;
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const where = { sellerId: userId };
  const [auctions, total] = await Promise.all([
    prisma.auction.findMany({ where, include: auctionInclude, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.auction.count({ where })
  ]);
  okPaginated(res, auctions, { page, limit, total });
}
async function myBids(req, res) {
  const userId = req.user.userId;
  const bids = await prisma.bid.findMany({
    where: { bidderId: userId },
    include: { auction: { include: auctionInclude } },
    orderBy: { amount: "desc" }
  });
  const byAuction = /* @__PURE__ */ new Map();
  for (const bid of bids) {
    const existing = byAuction.get(bid.auctionId);
    if (!existing || bid.amount > existing.amount) {
      byAuction.set(bid.auctionId, bid);
    }
  }
  ok(res, Array.from(byAuction.values()));
}
async function cancelAuction(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const auction = await prisma.auction.findUnique({ where: { id } });
  if (!auction) {
    fail(res, 404, "Auction not found");
    return;
  }
  if (auction.sellerId !== userId) {
    fail(res, 403, "You do not own this auction");
    return;
  }
  const bidCount = await prisma.bid.count({ where: { auctionId: id } });
  if (bidCount > 0) {
    fail(res, 400, "Cannot cancel an auction that already has bids");
    return;
  }
  const updated = await prisma.auction.update({ where: { id }, data: { status: "CANCELLED" }, include: auctionInclude });
  ok(res, updated);
}

// server/routes/auctionRoutes.ts
var router7 = (0, import_express7.Router)();
router7.get("/my-auctions", requireAuth, myAuctions);
router7.get("/my-bids", requireAuth, myBids);
router7.post("/", requireAuth, createAuction);
router7.get("/", listAuctions);
router7.get("/:id", getAuction);
router7.post("/:id/bid", requireAuth, placeBid);
router7.patch("/:id/cancel", requireAuth, cancelAuction);
var auctionRoutes_default = router7;

// server/routes/transportRoutes.ts
var import_express8 = require("express");

// server/controllers/transportController.ts
var TRANSPORT_TYPES = ["OPEN", "ENCLOSED"];
function toNumber3(value) {
  if (value === void 0 || value === null || value === "") return void 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : void 0;
}
function toInt2(value) {
  if (value === void 0 || value === null || value === "") return void 0;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : void 0;
}
var requestInclude = {
  vehicle: { include: { photos: { orderBy: { order: "asc" } } } },
  requester: { select: { id: true, firstName: true, lastName: true, avatar: true, phone: true } },
  offers: {
    include: { carrier: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    orderBy: { createdAt: "asc" }
  }
};
async function createRequest(req, res) {
  const userId = req.user.userId;
  const { vehicleId, originCountry, originCity, destCountry, destCity, transportType } = req.body ?? {};
  const requiredStrings = { originCountry, originCity, destCountry, destCity };
  for (const [key, value] of Object.entries(requiredStrings)) {
    if (!isNonEmptyString(value)) {
      fail(res, 400, `${key} is required`);
      return;
    }
  }
  if (!isNonEmptyString(transportType) || !TRANSPORT_TYPES.includes(transportType)) {
    fail(res, 400, `transportType must be one of: ${TRANSPORT_TYPES.join(", ")}`);
    return;
  }
  if (vehicleId !== void 0 && vehicleId !== null) {
    if (!isNonEmptyString(vehicleId)) {
      fail(res, 400, "vehicleId must be a string");
      return;
    }
    const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, deletedAt: null } });
    if (!vehicle) {
      fail(res, 404, "Vehicle not found");
      return;
    }
  }
  const request = await prisma.transportRequest.create({
    data: {
      requesterId: userId,
      vehicleId: isNonEmptyString(vehicleId) ? vehicleId : null,
      originCountry,
      originCity,
      destCountry,
      destCity,
      transportType,
      status: "OPEN"
    },
    include: requestInclude
  });
  ok(res, request, 201);
}
async function listRequests(req, res) {
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const where = { status: "OPEN" };
  if (isNonEmptyString(q.originCountry)) where.originCountry = { equals: q.originCountry, mode: "insensitive" };
  if (isNonEmptyString(q.destCountry)) where.destCountry = { equals: q.destCountry, mode: "insensitive" };
  if (isNonEmptyString(q.transportType) && TRANSPORT_TYPES.includes(q.transportType)) {
    where.transportType = q.transportType;
  }
  const [requests, total] = await Promise.all([
    prisma.transportRequest.findMany({ where, include: requestInclude, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.transportRequest.count({ where })
  ]);
  okPaginated(res, requests, { page, limit, total });
}
async function getRequest(req, res) {
  const { id } = req.params;
  const request = await prisma.transportRequest.findUnique({ where: { id }, include: requestInclude });
  if (!request) {
    fail(res, 404, "Transport request not found");
    return;
  }
  ok(res, request);
}
async function createOffer(req, res) {
  const userId = req.user.userId;
  const { id: requestId } = req.params;
  const { price, estimatedDays, message } = req.body ?? {};
  const priceNum = toNumber3(price);
  const daysNum = toInt2(estimatedDays);
  if (priceNum === void 0 || priceNum <= 0) {
    fail(res, 400, "A valid price is required");
    return;
  }
  if (daysNum === void 0 || daysNum <= 0) {
    fail(res, 400, "A valid estimatedDays is required");
    return;
  }
  const request = await prisma.transportRequest.findUnique({ where: { id: requestId } });
  if (!request) {
    fail(res, 404, "Transport request not found");
    return;
  }
  if (request.requesterId === userId) {
    fail(res, 400, "You cannot offer on your own transport request");
    return;
  }
  if (request.status !== "OPEN") {
    fail(res, 400, "This transport request is no longer open");
    return;
  }
  const offer = await prisma.transportOffer.create({
    data: {
      requestId,
      carrierId: userId,
      price: priceNum,
      estimatedDays: daysNum,
      message: isNonEmptyString(message) ? message : null,
      status: "PENDING"
    }
  });
  await createNotification(
    request.requesterId,
    "NEW_TRANSPORT_OFFER",
    "New transport offer",
    `You received a new offer of ${priceNum} for your transport request`,
    `/transport/${requestId}`
  );
  ok(res, offer, 201);
}
async function acceptOffer(req, res) {
  const userId = req.user.userId;
  const { offerId } = req.params;
  const offer = await prisma.transportOffer.findUnique({ where: { id: offerId }, include: { request: true } });
  if (!offer) {
    fail(res, 404, "Offer not found");
    return;
  }
  if (offer.request.requesterId !== userId) {
    fail(res, 403, "Only the request owner can accept an offer");
    return;
  }
  if (offer.request.status !== "OPEN") {
    fail(res, 400, "This request is no longer open");
    return;
  }
  await prisma.$transaction([
    prisma.transportOffer.update({ where: { id: offerId }, data: { status: "ACCEPTED" } }),
    prisma.transportOffer.updateMany({
      where: { requestId: offer.requestId, id: { not: offerId } },
      data: { status: "REJECTED" }
    }),
    prisma.transportRequest.update({ where: { id: offer.requestId }, data: { status: "ACCEPTED" } })
  ]);
  await createNotification(
    offer.carrierId,
    "TRANSPORT_OFFER_ACCEPTED",
    "Your transport offer was accepted",
    "Your offer has been accepted by the requester",
    `/transport/${offer.requestId}`
  );
  const updated = await prisma.transportRequest.findUnique({ where: { id: offer.requestId }, include: requestInclude });
  ok(res, updated);
}
async function updateRequestStatus(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const { status } = req.body ?? {};
  const UPDATABLE_STATUSES2 = ["IN_TRANSIT", "DELIVERED", "CANCELLED"];
  if (!isNonEmptyString(status) || !UPDATABLE_STATUSES2.includes(status)) {
    fail(res, 400, "status must be one of: IN_TRANSIT, DELIVERED, CANCELLED");
    return;
  }
  const newStatus = status;
  const request = await prisma.transportRequest.findUnique({
    where: { id },
    include: { offers: { where: { status: "ACCEPTED" } } }
  });
  if (!request) {
    fail(res, 404, "Transport request not found");
    return;
  }
  const acceptedCarrierId = request.offers[0]?.carrierId;
  const isOwner = request.requesterId === userId;
  const isCarrier = acceptedCarrierId === userId;
  if (!isOwner && !isCarrier) {
    fail(res, 403, "You do not have permission to update this request");
    return;
  }
  const updated = await prisma.transportRequest.update({
    where: { id },
    data: { status: newStatus },
    include: requestInclude
  });
  ok(res, updated);
}
async function myRequests(req, res) {
  const userId = req.user.userId;
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const where = { requesterId: userId };
  const [requests, total] = await Promise.all([
    prisma.transportRequest.findMany({ where, include: requestInclude, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.transportRequest.count({ where })
  ]);
  okPaginated(res, requests, { page, limit, total });
}
async function myOffers(req, res) {
  const userId = req.user.userId;
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const where = { carrierId: userId };
  const [offers, total] = await Promise.all([
    prisma.transportOffer.findMany({
      where,
      include: { request: { include: requestInclude } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.transportOffer.count({ where })
  ]);
  okPaginated(res, offers, { page, limit, total });
}

// server/routes/transportRoutes.ts
var router8 = (0, import_express8.Router)();
router8.get("/my-requests", requireAuth, myRequests);
router8.get("/my-offers", requireAuth, myOffers);
router8.patch("/offers/:offerId/accept", requireAuth, acceptOffer);
router8.post("/", requireAuth, createRequest);
router8.get("/", listRequests);
router8.get("/:id", getRequest);
router8.post("/:id/offers", requireAuth, createOffer);
router8.patch("/:id/status", requireAuth, updateRequestStatus);
var transportRoutes_default = router8;

// server/routes/vinRoutes.ts
var import_express9 = require("express");

// server/controllers/vinController.ts
var vehicleWithHistoryInclude = {
  inspections: { include: { inspector: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" } },
  ownershipTransfers: {
    include: {
      fromUser: { select: { id: true, firstName: true, lastName: true } },
      toUser: { select: { id: true, firstName: true, lastName: true } }
    },
    orderBy: { transferDate: "desc" }
  },
  stolenReports: { orderBy: { createdAt: "desc" } },
  insurancePolicies: { orderBy: { createdAt: "desc" } }
};
async function lookupVin(req, res) {
  const { vin } = req.params;
  const vehicles = await prisma.vehicle.findMany({
    where: { vin },
    include: vehicleWithHistoryInclude
  });
  if (vehicles.length === 0) {
    ok(res, { vehicles: [], message: "No vehicle found for this VIN" });
    return;
  }
  ok(res, { vehicles });
}
async function vinInspections(req, res) {
  const { vin } = req.params;
  const vehicles = await prisma.vehicle.findMany({ where: { vin }, select: { id: true } });
  if (vehicles.length === 0) {
    ok(res, { inspections: [], message: "No vehicle found for this VIN" });
    return;
  }
  const inspections = await prisma.inspection.findMany({
    where: { vehicleId: { in: vehicles.map((v) => v.id) } },
    include: { inspector: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" }
  });
  ok(res, inspections);
}
async function vinOwnership(req, res) {
  const { vin } = req.params;
  const vehicles = await prisma.vehicle.findMany({ where: { vin }, select: { id: true } });
  if (vehicles.length === 0) {
    ok(res, { transfers: [], message: "No vehicle found for this VIN" });
    return;
  }
  const transfers = await prisma.ownershipTransfer.findMany({
    where: { vehicleId: { in: vehicles.map((v) => v.id) } },
    include: {
      fromUser: { select: { id: true, firstName: true, lastName: true } },
      toUser: { select: { id: true, firstName: true, lastName: true } }
    },
    orderBy: { transferDate: "asc" }
  });
  ok(res, transfers);
}
async function vinStolen(req, res) {
  const { vin } = req.params;
  const vehicles = await prisma.vehicle.findMany({ where: { vin }, select: { id: true } });
  if (vehicles.length === 0) {
    ok(res, { reports: [], message: "No vehicle found for this VIN" });
    return;
  }
  const reports = await prisma.stolenReport.findMany({
    where: { vehicleId: { in: vehicles.map((v) => v.id) } },
    orderBy: { createdAt: "desc" }
  });
  ok(res, reports);
}
async function vinFraudScore(req, res) {
  const { vin } = req.params;
  const vehicles = await prisma.vehicle.findMany({
    where: { vin },
    include: {
      inspections: { orderBy: { createdAt: "asc" } },
      ownershipTransfers: true,
      stolenReports: true
    }
  });
  if (vehicles.length === 0) {
    fail(res, 404, "No vehicle found for this VIN");
    return;
  }
  const vehicle = vehicles[0];
  const transferCount = vehicle.ownershipTransfers.length;
  const failedInspections = vehicle.inspections.filter((i) => i.result === "FAILED").length;
  const stolenReportCount = vehicle.stolenReports.length;
  let mileageInconsistencies = 0;
  let lastMileage = null;
  for (const inspection of vehicle.inspections) {
    if (inspection.mileageRecorded === null || inspection.mileageRecorded === void 0) continue;
    if (lastMileage !== null && inspection.mileageRecorded < lastMileage) {
      mileageInconsistencies += 1;
    }
    lastMileage = inspection.mileageRecorded;
  }
  const transferPoints = Math.min(20, transferCount * 5);
  const inspectionPoints = Math.min(30, failedInspections * 15);
  const stolenPoints = Math.min(40, stolenReportCount * 40);
  const mileagePoints = Math.min(30, mileageInconsistencies * 20);
  const score = Math.min(100, transferPoints + inspectionPoints + stolenPoints + mileagePoints);
  ok(res, {
    vin,
    fraudScore: score,
    riskLevel: score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW",
    breakdown: {
      ownershipTransfers: { count: transferCount, points: transferPoints },
      failedInspections: { count: failedInspections, points: inspectionPoints },
      stolenReports: { count: stolenReportCount, points: stolenPoints },
      mileageInconsistencies: { count: mileageInconsistencies, points: mileagePoints }
    }
  });
}

// server/routes/vinRoutes.ts
var router9 = (0, import_express9.Router)();
router9.get("/:vin/inspections", vinInspections);
router9.get("/:vin/ownership", vinOwnership);
router9.get("/:vin/stolen", vinStolen);
router9.get("/:vin/fraud-score", vinFraudScore);
router9.get("/:vin", lookupVin);
var vinRoutes_default = router9;

// server/routes/inspectionRoutes.ts
var import_express10 = require("express");

// server/controllers/inspectionController.ts
var import_client4 = require("@prisma/client");
var RESULTS = ["PASSED", "FAILED", "REINSPECTION"];
function toInt3(value) {
  if (value === void 0 || value === null || value === "") return void 0;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : void 0;
}
var inspectionInclude = {
  vehicle: { select: { id: true, vin: true, make: true, model: true, year: true } },
  inspector: { select: { id: true, firstName: true, lastName: true, avatar: true } }
};
async function createInspection(req, res) {
  const userId = req.user.userId;
  const { vehicleId, centerId, result, mileageRecorded, notes, fraudFlags, certificateUrl } = req.body ?? {};
  if (!isNonEmptyString(vehicleId)) {
    fail(res, 400, "vehicleId is required");
    return;
  }
  if (!isNonEmptyString(result) || !RESULTS.includes(result)) {
    fail(res, 400, `result must be one of: ${RESULTS.join(", ")}`);
    return;
  }
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    fail(res, 404, "Vehicle not found");
    return;
  }
  const inspection = await prisma.inspection.create({
    data: {
      vehicleId,
      inspectorId: userId,
      centerId: isNonEmptyString(centerId) ? centerId : null,
      result,
      mileageRecorded: toInt3(mileageRecorded) ?? null,
      notes: isNonEmptyString(notes) ? notes : null,
      fraudFlags: Array.isArray(fraudFlags) ? fraudFlags : void 0,
      certificateUrl: isNonEmptyString(certificateUrl) ? certificateUrl : null
    },
    include: inspectionInclude
  });
  ok(res, inspection, 201);
}
async function listInspections(req, res) {
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const where = {};
  if (isNonEmptyString(q.vehicleId)) where.vehicleId = q.vehicleId;
  if (isNonEmptyString(q.inspectorId)) where.inspectorId = q.inspectorId;
  if (isNonEmptyString(q.centerId)) where.centerId = q.centerId;
  if (isNonEmptyString(q.result) && RESULTS.includes(q.result)) where.result = q.result;
  const [inspections, total] = await Promise.all([
    prisma.inspection.findMany({ where, include: inspectionInclude, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.inspection.count({ where })
  ]);
  okPaginated(res, inspections, { page, limit, total });
}
async function getInspection(req, res) {
  const { id } = req.params;
  const inspection = await prisma.inspection.findUnique({ where: { id }, include: inspectionInclude });
  if (!inspection) {
    fail(res, 404, "Inspection not found");
    return;
  }
  ok(res, inspection);
}
async function myInspections(req, res) {
  const userId = req.user.userId;
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const where = { inspectorId: userId };
  const [inspections, total] = await Promise.all([
    prisma.inspection.findMany({ where, include: inspectionInclude, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.inspection.count({ where })
  ]);
  okPaginated(res, inspections, { page, limit, total });
}
async function updateInspection(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const inspection = await prisma.inspection.findUnique({ where: { id } });
  if (!inspection) {
    fail(res, 404, "Inspection not found");
    return;
  }
  if (inspection.inspectorId !== userId) {
    fail(res, 403, "You did not create this inspection");
    return;
  }
  const { result, notes, fraudFlags } = req.body ?? {};
  const data = {};
  if (result !== void 0) {
    if (!RESULTS.includes(result)) {
      fail(res, 400, `result must be one of: ${RESULTS.join(", ")}`);
      return;
    }
    data.result = result;
  }
  if (notes !== void 0) data.notes = isNonEmptyString(notes) ? notes : null;
  if (fraudFlags !== void 0) data.fraudFlags = Array.isArray(fraudFlags) ? fraudFlags : import_client4.Prisma.JsonNull;
  const updated = await prisma.inspection.update({ where: { id }, data, include: inspectionInclude });
  ok(res, updated);
}

// server/routes/inspectionRoutes.ts
var router10 = (0, import_express10.Router)();
router10.get("/my-inspections", requireAuth, myInspections);
router10.post("/", requireAuth, requireRole("GOVERNMENT", "WORKSHOP"), createInspection);
router10.get("/", listInspections);
router10.get("/:id", getInspection);
router10.patch("/:id", requireAuth, updateInspection);
var inspectionRoutes_default = router10;

// server/routes/insuranceRoutes.ts
var import_express11 = require("express");

// server/controllers/insuranceController.ts
var POLICY_STATUSES = ["ACTIVE", "EXPIRED", "CANCELLED"];
var CLAIM_STATUSES = ["OPEN", "REVIEWING", "APPROVED", "DENIED", "CLOSED"];
var UPDATABLE_CLAIM_STATUSES = ["REVIEWING", "APPROVED", "DENIED", "CLOSED"];
function toNumber4(value) {
  if (value === void 0 || value === null || value === "") return void 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : void 0;
}
function toDate(value) {
  if (!value) return void 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? void 0 : d;
}
async function createPolicy(req, res) {
  const userId = req.user.userId;
  const { vehicleId, insurerId, policyNumber, coverageType, deductible, premium, startDate, endDate, documentUrl } = req.body ?? {};
  if (!isNonEmptyString(policyNumber)) {
    fail(res, 400, "policyNumber is required");
    return;
  }
  if (!isNonEmptyString(coverageType)) {
    fail(res, 400, "coverageType is required");
    return;
  }
  const deductibleNum = toNumber4(deductible);
  const premiumNum = toNumber4(premium);
  const start = toDate(startDate);
  const end = toDate(endDate);
  if (deductibleNum === void 0 || premiumNum === void 0) {
    fail(res, 400, "A valid deductible and premium are required");
    return;
  }
  if (!start || !end) {
    fail(res, 400, "A valid startDate and endDate are required");
    return;
  }
  const existing = await prisma.insurancePolicy.findUnique({ where: { policyNumber } });
  if (existing) {
    fail(res, 409, "A policy with this policyNumber already exists");
    return;
  }
  if (isNonEmptyString(vehicleId)) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      fail(res, 404, "Vehicle not found");
      return;
    }
  }
  const policy = await prisma.insurancePolicy.create({
    data: {
      userId,
      vehicleId: isNonEmptyString(vehicleId) ? vehicleId : null,
      insurerId: isNonEmptyString(insurerId) ? insurerId : null,
      policyNumber,
      coverageType,
      deductible: deductibleNum,
      premium: premiumNum,
      startDate: start,
      endDate: end,
      documentUrl: isNonEmptyString(documentUrl) ? documentUrl : null,
      status: "ACTIVE"
    }
  });
  ok(res, policy, 201);
}
async function listPolicies(req, res) {
  const userId = req.user.userId;
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const where = { userId };
  if (isNonEmptyString(q.status) && POLICY_STATUSES.includes(q.status)) where.status = q.status;
  if (isNonEmptyString(q.vehicleId)) where.vehicleId = q.vehicleId;
  const [policies, total] = await Promise.all([
    prisma.insurancePolicy.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.insurancePolicy.count({ where })
  ]);
  okPaginated(res, policies, { page, limit, total });
}
async function getPolicy(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const policy = await prisma.insurancePolicy.findUnique({ where: { id } });
  if (!policy) {
    fail(res, 404, "Policy not found");
    return;
  }
  if (policy.userId !== userId) {
    fail(res, 403, "You do not own this policy");
    return;
  }
  ok(res, policy);
}
async function updatePolicy(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const policy = await prisma.insurancePolicy.findUnique({ where: { id } });
  if (!policy) {
    fail(res, 404, "Policy not found");
    return;
  }
  if (policy.userId !== userId) {
    fail(res, 403, "You do not own this policy");
    return;
  }
  const { coverageType, deductible, premium, startDate, endDate, documentUrl } = req.body ?? {};
  const data = {};
  if (coverageType !== void 0) {
    if (!isNonEmptyString(coverageType)) {
      fail(res, 400, "coverageType must be a non-empty string");
      return;
    }
    data.coverageType = coverageType;
  }
  if (deductible !== void 0) {
    const n = toNumber4(deductible);
    if (n === void 0) {
      fail(res, 400, "deductible must be a number");
      return;
    }
    data.deductible = n;
  }
  if (premium !== void 0) {
    const n = toNumber4(premium);
    if (n === void 0) {
      fail(res, 400, "premium must be a number");
      return;
    }
    data.premium = n;
  }
  if (startDate !== void 0) {
    const d = toDate(startDate);
    if (!d) {
      fail(res, 400, "startDate must be a valid date");
      return;
    }
    data.startDate = d;
  }
  if (endDate !== void 0) {
    const d = toDate(endDate);
    if (!d) {
      fail(res, 400, "endDate must be a valid date");
      return;
    }
    data.endDate = d;
  }
  if (documentUrl !== void 0) data.documentUrl = isNonEmptyString(documentUrl) ? documentUrl : null;
  const updated = await prisma.insurancePolicy.update({ where: { id }, data });
  ok(res, updated);
}
async function cancelPolicy(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const policy = await prisma.insurancePolicy.findUnique({ where: { id } });
  if (!policy) {
    fail(res, 404, "Policy not found");
    return;
  }
  if (policy.userId !== userId) {
    fail(res, 403, "You do not own this policy");
    return;
  }
  const updated = await prisma.insurancePolicy.update({ where: { id }, data: { status: "CANCELLED" } });
  ok(res, updated);
}
async function createClaim(req, res) {
  const userId = req.user.userId;
  const { policyId, vehicleId, incidentDate, incidentType, description, evidenceUrls } = req.body ?? {};
  if (!isNonEmptyString(policyId)) {
    fail(res, 400, "policyId is required");
    return;
  }
  if (!isNonEmptyString(vehicleId)) {
    fail(res, 400, "vehicleId is required");
    return;
  }
  if (!isNonEmptyString(incidentType)) {
    fail(res, 400, "incidentType is required");
    return;
  }
  const incidentDateParsed = toDate(incidentDate);
  if (!incidentDateParsed) {
    fail(res, 400, "A valid incidentDate is required");
    return;
  }
  const policy = await prisma.insurancePolicy.findUnique({ where: { id: policyId } });
  if (!policy) {
    fail(res, 404, "Policy not found");
    return;
  }
  if (policy.userId !== userId) {
    fail(res, 403, "You do not own this policy");
    return;
  }
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    fail(res, 404, "Vehicle not found");
    return;
  }
  const claim = await prisma.claim.create({
    data: {
      policyId,
      userId,
      vehicleId,
      incidentDate: incidentDateParsed,
      incidentType,
      description: isNonEmptyString(description) ? description : null,
      evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls : void 0,
      status: "OPEN"
    }
  });
  ok(res, claim, 201);
}
async function listClaims(req, res) {
  const userId = req.user.userId;
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const where = { userId };
  if (isNonEmptyString(q.status) && CLAIM_STATUSES.includes(q.status)) where.status = q.status;
  if (isNonEmptyString(q.vehicleId)) where.vehicleId = q.vehicleId;
  const [claims, total] = await Promise.all([
    prisma.claim.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.claim.count({ where })
  ]);
  okPaginated(res, claims, { page, limit, total });
}
async function getClaim(req, res) {
  const userId = req.user.userId;
  const userRole = req.user.role;
  const { id } = req.params;
  const claim = await prisma.claim.findUnique({ where: { id } });
  if (!claim) {
    fail(res, 404, "Claim not found");
    return;
  }
  if (claim.userId !== userId && userRole !== "INSURANCE") {
    fail(res, 403, "You do not have permission to view this claim");
    return;
  }
  ok(res, claim);
}
async function updateClaimStatus(req, res) {
  const userRole = req.user.role;
  const { id } = req.params;
  const { status } = req.body ?? {};
  if (userRole !== "INSURANCE") {
    fail(res, 403, "Only insurance representatives can update claim status");
    return;
  }
  if (!isNonEmptyString(status) || !UPDATABLE_CLAIM_STATUSES.includes(status)) {
    fail(res, 400, `status must be one of: ${UPDATABLE_CLAIM_STATUSES.join(", ")}`);
    return;
  }
  const claim = await prisma.claim.findUnique({ where: { id } });
  if (!claim) {
    fail(res, 404, "Claim not found");
    return;
  }
  const updated = await prisma.claim.update({ where: { id }, data: { status } });
  await createNotification(
    claim.userId,
    "CLAIM_STATUS_UPDATED",
    "Claim status updated",
    `Your insurance claim status changed to ${status}`,
    `/claims/${id}`
  );
  ok(res, updated);
}

// server/routes/insuranceRoutes.ts
var router11 = (0, import_express11.Router)();
router11.post("/policies", requireAuth, createPolicy);
router11.get("/policies", requireAuth, listPolicies);
router11.get("/policies/:id", requireAuth, getPolicy);
router11.patch("/policies/:id/cancel", requireAuth, cancelPolicy);
router11.patch("/policies/:id", requireAuth, updatePolicy);
router11.post("/claims", requireAuth, createClaim);
router11.get("/claims", requireAuth, listClaims);
router11.get("/claims/:id", requireAuth, getClaim);
router11.patch("/claims/:id/status", requireAuth, updateClaimStatus);
var insuranceRoutes_default = router11;

// server/routes/transferRoutes.ts
var import_express12 = require("express");

// server/controllers/transferController.ts
var transferInclude = {
  vehicle: { select: { id: true, vin: true, make: true, model: true, year: true } },
  fromUser: { select: { id: true, firstName: true, lastName: true, avatar: true } },
  toUser: { select: { id: true, firstName: true, lastName: true, avatar: true } }
};
async function createTransfer(req, res) {
  const userId = req.user.userId;
  const { vehicleId, toUserId } = req.body ?? {};
  if (!isNonEmptyString(vehicleId)) {
    fail(res, 400, "vehicleId is required");
    return;
  }
  if (!isNonEmptyString(toUserId)) {
    fail(res, 400, "toUserId is required");
    return;
  }
  if (toUserId === userId) {
    fail(res, 400, "Cannot transfer a vehicle to yourself");
    return;
  }
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, deletedAt: null } });
  if (!vehicle) {
    fail(res, 404, "Vehicle not found");
    return;
  }
  if (vehicle.sellerId !== userId) {
    fail(res, 403, "You do not own this vehicle");
    return;
  }
  const toUser = await prisma.user.findUnique({ where: { id: toUserId } });
  if (!toUser) {
    fail(res, 404, "Recipient user not found");
    return;
  }
  const existingPending = await prisma.ownershipTransfer.findFirst({ where: { vehicleId, status: "PENDING" } });
  if (existingPending) {
    fail(res, 409, "This vehicle already has a pending transfer");
    return;
  }
  const transfer = await prisma.ownershipTransfer.create({
    data: {
      vehicle: { connect: { id: vehicleId } },
      fromUser: { connect: { id: userId } },
      toUser: { connect: { id: toUserId } },
      transferDate: /* @__PURE__ */ new Date(),
      status: "PENDING"
    },
    include: transferInclude
  });
  await createNotification(
    toUserId,
    "OWNERSHIP_TRANSFER_INITIATED",
    "Ownership transfer initiated",
    `${transfer.fromUser.firstName} ${transfer.fromUser.lastName} wants to transfer a vehicle to you`,
    `/transfers/${transfer.id}`
  );
  ok(res, transfer, 201);
}
async function confirmTransfer(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const transfer = await prisma.ownershipTransfer.findUnique({ where: { id } });
  if (!transfer) {
    fail(res, 404, "Transfer not found");
    return;
  }
  if (transfer.toUserId !== userId) {
    fail(res, 403, "Only the recipient can confirm this transfer");
    return;
  }
  if (transfer.status !== "PENDING") {
    fail(res, 400, "This transfer is no longer pending");
    return;
  }
  const [updatedTransfer] = await prisma.$transaction([
    prisma.ownershipTransfer.update({
      where: { id },
      data: { status: "CONFIRMED", transferDate: /* @__PURE__ */ new Date() },
      include: transferInclude
    }),
    prisma.vehicle.update({ where: { id: transfer.vehicleId }, data: { sellerId: transfer.toUserId } })
  ]);
  ok(res, updatedTransfer);
}
async function cancelTransfer(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const transfer = await prisma.ownershipTransfer.findUnique({ where: { id } });
  if (!transfer) {
    fail(res, 404, "Transfer not found");
    return;
  }
  if (transfer.fromUserId !== userId && transfer.toUserId !== userId) {
    fail(res, 403, "You are not a party to this transfer");
    return;
  }
  if (transfer.status !== "PENDING") {
    fail(res, 400, "Only pending transfers can be cancelled");
    return;
  }
  const updated = await prisma.ownershipTransfer.update({ where: { id }, data: { status: "CANCELLED" }, include: transferInclude });
  ok(res, updated);
}
async function myTransfers(req, res) {
  const userId = req.user.userId;
  const transfers = await prisma.ownershipTransfer.findMany({
    where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
    include: transferInclude,
    orderBy: { createdAt: "desc" }
  });
  ok(res, transfers);
}

// server/routes/transferRoutes.ts
var router12 = (0, import_express12.Router)();
router12.get("/my-transfers", requireAuth, myTransfers);
router12.post("/", requireAuth, createTransfer);
router12.patch("/:id/confirm", requireAuth, confirmTransfer);
router12.patch("/:id/cancel", requireAuth, cancelTransfer);
var transferRoutes_default = router12;

// server/routes/stolenReportRoutes.ts
var import_express13 = require("express");

// server/controllers/stolenReportController.ts
var REPORT_STATUSES = ["OPEN", "INVESTIGATING", "RECOVERED", "CLOSED"];
var UPDATABLE_STATUSES = ["INVESTIGATING", "RECOVERED", "CLOSED"];
function toDate2(value) {
  if (!value) return void 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? void 0 : d;
}
var reportInclude = {
  vehicle: { select: { id: true, vin: true, make: true, model: true, year: true, status: true } },
  reporter: { select: { id: true, firstName: true, lastName: true, avatar: true } }
};
async function createReport(req, res) {
  const userId = req.user.userId;
  const { vehicleId, incidentDate, policeRef, description } = req.body ?? {};
  if (!isNonEmptyString(vehicleId)) {
    fail(res, 400, "vehicleId is required");
    return;
  }
  const incidentDateParsed = toDate2(incidentDate);
  if (!incidentDateParsed) {
    fail(res, 400, "A valid incidentDate is required");
    return;
  }
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, deletedAt: null } });
  if (!vehicle) {
    fail(res, 404, "Vehicle not found");
    return;
  }
  if (vehicle.sellerId !== userId) {
    fail(res, 403, "You do not own this vehicle");
    return;
  }
  const existingOpen = await prisma.stolenReport.findFirst({
    where: { vehicleId, status: { in: ["OPEN", "INVESTIGATING"] } }
  });
  if (existingOpen) {
    fail(res, 409, "This vehicle already has an open stolen report");
    return;
  }
  const [report] = await prisma.$transaction([
    prisma.stolenReport.create({
      data: {
        vehicleId,
        reporterId: userId,
        incidentDate: incidentDateParsed,
        policeRef: isNonEmptyString(policeRef) ? policeRef : null,
        description: isNonEmptyString(description) ? description : null,
        status: "OPEN"
      },
      include: reportInclude
    }),
    prisma.vehicle.update({ where: { id: vehicleId }, data: { status: "FLAGGED" } })
  ]);
  await createNotification(
    vehicle.sellerId,
    "VEHICLE_FLAGGED",
    "Vehicle flagged as stolen",
    `A stolen report was filed for your vehicle (${vehicle.make} ${vehicle.model}) and it has been flagged`,
    `/vehicles/${vehicleId}`
  );
  ok(res, report, 201);
}
async function listReports(req, res) {
  const userRole = req.user.role;
  if (userRole !== "POLICE" && userRole !== "GOVERNMENT") {
    fail(res, 403, "Only police or government accounts can view all stolen reports");
    return;
  }
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const where = {};
  if (isNonEmptyString(q.status) && REPORT_STATUSES.includes(q.status)) where.status = q.status;
  const [reports, total] = await Promise.all([
    prisma.stolenReport.findMany({ where, include: reportInclude, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.stolenReport.count({ where })
  ]);
  okPaginated(res, reports, { page, limit, total });
}
async function getReport(req, res) {
  const userId = req.user.userId;
  const userRole = req.user.role;
  const { id } = req.params;
  const report = await prisma.stolenReport.findUnique({ where: { id }, include: reportInclude });
  if (!report) {
    fail(res, 404, "Report not found");
    return;
  }
  if (report.reporterId !== userId && userRole !== "POLICE" && userRole !== "GOVERNMENT") {
    fail(res, 403, "You do not have permission to view this report");
    return;
  }
  ok(res, report);
}
async function updateReportStatus(req, res) {
  const userRole = req.user.role;
  const { id } = req.params;
  const { status } = req.body ?? {};
  if (userRole !== "POLICE") {
    fail(res, 403, "Only police accounts can update report status");
    return;
  }
  if (!isNonEmptyString(status) || !UPDATABLE_STATUSES.includes(status)) {
    fail(res, 400, `status must be one of: ${UPDATABLE_STATUSES.join(", ")}`);
    return;
  }
  const report = await prisma.stolenReport.findUnique({ where: { id } });
  if (!report) {
    fail(res, 404, "Report not found");
    return;
  }
  const updates = [
    prisma.stolenReport.update({ where: { id }, data: { status }, include: reportInclude })
  ];
  if (status === "RECOVERED") {
    updates.push(prisma.vehicle.update({ where: { id: report.vehicleId }, data: { status: "ACTIVE" } }));
  }
  const [updated] = await prisma.$transaction(updates);
  ok(res, updated);
}

// server/routes/stolenReportRoutes.ts
var router13 = (0, import_express13.Router)();
router13.post("/", requireAuth, createReport);
router13.get("/", requireAuth, listReports);
router13.get("/:id", requireAuth, getReport);
router13.patch("/:id/status", requireAuth, updateReportStatus);
var stolenReportRoutes_default = router13;

// server/routes/messageRoutes.ts
var import_express14 = require("express");

// server/controllers/messageController.ts
var userSelect = { id: true, firstName: true, lastName: true, avatar: true };
async function sendMessage(req, res) {
  const userId = req.user.userId;
  const { receiverId, vehicleId, content } = req.body ?? {};
  if (!isNonEmptyString(receiverId)) {
    fail(res, 400, "receiverId is required");
    return;
  }
  if (receiverId === userId) {
    fail(res, 400, "You cannot send a message to yourself");
    return;
  }
  if (!isNonEmptyString(content)) {
    fail(res, 400, "content is required");
    return;
  }
  const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
  if (!receiver) {
    fail(res, 404, "Receiver not found");
    return;
  }
  if (vehicleId !== void 0 && vehicleId !== null) {
    if (!isNonEmptyString(vehicleId)) {
      fail(res, 400, "vehicleId must be a string");
      return;
    }
    const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, deletedAt: null } });
    if (!vehicle) {
      fail(res, 404, "Vehicle not found");
      return;
    }
  }
  const message = await prisma.message.create({
    data: {
      senderId: userId,
      receiverId,
      vehicleId: isNonEmptyString(vehicleId) ? vehicleId : null,
      content,
      read: false
    },
    include: {
      sender: { select: userSelect },
      receiver: { select: userSelect },
      vehicle: { select: { id: true, make: true, model: true, year: true } }
    }
  });
  const sender = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
  await createNotification(
    receiverId,
    "NEW_MESSAGE",
    "New message",
    `${sender?.firstName ?? "Someone"} ${sender?.lastName ?? ""} sent you a message`.trim(),
    `/messages/${userId}`
  );
  ok(res, message, 201);
}
async function listConversations(req, res) {
  const userId = req.user.userId;
  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: userSelect },
      receiver: { select: userSelect },
      vehicle: { select: { id: true, make: true, model: true, year: true } }
    }
  });
  const conversations = /* @__PURE__ */ new Map();
  for (const message of messages) {
    const otherUser = message.senderId === userId ? message.receiver : message.sender;
    const key = otherUser.id;
    if (!conversations.has(key)) {
      conversations.set(key, {
        otherUser,
        lastMessage: message,
        unreadCount: 0,
        vehicle: message.vehicle
      });
    }
    if (message.receiverId === userId && !message.read) {
      conversations.get(key).unreadCount += 1;
    }
  }
  const result = Array.from(conversations.values()).sort(
    (a, b) => b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime()
  );
  ok(res, result);
}
async function getConversation(req, res) {
  const userId = req.user.userId;
  const { userId: otherUserId } = req.params;
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const where = {
    OR: [
      { senderId: userId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: userId }
    ]
  };
  if (isNonEmptyString(q.vehicleId)) {
    where.vehicleId = q.vehicleId;
  }
  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      include: {
        sender: { select: userSelect },
        receiver: { select: userSelect },
        vehicle: { select: { id: true, make: true, model: true, year: true } }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.message.count({ where })
  ]);
  await prisma.message.updateMany({
    where: { senderId: otherUserId, receiverId: userId, read: false },
    data: { read: true }
  });
  okPaginated(res, messages, { page, limit, total });
}
async function unreadCount(req, res) {
  const userId = req.user.userId;
  const count = await prisma.message.count({ where: { receiverId: userId, read: false } });
  ok(res, { count });
}
async function deleteMessage(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const message = await prisma.message.findUnique({ where: { id } });
  if (!message) {
    fail(res, 404, "Message not found");
    return;
  }
  if (message.senderId !== userId) {
    fail(res, 403, "You can only delete your own messages");
    return;
  }
  await prisma.message.delete({ where: { id } });
  ok(res, { id, deleted: true });
}

// server/routes/messageRoutes.ts
var router14 = (0, import_express14.Router)();
router14.get("/conversations", requireAuth, listConversations);
router14.get("/conversation/:userId", requireAuth, getConversation);
router14.get("/unread-count", requireAuth, unreadCount);
router14.post("/", requireAuth, sendMessage);
router14.delete("/:id", requireAuth, deleteMessage);
var messageRoutes_default = router14;

// server/routes/notificationRoutes.ts
var import_express15 = require("express");

// server/controllers/notificationController.ts
async function listNotifications(req, res) {
  const userId = req.user.userId;
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const where = { userId };
  if (q.read === "true") where.read = true;
  if (q.read === "false") where.read = false;
  if (isNonEmptyString(q.type)) where.type = q.type;
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.notification.count({ where })
  ]);
  okPaginated(res, notifications, { page, limit, total });
}
async function markAsRead(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) {
    fail(res, 404, "Notification not found");
    return;
  }
  if (notification.userId !== userId) {
    fail(res, 403, "You do not have permission to update this notification");
    return;
  }
  const updated = await prisma.notification.update({ where: { id }, data: { read: true } });
  ok(res, updated);
}
async function markAllAsRead(req, res) {
  const userId = req.user.userId;
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  ok(res, { success: true });
}
async function unreadCount2(req, res) {
  const userId = req.user.userId;
  const count = await prisma.notification.count({ where: { userId, read: false } });
  ok(res, { count });
}
async function deleteNotification(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) {
    fail(res, 404, "Notification not found");
    return;
  }
  if (notification.userId !== userId) {
    fail(res, 403, "You do not have permission to delete this notification");
    return;
  }
  await prisma.notification.delete({ where: { id } });
  ok(res, { id, deleted: true });
}

// server/routes/notificationRoutes.ts
var router15 = (0, import_express15.Router)();
router15.get("/unread-count", requireAuth, unreadCount2);
router15.get("/", requireAuth, listNotifications);
router15.patch("/read-all", requireAuth, markAllAsRead);
router15.patch("/:id/read", requireAuth, markAsRead);
router15.delete("/:id", requireAuth, deleteNotification);
var notificationRoutes_default = router15;

// server/routes/sparePartRoutes.ts
var import_express16 = require("express");

// server/controllers/sparePartController.ts
var CONDITIONS = ["NEW", "USED", "REFURBISHED"];
function toNumber5(value) {
  if (value === void 0 || value === null || value === "") return void 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : void 0;
}
function toInt4(value) {
  if (value === void 0 || value === null || value === "") return void 0;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : void 0;
}
var businessSelect = { id: true, businessName: true, slug: true, logo: true, businessType: true, verified: true };
async function getOwnedDismantlerBusiness(userId) {
  return prisma.businessProfile.findFirst({ where: { userId, businessType: "DISMANTLER" } });
}
async function createPart(req, res) {
  const userId = req.user.userId;
  const { name, oem, compatibleVins, condition, price, stock } = req.body ?? {};
  if (!isNonEmptyString(name)) {
    fail(res, 400, "name is required");
    return;
  }
  if (!isNonEmptyString(condition) || !CONDITIONS.includes(condition)) {
    fail(res, 400, `condition must be one of: ${CONDITIONS.join(", ")}`);
    return;
  }
  const priceNum = toNumber5(price);
  if (priceNum === void 0 || priceNum <= 0) {
    fail(res, 400, "A valid price is required");
    return;
  }
  const stockNum = toInt4(stock) ?? 0;
  if (compatibleVins !== void 0 && !Array.isArray(compatibleVins)) {
    fail(res, 400, "compatibleVins must be an array");
    return;
  }
  const business = await getOwnedDismantlerBusiness(userId);
  if (!business) {
    fail(res, 403, "You must have a DISMANTLER business profile to list spare parts");
    return;
  }
  const part = await prisma.sparePart.create({
    data: {
      businessId: business.id,
      name,
      oem: isNonEmptyString(oem) ? oem : null,
      compatibleVins: Array.isArray(compatibleVins) ? compatibleVins : void 0,
      condition,
      price: priceNum,
      stock: stockNum
    },
    include: { business: { select: businessSelect } }
  });
  ok(res, part, 201);
}
async function listParts(req, res) {
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const where = {};
  if (isNonEmptyString(q.name)) where.name = { contains: q.name, mode: "insensitive" };
  if (isNonEmptyString(q.oem)) where.oem = { contains: q.oem, mode: "insensitive" };
  if (isNonEmptyString(q.condition) && CONDITIONS.includes(q.condition)) {
    where.condition = q.condition;
  }
  const minPrice = toNumber5(q.minPrice);
  const maxPrice = toNumber5(q.maxPrice);
  if (minPrice !== void 0 || maxPrice !== void 0) {
    where.price = {};
    if (minPrice !== void 0) where.price.gte = minPrice;
    if (maxPrice !== void 0) where.price.lte = maxPrice;
  }
  if (isNonEmptyString(q.compatibleVin)) {
    where.compatibleVins = { array_contains: q.compatibleVin };
  }
  const [parts, total] = await Promise.all([
    prisma.sparePart.findMany({
      where,
      include: { business: { select: businessSelect } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.sparePart.count({ where })
  ]);
  okPaginated(res, parts, { page, limit, total });
}
async function getPart(req, res) {
  const { id } = req.params;
  const part = await prisma.sparePart.findUnique({ where: { id }, include: { business: { select: businessSelect } } });
  if (!part) {
    fail(res, 404, "Spare part not found");
    return;
  }
  ok(res, part);
}
async function updatePart(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const part = await prisma.sparePart.findUnique({ where: { id }, include: { business: true } });
  if (!part) {
    fail(res, 404, "Spare part not found");
    return;
  }
  if (part.business.userId !== userId) {
    fail(res, 403, "You do not own this spare part listing");
    return;
  }
  const { name, oem, compatibleVins, condition, price, stock } = req.body ?? {};
  const data = {};
  if (name !== void 0) {
    if (!isNonEmptyString(name)) {
      fail(res, 400, "name must be a non-empty string");
      return;
    }
    data.name = name;
  }
  if (oem !== void 0) data.oem = isNonEmptyString(oem) ? oem : null;
  if (compatibleVins !== void 0) {
    if (!Array.isArray(compatibleVins)) {
      fail(res, 400, "compatibleVins must be an array");
      return;
    }
    data.compatibleVins = compatibleVins;
  }
  if (condition !== void 0) {
    if (!isNonEmptyString(condition) || !CONDITIONS.includes(condition)) {
      fail(res, 400, `condition must be one of: ${CONDITIONS.join(", ")}`);
      return;
    }
    data.condition = condition;
  }
  if (price !== void 0) {
    const n = toNumber5(price);
    if (n === void 0 || n <= 0) {
      fail(res, 400, "price must be a positive number");
      return;
    }
    data.price = n;
  }
  if (stock !== void 0) {
    const n = toInt4(stock);
    if (n === void 0 || n < 0) {
      fail(res, 400, "stock must be a non-negative integer");
      return;
    }
    data.stock = n;
  }
  const updated = await prisma.sparePart.update({ where: { id }, data, include: { business: { select: businessSelect } } });
  ok(res, updated);
}
async function deletePart(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const part = await prisma.sparePart.findUnique({ where: { id }, include: { business: true } });
  if (!part) {
    fail(res, 404, "Spare part not found");
    return;
  }
  if (part.business.userId !== userId) {
    fail(res, 403, "You do not own this spare part listing");
    return;
  }
  await prisma.sparePart.delete({ where: { id } });
  ok(res, { id, deleted: true });
}
async function myParts(req, res) {
  const userId = req.user.userId;
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const businesses = await prisma.businessProfile.findMany({ where: { userId }, select: { id: true } });
  const businessIds = businesses.map((b) => b.id);
  if (businessIds.length === 0) {
    okPaginated(res, [], { page, limit, total: 0 });
    return;
  }
  const where = { businessId: { in: businessIds } };
  const [parts, total] = await Promise.all([
    prisma.sparePart.findMany({
      where,
      include: { business: { select: businessSelect } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.sparePart.count({ where })
  ]);
  okPaginated(res, parts, { page, limit, total });
}
async function compatibleWithVin(req, res) {
  const { vin } = req.params;
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const where = { compatibleVins: { array_contains: vin } };
  const [parts, total] = await Promise.all([
    prisma.sparePart.findMany({
      where,
      include: { business: { select: businessSelect } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.sparePart.count({ where })
  ]);
  okPaginated(res, parts, { page, limit, total });
}

// server/routes/sparePartRoutes.ts
var router16 = (0, import_express16.Router)();
router16.get("/my-parts", requireAuth, myParts);
router16.get("/compatible/:vin", compatibleWithVin);
router16.get("/", listParts);
router16.get("/:id", getPart);
router16.post("/", requireAuth, createPart);
router16.put("/:id", requireAuth, updatePart);
router16.delete("/:id", requireAuth, deletePart);
var sparePartRoutes_default = router16;

// server/routes/documentRoutes.ts
var import_express17 = require("express");

// server/controllers/documentController.ts
var DOCUMENT_TYPES = [
  "ID_CARD",
  "PASSPORT",
  "REGISTRATION",
  "INSURANCE",
  "INSPECTION",
  "CONTRACT",
  "INVOICE",
  "RECEIPT"
];
async function createDocument(req, res) {
  const userId = req.user.userId;
  const { vehicleId, type, url, name } = req.body ?? {};
  if (!isNonEmptyString(type) || !DOCUMENT_TYPES.includes(type)) {
    fail(res, 400, `type must be one of: ${DOCUMENT_TYPES.join(", ")}`);
    return;
  }
  if (!isNonEmptyString(url)) {
    fail(res, 400, "url is required");
    return;
  }
  if (!isNonEmptyString(name)) {
    fail(res, 400, "name is required");
    return;
  }
  if (vehicleId !== void 0 && vehicleId !== null) {
    if (!isNonEmptyString(vehicleId)) {
      fail(res, 400, "vehicleId must be a string");
      return;
    }
    const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, deletedAt: null } });
    if (!vehicle) {
      fail(res, 404, "Vehicle not found");
      return;
    }
  }
  const document = await prisma.document.create({
    data: {
      userId,
      vehicleId: isNonEmptyString(vehicleId) ? vehicleId : null,
      type,
      url,
      name
    }
  });
  ok(res, document, 201);
}
async function listDocuments(req, res) {
  const userId = req.user.userId;
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const where = { userId };
  if (isNonEmptyString(q.type) && DOCUMENT_TYPES.includes(q.type)) where.type = q.type;
  if (isNonEmptyString(q.vehicleId)) where.vehicleId = q.vehicleId;
  const [documents, total] = await Promise.all([
    prisma.document.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.document.count({ where })
  ]);
  okPaginated(res, documents, { page, limit, total });
}
async function getDocument(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    fail(res, 404, "Document not found");
    return;
  }
  if (document.userId !== userId) {
    fail(res, 403, "You do not have permission to view this document");
    return;
  }
  ok(res, document);
}
async function deleteDocument(req, res) {
  const userId = req.user.userId;
  const { id } = req.params;
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    fail(res, 404, "Document not found");
    return;
  }
  if (document.userId !== userId) {
    fail(res, 403, "You do not have permission to delete this document");
    return;
  }
  await prisma.document.delete({ where: { id } });
  ok(res, { id, deleted: true });
}

// server/routes/documentRoutes.ts
var router17 = (0, import_express17.Router)();
router17.get("/", requireAuth, listDocuments);
router17.get("/:id", requireAuth, getDocument);
router17.post("/", requireAuth, createDocument);
router17.delete("/:id", requireAuth, deleteDocument);
var documentRoutes_default = router17;

// server/routes/dashboardRoutes.ts
var import_express18 = require("express");

// server/controllers/dashboardController.ts
function startOfToday() {
  const d = /* @__PURE__ */ new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function monthsAgo(n) {
  const d = /* @__PURE__ */ new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}
function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function bucketByMonth(dates, months = 6) {
  const buckets = /* @__PURE__ */ new Map();
  const keys = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = /* @__PURE__ */ new Date();
    d.setMonth(d.getMonth() - i);
    const key = monthKey(d);
    keys.push(key);
    buckets.set(key, 0);
  }
  for (const date of dates) {
    const key = monthKey(date);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }
  return keys.map((month) => ({ month, count: buckets.get(month) ?? 0 }));
}
async function userDashboard(req, res) {
  const userId = req.user.userId;
  const [
    myVehicles,
    myActiveAuctions,
    myActiveBidRows,
    myOpenClaims,
    myPolicies,
    myBookings2,
    myUnreadMessages,
    myUnreadNotifications,
    recentActivity
  ] = await Promise.all([
    prisma.vehicle.count({ where: { sellerId: userId, status: "ACTIVE", deletedAt: null } }),
    prisma.auction.count({ where: { sellerId: userId, status: "ACTIVE" } }),
    prisma.bid.findMany({
      where: { bidderId: userId, auction: { status: "ACTIVE" } },
      distinct: ["auctionId"],
      select: { auctionId: true }
    }),
    prisma.claim.count({ where: { userId, status: { in: ["OPEN", "REVIEWING"] } } }),
    prisma.insurancePolicy.count({ where: { userId, status: "ACTIVE" } }),
    prisma.booking.count({ where: { userId, date: { gte: startOfToday() } } }),
    prisma.message.count({ where: { receiverId: userId, read: false } }),
    prisma.notification.count({ where: { userId, read: false } }),
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 })
  ]);
  ok(res, {
    myVehicles,
    myActiveAuctions,
    myActiveBids: myActiveBidRows.length,
    myOpenClaims,
    myPolicies,
    myBookings: myBookings2,
    myUnreadMessages,
    myUnreadNotifications,
    recentActivity
  });
}
async function businessDashboard(req, res) {
  const userId = req.user.userId;
  const businesses = await prisma.businessProfile.findMany({ where: { userId } });
  if (businesses.length === 0) {
    fail(res, 403, "You do not have a business profile");
    return;
  }
  const businessIds = businesses.map((b) => b.id);
  const [
    totalListings,
    totalSold,
    revenueAgg,
    upcomingBookings,
    recentReviews,
    recentVehicles
  ] = await Promise.all([
    prisma.vehicle.count({ where: { sellerId: userId, status: "ACTIVE", deletedAt: null } }),
    prisma.vehicle.count({ where: { sellerId: userId, status: "SOLD", deletedAt: null } }),
    prisma.vehicle.aggregate({
      where: { sellerId: userId, status: "SOLD", deletedAt: null },
      _sum: { price: true }
    }),
    prisma.booking.findMany({
      where: { businessId: { in: businessIds }, date: { gte: /* @__PURE__ */ new Date() } },
      orderBy: { date: "asc" },
      take: 5,
      include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true, phone: true } } }
    }),
    prisma.review.findMany({
      where: { businessId: { in: businessIds } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { reviewer: { select: { id: true, firstName: true, lastName: true, avatar: true } } }
    }),
    prisma.vehicle.findMany({
      where: { sellerId: userId, deletedAt: null, createdAt: { gte: monthsAgo(6) } },
      select: { createdAt: true }
    })
  ]);
  const totalReviews = businesses.reduce((sum, b) => sum + b.reviewCount, 0);
  const weightedRatingSum = businesses.reduce((sum, b) => sum + b.rating * b.reviewCount, 0);
  const avgRating = totalReviews > 0 ? weightedRatingSum / totalReviews : 0;
  ok(res, {
    totalListings,
    totalSold,
    avgRating,
    totalReviews,
    upcomingBookings,
    recentReviews,
    totalRevenue: revenueAgg._sum.price ?? 0,
    monthlyListings: bucketByMonth(recentVehicles.map((v) => v.createdAt))
  });
}
async function governmentDashboard(req, res) {
  const [
    totalRegisteredVehicles,
    totalInspections,
    passedCount,
    failedCount,
    flaggedVehicles,
    recentInspections,
    recentInspectionDates,
    allFraudFlags
  ] = await Promise.all([
    prisma.vehicle.count({ where: { deletedAt: null } }),
    prisma.inspection.count(),
    prisma.inspection.count({ where: { result: "PASSED" } }),
    prisma.inspection.count({ where: { result: "FAILED" } }),
    prisma.vehicle.count({ where: { status: "FLAGGED" } }),
    prisma.inspection.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        vehicle: { select: { id: true, vin: true, make: true, model: true, year: true } },
        inspector: { select: { id: true, firstName: true, lastName: true } }
      }
    }),
    prisma.inspection.findMany({ where: { createdAt: { gte: monthsAgo(6) } }, select: { createdAt: true } }),
    prisma.inspection.findMany({ select: { fraudFlags: true } })
  ]);
  const passRate = totalInspections > 0 ? passedCount / totalInspections * 100 : 0;
  const failRate = totalInspections > 0 ? failedCount / totalInspections * 100 : 0;
  const flagCounts = /* @__PURE__ */ new Map();
  for (const { fraudFlags } of allFraudFlags) {
    if (Array.isArray(fraudFlags)) {
      for (const flag of fraudFlags) {
        if (typeof flag === "string") {
          flagCounts.set(flag, (flagCounts.get(flag) ?? 0) + 1);
        }
      }
    }
  }
  const topFraudFlags = Array.from(flagCounts.entries()).map(([flag, count]) => ({ flag, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  ok(res, {
    totalRegisteredVehicles,
    totalInspections,
    passRate,
    failRate,
    flaggedVehicles,
    recentInspections,
    inspectionsByMonth: bucketByMonth(recentInspectionDates.map((i) => i.createdAt)),
    topFraudFlags
  });
}
async function policeDashboard(_req, res) {
  const [
    totalStolenReports,
    openCases,
    recoveredVehicles,
    closedCases,
    recentReports,
    recentReportDates,
    flaggedVehicleList
  ] = await Promise.all([
    prisma.stolenReport.count(),
    prisma.stolenReport.count({ where: { status: { in: ["OPEN", "INVESTIGATING"] } } }),
    prisma.stolenReport.count({ where: { status: "RECOVERED" } }),
    prisma.stolenReport.count({ where: { status: "CLOSED" } }),
    prisma.stolenReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        vehicle: { select: { id: true, vin: true, make: true, model: true, year: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } }
      }
    }),
    prisma.stolenReport.findMany({ where: { createdAt: { gte: monthsAgo(6) } }, select: { createdAt: true } }),
    prisma.vehicle.findMany({
      where: { status: "FLAGGED" },
      include: { seller: { select: { id: true, firstName: true, lastName: true, phone: true } } }
    })
  ]);
  ok(res, {
    totalStolenReports,
    openCases,
    recoveredVehicles,
    closedCases,
    recentReports,
    reportsByMonth: bucketByMonth(recentReportDates.map((r) => r.createdAt)),
    flaggedVehicles: flaggedVehicleList
  });
}
async function insuranceDashboard(_req, res) {
  const [
    totalPolicies,
    activePolicies,
    totalClaims,
    openClaims,
    approvedClaims,
    deniedClaims,
    recentClaims,
    recentClaimDates,
    premiumAgg
  ] = await Promise.all([
    prisma.insurancePolicy.count(),
    prisma.insurancePolicy.count({ where: { status: "ACTIVE" } }),
    prisma.claim.count(),
    prisma.claim.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
    prisma.claim.count({ where: { status: "APPROVED" } }),
    prisma.claim.count({ where: { status: "DENIED" } }),
    prisma.claim.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        vehicle: { select: { id: true, vin: true, make: true, model: true, year: true } },
        user: { select: { id: true, firstName: true, lastName: true } }
      }
    }),
    prisma.claim.findMany({ where: { createdAt: { gte: monthsAgo(6) } }, select: { createdAt: true } }),
    prisma.insurancePolicy.aggregate({ where: { status: "ACTIVE" }, _sum: { premium: true } })
  ]);
  ok(res, {
    totalPolicies,
    activePolicies,
    totalClaims,
    openClaims,
    approvedClaims,
    deniedClaims,
    recentClaims,
    claimsByMonth: bucketByMonth(recentClaimDates.map((c) => c.createdAt)),
    totalPremiumValue: premiumAgg._sum.premium ?? 0
  });
}

// server/routes/dashboardRoutes.ts
var router18 = (0, import_express18.Router)();
router18.get("/user", requireAuth, userDashboard);
router18.get("/business", requireAuth, businessDashboard);
router18.get("/government", requireAuth, requireRole("GOVERNMENT"), governmentDashboard);
router18.get("/police", requireAuth, requireRole("POLICE"), policeDashboard);
router18.get("/insurance", requireAuth, requireRole("INSURANCE"), insuranceDashboard);
var dashboardRoutes_default = router18;

// server/routes/adminRoutes.ts
var import_express19 = require("express");

// server/controllers/adminController.ts
var USER_ROLES = ["PERSONAL", "BUSINESS", "INSURANCE", "WORKSHOP", "LOGISTICS", "GOVERNMENT", "POLICE"];
var userSelect2 = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatar: true,
  country: true,
  city: true,
  role: true,
  emailVerified: true,
  identityVerified: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
};
function sevenDaysAgo() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
}
async function listUsers(req, res) {
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const where = {};
  if (isNonEmptyString(q.role) && USER_ROLES.includes(q.role)) {
    where.role = q.role;
  }
  if (isNonEmptyString(q.search)) {
    const search = q.search;
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } }
    ];
  }
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, select: userSelect2, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.user.count({ where })
  ]);
  okPaginated(res, users, { page, limit, total });
}
async function updateUserRole(req, res) {
  const { id } = req.params;
  const { role } = req.body ?? {};
  if (!isNonEmptyString(role) || !USER_ROLES.includes(role)) {
    fail(res, 400, `role must be one of: ${USER_ROLES.join(", ")}`);
    return;
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    fail(res, 404, "User not found");
    return;
  }
  const updated = await prisma.user.update({ where: { id }, data: { role }, select: userSelect2 });
  ok(res, updated);
}
async function verifyUser(req, res) {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    fail(res, 404, "User not found");
    return;
  }
  const updated = await prisma.user.update({ where: { id }, data: { identityVerified: true }, select: userSelect2 });
  ok(res, updated);
}
async function banUser(req, res) {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    fail(res, 404, "User not found");
    return;
  }
  const updated = await prisma.user.update({ where: { id }, data: { deletedAt: /* @__PURE__ */ new Date() }, select: userSelect2 });
  ok(res, updated);
}
async function listBusinesses2(req, res) {
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const where = {};
  if (q.verified === "true") where.verified = true;
  if (q.verified === "false") where.verified = false;
  if (isNonEmptyString(q.businessType) && BUSINESS_TYPES.includes(q.businessType)) {
    where.businessType = q.businessType;
  }
  const [businesses, total] = await Promise.all([
    prisma.businessProfile.findMany({
      where,
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.businessProfile.count({ where })
  ]);
  okPaginated(res, businesses, { page, limit, total });
}
async function verifyBusiness(req, res) {
  const { id } = req.params;
  const business = await prisma.businessProfile.findUnique({ where: { id } });
  if (!business) {
    fail(res, 404, "Business not found");
    return;
  }
  const updated = await prisma.businessProfile.update({ where: { id }, data: { verified: true } });
  ok(res, updated);
}
async function rejectBusiness(req, res) {
  const { id } = req.params;
  const { deleteRecord } = req.body ?? {};
  const business = await prisma.businessProfile.findUnique({ where: { id } });
  if (!business) {
    fail(res, 404, "Business not found");
    return;
  }
  if (deleteRecord === true) {
    await prisma.businessProfile.delete({ where: { id } });
    ok(res, { id, deleted: true });
    return;
  }
  const updated = await prisma.businessProfile.update({ where: { id }, data: { verified: false } });
  ok(res, updated);
}
async function platformStats(_req, res) {
  const since = sevenDaysAgo();
  const [
    totalUsers,
    totalVehicles,
    totalBusinesses,
    totalAuctions,
    completedBookings,
    confirmedTransfers,
    usersRegisteredThisWeek,
    vehiclesListedThisWeek
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.vehicle.count({ where: { deletedAt: null } }),
    prisma.businessProfile.count(),
    prisma.auction.count(),
    prisma.booking.count({ where: { status: "COMPLETED" } }),
    prisma.ownershipTransfer.count({ where: { status: "CONFIRMED" } }),
    prisma.user.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
    prisma.vehicle.count({ where: { createdAt: { gte: since }, deletedAt: null } })
  ]);
  ok(res, {
    totalUsers,
    totalVehicles,
    totalBusinesses,
    totalAuctions,
    totalTransactions: completedBookings + confirmedTransfers,
    usersRegisteredThisWeek,
    vehiclesListedThisWeek
  });
}
var BACKFILL_PHOTO_URLS = [
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70",
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d",
  "https://images.unsplash.com/photo-1494905998402-395d579af36f",
  "https://images.unsplash.com/photo-1583121274602-3e2820c69888",
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994",
  "https://images.unsplash.com/photo-1560958089-b8a1929cea89"
];
async function backfillVehiclePhotos(_req, res) {
  const vehiclesWithoutPhotos = await prisma.vehicle.findMany({
    where: { photos: { none: {} } },
    select: { id: true }
  });
  for (const [i, v] of vehiclesWithoutPhotos.entries()) {
    await prisma.vehiclePhoto.createMany({
      data: [0, 1, 2].map((idx) => ({
        vehicleId: v.id,
        url: `${BACKFILL_PHOTO_URLS[(i + idx) % BACKFILL_PHOTO_URLS.length]}?auto=format&fit=crop&w=1200&q=80&sig=backfill-${i}-${idx}`,
        isPrimary: idx === 0,
        order: idx
      }))
    });
  }
  ok(res, { backfilled: vehiclesWithoutPhotos.length });
}
async function flaggedOverview(_req, res) {
  const [flaggedVehicles, openStolenReports, openClaims] = await Promise.all([
    prisma.vehicle.findMany({
      where: { status: "FLAGGED" },
      include: { seller: { select: { id: true, firstName: true, lastName: true, phone: true } } }
    }),
    prisma.stolenReport.findMany({
      where: { status: { in: ["OPEN", "INVESTIGATING"] } },
      include: {
        vehicle: { select: { id: true, vin: true, make: true, model: true, year: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.claim.findMany({
      where: { status: { in: ["OPEN", "REVIEWING"] } },
      include: {
        vehicle: { select: { id: true, vin: true, make: true, model: true, year: true } },
        user: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);
  ok(res, { flaggedVehicles, openStolenReports, openClaims });
}

// server/routes/adminRoutes.ts
var router19 = (0, import_express19.Router)();
router19.use(requireAuth, requireRole("GOVERNMENT"));
router19.get("/stats", platformStats);
router19.get("/flagged", flaggedOverview);
router19.get("/users", listUsers);
router19.patch("/users/:id/role", updateUserRole);
router19.patch("/users/:id/verify", verifyUser);
router19.patch("/users/:id/ban", banUser);
router19.get("/businesses", listBusinesses2);
router19.patch("/businesses/:id/verify", verifyBusiness);
router19.patch("/businesses/:id/reject", rejectBusiness);
router19.post("/backfill-vehicle-photos", backfillVehiclePhotos);
var adminRoutes_default = router19;

// server/routes/searchRoutes.ts
var import_express20 = require("express");

// server/controllers/searchController.ts
async function globalSearch(req, res) {
  const q = req.query.q;
  if (!isNonEmptyString(q)) {
    fail(res, 400, "q is required");
    return;
  }
  const query = q;
  const vehicleWhere = {
    status: "ACTIVE",
    deletedAt: null,
    OR: [
      { make: { contains: query, mode: "insensitive" } },
      { model: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } }
    ]
  };
  const businessWhere = {
    OR: [
      { businessName: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } }
    ]
  };
  const sparePartWhere = {
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { oem: { contains: query, mode: "insensitive" } }
    ]
  };
  const [vehicles, vehicleTotal, businesses, businessTotal, spareParts, sparePartTotal] = await Promise.all([
    prisma.vehicle.findMany({
      where: vehicleWhere,
      include: { photos: { orderBy: { order: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.vehicle.count({ where: vehicleWhere }),
    prisma.businessProfile.findMany({
      where: businessWhere,
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.businessProfile.count({ where: businessWhere }),
    prisma.sparePart.findMany({
      where: sparePartWhere,
      include: { business: { select: { id: true, businessName: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.sparePart.count({ where: sparePartWhere })
  ]);
  ok(res, {
    vehicles: { results: vehicles, total: vehicleTotal },
    businesses: { results: businesses, total: businessTotal },
    spareParts: { results: spareParts, total: sparePartTotal }
  });
}

// server/routes/searchRoutes.ts
var router20 = (0, import_express20.Router)();
router20.get("/", globalSearch);
var searchRoutes_default = router20;

// server/routes/photoSyncRoutes.ts
var import_express21 = require("express");

// server/controllers/photoSyncController.ts
async function uploadPhoto(req, res) {
  const { sessionId, photoKey, imageBytes } = req.body ?? {};
  if (!isNonEmptyString(sessionId) || !isNonEmptyString(photoKey) || !isNonEmptyString(imageBytes)) {
    res.status(400).json({ error: "Missing required parameters: sessionId, photoKey, or imageBytes" });
    return;
  }
  await prisma.photoSyncPhoto.upsert({
    where: { sessionId_photoKey: { sessionId, photoKey } },
    create: { sessionId, photoKey, imageBytes },
    update: { imageBytes }
  });
  res.json({ success: true, message: `Photo synced for key '${photoKey}' under session '${sessionId}'` });
}
async function getSessionPhotos(req, res) {
  const { sessionId } = req.params;
  if (!isNonEmptyString(sessionId)) {
    res.status(400).json({ error: "No sessionId provided" });
    return;
  }
  const rows = await prisma.photoSyncPhoto.findMany({ where: { sessionId } });
  const photos = {};
  for (const row of rows) {
    photos[row.photoKey] = row.imageBytes;
  }
  res.json({ success: true, photos });
}
async function clearSession(req, res) {
  const { sessionId } = req.body ?? {};
  if (isNonEmptyString(sessionId)) {
    await prisma.photoSyncPhoto.deleteMany({ where: { sessionId } });
  }
  res.json({ success: true });
}

// server/routes/photoSyncRoutes.ts
var router21 = (0, import_express21.Router)();
router21.post("/upload", uploadPhoto);
router21.get("/session/:sessionId", getSessionPhotos);
router21.post("/clear", clearSession);
var photoSyncRoutes_default = router21;

// server/app.ts
var app = (0, import_express22.default)();
app.use((0, import_cors.default)());
app.use(import_express22.default.json({ limit: "20mb" }));
app.use(import_express22.default.urlencoded({ limit: "20mb", extended: true }));
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});
app.get("/api/backend-health", (_req, res) => {
  res.json({ status: "ok", service: "backend" });
});
app.use("/api/auth", authRoutes_default);
app.use("/api/vehicles", vehicleRoutes_default);
app.use("/api/businesses", businessRoutes_default);
app.use("/api/reviews", reviewRoutes_default);
app.use("/api/bookings", bookingRoutes_default);
app.use("/api/marketplace", marketplaceRoutes_default);
app.use("/api/auctions", auctionRoutes_default);
app.use("/api/transport", transportRoutes_default);
app.use("/api/vin", vinRoutes_default);
app.use("/api/inspections", inspectionRoutes_default);
app.use("/api/insurance", insuranceRoutes_default);
app.use("/api/transfers", transferRoutes_default);
app.use("/api/stolen-reports", stolenReportRoutes_default);
app.use("/api/messages", messageRoutes_default);
app.use("/api/notifications", notificationRoutes_default);
app.use("/api/spare-parts", sparePartRoutes_default);
app.use("/api/documents", documentRoutes_default);
app.use("/api/dashboard", dashboardRoutes_default);
app.use("/api/admin", adminRoutes_default);
app.use("/api/search", searchRoutes_default);
app.use("/api/photo-sync", photoSyncRoutes_default);
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Not found" });
});
app.use((err, _req, res, _next) => {
  console.error("[backend] Unhandled error:", err);
  if (res.headersSent) return;
  res.status(500).json({ success: false, error: "Internal server error" });
});

// server/vercelHandler.ts
var vercelHandler_default = app;
