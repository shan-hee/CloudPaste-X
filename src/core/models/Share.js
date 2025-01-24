class Share {
  constructor({
    id,
    type,
    content,
    filename,
    originalname,
    password,
    maxViews = 0,
    views = 0,
    createdAt = Date.now(),
    expiresAt = null,
    fileSize = null,
    mimeType = null
  }) {
    this.id = id;
    this.type = type;
    this.content = content;
    this.filename = filename;
    this.originalname = originalname;
    this.password = password;
    this.maxViews = maxViews;
    this.views = views;
    this.createdAt = createdAt;
    this.expiresAt = expiresAt;
    this.fileSize = fileSize;
    this.mimeType = mimeType;
  }

  isExpired() {
    if (!this.expiresAt) return false;
    return Date.now() > this.expiresAt;
  }

  hasReachedMaxViews() {
    if (this.maxViews === 0) return false;
    return this.views >= this.maxViews;
  }

  incrementViews() {
    this.views += 1;
    return this.views;
  }

  isPasswordProtected() {
    return !!this.password;
  }

  validatePassword(password) {
    return this.password === password;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      filename: this.filename,
      originalname: this.originalname,
      views: this.views,
      maxViews: this.maxViews,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      hasPassword: this.isPasswordProtected(),
      fileSize: this.fileSize,
      mimeType: this.mimeType
    };
  }
}

module.exports = Share; 