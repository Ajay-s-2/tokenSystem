const store = new Map();

const normalizeEmail = (email) => (email || "").toLowerCase();

const setOtp = (email, payload) => {
  store.set(normalizeEmail(email), payload);
};

const getOtp = (email) => {
  return store.get(normalizeEmail(email)) || null;
};

const clearOtp = (email) => {
  store.delete(normalizeEmail(email));
};

module.exports = { setOtp, getOtp, clearOtp };
