const mongoose = require("mongoose");
const Log = require("./log.model");
const { createHttpError } = require("../../shared/utils/error.util");
const { parsePagination, buildSort } = require("../../shared/utils/query.util");

const LOG_TYPES = ["info", "success", "warn", "error"];
const LOG_ORIGINS = ["frontend", "backend", "system"];
const LOG_SORT_FIELDS = ["createdAt", "updatedAt", "type", "origin", "source", "message"];

const normalizeText = (value) => {
  const normalizedValue = String(value || "").trim();
  return normalizedValue || null;
};

const normalizeData = (value) => {
  if (value === undefined) {
    return null;
  }

  if (value === null) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return { value: String(value) };
  }
};

const mapLog = (log) => {
  const source = typeof log.toObject === "function" ? log.toObject() : log;

  return {
    id: String(source._id),
    type: source.type,
    message: source.message,
    source: source.source,
    origin: source.origin,
    data: source.data,
    userId: source.userId,
    userRole: source.userRole,
    requestMethod: source.requestMethod,
    requestPath: source.requestPath,
    statusCode: source.statusCode,
    ipAddress: source.ipAddress,
    userAgent: source.userAgent,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
};

const buildLogFilters = (query = {}) => {
  const filters = {};
  const type = normalizeText(query.type)?.toLowerCase();
  const origin = normalizeText(query.origin)?.toLowerCase();
  const source = normalizeText(query.source);
  const search = normalizeText(query.search);

  if (type) {
    filters.type = type;
  }

  if (origin) {
    filters.origin = origin;
  }

  if (source) {
    filters.source = source;
  }

  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filters.$or = [
      { message: { $regex: escapedSearch, $options: "i" } },
      { source: { $regex: escapedSearch, $options: "i" } },
      { requestPath: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  return filters;
};

const createLog = async (payload = {}, context = {}) => {
  const type = normalizeText(payload.type)?.toLowerCase();
  const message = normalizeText(payload.message);
  const source = normalizeText(payload.source);
  const origin = normalizeText(payload.origin)?.toLowerCase() || "frontend";

  if (!LOG_TYPES.includes(type)) {
    throw createHttpError(400, "type must be one of info, success, warn, error");
  }

  if (!message) {
    throw createHttpError(400, "message is required");
  }

  if (!LOG_ORIGINS.includes(origin)) {
    throw createHttpError(400, "origin must be one of frontend, backend, system");
  }

  const log = await Log.create({
    type,
    message,
    source,
    origin,
    data: normalizeData(payload.data),
    userId: context.userId ? String(context.userId) : null,
    userRole: context.userRole ? String(context.userRole) : null,
    requestMethod: normalizeText(context.requestMethod),
    requestPath: normalizeText(context.requestPath),
    statusCode: Number.isInteger(context.statusCode) ? context.statusCode : null,
    ipAddress: normalizeText(context.ipAddress),
    userAgent: normalizeText(context.userAgent),
  });

  return mapLog(log);
};

const listLogs = async (query = {}) => {
  const filters = buildLogFilters(query);
  const { page, limit, skip } = parsePagination(query);
  const sort = buildSort(query.sort, LOG_SORT_FIELDS, { createdAt: -1 });

  const [items, total] = await Promise.all([
    Log.find(filters).sort(sort).skip(skip).limit(limit),
    Log.countDocuments(filters),
  ]);

  return {
    items: items.map(mapLog),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

const deleteLogById = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw createHttpError(400, "Invalid log id");
  }

  const log = await Log.findByIdAndDelete(id);
  if (!log) {
    throw createHttpError(404, "Log not found");
  }

  return {
    id: String(log._id),
  };
};

const captureErrorLog = async (error, req) => {
  if (!error) return null;

  try {
    return await createLog(
      {
        type: "error",
        message: error.message || "Unhandled server error",
        source: "backend.error",
        origin: "backend",
        data: {
          statusCode: error.statusCode || 500,
          errors: error.errors || null,
          stack: error.stack || null,
        },
      },
      {
        userId: req?.user?.id || null,
        userRole: req?.user?.role || null,
        requestMethod: req?.method || null,
        requestPath: req?.originalUrl || req?.path || null,
        statusCode: error.statusCode || 500,
        ipAddress: req?.ip || null,
        userAgent: req?.get ? req.get("user-agent") : null,
      }
    );
  } catch {
    return null;
  }
};

module.exports = {
  createLog,
  listLogs,
  deleteLogById,
  captureErrorLog,
};
