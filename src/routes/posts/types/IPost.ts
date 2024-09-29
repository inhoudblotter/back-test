export interface IPost {
  slug: string;
  title: string;
  body: string;
  createdAt: string;
  username: string;
  category?: {slug: string, name: string};
  subcategories: {slug: string, name: string, category: string}[]
}
