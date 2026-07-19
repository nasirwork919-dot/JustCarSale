import { Response } from "express";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { signToken } from "../utils/jwt";
import { generateSecureToken, generateOtpCode } from "../utils/tokens";
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/emailService";
import { isValidEmail, isNonEmptyString, isStrongEnoughPassword } from "../utils/validation";
import { AuthenticatedRequest } from "../middleware/auth";
import { Request } from "express";

const SALT_ROUNDS = 10;
const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h
const OTP_CREATE_MAX_ATTEMPTS = 5;

// The token column is globally unique; a 6-digit numeric OTP has a much
// smaller keyspace than the long opaque tokens it's replacing, so retry a
// handful of times on the rare collision instead of failing registration.
async function createVerificationCode(userId: string): Promise<string> {
  for (let attempt = 0; attempt < OTP_CREATE_MAX_ATTEMPTS; attempt++) {
    const code = generateOtpCode();
    try {
      await prisma.emailVerificationToken.create({
        data: {
          userId,
          token: code,
          expiresAt: new Date(Date.now() + VERIFICATION_CODE_TTL_MS),
        },
      });
      return code;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        continue;
      }
      throw err;
    }
  }
  throw new Error("Could not generate a unique verification code");
}

function publicUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  country: string | null;
  city: string | null;
  role: string;
  emailVerified: boolean;
  identityVerified: boolean;
  createdAt: Date;
}) {
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
    createdAt: user.createdAt,
  };
}

export async function register(req: Request, res: Response) {
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

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      phone: isNonEmptyString(phone) ? phone : null,
    },
  });

  const code = await createVerificationCode(user.id);
  await sendVerificationEmail(user.email, code);

  const jwtToken = signToken({ userId: user.id, email: user.email, role: user.role });

  res.status(201).json({ user: publicUser(user), token: jwtToken });
}

export async function resendVerification(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.userId;

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

export async function login(req: Request, res: Response) {
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

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const jwtToken = signToken({ userId: user.id, email: user.email, role: user.role });
  res.json({ user: publicUser(user), token: jwtToken });
}

export async function verifyEmail(req: Request, res: Response) {
  const { token } = req.body ?? {};
  if (!isNonEmptyString(token)) {
    res.status(400).json({ error: "token is required" });
    return;
  }

  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record || record.expiresAt < new Date()) {
    res.status(400).json({ error: "Invalid or expired verification token" });
    return;
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
    prisma.emailVerificationToken.delete({ where: { id: record.id } }),
  ]);

  res.json({ success: true, message: "Email verified successfully" });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body ?? {};
  if (!isValidEmail(email)) {
    res.status(400).json({ error: "A valid email is required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  // Always respond success to avoid leaking which emails are registered.
  if (user && !user.deletedAt) {
    const token = generateSecureToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });
    await sendPasswordResetEmail(user.email, token);
  }

  res.json({ success: true, message: "If that email exists, a reset link has been sent" });
}

export async function resetPassword(req: Request, res: Response) {
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
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  res.json({ success: true, message: "Password reset successfully" });
}

export async function me(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user: publicUser(user) });
}

export async function completeProfile(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.userId;
  const { country, city, avatar } = req.body ?? {};

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      country: isNonEmptyString(country) ? country : undefined,
      city: isNonEmptyString(city) ? city : undefined,
      avatar: isNonEmptyString(avatar) ? avatar : undefined,
    },
  });

  res.json({ user: publicUser(user) });
}

const UPGRADABLE_ROLES = ["BUSINESS", "INSURANCE", "WORKSHOP", "LOGISTICS", "GOVERNMENT", "POLICE"] as const;

export async function selectRole(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!.userId;
  const { role } = req.body ?? {};

  if (typeof role !== "string" || !UPGRADABLE_ROLES.includes(role as (typeof UPGRADABLE_ROLES)[number])) {
    res.status(400).json({
      error: `role must be one of: ${UPGRADABLE_ROLES.join(", ")}`,
    });
    return;
  }

  // Every one of these roles requires admin approval before taking effect —
  // including the sensitive GOVERNMENT/POLICE roles, which real-world identity
  // verification means we never grant automatically either. We only record the
  // request as a notification; a GOVERNMENT-role admin must approve it out of
  // band via PATCH /api/admin/users/:id/role before the user's role actually
  // changes.
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
      message: `Request to upgrade role to ${role} is pending admin approval`,
    },
  });
  res.json({
    success: true,
    message: "Role upgrade request submitted for admin approval",
    pendingRole: role,
  });
}
