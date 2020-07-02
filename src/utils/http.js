const fetchWrapper = async (url, method = "GET", body = null) => {
  if (body) {
    body = await JSON.stringify(body);
  }

  return fetch(url, {
    method: method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body,
  });
};

export const http = fetchWrapper;
