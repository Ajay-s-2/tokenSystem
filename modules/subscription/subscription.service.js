const Subscription = require("./subscription.model");
const Hospital = require("../hospital/hospital.model");
const User = require("../user/user.model");
const { DEFAULT_SUBSCRIPTION_AMOUNT, LOGIN_STATUS, ROLES } = require("../../shared/utils/constants");
const { createHttpError } = require("../../shared/utils/error.util");

const getDefaultSubscription = async () => {
  const subscription = await Subscription.findOne({ key: "default" }).lean();

  return {
    amount: subscription?.amount ?? DEFAULT_SUBSCRIPTION_AMOUNT,
    currency: subscription?.currency || "INR",
    interval: subscription?.interval || "month",
    source: subscription ? "configured" : "fallback",
  };
};

const setDefaultSubscription = async (amount) => {
  const subscription = await Subscription.findOneAndUpdate(
    { key: "default" },
    {
      key: "default",
      amount,
      currency: "INR",
      interval: "month",
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  return subscription;
};

const resolveHospitalByIdentifier = async (identifier) => {
  let hospital = await Hospital.findById(identifier);

  if (!hospital) {
    hospital = await Hospital.findOne({ userId: identifier });
  }

  return hospital;
};

const setHospitalSubscription = async ({ hospitalId, amount }) => {
  const hospital = await resolveHospitalByIdentifier(hospitalId);

  if (!hospital) {
    throw createHttpError(404, "Hospital not found");
  }

  hospital.subscriptionAmount = amount;
  await hospital.save();

  return hospital;
};

const getHospitalSubscription = async ({ hospitalId, requesterId, requesterRole }) => {
  const hospital = await resolveHospitalByIdentifier(hospitalId);

  if (!hospital) {
    throw createHttpError(404, "Hospital not found");
  }

  if (requesterRole !== ROLES.HOSPITAL || String(hospital.userId) !== String(requesterId)) {
    throw createHttpError(403, "You can only view your own hospital subscription");
  }

  const user = await User.findOne({ _id: hospital.userId, role: ROLES.HOSPITAL }).lean();
  if (!user || user.loginStatus !== LOGIN_STATUS.APPROVED || hospital.status !== "approved") {
    throw createHttpError(403, "Only approved hospitals can view subscription");
  }

  const defaultSubscription = await getDefaultSubscription();
  const amount = hospital.subscriptionAmount ?? defaultSubscription.amount;

  return {
    hospitalId: hospital._id,
    hospitalName: hospital.name,
    amount,
    defaultAmount: defaultSubscription.amount,
    currency: defaultSubscription.currency,
    interval: defaultSubscription.interval,
    source: hospital.subscriptionAmount != null ? "hospital_override" : "default",
  };
};

module.exports = {
  getDefaultSubscription,
  setDefaultSubscription,
  setHospitalSubscription,
  getHospitalSubscription,
  resolveHospitalByIdentifier,
};
