export const authUserFields = [
  'id', 'email', 'encrypted_password', 'email_confirmed_at', 'created_at', 'updated_at',
  'raw_user_meta_data', 'banned_until', 'deleted_at',
];

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function validateAuthUsers(users, profiles, fail) {
  if (!Array.isArray(users) || !Array.isArray(profiles) || users.length !== profiles.length) {
    fail('Snapshot auth user count does not match public.users');
  }
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const ids = new Set();
  const emails = new Set();
  for (const user of users) {
    if (!isRecord(user) || Object.keys(user).length !== authUserFields.length || authUserFields.some((field) => !(field in user))) {
      fail('Snapshot auth user fields are invalid');
    }
    if (typeof user.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(user.id) || ids.has(user.id)) fail('Snapshot auth user IDs are invalid or duplicated');
    if (typeof user.email !== 'string' || !user.email.trim() || emails.has(user.email.toLocaleLowerCase())) fail('Snapshot auth emails are invalid or duplicated');
    if (typeof user.encrypted_password !== 'string' || !/^\$2[aby]\$\d\d\$[./A-Za-z0-9]{53}$/.test(user.encrypted_password)) fail('Snapshot is missing a verified bcrypt credential');
    if (!user.email_confirmed_at || user.banned_until || user.deleted_at) fail('Snapshot contains an unverified, banned, or deleted auth identity');
    const profile = profileById.get(user.id);
    if (!profile || String(profile.email).toLocaleLowerCase() !== user.email.toLocaleLowerCase()) fail('Snapshot auth identities do not match public.users');
    ids.add(user.id);
    emails.add(user.email.toLocaleLowerCase());
  }
  if (profiles.some((profile) => !ids.has(profile.id))) fail('Snapshot public.users contains an identity missing from authUsers');
}

export function validateStorage(snapshot, fail) {
  if (!Array.isArray(snapshot.storageBuckets) || snapshot.storageBuckets.length !== 3 || !Array.isArray(snapshot.storageObjects)) {
    fail('Snapshot must contain all three Storage buckets and an object inventory');
  }
  const bucketIds = new Set();
  for (const bucket of snapshot.storageBuckets) {
    if (!isRecord(bucket) || typeof bucket.id !== 'string' || bucketIds.has(bucket.id) || bucket.public !== true) {
      fail('Snapshot Storage buckets must have unique IDs and be public');
    }
    bucketIds.add(bucket.id);
  }
  const objectNames = new Set();
  for (const object of snapshot.storageObjects) {
    if (!isRecord(object) || typeof object.bucket_id !== 'string' || typeof object.name !== 'string' || !bucketIds.has(object.bucket_id)) {
      fail('Snapshot Storage object inventory references an unknown bucket or has invalid fields');
    }
    const key = `${object.bucket_id}\u0000${object.name}`;
    if (objectNames.has(key)) fail('Snapshot Storage object inventory contains duplicate paths');
    objectNames.add(key);
  }
}
