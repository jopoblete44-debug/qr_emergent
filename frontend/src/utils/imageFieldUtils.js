export const IMAGE_LIKE_FIELD_NAME_PATTERN = /(photo|image|logo|avatar|banner|cover|thumbnail|thumb|picture|icon|hero|portada|foto|imagen)/i;

const getFieldNameCandidates = (fieldLike) => {
  if (typeof fieldLike === 'string') {
    return [fieldLike.trim()].filter(Boolean);
  }

  return [fieldLike?.name, fieldLike?.id]
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean);
};

export const isImageLikeField = (fieldLike) => (
  getFieldNameCandidates(fieldLike).some((value) => IMAGE_LIKE_FIELD_NAME_PATTERN.test(value))
);

export const getEffectiveFieldType = (field = {}) => (
  isImageLikeField(field) ? 'image' : (field?.type || 'text')
);
