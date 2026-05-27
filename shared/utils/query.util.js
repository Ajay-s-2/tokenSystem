const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

const parsePagination = (query = {}, options = {}) => {
  const defaultPage = parsePositiveInt(options.defaultPage, DEFAULT_PAGE);
  const defaultLimit = parsePositiveInt(options.defaultLimit, DEFAULT_LIMIT);
  const maxLimit = parsePositiveInt(options.maxLimit, MAX_LIMIT);
  const page = parsePositiveInt(query.page, defaultPage);
  const limit = Math.min(parsePositiveInt(query.limit, defaultLimit), maxLimit);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const buildPaginatedResponse = ({ items, page, limit, totalRecords }) => {
  const total = Number(totalRecords || 0);
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    items,
    data: items,
    page,
    limit,
    total,
    totalRecords: total,
    totalPages,
    pagination: {
      page,
      limit,
      total,
      totalRecords: total,
      totalPages,
    },
  };
};

const buildSort = (sortParam, allowedFields = [], defaultSort = { createdAt: -1 }) => {
  if (!sortParam) {
    return defaultSort;
  }

  const sortFields = String(sortParam)
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);

  const sort = {};

  sortFields.forEach((field) => {
    const direction = field.startsWith("-") ? -1 : 1;
    const normalizedField = field.replace(/^-/, "");

    if (allowedFields.includes(normalizedField)) {
      sort[normalizedField] = direction;
    }
  });

  return Object.keys(sort).length ? sort : defaultSort;
};

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  parsePagination,
  buildPaginatedResponse,
  buildSort,
};
