import ky, { HTTPError } from "ky";

export const api = ky.create({
  prefix: "/api/v1",
});

export const getApiErrorMessage = async (error: unknown) => {
  if (error instanceof HTTPError) {
    let body: unknown;

    try {
      body = await error.response.clone().json();
    } catch {
      body = null;
    }

    if (
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      return body.error;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Request failed";
};
