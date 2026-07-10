export interface User {
  id: string;
  username: string;
  email: string;
  favoriteRegion: string;
  favoriteComuna: string;
  favoritePharmacies: string[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
