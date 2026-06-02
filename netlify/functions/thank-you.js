const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let email, firstName;
  try {
    ({ email, firstName } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";

  const html = `
<p>${greeting}</p>
<p>Thank you. Your stepping in helps carry this work, and the families it reaches, further than you know.</p>
<p>May the Lord bless you and keep you. May He make your foundation strong, your hands faithful with what's been given, and your home a place of peace.</p>
<p>A short prayer for you:</p>
<p><em>Father, thank You for this friend. Bless what they've sown here and multiply it for good. Steady their steps, provide for their household, and let everything they build rest on You. In Jesus' name, amen.</em></p>
<p>Faithfully,<br>
Matt McFarlane<br>
Foundation Financial<br>
<em>Strong Foundations Change Everything</em></p>
`;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: '"Foundation Financial" <blueprint@foundationfinancial.community>',
      to: email,
      subject: "Thank you — and a prayer for you",
      html,
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
