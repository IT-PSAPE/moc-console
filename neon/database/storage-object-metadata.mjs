export function sourceObjectMetadata(object) {
  const source = Buffer.from(JSON.stringify(object.sourceObject)).toString('base64');
  if (Buffer.byteLength(source, 'ascii') > 1500) throw new Error('Source object metadata exceeds the safe S3 user-metadata budget');
  return { 'source-storage-object': source, 'source-sha256': object.sha256 };
}
