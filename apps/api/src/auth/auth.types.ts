export type AuthenticatedUser = {
  id: string;
  email: string;
};

export type AccessTokenPayload = {
  sub: string;
  email: string;
};

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
};
