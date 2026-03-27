const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

const parsePagination = (query = {}) => {
  const page = parsePositiveInt(query.page, DEFAULT_PAGE);
  const limit = Math.min(parsePositiveInt(query.limit, DEFAULT_LIMIT), MAX_LIMIT);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
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
  parsePagination,
  buildSort,
};
