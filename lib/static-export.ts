const DEFAULT_STATIC_ORG_IDS = ["1"];

export function getStaticOrgIds(): string[] {
  const fromEnv = process.env.STATIC_ORG_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return fromEnv?.length ? fromEnv : DEFAULT_STATIC_ORG_IDS;
}

export function generateOrgStaticParams() {
  return getStaticOrgIds().map((org_id) => ({ org_id }));
}

export function generatePlaceholderStaticParams(paramName: string, value = "0") {
  return [{ [paramName]: value }];
}
