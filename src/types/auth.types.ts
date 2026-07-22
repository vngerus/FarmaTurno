export interface User {
  id: string;
  username: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
  favoriteRegion: string;
  favoriteComuna: string;
  favoritePharmacies: string[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
