const { LOGIN_STATUS, APPROVAL_STATUS } = require("./constants");

const approvalToLoginStatusMap = {
  [APPROVAL_STATUS.PENDING]: LOGIN_STATUS.PENDING,
  [APPROVAL_STATUS.APPROVED]: LOGIN_STATUS.APPROVED,
  [APPROVAL_STATUS.REJECTED]: LOGIN_STATUS.REJECTED,
};

const loginToApprovalStatusMap = {
  [LOGIN_STATUS.PENDING]: APPROVAL_STATUS.PENDING,
  [LOGIN_STATUS.APPROVED]: APPROVAL_STATUS.APPROVED,
  [LOGIN_STATUS.REJECTED]: APPROVAL_STATUS.REJECTED,
};

const normalizeApprovalStatus = (status) => String(status || "").trim().toLowerCase();

const getLoginStatusFromApprovalStatus = (status) =>
  approvalToLoginStatusMap[normalizeApprovalStatus(status)] || null;

const getApprovalStatusFromLoginStatus = (loginStatus) =>
  loginToApprovalStatusMap[loginStatus] || APPROVAL_STATUS.PENDING;

const isValidApprovalStatus = (status) => Boolean(getLoginStatusFromApprovalStatus(status));

module.exports = {
  normalizeApprovalStatus,
  getLoginStatusFromApprovalStatus,
  getApprovalStatusFromLoginStatus,
  isValidApprovalStatus,
};
