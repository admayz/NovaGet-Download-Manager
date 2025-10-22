export interface Category {
  id: number;
  name: string;
  folderPath: string;
  fileExtensions?: string;
  mimeTypes?: string;
  isSystem: boolean;
  color?: string;
  icon?: string;
}

export interface CategoryFormData {
  name: string;
  folderPath: string;
  fileExtensions: string[];
  mimeTypes: string[];
  color: string;
  icon: string;
}
