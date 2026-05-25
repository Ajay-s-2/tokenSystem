const AuthSession = require("./auth-session.model");

const createSession = async (payload) => AuthSession.create(payload);

const findById = async (id) => AuthSession.findById(id);

const findActiveById = async (id) =>
  AuthSession.findOne({
    _id: id,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

const revokeById = async (id, revokeReason = "logout") =>
  AuthSession.findByIdAndUpdate(
    id,
    { revokedAt: new Date(), revokeReason },
    { returnDocument: "after" }
  );

const rotateRefreshToken = async (id, refreshTokenHash, expiresAt, context = {}) =>
  AuthSession.findByIdAndUpdate(
    id,
    {
      refreshTokenHash,
      expiresAt,
      lastUsedAt: new Date(),
      userAgent: context.userAgent || null,
      ipAddress: context.ipAddress || null,
      revokedAt: null,
      revokeReason: null,
    },
    { returnDocument: "after" }
  );

const revokeFamily = async (familyId, revokeReason = "session_reuse_detected") =>
  AuthSession.updateMany(
    { familyId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokeReason } }
  );

const revokeAllForUser = async (userId, revokeReason = "logout_all") =>
  AuthSession.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokeReason } }
  );

module.exports = {
  createSession,
  findById,
  findActiveById,
  revokeById,
  rotateRefreshToken,
  revokeFamily,
  revokeAllForUser,
};
