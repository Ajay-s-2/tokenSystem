const { LOGIN_STATUS, ONBOARDING_STATUS } = require("../../shared/utils/constants");
const userRepository = require("../user/user.repository");

const approveUser = async (userId) => {
  // Approve user for login
  const user = await userRepository.updateById(userId, {
    loginStatus: LOGIN_STATUS.APPROVED,
  });
  if (!user) throw new Error("User not found");
  return user;
};

const rejectUser = async (userId) => {
  // Reject user login request
  const user = await userRepository.updateById(userId, {
    loginStatus: LOGIN_STATUS.REJECTED,
  });
  if (!user) throw new Error("User not found");
  return user;
};

const onboardUser = async (userId) => {
  // Mark user onboarding as complete
  const user = await userRepository.updateById(userId, {
    onboardingStatus: ONBOARDING_STATUS.ONBOARDED,
  });
  if (!user) throw new Error("User not found");
  return user;
};

const deleteUser = async (userId) => {
  // Remove user from the system
  const user = await userRepository.deleteById(userId);
  if (!user) throw new Error("User not found");
  return user;
};

module.exports = {
  approveUser,
  rejectUser,
  onboardUser,
  deleteUser,
};
