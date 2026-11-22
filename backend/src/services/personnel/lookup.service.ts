import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/httpError.js";

// License Types
export async function listLicenseTypes() {
  const records = await prisma.licenseType.findMany({
    orderBy: { license_type_name: "asc" },
    select: {
      license_type_UUID: true,
      license_type_name: true,
    },
  });
  return records.map((r) => ({ id: r.license_type_UUID, name: r.license_type_name }));
}

// Renewal Statuses
export async function listRenewalStatuses() {
  const records = await prisma.renewalStatus.findMany({
    orderBy: { status_name: "asc" },
    select: {
      renewal_status_UUID: true,
      status_name: true,
    },
  });
  return records.map((r) => ({ id: r.renewal_status_UUID, name: r.status_name }));
}

// Training Types
export async function listTrainingTypes() {
  const records = await prisma.trainingType.findMany({
    orderBy: { training_name: "asc" },
    select: {
      training_type_UUID: true,
      training_name: true,
    },
  });
  return records.map((r) => ({ id: r.training_type_UUID, name: r.training_name }));
}

// Training Providers
export async function listTrainingProviders() {
  const records = await prisma.trainingProvider.findMany({
    orderBy: { provider_name: "asc" },
    select: {
      training_provider_UUID: true,
      provider_name: true,
    },
  });
  return records.map((r) => ({ id: r.training_provider_UUID, name: r.provider_name }));
}