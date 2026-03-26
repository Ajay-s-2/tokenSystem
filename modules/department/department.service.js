const mongoose = require("mongoose");
const Department = require("./department.model");
const userRepository = require("../user/user.repository");

const DEPARTMENT_ID_PREFIX = "DEP";

const normalizeDepartmentName = (departmentName) => (departmentName || "").trim();

const buildNameRegex = (departmentName) => {
  const escapedName = departmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escapedName}$`, "i");
};

const findExistingByName = async (departmentName, excludeId = null) => {
  const query = { departmentName: buildNameRegex(departmentName) };

  if (excludeId && mongoose.isValidObjectId(excludeId)) {
    query._id = { $ne: excludeId };
  }

  return Department.findOne(query);
};

const getNextDepartmentId = async () => {
  const [lastDepartment] = await Department.aggregate([
    {
      $addFields: {
        departmentSequence: {
          $toInt: {
            $substrBytes: [
              "$departmentId",
              DEPARTMENT_ID_PREFIX.length,
              {
                $subtract: [{ $strLenBytes: "$departmentId" }, DEPARTMENT_ID_PREFIX.length],
              },
            ],
          },
        },
      },
    },
    { $sort: { departmentSequence: -1 } },
    { $limit: 1 },
  ]);

  const nextSequence = (lastDepartment?.departmentSequence || 0) + 1;
  return `${DEPARTMENT_ID_PREFIX}${String(nextSequence).padStart(3, "0")}`;
};

const findDepartmentByIdentifier = async (identifier) => {
  if (!identifier) return null;

  const trimmedIdentifier = String(identifier).trim();
  const query = [{ departmentId: trimmedIdentifier }];

  if (mongoose.isValidObjectId(trimmedIdentifier)) {
    query.push({ _id: trimmedIdentifier });
  }

  return Department.findOne({ $or: query });
};

const createDepartment = async (payload, adminId) => {
  const departmentName = normalizeDepartmentName(payload?.departmentName);
  if (!departmentName) {
    throw new Error("Department name is required");
  }

  const existingDepartment = await findExistingByName(departmentName);
  if (existingDepartment) {
    throw new Error("Department name already exists");
  }

  const departmentId = await getNextDepartmentId();

  return Department.create({
    departmentId,
    departmentName,
    createdBy: String(adminId),
  });
};

const getDepartments = async () => {
  const departments = await Department.find({}, { departmentId: 1, departmentName: 1 })
    .sort({ departmentId: 1 })
    .lean();

  return departments.map((department) => ({
    id: department.departmentId,
    name: department.departmentName,
  }));
};

const validateDepartment = async (departmentId) => {
  const trimmedDepartmentId = (departmentId || "").trim();
  if (!trimmedDepartmentId) {
    throw new Error("Department ID is required");
  }

  const department = await Department.findOne({ departmentId: trimmedDepartmentId });
  if (!department) {
    throw new Error("Selected department does not exist");
  }

  return department;
};

const updateDepartment = async (identifier, payload) => {
  const department = await findDepartmentByIdentifier(identifier);
  if (!department) {
    throw new Error("Department not found");
  }

  const departmentName = normalizeDepartmentName(payload?.departmentName);
  if (!departmentName) {
    throw new Error("Department name is required");
  }

  const existingDepartment = await findExistingByName(departmentName, department._id.toString());
  if (existingDepartment) {
    throw new Error("Department name already exists");
  }

  department.departmentName = departmentName;
  await department.save();

  await userRepository.updateManyByDepartmentId(department.departmentId, {
    departmentName: department.departmentName,
  });

  return department;
};

const deleteDepartment = async (identifier) => {
  const department = await findDepartmentByIdentifier(identifier);
  if (!department) {
    throw new Error("Department not found");
  }

  const assignedUsersCount = await userRepository.countByDepartmentId(department.departmentId);
  if (assignedUsersCount > 0) {
    throw new Error("Department cannot be deleted while users are assigned to it");
  }

  await Department.deleteOne({ _id: department._id });
  return department;
};

module.exports = {
  createDepartment,
  getDepartments,
  validateDepartment,
  updateDepartment,
  deleteDepartment,
};
