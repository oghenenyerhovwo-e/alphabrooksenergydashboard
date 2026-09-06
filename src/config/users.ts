/**
 * Maps Microsoft Graph user IDs to company-recognized names/roles.
 * Populate this as real Graph user IDs become known — never invent identities.
 */
export const USER_MAP: Record<string, { name: string; role?: string }> = {
  "f8fc95e8-a5ff-4d4a-af9a-09a468931aed": { name: "Eke Nwannediya Stephanie" },
  "1cf6c525-ba79-4a15-8bf1-7b0eab9437ea": {
    name: "Femi-Ademola Oluwatobi",
    role: "Business Development Manager",
  },
  "48850943-15fc-4867-b05e-b405010a3e64": {
    name: "Victor Nnamdi Paul",
    role: "Sales Executive",
  },
  "a6432b55-ce34-494c-bebd-e2357131e073": {
    name: "Ezeilo Sharon",
    role: "Operations Support",
  },
  "09d54739-b698-435d-932b-e3a5fe9f5a91": {
    name: "Joseph Regina",
    role: "Accountant",
  },
  "68349eb7-ffbc-42f0-abd3-e9e6efddbb55": { name: "IT Alphabrooks Energy" },
};

export function resolveUserName(
  userId: string,
  graphDisplayName?: string | null
): { name: string; isUnmapped: boolean } {
  const mapped = USER_MAP[userId];
  if (mapped) return { name: mapped.name, isUnmapped: false };
  if (graphDisplayName) return { name: graphDisplayName, isUnmapped: false };
  return { name: "Unmapped User", isUnmapped: true };
}

export function resolveUserRole(userId: string): string | undefined {
  return USER_MAP[userId]?.role;
}