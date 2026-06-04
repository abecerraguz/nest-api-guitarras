export interface TokenResponseDto {
  tokenType: 'Bearer';
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}
