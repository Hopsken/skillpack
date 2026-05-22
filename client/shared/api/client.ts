import ky from "ky";

export const api = ky.create({
  prefix: "/api/v1",
});

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};
