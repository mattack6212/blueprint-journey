exports.handler = async (event, context) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const secret = event.headers["x-dashboard-secret"];
  if (!secret || secret !== process.env.DASHBOARD_SECRET) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "unauthorized" }),
    };
  }

  try {
    const identity = context.clientContext && context.clientContext.identity;
    if (!identity) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Identity context not available" }),
      };
    }

    const members = [];
    let page = 1;

    while (true) {
      const res = await fetch(
        `${identity.url}/admin/users?per_page=200&page=${page}`,
        { headers: { Authorization: `Bearer ${identity.token}` } }
      );
      if (!res.ok) {
        throw new Error(`Identity API error: ${res.status} ${await res.text()}`);
      }
      const data = await res.json();
      const users = data.users || data;
      for (const user of users) {
        members.push({
          email: user.email,
          created: user.created_at,
          confirmed: !!user.confirmed_at,
        });
      }
      if (users.length < 200) break;
      page++;
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ members }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
