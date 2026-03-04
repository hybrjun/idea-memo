export interface Tag {
  id: string;
  text: string;
  normalizedText: string;
  createdAt: Date;
}

export interface TagFrequency {
  tag: Tag;
  count: number;
  lastUsedAt: Date;
}
