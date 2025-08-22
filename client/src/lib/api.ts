import ky from "ky";

export const api = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL!,
  hooks: {
    beforeRequest: [
      (request) => {
        request.headers.set("content-type", "application/json");
      }
    ]
  }
});
